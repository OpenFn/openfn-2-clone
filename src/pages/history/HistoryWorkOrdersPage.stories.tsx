import type { Meta, StoryObj } from "@storybook/react";
import HistoryWorkOrdersPage from "./HistoryWorkOrdersPage";
import type { WorkOrderFilters } from "../../types/history";
import { workOrdersIn } from "../../mock-data/history";
import { workflowJobs, workOrderRow } from "../../mock-data/history-extra";
import { projects } from "../../mock-data/projects";
import { workflowsIn } from "../../mock-data/workflows";
import { withCanvas, withRouter } from "../../stories/decorators";

const project = projects[0]!;
const rows = workOrdersIn(project.id).map(workOrderRow);
const filters: WorkOrderFilters = {
  workflowId: null,
  statuses: [],
  receivedAfter: null,
  receivedBefore: null,
  activityAfter: null,
  activityBefore: null,
  runStatuses: [],
  runCreatedAfter: null,
  runCreatedBefore: null,
  workorderId: null,
  errorSignature: null,
  searchTerm: "",
  searchFields: ["log"],
};
const done = async () => {};

const meta: Meta<typeof HistoryWorkOrdersPage> = {
  title: "Pages/History/HistoryWorkOrdersPage",
  component: HistoryWorkOrdersPage,
  // PageContent fills its parent, so give it a screen to fill.
  decorators: [withRouter, withCanvas("h-screen")],
  parameters: { layout: "fullscreen" },
  args: {
    project,
    projectLabel: project.name,
    channelsEnabled: false,
    workOrdersHref: `/projects/${project.id}/history`,
    channelLogsHref: `/projects/${project.id}/history/channels`,
    dataStorageHref: `/projects/${project.id}/settings#data-storage`,
    onCheckRunLimit: done,
    workflows: workflowsIn(project.id).map((w) => ({ id: w.id, name: w.name, jobs: workflowJobs(w.id) })),
    filters,
    rows,
    state: "ready",
    page: { number: 1, size: 10, totalEntries: rows.length },
    sort: { key: "last_activity", direction: "desc" },
    searchLimit: 50,
    canRunWorkflow: true,
    onCancelWorkOrder: done,
    onRetryWorkOrder: done,
    onCancelRun: done,
    onRetryStep: done,
    onBulkCancel: done,
    onBulkRetry: done,
    onExport: done,
  },
};
export default meta;
type Story = StoryObj<typeof HistoryWorkOrdersPage>;

export const Default: Story = {};
export const Loading: Story = { args: { state: "loading" } };
export const Empty: Story = { args: { rows: [], page: { number: 1, size: 10, totalEntries: 0 } } };
export const Filtered: Story = {
  args: {
    filters: {
      ...filters,
      statuses: ["failed", "crashed"],
      runStatuses: ["failed"],
      runCreatedAfter: "2026-10-14T09:00:00Z",
      errorSignature: { exitReason: "kill", errorType: "TimeoutError", jobId: null, jobName: null },
      searchTerm: "timeout",
    },
  },
};
export const ReadOnly: Story = { args: { canRunWorkflow: false } };
export const Error: Story = { args: { state: "error" } };
