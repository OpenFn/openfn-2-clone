/**
 * Personal access tokens and MFA backup codes for the signed-in user
 * (/profile/tokens, /profile/auth/backup_codes). Static fixtures only:
 * every value is an obviously fake placeholder, never a real secret.
 */
import type { ApiToken, BackupCode } from "../types/tokens";

export const apiTokens: ApiToken[] = [
  {
    id: "token-1",
    masked: "...bCdE-12345",
    insertedAt: "2026-10-14T08:12:00Z",
    lastUsedAt: null,
  },
  {
    id: "token-2",
    masked: "...yXwV-67890",
    insertedAt: "2026-09-02T14:30:00Z",
    lastUsedAt: "2026-10-12T16:05:00Z",
  },
];

/** Ten placeholder recovery codes; one already used. */
export const backupCodes: BackupCode[] = [
  "demo0001", "demo0002", "demo0003", "demo0004", "demo0005",
  "demo0006", "demo0007", "demo0008", "demo0009", "demo0010",
].map((code, i) => ({ code, usedAt: i === 2 ? "2026-09-18T10:41:07Z" : null }));

export function regenerateFakeBackupCodes(): BackupCode[] {
  return Array.from({ length: 10 }, () => ({
    code: "demo" + Math.random().toString(36).slice(2, 6),
    usedAt: null,
  }));
}
