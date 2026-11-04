import { useState } from "react";
import AsyncBoundary from "../../components/primitives/AsyncBoundary";
import Button from "../../components/primitives/Button";
import Header from "../../components/primitives/Header";
import { Centered, PageContent } from "../../components/primitives/PageContent";
import CreateProjectModal from "../../components/projects/CreateProjectModal";
import ProjectsTable from "../../components/projects/ProjectsTable";
import WelcomeBanner from "../../components/projects/WelcomeBanner";
import type { ResourceStatus } from "../../types/resource";
import type { ProjectOverview } from "../../types/workflows";

/** The contract between this page and whatever feeds it (the replica wrapper, later Lightning). */
export interface ProjectsDashboardPageProps {
  /** The signed-in user's first name, for the greeting. */
  firstName: string;
  /** The user's projects with their counts, as the server lists them; the table sorts them. */
  projects: ProjectOverview[];
  /**
   * Creates a project. Rejects on failure; field errors keyed `rawName` and
   * `description` show on the form. The host announces success.
   */
  onCreate: (project: { name: string; description: string }) => Promise<void>;
  /** While the host loads the projects, or why it couldn't (STANDARDS pattern 5). Leave it out when the data arrives with the page. */
  status?: ResourceStatus;
}

/**
 * Inventory view `projects-dashboard` (DashboardLive.Index): the greeting,
 * the user's projects, and the Create project modal. Props only, so it can
 * run unchanged in Lightning; the replica's data and toasts live in
 * ProjectsDashboardPage.replica.tsx.
 */
export default function ProjectsDashboardPage({ firstName, projects, onCreate, status = { state: "ready" } }: ProjectsDashboardPageProps) {
  const [creating, setCreating] = useState(false);

  return (
    <PageContent
      header={
        // With no projects, Lightning shows only the empty state's "Create a new one.": no count, no second button.
        <Header title="Projects" count={projects.length || undefined}>
          {projects.length > 0 && (
            <Button id="open-create-project-modal-button" onClick={() => setCreating(true)}>
              Create project
            </Button>
          )}
        </Header>
      }
    >
      <Centered>
        <div className="-mt-6">
          <AsyncBoundary status={status}>
            <WelcomeBanner firstName={firstName} />
            <div id="user-projects-section">
              <ProjectsTable
                projects={projects}
                onCreate={() => setCreating(true)}
              />
            </div>
          </AsyncBoundary>
          <CreateProjectModal open={creating} onClose={() => setCreating(false)} onCreate={onCreate} />
        </div>
      </Centered>
    </PageContent>
  );
}
