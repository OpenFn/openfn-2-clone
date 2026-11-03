import { useEffect } from "react";
import { useRouter } from "../../routing/router";
import { cn } from "../../utils/cn";
import NavItem from "./NavItem";
import UserMenu, { type MenuUser } from "./UserMenu";
import { OpenFnLogo, OpenFnLogoCollapsed } from "./OpenFnLogo";
import Tooltip from "../primitives/Tooltip";
import Text from "../primitives/Text";

/** Which menu the side bar shows: the project's, your own pages, or the admin menu. */
export type SidebarMenu = "project" | "profile" | "admin";

export interface SidebarProps {
  menu: SidebarMenu;
  /** Required for the project menu. */
  project?: { id: string } | undefined;
  user: MenuUser;
  /** Superusers get the Admin menu in place of the support links. */
  canAccessAdmin: boolean;
  /** Address the "Support" link mails. */
  adminEmail: string;
  /** Release label under the logo. */
  releaseLabel: string;
  collapsed: boolean;
  onToggle: () => void;
}

function isAt(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(path + "/");
}

function ProjectItems({ project, user }: { project: { id: string }; user: Pick<MenuUser, "experimentalFeatures"> }) {
  const { pathname } = useRouter().useLocation();
  const base = `/projects/${project.id}`;
  return (
    <>
      <NavItem to={`${base}/w`} icon="hero-square-3-stack-3d" label="Workflows" active={isAt(pathname, `${base}/w`)} />
      {user.experimentalFeatures && (
        <NavItem
          to={`${base}/channels`}
          icon="hero-arrows-right-left"
          label="Channels"
          active={isAt(pathname, `${base}/channels`)}
        />
      )}
      <NavItem to={`${base}/sandboxes`} icon="hero-beaker" label="Sandboxes" active={isAt(pathname, `${base}/sandboxes`)} />
      <NavItem
        to={`${base}/history`}
        icon="hero-rectangle-stack"
        label="History"
        active={["history", "runs", "dataclips"].some((s) => isAt(pathname, `${base}/${s}`))}
      />
      <NavItem to={`${base}/settings`} icon="hero-cog-8-tooth" label="Settings" active={isAt(pathname, `${base}/settings`)} />
    </>
  );
}

function ProfileItems() {
  const { pathname } = useRouter().useLocation();
  return (
    <>
      <NavItem to="/projects" icon="hero-folder" label="Projects" active={pathname === "/projects"} />
      <NavItem
        to="/profile"
        icon="hero-user-circle"
        label="User Profile"
        active={isAt(pathname, "/profile") && !isAt(pathname, "/profile/tokens")}
      />
      <NavItem to="/credentials" icon="hero-key" label="Credentials" active={isAt(pathname, "/credentials")} />
      <NavItem to="/profile/tokens" icon="hero-command-line" label="API Tokens" active={isAt(pathname, "/profile/tokens")} />
    </>
  );
}

function AdminItems() {
  const { pathname } = useRouter().useLocation();
  return (
    <>
      <div className="mt-4" />
      <NavItem to="/settings/projects" icon="hero-building-library" label="Projects" active={isAt(pathname, "/settings/projects")} />
      <NavItem to="/settings/users" icon="hero-user-group" label="Users" active={isAt(pathname, "/settings/users")} />
      <NavItem
        to="/settings/authentication/new"
        icon="hero-key"
        label="Authentication"
        active={isAt(pathname, "/settings/authentication")}
      />
      <NavItem to="/settings/audit" icon="hero-archive-box" label="Audit" active={isAt(pathname, "/settings/audit")} />
      <NavItem
        to="/settings/collections"
        icon="hero-circle-stack"
        label="Collections"
        active={isAt(pathname, "/settings/collections")}
      />
      <NavItem
        to="/settings/maintenance"
        icon="hero-wrench-screwdriver"
        label="Maintenance"
        active={isAt(pathname, "/settings/maintenance")}
      />
      <div className="grow" />
      <NavItem to="/projects" icon="hero-arrow-left" label="Back" />
    </>
  );
}

/** Support links for regular users; superusers get the Admin menu instead. */
function FooterItems({ canAccessAdmin, adminEmail }: { canAccessAdmin: boolean; adminEmail: string }) {
  if (canAccessAdmin) {
    return (
      <>
        <NavItem to="/settings/projects" icon="hero-cog-6-tooth" label="Admin Menu" />
        <NavItem to="/dashboard" icon="hero-exclamation-triangle" label="Sys Info" />
      </>
    );
  }
  return (
    <>
      <NavItem href="https://docs.openfn.org" icon="hero-book-open-mini" label="Documentation" />
      <NavItem href="https://community.openfn.org" icon="hero-user-group-mini" label="Community" />
      <NavItem
        href={`mailto:${adminEmail}`}
        target="_self"
        icon="hero-lifebuoy-mini"
        label="Support"
        tooltip={adminEmail}
      />
    </>
  );
}

