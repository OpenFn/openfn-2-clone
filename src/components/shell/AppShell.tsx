import { useCallback, useState } from "react";
// eslint-disable-next-line no-restricted-imports -- wiring: the layout route reads route params and renders the route Outlet.
import { Outlet, useLocation, useParams } from "react-router-dom";
// eslint-disable-next-line no-restricted-imports -- wiring: the layout route loads the project in the URL and the picker's project tree.
import { findProject, projects } from "../../mock-data/projects";
// eslint-disable-next-line no-restricted-imports -- wiring: the shell reads the signed-in user, their permissions and instance info for the header and sidebar.
import { useCurrentUser, useInstanceInfo, usePermissions } from "../../session/session";
import RouteErrorBoundary from "./RouteErrorBoundary";
import Sidebar, { type SidebarMenu } from "./Sidebar";
import Picker from "../primitives/Picker";
import { buildProjectPickerItems } from "./projectPickerItems";

/**
 * Lightning's logged-in layout (layouts/live.html.heex, settings.html.heex):
 * the side menu, the page, and the global project picker. Admin routes
 * (/settings/*) get the gray admin menu; project routes the project menu.
 */
export default function AppShell() {
  const { pathname } = useLocation();
  const { projectId } = useParams();
  const project = findProject(projectId);
  const user = useCurrentUser();
  const { adminEmail, releaseLabel } = useInstanceInfo();
  const { canAccessAdmin } = usePermissions(project);
  const [collapsed, setCollapsed] = useState(false);
  const toggle = useCallback(() => setCollapsed((c) => !c), []);

  const menu: SidebarMenu = pathname.startsWith("/settings") ? "admin" : projectId ? "project" : "profile";

  return (
    <main className="flex h-screen">
      <Sidebar
        menu={menu}
        // The menu needs only the id, so it draws for a project the fixtures lack (one from the API).
        project={projectId ? { id: projectId } : undefined}
        user={user}
        canAccessAdmin={canAccessAdmin}
        adminEmail={adminEmail}
        releaseLabel={releaseLabel}
        collapsed={collapsed}
        onToggle={toggle}
      />
      <div className="min-w-0 flex-auto">
        <RouteErrorBoundary resetKey={pathname}>
          <Outlet />
        </RouteErrorBoundary>
      </div>
      <Picker
        items={buildProjectPickerItems(pathname, projects)}
        currentId={project?.id}
        placeholder="Search projects..."
        emptyMessage="No projects found"
        viewAllLabel="View all projects"
        viewAllHref="/projects"
        openEvent="open-project-picker"
      />
    </main>
  );
}
