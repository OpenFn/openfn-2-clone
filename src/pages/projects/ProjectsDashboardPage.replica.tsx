import { useProjectSaves, useProjectsOverview } from "../../api/projects";
import { useToast } from "../../components/primitives/Toast";
import ProjectsDashboardPage from "./ProjectsDashboardPage";

/**
 * The replica's side of ProjectsDashboardPage: the greeting's name, the
 * projects and their counts come from Lightning's API (or its stand-in), and
 * the success toast is Lightning's flash. Lightning replaces this file with a
 * LiveView wrapper.
 */
export default function ProjectsDashboardPageReplica() {
  const toast = useToast();
  const overview = useProjectsOverview();
  const saves = useProjectSaves();

  return (
    <ProjectsDashboardPage
      {...overview}
      onCreate={async (project) => {
        await saves.onCreate(project);
        toast("Project created successfully");
      }}
    />
  );
}
