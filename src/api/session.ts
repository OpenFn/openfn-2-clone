/**
 * Signing in and out on Lightning's API (API.md "Authenticate";
 * session_controller.ex): the session, the hooks main.tsx and the auth
 * wrappers call, and the stand-in. The signed-in person is me.ts.
 */
import { MutationCache, QueryCache, QueryClient, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { users as fixtureUsers } from "../mock-data/users";
import type { Session } from "../session/session";
import type { TwoFactorMethod } from "../types/auth";
import type { User } from "../types/users";
import { ApiError, live, renewCsrfToken, request, standIn, useSave } from "./client";
import { instanceInfo, instanceQuery } from "./instance";
import { fixtureUserFor, meKeys, meQuery, standInAccount, userFromMe } from "./me";
import recordedSession from "./recorded/session.json";

/** `GET`/`POST /api/session`'s `data`. */
export interface ApiSession {
  state: "signed_in" | "mfa_required";
  user_id: string;
  stepped_up_until: string | null;
  csrf_token: string;
  pending_signup: null;
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

/** What the confirm access form sends to step the session up. */
export type StepUpValues = { password: string } | { code: string };

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
    queryCache: new QueryCache({ onError: (error, query) => query.queryKey[0] !== meKeys.all[0] && recheck(error) }),
    mutationCache: new MutationCache({ onError: (error) => recheck(error) }),
  });
  const recheck = (error: unknown) => {
    if (error instanceof ApiError && error.code === "unauthenticated") void client.invalidateQueries({ queryKey: meKeys.all });
  };
  return client;
}

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
      // On the stand-in, pages still on the fixtures know the fixture's user, by the same email.
      user: (!live && fixtureUserFor(me.data)) || userFromMe(me.data),
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
  const verifyCode = useSave([everything], ({ method, code }: CodeValues) => startSession(method === "backup_code" ? { backup_code: code } : { mfa_code: code }));
  const signOut = useSave([meKeys.all, instanceQuery.queryKey], async () => {
    await request("DELETE", "/api/session");
    renewCsrfToken(null);
    // Nothing of this person's stays behind for whoever signs in next.
    queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== meKeys.all[0] && q.queryKey[0] !== instanceQuery.queryKey[0] });
  });
  // Entering the password or a code again while signed in steps the session up for five minutes.
  const stepUp = useSave([meKeys.all], (values: StepUpValues) => startSession("password" in values ? { password: values.password } : { mfa_code: values.code }));
  return {
    signIn: (values: SignInValues) => signIn([values]),
    stepUp: async (values: StepUpValues) => void (await stepUp([values])),
    verifyCode: (values: CodeValues) => verifyCode([values]),
    signOut: () => signOut([]),
  };
}

// The stand-in. It starts signed in (me.ts). Any fixture user signs in with
// Lightning's demo password; one with MFA on then needs the code 123456.

const STAND_IN_PASSWORD = "welcome12345";
const STAND_IN_CODE = "123456";
/** How long a step-up lasts on Lightning. */
const STEP_UP_MS = 5 * 60_000;

let waitingForCode: User | null = null;

const refused = (code: string, detail: string) => new ApiError(401, code, detail);
const unauthenticated = () => refused("unauthenticated", "Authentication is required.");
const invalidCredentials = () => refused("invalid_credentials", "The sign-in details are not valid.");

function sessionAnswer(user: User) {
  return { data: { ...recordedSession.data, user_id: user.id, csrf_token: "stand-in" } };
}

standIn("POST", "/api/session", (_params, body) => {
  const b = body as Partial<Record<"email" | "password" | "mfa_code" | "backup_code", string>>;
  const code = b.mfa_code ?? b.backup_code;
  if (b.email === undefined && !waitingForCode && standInAccount.user) {
    // Stepping up a signed-in session.
    if (b.password !== undefined ? b.password !== STAND_IN_PASSWORD : code !== STAND_IN_CODE) throw invalidCredentials();
    standInAccount.steppedUpUntil = Date.now() + STEP_UP_MS;
    return sessionAnswer(standInAccount.user);
  }
  if (b.email === undefined) {
    // Only the code, continuing a sign-in that waits for it.
    if (!waitingForCode) throw unauthenticated();
    if (code !== STAND_IN_CODE) throw invalidCredentials();
    standInAccount.user = waitingForCode;
    waitingForCode = null;
    return sessionAnswer(standInAccount.user);
  }
  if (b.password === undefined) {
    throw new ApiError(422, "invalid", "The request is not valid. See errors.", [{ code: "required", pointer: "#/password", detail: "can't be blank" }]);
  }
  const user = fixtureUsers.find((u) => u.email === b.email);
  // Signing in replaces whatever session there was.
  [standInAccount.user, waitingForCode, standInAccount.steppedUpUntil] = [null, null, 0];
  if (!user || b.password !== STAND_IN_PASSWORD || user.disabled || user.scheduledDeletion) throw invalidCredentials();
  if (user.mfaEnabled && code === undefined) {
    waitingForCode = user;
    throw refused("mfa_required", "Signing in needs an MFA code or backup code as well.");
  }
  if (user.mfaEnabled && code !== STAND_IN_CODE) throw invalidCredentials();
  standInAccount.user = user;
  return sessionAnswer(user);
});

standIn("DELETE", "/api/session", () => {
  [standInAccount.user, waitingForCode] = [null, null];
  return undefined;
});
