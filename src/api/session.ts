/**
 * Signing in and out on Lightning's API (API.md "Authenticate";
 * session_controller.ex): the session, the signed-in person (`GET /api/me`),
 * their keys, the hooks main.tsx and the auth wrappers call, and the stand-in.
 */
import { MutationCache, QueryCache, QueryClient, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { session as fixtureSession, users as fixtureUsers } from "../mock-data/users";
import type { Session } from "../session/session";
import type { TwoFactorMethod } from "../types/auth";
import type { User } from "../types/users";
import { ApiError, renewCsrfToken, request, standIn, useSave } from "./client";
import { instanceInfo, instanceQuery } from "./instance";
import recordedMe from "./recorded/me.json";
import recordedSession from "./recorded/session.json";

/** `GET`/`POST /api/session`'s `data`. */
export interface ApiSession {
  state: "signed_in" | "mfa_required";
  user_id: string;
  stepped_up_until: string | null;
  csrf_token: string;
  pending_signup: null;
}

/** `GET /api/me`'s `data`, for a session token. */
export interface ApiMe {
  id: string;
  attributes: {
    first_name: string;
    last_name: string;
    email: string;
    role: "superuser" | "user";
    inserted_at: string;
    confirmed_at: string | null;
    mfa_enabled: boolean;
    experimental_features: boolean;
    contact_preference: "critical" | "any";
    github: { connected: boolean };
  };
}

/** What the log in form sends. */
export interface SignInValues {
  email: string;
  password: string;
}

/** What the two-factor form sends. */
export interface CodeValues {
  method: TwoFactorMethod;
  code: string;
}

/** The API doesn't send `support_user`; a signed-in account is neither disabled nor scheduled for deletion. */
export function userFromMe(me: ApiMe): User {
  const a = me.attributes;
  return {
    id: me.id,
    firstName: a.first_name,
    lastName: a.last_name,
    email: a.email,
    role: a.role,
    confirmedAt: a.confirmed_at,
    insertedAt: a.inserted_at,
    mfaEnabled: a.mfa_enabled,
    githubConnected: a.github.connected,
    experimentalFeatures: a.experimental_features,
    supportUser: false,
    disabled: false,
    scheduledDeletion: null,
    contactPreference: a.contact_preference,
  };
}

export const sessionKeys = {
  all: ["session"] as const,
  me: ["session", "me"] as const,
};

/** Everything cached: signing in may be someone else, so every list reloads. */
const everything: QueryKey = [];

/**
 * The app's query client. A request Lightning answers 401 `unauthenticated`
 * means the session ended while the app was open, so the signed-in person is
 * read again, and main.tsx sends them to log in.
 */
export function createQueryClient(): QueryClient {
  const client: QueryClient = new QueryClient({
    // A refused request shows at once; Lightning's answer won't change on a retry.
    defaultOptions: { queries: { retry: false } },
    queryCache: new QueryCache({ onError: (error, query) => query.queryKey[0] !== "session" && recheck(error) }),
    mutationCache: new MutationCache({ onError: (error) => recheck(error) }),
  });
  const recheck = (error: unknown) => {
    if (error instanceof ApiError && error.code === "unauthenticated") void client.invalidateQueries({ queryKey: sessionKeys.me });
  };
  return client;
}

/**
 * `GET /api/me`, or null when signed out. Signed out is an answer, not a
 * failure: kept as data, it stays on screen while the next sign-in reloads it.
 */
export const meQuery = {
  queryKey: sessionKeys.me,
  queryFn: () =>
    request<{ data: ApiMe }>("GET", "/api/me").then(
      (r) => r.data,
      (error: unknown) => {
        if (error instanceof ApiError && error.code === "unauthenticated") return null;
        throw error;
      }
    ),
};

export type SessionState = { state: "loading" } | { state: "signedOut" } | { state: "signedIn"; session: Session };

/**
 * Who is signed in, for SessionProvider. The instance details fill in once
 * they arrive.
 */
export function useSessionState(): SessionState {
  const me = useQuery(meQuery);
  const instance = useQuery(instanceQuery);
  // ponytail: Lightning being unreachable also reads as signed out; the log in form then says "Couldn't reach Lightning."
  if (me.data === null || me.isError) return { state: "signedOut" };
  if (me.data === undefined) return { state: "loading" };
  return {
    state: "signedIn",
    session: {
      user: userFromMe(me.data),
      instance: instance.data ? instanceInfo(instance.data) : { adminEmail: "", releaseLabel: "" },
    },
  };
}

/** `POST /api/session`. A new session comes with a new CSRF token, kept for the next write. */
async function startSession(body: Record<string, string>): Promise<"signedIn" | "mfaRequired"> {
  try {
    const { data } = await request<{ data: ApiSession }>("POST", "/api/session", body);
    renewCsrfToken(data.csrf_token);
    return "signedIn";
  } catch (error) {
    if (error instanceof ApiError && error.code === "mfa_required") {
      // The waiting session has its own token; the code's POST reads it.
      renewCsrfToken(null);
      return "mfaRequired";
    }
    throw error;
  }
}

/** Signing in (with its MFA step) and out. Each resolves once the signed-in person has been read again. */
export function useSessionActions() {
  const queryClient = useQueryClient();
  // Remember me isn't sent: the API refuses `remember_me`.
  const signIn = useSave([everything], ({ email, password }: SignInValues) => startSession({ email, password }));
  // The second POST of an MFA sign-in, with only the code.
  const verifyCode = useSave([everything], ({ method, code }: CodeValues) =>
    startSession(method === "backup_code" ? { backup_code: code } : { mfa_code: code })
  );
  const signOut = useSave([sessionKeys.all, instanceQuery.queryKey], async () => {
    await request("DELETE", "/api/session");
    renewCsrfToken(null);
    // Nothing of this person's stays behind for whoever signs in next.
    queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== "session" && q.queryKey[0] !== "instance" });
  });
  return {
    signIn: (values: SignInValues) => signIn([values]),
    verifyCode: (values: CodeValues) => verifyCode([values]),
    signOut: () => signOut([]),
  };
}

