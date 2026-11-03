/** The signed-in person on Lightning's API (API.md "Your account"): the API's shape, its mapper, its key, its query and the stand-in. */
import { session as fixtureSession, users as fixtureUsers } from "../mock-data/users";
import type { User } from "../types/users";
import { ApiError, request, standIn } from "./client";
import recorded from "./recorded/me.json";

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

export const meKeys = {
  all: ["me"] as const,
};

/**
 * The query for the signed-in person, for any wrapper that needs them: null
 * when signed out. Signed out is an answer, not a failure: kept as data, it
 * stays on screen while the next sign-in reloads it.
 */
export const meQuery = {
  queryKey: meKeys.all,
  queryFn: () =>
    request<{ data: ApiMe }>("GET", "/api/me").then(
      (r): ApiMe | null => r.data,
      (error: unknown) => {
        if (error instanceof ApiError && error.code === "unauthenticated") return null;
        throw error;
      }
    ),
};

// The stand-in. It starts signed in as the fixture's session user. The
// recorded answer is that person on the real Lightning (the same email), so
// the stand-in's API pages find them in the recorded members; any other
// fixture user gets the recorded answer with their own details.

/** Who the stand-in has signed in; session.ts signs people in and out. */
/** The stand-in's session: who is signed in, and until when they've stepped up (ms; 0 for not). */
export const standInAccount: { user: User | null; steppedUpUntil: number } = { user: fixtureSession.user, steppedUpUntil: 0 };

/** The fixture user with this email, so pages still on the fixtures find the user they know. */
export const fixtureUserFor = (me: ApiMe): User | undefined => fixtureUsers.find((u) => u.email === me.attributes.email);

function meAnswer(user: User) {
  if (user.email === recorded.data.attributes.email) return recorded;
  const attributes = {
    ...recorded.data.attributes,
    first_name: user.firstName,
    last_name: user.lastName,
    email: user.email,
    role: user.role,
    mfa_enabled: user.mfaEnabled,
  };
  return { data: { ...recorded.data, id: user.id, attributes } };
}

standIn("GET", "/api/me", () => {
  if (!standInAccount.user) throw new ApiError(401, "unauthenticated", "Authentication is required.");
  return meAnswer(standInAccount.user);
});
