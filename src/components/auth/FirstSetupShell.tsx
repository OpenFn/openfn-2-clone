import type { ReactNode } from "react";
import { SidebarLogo } from "../shell/Sidebar";

/**
 * The logged-in live layout as it renders during first setup
 * (layouts/live.html.heex with `is_first_setup`): the side menu is there but
 * empty (no user menu, no items, no project picker), just the footer logo.
 */
export default function FirstSetupShell({ releaseLabel, children }: { releaseLabel: string; children: ReactNode }) {
  return (
    <main className="flex h-screen">
      <div className="w-48 shrink-0" />
      <div id="sidebar-panel" data-ui="sidebar" className="fixed z-100 flex h-full w-48 flex-col">
        <div className="app-logo-container h-20" />
        <nav id="side-menu" className="flex flex-1 flex-col justify-end overflow-hidden">
          <SidebarLogo releaseLabel={releaseLabel} />
          <div className="sidebar-rule mt-2 h-8 border-t" />
        </nav>
      </div>
      <div className="min-w-0 flex-auto">{children}</div>
    </main>
  );
}