// The stand-in. It starts signed in as the fixture's session user, so every
// page on the fixtures works as before. Any fixture user signs in with
// Lightning's demo password; one with MFA on then needs the code 123456.

const STAND_IN_PASSWORD = "welcome12345";
const STAND_IN_CODE = "123456";

let signedIn: User | null = fixtureSession.user;
let waitingForCode: User | null = null;

const refused = (code: string, detail: string) => new ApiError(401, code, detail);
const unauthenticated = () => refused("unauthenticated", "Authentication is required.");
const invalidCredentials = () => refused("invalid_credentials", "The sign-in details are not valid.");

function sessionAnswer(user: User) {
  return { data: { ...recordedSession.data, user_id: user.id, csrf_token: "stand-in" } };
}

/** The recorded answer, about the stand-in's user. */
function meAnswer(user: User): { data: ApiMe } {
  const attributes = {
    ...recordedMe.data.attributes,
    first_name: user.firstName,
    last_name: user.lastName,
    email: user.email,
    role: user.role,
    inserted_at: user.insertedAt,
    confirmed_at: user.confirmedAt,
    mfa_enabled: user.mfaEnabled,
    experimental_features: user.experimentalFeatures,
    contact_preference: user.contactPreference,
    github: { connected: user.githubConnected, expires_at: null },
  };
  return { data: { ...recordedMe.data, id: user.id, attributes } };
}

standIn("POST", "/api/session", (_params, body) => {
  const b = body as Partial<Record<"email" | "password" | "mfa_code" | "backup_code", string>>;
  const code = b.mfa_code ?? b.backup_code;
  if (b.email === undefined) {
    // Only the code, continuing a sign-in that waits for it.
    if (!waitingForCode) throw unauthenticated();
    if (code !== STAND_IN_CODE) throw invalidCredentials();
    [signedIn, waitingForCode] = [waitingForCode, null];
    return sessionAnswer(signedIn);
  }
  if (b.password === undefined) {
    throw new ApiError(422, "invalid", "The request is not valid. See errors.", [{ code: "required", pointer: "#/password", detail: "can't be blank" }]);
  }
  const user = fixtureUsers.find((u) => u.email === b.email);
  // Signing in replaces whatever session there was.
  [signedIn, waitingForCode] = [null, null];
  if (!user || b.password !== STAND_IN_PASSWORD || user.disabled || user.scheduledDeletion) throw invalidCredentials();
  if (user.mfaEnabled && code === undefined) {
    waitingForCode = user;
    throw refused("mfa_required", "Signing in needs an MFA code or backup code as well.");
  }
  if (user.mfaEnabled && code !== STAND_IN_CODE) throw invalidCredentials();
  signedIn = user;
  return sessionAnswer(user);
});

standIn("DELETE", "/api/session", () => {
  [signedIn, waitingForCode] = [null, null];
  return undefined;
});

standIn("GET", "/api/me", () => {
  if (!signedIn) throw unauthenticated();
  return meAnswer(signedIn);
});