/** The OpenFn logo and release version at the foot of the side menu. */
export function SidebarLogo({
  releaseLabel,
  collapsed = false,
  className,
}: {
  releaseLabel: string;
  collapsed?: boolean;
  /** Placement only. */
  className?: string;
}) {
  return (
    <div className={cn("primary-light sidebar-rule border-t pt-5 text-center", className)}>
      {collapsed ? <OpenFnLogoCollapsed className="mx-auto h-6" /> : <OpenFnLogo className="mx-auto h-6" />}
      {/* eslint-disable-next-line no-restricted-syntax -- below text-xs, the smallest step on the scale */}
      <code className="block py-1 text-[8px]">{releaseLabel}</code>
    </div>
  );
}

/**
 * Lightning's side menu (layouts/live.html.heex and settings.html.heex): the
 * user menu in a dark h-20 bar, the menu items for where you are, support or
 * admin links pinned low, then the OpenFn logo, version and collapse toggle.
 * Ctrl+M collapses it. Props only: the host says who is signed in and where
 * we are.
 */
export default function Sidebar({
  menu,
  project,
  user,
  canAccessAdmin,
  adminEmail,
  releaseLabel,
  collapsed,
  onToggle,
}: SidebarProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === "m") {
        e.preventDefault();
        onToggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onToggle]);

  // Lightning's `side_menu_theme`: the admin menu is slate, the others primary.
  const theme = menu === "admin" ? "sudo-variant" : "primary-theme";

  return (
    <>
      {/* Placeholder keeps the content column from sliding under the fixed panel. */}
      <div className={cn("shrink-0 transition-all duration-200", collapsed ? "w-16" : "w-48")} />
      <div
        id="sidebar-panel"
        data-ui="sidebar"
        data-collapsed={String(collapsed)}
        className="fixed z-100 flex h-full flex-col transition-all duration-200"
      >
        <div className={cn("app-logo-container flex h-20 items-center", theme)}>
          <UserMenu user={user} />
        </div>
        <nav id="side-menu" className={cn("flex min-h-0 flex-1 flex-col", theme)}>
          <div className={cn("flex min-h-0 flex-1 flex-col overflow-y-auto", menu !== "admin" && "py-4")}>
            {menu === "admin" ? (
              <AdminItems />
            ) : (
              <>
                {menu === "project" && project ? <ProjectItems project={project} user={user} /> : <ProfileItems />}
                <div className="grow" />
                <FooterItems canAccessAdmin={canAccessAdmin} adminEmail={adminEmail} />
              </>
            )}
          </div>
          {user.experimentalFeatures && (
            <div className="sidebar-rule mt-3 border-t pt-3">
              <Tooltip
                content="You're using features that are still being built. Things may work differently for you than for your teammates."
                side="right"
              >
                {/* eslint-disable-next-line local/primitive-classname -- debt: F529 state, F525 margin, F526 box (menu-item mx-3 rounded-lg) */}
                <Text as="div" variant="label-md" className="menu-item menu-item-experimental mx-3 flex h-8 items-center rounded-lg">
                  <span className="hero-wrench-screwdriver h-5 w-5" />
                  <span className="menu-item-text truncate">Experimental</span>
                </Text>
              </Tooltip>
            </div>
          )}
          <SidebarLogo releaseLabel={releaseLabel} collapsed={collapsed} className="mt-3" />
          {/* eslint-disable-next-line no-restricted-syntax -- sidebar chrome, styled by the themes through .sidebar-toggle-btn */}
          <button
            type="button"
            onClick={onToggle}
            className="sidebar-toggle-btn sidebar-rule mt-2 flex border-t py-1.5 pl-6 transition-colors focus:outline-none"
            aria-label="Toggle sidebar"
          >
            {/* On the icon, not the button: the button spans the sidebar, so the tooltip would float off its far edge. */}
            <Tooltip content="Toggle sidebar" side="right">
              <svg className="h-5 w-5" viewBox="0 0 18 18" fill="currentColor" aria-hidden="true">
                {collapsed ? (
                  <path
                    fillRule="evenodd"
                    d="M12.54 9.154l-3.444 3.442 1.058 1.058 4.5-4.5-4.5-4.5-1.058 1.057 3.444 3.443zm-7.194-4.5v9h1.5v-9h-1.5z"
                  />
                ) : (
                  <path
                    fillRule="evenodd"
                    d="M5.46 8.846l3.444-3.442-1.058-1.058-4.5 4.5 4.5 4.5 1.058-1.057L5.46 8.84zm7.194 4.5v-9h-1.5v9h1.5z"
                  />
                )}
              </svg>
            </Tooltip>
          </button>
        </nav>
      </div>
    </>
  );
}
