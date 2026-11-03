import { createContext, useContext } from "react";
import { permissionsFor, type Permissions } from "../permissions";
import type { Project } from "../types/projects";
import type { User } from "../types/users";

/** Instance details the layout shows (Lightning.Config). */
export interface InstanceInfo {
  /** Address the sidebar's "Support" link mails (`instance_admin_email`). */
  adminEmail: string;
  /** Release label in the sidebar footer's version chip. */
  releaseLabel: string;
}

/** Who is signed in, and where. Lightning's `@current_user` plus instance config. */
export interface Session {
  user: User;
  instance: InstanceInfo;
}

export const SessionContext = createContext<Session | null>(null);

function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useCurrentUser needs a <SessionProvider> above it");
  return session;
}

/** The signed-in user. The one way to ask who that is. */
export function useCurrentUser(): User {
  return useSession().user;
}

export function useInstanceInfo(): InstanceInfo {
  return useSession().instance;
}

/** `permissionsFor(project, currentUser)`, for pages. */
export function usePermissions(project?: Project): Permissions {
  return permissionsFor(project, useCurrentUser());
}
