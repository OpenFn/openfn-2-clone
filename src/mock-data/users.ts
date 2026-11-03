/**
 * Users, modelled on Lightning's demo seed (lib/lightning/setup_utils.ex).
 * Static fixtures only: nothing here talks to a backend.
 */
import type { Session } from "../session/session";
import type { User } from "../types/users";

export const users: User[] = [
  {
    id: "user-amy",
    firstName: "Amy",
    lastName: "Admin",
    email: "demo@openfn.org",
    role: "superuser",
    confirmedAt: "2024-03-12",
    insertedAt: "2024-03-12",
    mfaEnabled: false,
    githubConnected: false,
    experimentalFeatures: false,
    supportUser: false,
    disabled: false,
    scheduledDeletion: null,
    contactPreference: "critical",
  },
  {
    id: "user-esther",
    firstName: "Esther",
    lastName: "Editor",
    email: "editor@openfn.org",
    role: "user",
    confirmedAt: "2024-03-14",
    insertedAt: "2024-03-14",
    mfaEnabled: true,
    githubConnected: true,
    experimentalFeatures: false,
    supportUser: false,
    disabled: false,
    scheduledDeletion: null,
    contactPreference: "any",
  },
  {
    id: "user-vikram",
    firstName: "Vikram",
    lastName: "Viewer",
    email: "viewer@openfn.org",
    role: "user",
    confirmedAt: null,
    insertedAt: "2024-05-02",
    mfaEnabled: false,
    githubConnected: false,
    experimentalFeatures: false,
    supportUser: false,
    disabled: false,
    scheduledDeletion: null,
    contactPreference: "critical",
  },
  {
    id: "user-sizwe",
    firstName: "Sizwe",
    lastName: "Super",
    email: "super@openfn.org",
    role: "superuser",
    confirmedAt: "2024-01-08",
    insertedAt: "2024-01-08",
    mfaEnabled: true,
    githubConnected: false,
    experimentalFeatures: true,
    supportUser: false,
    disabled: false,
    scheduledDeletion: null,
    contactPreference: "critical",
  },
];

/**
 * The signed-in session: Amy, a superuser, so the Admin menu is reachable.
 * main.tsx and Storybook hand it to <SessionProvider>; components read it
 * through useCurrentUser() / useInstanceInfo(), never from here.
 */
export const session: Session = {
  user: users[0]!,
  instance: {
    // Lightning.Config.instance_admin_email
    adminEmail: "support@openfn.org",
    releaseLabel: "v2.19.1",
  },
};

export function findUser(id: string): User | undefined {
  return users.find((u) => u.id === id);
}
