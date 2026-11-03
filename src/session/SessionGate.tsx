import { useEffect, useRef, type ReactNode } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useInstance } from "../api/instance";
import { useSessionActions, useSessionState } from "../api/session";
import SessionProvider from "./SessionProvider";
import type { SignInState } from "./session";

/** Pages a signed-out visitor may see; Lightning sends them anywhere else to log in. */
const signedOutPaths = ["/users/log_in", "/users/register", "/users/reset_password", "/users/two-factor", "/users/confirm"];
/**
 * Pages Lightning sends a signed-in visitor away from (`redirect_if_user_is_authenticated`),
 * and the two-factor step once it's done: on to where they were headed, or their projects.
 */
const signedInAway = ["/users/log_in", "/users/register", "/users/reset_password", "/users/two-factor"];

const under = (paths: string[], pathname: string) => paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));

/**
 * The signed-in person from Lightning's API (or its stand-in) for everything
 * below, as UserAuth's plugs do: signed out, a visitor goes to log in and
 * comes back after; signed in, the log in pages send them to their projects.
 * `/users/log_out` signs out, then shows log in with Lightning's flash.
 */
export default function SessionGate({ children }: { children: ReactNode }) {
  const session = useSessionState();
  const instance = useInstance();
  const { pathname, search, state } = useLocation() as { pathname: string; search: string; state: SignInState | null };
  const navigate = useNavigate();
  const { signOut } = useSessionActions();
  const signingOut = useRef(false);
  const loggingOut = pathname === "/users/log_out";

  // signOut is new on every render, so the effect runs often: the ref keeps it to one sign-out per visit.
  useEffect(() => {
    if (!loggingOut) {
      signingOut.current = false;
      return;
    }
    if (signingOut.current) return;
    signingOut.current = true;
    void signOut().finally(() =>
      navigate("/users/log_in", { replace: true, state: { info: "Logged out successfully." } satisfies SignInState })
    );
  }, [loggingOut, signOut, navigate]);

  if (session.state === "loading" || loggingOut) return null;
  // An instance with no superuser yet sends every page to first setup (Lightning's :check_first_setup plug).
  if (instance?.needs_setup) return pathname === "/first_setup" ? children : <Navigate to="/first_setup" replace />;
  // A sign-in waiting for its MFA code may only finish it, or start again.
  if (session.state === "waitingForCode") {
    if (under(signedOutPaths, pathname)) return children;
    return <Navigate to="/users/two-factor" replace state={{ returnTo: pathname + search } satisfies SignInState} />;
  }
  if (session.state === "signedOut") {
    if (under(signedOutPaths, pathname)) return children;
    return <Navigate to="/users/log_in" replace state={{ returnTo: pathname + search } satisfies SignInState} />;
  }
  // This is also how signing in moves on.
  if (under(signedInAway, pathname)) return <Navigate to={state?.returnTo ?? "/projects"} replace />;
  return <SessionProvider session={session.session}>{children}</SessionProvider>;
}
