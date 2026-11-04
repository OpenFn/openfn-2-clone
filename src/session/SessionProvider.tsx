import type { ReactNode } from "react";
import { SessionContext, type Session } from "./session";

/**
 * Supplies the signed-in user and instance details to everything below it.
 * The app fills it from Lightning's API (SessionGate); Storybook and tests
 * from the session fixture.
 */
export default function SessionProvider({ session, children }: { session: Session; children: ReactNode }) {
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}
