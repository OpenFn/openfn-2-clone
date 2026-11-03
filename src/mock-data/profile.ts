/**
 * Profile page settings (/profile). Static fixtures only.
 */
import type { MfaSetupResult, ProfilePageData } from "../types/profile";
import type { User } from "../types/users";

/** VersionControl.github_enabled?(): the demo instance has no GitHub app configured, like the reference. */
export const githubOauthEnabled = false;

/** Whether the user has run activity in projects (UserDeletionModal's footnote). */
export const hasActivityInProjects = true;

/** A stand-in for the TOTP QR code, as an SVG data URI (Lightning renders a real one with EQRCode). */
function fakeQrCodeSrc() {
  const finder = (x: number, y: number, cx: number, cy: number) =>
    x >= cx && x < cx + 7 && y >= cy && y < cy + 7 &&
    (x === cx || x === cx + 6 || y === cy || y === cy + 6 || (x >= cx + 2 && x <= cx + 4 && y >= cy + 2 && y <= cy + 4));
  const rects: string[] = [];
  for (let y = 0; y < 21; y++) {
    for (let x = 0; x < 21; x++) {
      const inFinder = (x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12);
      const on = finder(x, y, 0, 0) || finder(x, y, 14, 0) || finder(x, y, 0, 14) || (!inFinder && (x * 7 + y * 13 + x * y) % 5 < 2);
      if (on) rects.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`);
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 21 21" shape-rendering="crispEdges">${rects.join("")}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** What starting MFA setup answers with: a fake secret and QR code. */
export const fakeMfaSetup: MfaSetupResult = { secret: "DEMOFAKESECRETNOTREAL234", qrCodeSrc: fakeQrCodeSrc() };

/** The profile page's data for a user, as Lightning's ProfileLive would send it. */
export function profilePropsFor(user: User): ProfilePageData {
  return {
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      contactPreference: user.contactPreference,
      insertedAt: user.insertedAt,
    },
    mfa: { enabled: user.mfaEnabled, backupCodesHref: "/profile/auth/backup_codes" },
    github: {
      connectHref: githubOauthEnabled ? "https://github.com/login/oauth/authorize?client_id=demo" : null,
      status: user.githubConnected ? "connected" : "none",
    },
    experimentalFeatures: user.experimentalFeatures,
    deletion: {
      href: `/profile/${user.id}/delete`,
      hasActivityInProjects,
      // UserDeletionModal: a scheduled account is deleted at once, which project activity blocks.
      blocked: user.scheduledDeletion !== null && hasActivityInProjects,
    },
  };
}
