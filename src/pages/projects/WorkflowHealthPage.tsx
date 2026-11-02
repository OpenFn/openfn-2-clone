import Header from "../../components/primitives/Header";
import { Centered, PageContent } from "../../components/primitives/PageContent";
import ProjectBreadcrumbs from "../../components/shell/ProjectBreadcrumbs";
import RangePicker from "../../components/projects/health/RangePicker";
import WorkflowHealth from "../../components/projects/health/WorkflowHealth";
import type { CurrentProject } from "../../types/projects";
import type { ErrorSignatures, HealthQuery, HealthRange, Outcomes, RunVolume } from "../../types/workflow-health";

/** The contract between this page and whatever feeds it (the replica wrapper, later Lightning). */
export interface WorkflowHealthPageProps {
  /** `historyRetentionPeriod` disables ranges longer than the history the project keeps. */
  project: CurrentProject & { historyRetentionPeriod: number | null };
  /** The picker's label, "parent/child" for a sandbox. */
  projectLabel: string;
  /** The workflow named in the heading and the crumbs. */
  workflow: { id: string; name: string };
  /** The range shown. The host owns it. */
  days: HealthRange["days"];
  /** Picks a range; the host stores it and refetches. */
  onDaysChange: (days: HealthRange["days"]) => void;
  /**
   * The host's HealthQuery replies, one per endpoint. Null data with no error
   * is loading; an error with no data shows the error. The page never fetches
   * or polls.
   */
  outcomes: HealthQuery<Outcomes>;
  failures: HealthQuery<ErrorSignatures>;
  runs: HealthQuery<RunVolume>;
}

/**
 * Inventory view `workflow-health` (WorkflowLive.Health), which mounts the
 * WorkflowHealth React component under Workflows › name › Health crumbs.
 * Props only: the replica feeds it fixtures, Lightning its health endpoints.
 */
export default function WorkflowHealthPage({
  project,
  projectLabel,
  workflow,
  days,
  onDaysChange,
  outcomes,
  failures,
  runs,
}: WorkflowHealthPageProps) {
  return (
    <PageContent
      header={
        <Header
          breadcrumbs={
            <ProjectBreadcrumbs
              project={project}
              label={projectLabel}
              items={[
                ["Workflows", `/projects/${project.id}/w`],
                [workflow.name, `/projects/${project.id}/w/${workflow.id}`],
              ]}
              current="Health"
            />
          }
          title={workflow.name}
        >
          <RangePicker days={days} onChange={onDaysChange} retentionDays={project.historyRetentionPeriod} />
        </Header>
      }
    >
      {/* eslint-disable-next-line local/primitive-classname -- debt: F526 box (px-4) */}
      <Centered className="px-4">
        <div id="workflow-health">
          <WorkflowHealth
            projectId={project.id}
            workflowId={workflow.id}
            days={days}
            outcomes={outcomes}
            failures={failures}
            runs={runs}
          />
        </div>
      </Centered>
    </PageContent>
  );
}
