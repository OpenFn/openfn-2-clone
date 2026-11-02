import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../components/primitives/Toast";
import { RouterProvider, type Router } from "../../routing/router";
import type { RunRow, StepRow, WorkOrderFilters, WorkOrderRow } from "../../types/history";
import { RequestError } from "../../utils/errors";
import { formatRelativeDetailed } from "../../utils/format";
import HistoryWorkOrdersPage, { type HistoryWorkOrdersPageProps } from "./HistoryWorkOrdersPage";
import { isDisabled } from "../../test/disabled";
import { tooltipOf } from "../../test/tooltip";

const step = (id: string, jobId: string, over: Partial<StepRow> = {}): StepRow => ({
  id,
  jobId,
  jobName: `Job ${jobId}`,
  exitReason: "success",
  errorType: null,
  startedAt: "2026-10-14T09:30:00Z",
  finishedAt: "2026-10-14T09:30:02Z",
  cloned: false,
  inputWiped: false,
  jobDeleted: false,
  href: `/projects/p1/runs/r-${id}?step=${id}`,
  inspectHref: `/projects/p1/w/w1?run=r-${id}&panel=editor&job=${jobId}#log`,
  ...over,
});

const run = (id: string, steps: StepRow[], over: Partial<RunRow> = {}): RunRow => ({
  id,
  state: "success",
  insertedAt: "2026-10-14T09:30:00Z",
  claimedAt: "2026-10-14T09:30:00Z",
  startedAt: "2026-10-14T09:30:00Z",
  finishedAt: "2026-10-14T09:30:05Z",
  updatedAt: "2026-10-14T09:30:05Z",
  href: `/projects/p1/runs/${id}`,
  steps,
  ...over,
});

const row = (id: string, over: Partial<WorkOrderRow> = {}): WorkOrderRow => ({
  id,
  workflowId: "w1",
  workflowName: "Referrals",
  state: "success",
  dataclipId: `dc-${id}`,
  dataclipWiped: false,
  insertedAt: "2026-10-14T09:29:00Z",
  lastActivity: "2026-10-14T09:30:05Z",
  runs: [run(`run-${id}`, [step(`s-${id}`, "j1")])],
  href: `/projects/p1/history?filters[workorder_id]=${id}`,
  workflowHref: `/projects/p1/w/w1?run=run-${id}`,
  dataclipHref: `/projects/p1/dataclips/dc-${id}/show`,
  ...over,
});

const filters: WorkOrderFilters = {
  workflowId: null,
  statuses: [],
  receivedAfter: null,
  receivedBefore: null,
  activityAfter: "2026-09-14T09:00:00.000Z",
  activityBefore: null,
  runStatuses: [],
  runCreatedAfter: null,
  runCreatedBefore: null,
  workorderId: null,
  errorSignature: null,
  searchTerm: "",
  searchFields: ["log"],
};

const rows = [row("a1b2c3d4-0000-0000-0000-000000000001"), row("b1b2c3d4-0000-0000-0000-000000000002")];

function renderPage(props: Partial<HistoryWorkOrdersPageProps> = {}, search = "") {
  const router: Router = { navigate: vi.fn(), useHref: (to) => to, useLocation: () => ({ pathname: "/projects/p1/history", search, hash: "" }) };
  const handlers = {
    onCancelWorkOrder: vi.fn().mockResolvedValue(undefined),
    onRetryWorkOrder: vi.fn().mockResolvedValue(undefined),
    onCancelRun: vi.fn().mockResolvedValue(undefined),
    onRetryStep: vi.fn().mockResolvedValue(undefined),
    onBulkCancel: vi.fn().mockResolvedValue(undefined),
    onBulkRetry: vi.fn().mockResolvedValue(undefined),
    onExport: vi.fn().mockResolvedValue(undefined),
    onCheckRunLimit: vi.fn().mockResolvedValue(undefined),
  };
  const page = (props: Partial<HistoryWorkOrdersPageProps>) => (
    <RouterProvider value={router}>
      <ToastProvider>
        <HistoryWorkOrdersPage
          project={{ id: "p1", parentId: null, color: null }}
          projectLabel="Malawi HIV"
          channelsEnabled={false}
          workOrdersHref="/host/work-orders"
          channelLogsHref="/host/channel-logs"
          workflows={[
            { id: "w1", name: "Referrals", jobs: [{ id: "j1", name: "Job j1" }, { id: "j2", name: "Job j2" }] },
            { id: "w2", name: "Stock", jobs: [] },
          ]}
          filters={filters}
          rows={rows}
          state="ready"
          page={{ number: 1, size: 10, totalEntries: 2 }}
          sort={{ key: "last_activity", direction: "desc" }}
          searchLimit={50}
          canRunWorkflow
          dataStorageHref="/projects/p1/settings#data-storage"
          {...handlers}
          {...props}
        />
      </ToastProvider>
    </RouterProvider>
  );
  const { rerender } = render(page(props));
  return { router, ...handlers, rerender: (next: Partial<HistoryWorkOrdersPageProps>) => rerender(page(next)) };
}

/** The query of the URL the page last navigated to. */
const lastQuery = (router: Router) => new URL(vi.mocked(router.navigate).mock.lastCall![0], "http://x").searchParams;
const rowOf = (id: string) => document.getElementById(`toggle_details_for_${id}`)!;
const chip = (id: string) => document.getElementById(id)!;
const tick = (id: string) => userEvent.click(document.getElementById(`select_${id}`)!);
const many = { number: 1, size: 2, totalEntries: 7 };

const buttonLabels = (dialog: HTMLElement) => within(dialog).getAllByRole("button").map((b) => b.textContent ?? "");

/** Opens a bulk action's modal, reads it (by default, the labels of its buttons) and closes it again. */
async function bulkOffers<T = string[]>(action: string, read: (dialog: HTMLElement) => T = buttonLabels as (dialog: HTMLElement) => T) {
  await userEvent.click(screen.getByRole("button", { name: action }));
  const dialog = await screen.findByRole("dialog");
  const labels = read(dialog);
  await userEvent.click(within(dialog).getByRole("button", { name: "Close" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  return labels;
}
const matching = (labels: string[]) => labels.filter((l) => l.includes("matching"));

describe("HistoryWorkOrdersPage", () => {
  it("lists the work orders with the host's links", () => {
    renderPage();
    const first = rowOf(rows[0]!.id);
    expect(within(first).getByRole("link", { name: "a1b2c3d4" }).getAttribute("href")).toBe(rows[0]!.href);
    expect(within(first).getByRole("link", { name: "Referrals" }).getAttribute("href")).toBe(rows[0]!.workflowHref);
    expect(within(first).getByRole("link", { name: /^dc-a1b2/ }).getAttribute("href")).toBe(rows[0]!.dataclipHref);
    expect(screen.getByText(/Showing/).textContent).toContain("1 to 2 of 2");
    expect(screen.getByRole("button", { name: "Export all 2 results matching your query" })).toBeTruthy();
  });

  it("opens a row to its runs and steps, and reruns a step", async () => {
    const { onRetryStep } = renderPage();
    await userEvent.click(rowOf(rows[0]!.id));
    const runCard = document.getElementById(`run_run-${rows[0]!.id}`)!;
    expect(within(runCard).getByRole("link", { name: "Job j1" }).getAttribute("href")).toBe(rows[0]!.runs[0]!.steps[0]!.href);
    expect(within(runCard).getByRole("link", { name: "Inspect this step" }).getAttribute("href")).toContain("#log");
    await userEvent.click(within(runCard).getByRole("button", { name: "Run this step with the latest version of this workflow" }));
    expect(onRetryStep).toHaveBeenCalledWith(`run-${rows[0]!.id}`, `s-${rows[0]!.id}`);
  });

  it("opens the work order the URL filters to, with every run", () => {
    const wo = row("c1", { runs: [run("new", [step("s2", "j1")]), run("old", [step("s1", "j1")])] });
    renderPage({ rows: [wo], filters: { ...filters, workorderId: "c1" } });
    expect(document.getElementById("run_new")).toBeTruthy();
    expect(document.getElementById("run_old")).toBeTruthy();
    expect(chip("workorder-id-filter-chip").textContent).toContain("Work order: c1");
  });

  it("writes every filter to the URL on a change, so the rest are kept, and starts at page 1", async () => {
    const { router } = renderPage({}, "?page=3");
    await userEvent.click(within(chip("workflow-filter-chip")).getByRole("button", { name: /Workflow is any/ }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Stock" }));
    const q = lastQuery(router);
    expect(q.get("filters[workflow_id]")).toBe("w2");
    expect(q.get("filters[date_after]")).toBe(filters.activityAfter);
    expect(q.get("filters[log]")).toBe("true");
    expect(q.get("filters[sort_by]")).toBe("last_activity");
    expect(q.get("page")).toBeNull();
  });

  it("names the date, run and error signature filters, and clears the run status ones", async () => {
    const { router } = renderPage(
      {
        filters: {
          ...filters,
          activityAfter: "2026-10-01T00:00:00Z",
          runStatuses: ["failed", "crashed"],
          runCreatedAfter: "2026-10-14T09:00:00Z",
          runCreatedBefore: "2026-10-14T10:00:00Z",
          errorSignature: { exitReason: "kill", errorType: "TimeoutError", jobId: "j9", jobName: "Load" },
        },
      },
      "?filters[run_status][]=failed&filters[run_status][]=crashed"
    );
    expect(chip("activity-filter-chip").textContent).toContain("Last activity after 1-Oct");
    expect(chip("run-status-filter-chip").textContent).toContain("Run status: Failed, Crashed");
    expect(chip("run-dates-filter-chip").textContent).toContain("Run created 14-Oct 09:00 – 14-Oct 10:00 UTC");
    expect(chip("error-signature-filter-chip").textContent).toContain("kill:TimeoutError @ Load");

    await userEvent.click(within(chip("run-status-filter-chip")).getByRole("button", { name: /clear/i }));
    expect(lastQuery(router).getAll("filters[run_status][]")).toEqual([]);
  });

  it("links the sortable columns to the URL that re-sorts them", () => {
    renderPage();
    const sortLink = (name: string) => new URL(screen.getByRole("link", { name }).getAttribute("href")!, "http://x").searchParams;
    expect(sortLink("Created").get("filters[sort_by]")).toBe("inserted_at");
    expect(sortLink("Created").get("filters[sort_direction]")).toBe("desc");
    expect(sortLink("Last Activity").get("filters[sort_direction]")).toBe("asc");
    expect(sortLink("Created").get("filters[date_after]")).toBe(filters.activityAfter);
  });

  it("counts a search, with + at the limit", () => {
    renderPage({ filters: { ...filters, searchTerm: "boom" }, page: { number: 1, size: 10, totalEntries: 50 } });
    expect(screen.getByText(/work orders with runs matching/).textContent).toContain('50+ work orders with runs matching "boom" (try more specific filters)');
  });

  it("shows the loading and failed searches in the table", () => {
    const { rerender } = renderPage({ state: "loading" });
    expect(screen.getByText("Loading work orders ...")).toBeTruthy();
    expect(rowOf(rows[0]!.id)).toBeNull();
    rerender({ state: "error" });
    expect(screen.getByText("There was an error loading the work orders")).toBeTruthy();
    expect(rowOf(rows[0]!.id)).toBeNull();
  });

  it("retries the ticked work orders", async () => {
    const { onBulkRetry } = renderPage();
    await userEvent.click(document.getElementById(`select_${rows[0]!.id}`)!);
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    await userEvent.click(screen.getByRole("button", { name: "Rerun 1 selected work order from start" }));
    expect(onBulkRetry).toHaveBeenCalledWith([rows[0]!.id], null);
  });

  it("cancels every matching work order when the whole page of many is ticked", async () => {
    const { onBulkCancel } = renderPage({ rows: rows.map((r) => ({ ...r, state: "pending" as const })), page: many });
    await userEvent.click(document.getElementById("select_all")!);
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(await screen.findByRole("button", { name: "Cancel up to 2 selected" })).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Cancel up to 7 matching" }));
    expect(onBulkCancel).toHaveBeenCalledWith("all");
  });

  it("retries the selected or every matching work order when the whole page of many is ticked", async () => {
    const { onBulkRetry, onCheckRunLimit } = renderPage({ page: many });
    await userEvent.click(document.getElementById("select_all")!);
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onCheckRunLimit).toHaveBeenCalledWith(2);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "Rerun 2 selected work orders from start" })).toBeTruthy();
    await userEvent.click(within(dialog).getByRole("button", { name: "Rerun all 7 matching work orders from start" }));
    expect(onBulkRetry).toHaveBeenCalledWith("all", null);
  });

  it("says the search in words when the whole page is ticked", async () => {
    renderPage({ filters: { ...filters, workflowId: "w1", statuses: ["failed"] }, page: many });
    await userEvent.click(document.getElementById("select_all")!);
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(screen.getByText(/You've selected all 2 work orders from page 1 of 4/).textContent).toContain(
      "for Referrals workflow, which was last run after 14/9/26 at 9:00am, having a status of 'Failed'"
    );
  });

  it("retries from a job the selected last runs reached, and disables the others", async () => {
    const { onBulkRetry } = renderPage();
    await userEvent.click(document.getElementById(`select_${rows[0]!.id}`)!);
    await userEvent.click(document.getElementById(`select_${rows[1]!.id}`)!);
    await userEvent.click(screen.getByRole("button", { name: "Retry from" }));
    expect((screen.getByLabelText("Job j2") as HTMLInputElement).disabled).toBe(true);
    await userEvent.click(screen.getByRole("button", { name: "Rerun 2 selected work orders from selected job" }));
    expect(onBulkRetry).toHaveBeenCalledWith([rows[0]!.id, rows[1]!.id], "j1");
  });

  it("toasts a refused row action", async () => {
    const { onRetryWorkOrder } = renderPage();
    onRetryWorkOrder.mockRejectedValueOnce(new RequestError("Runs for deleted workflows cannot be retried"));
    await userEvent.click(within(rowOf(rows[0]!.id)).getByRole("button", { name: "Retry (run from the start)" }));
    expect(onRetryWorkOrder).toHaveBeenCalledWith(rows[0]!.id);
    await waitFor(() => expect(screen.getByText("Runs for deleted workflows cannot be retried")).toBeTruthy());
  });

  it("keeps the bulk modal open with the reason when the host refuses", async () => {
    const { onBulkRetry } = renderPage();
    onBulkRetry.mockRejectedValueOnce(new RequestError("You have reached your run limit"));
    await userEvent.click(document.getElementById(`select_${rows[0]!.id}`)!);
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    await userEvent.click(screen.getByRole("button", { name: "Rerun 1 selected work order from start" }));
    expect(await screen.findByText("You have reached your run limit")).toBeTruthy();
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("doesn't retry a running work order, alone or in a selection", async () => {
    const running = row("r1", { state: "running" });
    renderPage({ rows: [running, rows[0]!] });
    expect(within(rowOf("r1")).queryByRole("button", { name: "Retry (run from the start)" })).toBeNull();
    await userEvent.click(document.getElementById("select_r1")!);
    await userEvent.click(document.getElementById(`select_${rows[0]!.id}`)!);
    expect(isDisabled(screen.getByRole("button", { name: "Retry" }))).toBe(true);
  });

  it("links the tabs where the host says, and leaves them out without channels", () => {
    const { rerender } = renderPage({ channelsEnabled: true });
    expect(screen.getByRole("tab", { name: "Work Orders" }).getAttribute("href")).toBe("/host/work-orders");
    expect(screen.getByRole("tab", { name: "Channel Logs" }).getAttribute("href")).toBe("/host/channel-logs");
    rerender({ channelsEnabled: false });
    expect(screen.queryByRole("tab")).toBeNull();
  });

  it("says why a wiped input can't be rerun, and where to change the policy", async () => {
    const { rerender } = renderPage({ rows: [row("w1", { dataclipWiped: true })] });
    await userEvent.hover(document.getElementById("select_w1")!.parentElement!);
    const link = await screen.findByRole("link", { name: "Go to data storage settings" });
    expect(link.getAttribute("href")).toBe("/projects/p1/settings#data-storage");
    await userEvent.unhover(document.getElementById("select_w1")!.parentElement!);

    rerender({ rows: [row("w1", { dataclipWiped: true })], dataStorageHref: null });
    await userEvent.hover(document.getElementById("select_w1")!.parentElement!);
    expect((await screen.findAllByText(/contact one of your project admins/)).length).toBeGreaterThan(0);
  });

  it("checks the run limit before opening Retry, and says the refusal instead", async () => {
    const { onCheckRunLimit } = renderPage();
    onCheckRunLimit.mockRejectedValueOnce(new RequestError("You have reached your run limit"));
    await userEvent.click(document.getElementById(`select_${rows[0]!.id}`)!);
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onCheckRunLimit).toHaveBeenCalledWith(1);
    expect(await screen.findByText("You have reached your run limit")).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("follows the URL: the search box and the work order it points at", () => {
    const wo = row("c1", { runs: [run("new", [step("s2", "j1")]), run("old", [step("s1", "j1")])] });
    const { rerender } = renderPage({ rows: [wo], filters: { ...filters, searchTerm: "first" } });
    expect((screen.getByPlaceholderText("Search work orders...") as HTMLInputElement).value).toBe("first");
    expect(document.getElementById("run_new")).toBeNull();

    rerender({ rows: [wo], filters: { ...filters, searchTerm: "second", workorderId: "c1" } });
    expect((screen.getByPlaceholderText("Search work orders...") as HTMLInputElement).value).toBe("second");
    expect(document.getElementById("run_old")).toBeTruthy();
  });

  it("writes a ticked status and a cleared error signature to the URL", async () => {
    const { router } = renderPage({
      filters: { ...filters, errorSignature: { exitReason: "kill", errorType: "TimeoutError", jobId: "j9", jobName: null } },
    });
    await userEvent.click(within(chip("status-filter-chip")).getByRole("button", { name: /Status is any/ }));
    await userEvent.click(screen.getByLabelText("Failed"));
    expect(lastQuery(router).get("filters[failed]")).toBe("true");
    expect(lastQuery(router).get("filters[error_signature_exit_reason]")).toBe("kill");

    await userEvent.click(within(chip("error-signature-filter-chip")).getByRole("button", { name: /clear/i }));
    const q = lastQuery(router);
    expect(["exit_reason", "error_type", "job_id"].map((k) => q.get(`filters[error_signature_${k}]`))).toEqual([null, null, null]);
  });

  it("writes a date range to the URL", async () => {
    const { router } = renderPage();
    await userEvent.click(within(chip("received-filter-chip")).getByRole("button", { name: /Received any time/ }));
    await userEvent.type(screen.getByLabelText("Received After"), "2026-10-01T08:30");
    expect(lastQuery(router).get("filters[wo_date_after]")).toBe("2026-10-01T08:30");
  });

  it("writes the search and the fields it searches to the URL", async () => {
    const { router } = renderPage();
    await userEvent.type(screen.getByPlaceholderText("Search work orders..."), "boom");
    await userEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(lastQuery(router).get("filters[search_term]")).toBe("boom");

    await userEvent.click(screen.getByRole("button", { name: "Include IDs" }));
    const q = lastQuery(router);
    expect(q.get("filters[id]")).toBe("true");
    expect(q.get("filters[log]")).toBe("true");
  });

  it.each([
    { when: "once a row of a page of many is unticked", page: many, untick: true, retry: "Rerun 1 selected work order from start", cancel: "Cancel up to 1 selected" },
    { when: "when the whole of a single page is ticked", page: { number: 1, size: 10, totalEntries: 2 }, untick: false, retry: "Rerun 2 selected work orders from start", cancel: "Cancel up to 2 selected" },
  ])("offers only the ticked work orders $when", async ({ page, untick, retry, cancel }) => {
    const { rerender } = renderPage({ page });
    await userEvent.click(document.getElementById("select_all")!);
    if (untick) await tick(rows[1]!.id);
    const retryOffers = await bulkOffers("Retry");
    expect(retryOffers).toContain(retry);
    expect(matching(retryOffers)).toEqual([]);
    expect(matching(await bulkOffers("Retry from"))).toEqual([]);

    rerender({ page, rows: rows.map((r) => ({ ...r, state: "pending" as const })) });
    const cancelOffers = await bulkOffers("Cancel");
    expect(cancelOffers).toContain(cancel);
    expect(matching(cancelOffers)).toEqual([]);
  });

  it("retries every matching work order from a job when the whole page of many is ticked", async () => {
    const { onBulkRetry } = renderPage({ page: many });
    await userEvent.click(document.getElementById("select_all")!);
    await userEvent.click(screen.getByRole("button", { name: "Retry from" }));
    await userEvent.click(await screen.findByRole("button", { name: "Rerun all 7 matching work orders from selected job" }));
    expect(onBulkRetry).toHaveBeenCalledWith("all", "j1");
  });

  it("offers Retry from only for one workflow, with that workflow's jobs", async () => {
    const stock = row("x1", { workflowId: "w2", workflowName: "Stock", runs: [run("run-x1", [step("s-x1", "j3")])] });
    renderPage({
      rows: [rows[0]!, stock],
      workflows: [
        { id: "w1", name: "Referrals", jobs: [{ id: "j1", name: "Job j1" }] },
        { id: "w2", name: "Stock", jobs: [{ id: "j3", name: "Job j3" }] },
      ],
    });
    const jobsOffered = () =>
      bulkOffers("Retry from", (dialog) => ["Job j1", "Job j3"].filter((name) => within(dialog).queryByLabelText(name)));

    await tick("x1");
    expect(await jobsOffered()).toEqual(["Job j3"]);
    await tick("x1");
    await tick(rows[0]!.id);
    expect(await jobsOffered()).toEqual(["Job j1"]);
    await tick("x1");
    expect(screen.queryByRole("button", { name: "Retry from" })).toBeNull();
  });

  it("disables a job whose step in the last run has lost its input", async () => {
    const wo = row("c1", { runs: [run("r1", [step("s1", "j1"), step("s2", "j2", { inputWiped: true })])] });
    renderPage({ rows: [wo] });
    await tick("c1");
    await userEvent.click(screen.getByRole("button", { name: "Retry from" }));
    expect(isDisabled(((await screen.findByLabelText("Job j1")) as HTMLInputElement))).toBe(false);
    expect((screen.getByLabelText("Job j2") as HTMLInputElement).disabled).toBe(true);
  });

  it("disables Cancel and Retry for a mix of pending and finished work orders, and select-all with no rows", async () => {
    const { rerender } = renderPage({ rows: [row("p1", { state: "pending" }), row("f1", { state: "failed" })] });
    await userEvent.click(document.getElementById("select_all")!);
    expect(isDisabled(screen.getByRole("button", { name: "Cancel" }))).toBe(true);
    expect(isDisabled(screen.getByRole("button", { name: "Retry" }))).toBe(true);

    rerender({ rows: [] });
    expect((document.getElementById("select_all") as HTMLInputElement).disabled).toBe(true);
  });

  it("counts the page as all ticked with a wiped row on it, and clears it on the next click", async () => {
    renderPage({ rows: [row("a"), row("b"), row("x", { dataclipWiped: true })], page: many });
    const all = document.getElementById("select_all") as HTMLInputElement;
    await userEvent.click(all);
    expect([all.checked, all.indeterminate]).toEqual([true, false]);
    expect(matching(await bulkOffers("Retry"))).toHaveLength(1);

    await userEvent.click(all);
    expect(["a", "b"].map((id) => (document.getElementById(`select_${id}`) as HTMLInputElement).checked)).toEqual([false, false]);
  });

  it("says every kind of search in words", async () => {
    const { rerender } = renderPage({ page: many });
    await userEvent.click(document.getElementById("select_all")!);
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    const words = (f: Partial<WorkOrderFilters>) => {
      rerender({ page: many, filters: { ...filters, activityAfter: null, ...f } });
      return screen.getByText(/You've selected all 2 work orders/).textContent;
    };
    const [jan, apr] = ["2023-01-01T16:20:00Z", "2023-04-01T08:05:00Z"];

    expect(words({ statuses: ["success", "failed"] })).toContain("having a status of either 'Success' or 'Failed'");
    expect(words({ searchTerm: "TestSearch", searchFields: ["body"] })).toContain("whose run Input contain TestSearch");
    expect(words({ searchTerm: "TestSearch", searchFields: ["body", "log"] })).toContain("whose run Input and Logs contain TestSearch");
    expect(words({ activityBefore: apr })).toContain("which was last run before 1/4/23 at 8:05am");
    expect(words({ activityAfter: jan, activityBefore: apr })).toContain("which was last run between 1/4/23 at 8:05am and 1/1/23 at 4:20pm");
    expect(words({ receivedAfter: apr })).toContain("received after 1/4/23 at 8:05am");
    expect(words({ receivedBefore: apr })).toContain("received before 1/4/23 at 8:05am");
    expect(words({ receivedAfter: jan, receivedBefore: apr })).toContain("received between 1/4/23 at 8:05am and 1/1/23 at 4:20pm");
    expect(words({ workflowId: null })).not.toContain("workflow");
    expect(words({ workflowId: "not-in-this-project" })).not.toContain("workflow");
  });

  it("names the chosen workflow and statuses, and clears the workflow", async () => {
    const { router, rerender } = renderPage({ filters: { ...filters, workflowId: "w1", statuses: ["failed"] } });
    expect(chip("workflow-filter-chip").textContent).toContain("Workflow is Referrals");
    expect(chip("status-filter-chip").textContent).toContain("Status is Failed");
    await userEvent.click(within(chip("workflow-filter-chip")).getByRole("button", { name: /clear/i }));
    expect(lastQuery(router).get("filters[workflow_id]")).toBeNull();
    expect(lastQuery(router).get("filters[failed]")).toBe("true");

    rerender({ filters: { ...filters, statuses: ["failed", "success"] } });
    expect(chip("status-filter-chip").textContent).toContain("Status in Success, Failed");
  });

  it("names the received dates, and clears them", async () => {
    const { router } = renderPage({ filters: { ...filters, receivedAfter: "2025-01-01T00:00:00Z" } });
    expect(chip("received-filter-chip").textContent).toContain("Received after 1-Jan-2025");
    await userEvent.click(within(chip("received-filter-chip")).getByRole("button", { name: /clear/i }));
    expect(lastQuery(router).get("filters[wo_date_after]")).toBeNull();
  });

  it("names an error signature by its job's short id when the job has no name, and leaves out what isn't set", () => {
    const sig = { exitReason: "fail", errorType: null, jobId: "9f8e7d6c-1111-2222-3333-444444444444", jobName: null };
    const { rerender } = renderPage({ filters: { ...filters, errorSignature: sig } });
    expect(chip("error-signature-filter-chip").textContent).toBe("fail @ 9f8e7d6c");

    rerender({ filters: { ...filters, errorSignature: { ...sig, exitReason: "lost", jobId: null } } });
    expect(chip("error-signature-filter-chip").textContent).toBe("lost");
  });

  it("shows the error signature and run chips only for the filters set", () => {
    const shown = () => ["error-signature-filter-chip", "run-status-filter-chip", "run-dates-filter-chip"].filter((id) => document.getElementById(id));
    const { rerender } = renderPage();
    expect(shown()).toEqual([]);

    rerender({ filters: { ...filters, runStatuses: ["success"] } });
    expect(shown()).toEqual(["run-status-filter-chip"]);
    expect(chip("run-status-filter-chip").textContent).toContain("Run status: Success");

    rerender({ filters: { ...filters, runCreatedAfter: "2026-10-14T09:00:00Z" } });
    expect(shown()).toEqual(["run-dates-filter-chip"]);
    expect(chip("run-dates-filter-chip").textContent).toContain("Run created after 14-Oct 09:00 UTC");
  });

  it("offers Cancel on a pending work order and Retry on a finished one, and says each one's state", () => {
    renderPage({ rows: [row("p1", { state: "pending" }), row("f1", { state: "failed" }), row("r1", { state: "running" }), row("x1", { state: "rejected" })] });
    expect(["p1", "f1", "x1"].map((id) => within(rowOf(id)).getByText(/^(Enqueued|Failed|Rejected)$/).textContent)).toEqual(["Enqueued", "Failed", "Rejected"]);
    expect(within(rowOf("r1")).queryByRole("button", { name: "Cancel pending run" })).toBeNull();
    expect(within(rowOf("p1")).getByRole("button", { name: "Cancel pending run" })).toBeTruthy();
    expect(within(rowOf("p1")).queryByRole("button", { name: "Retry (run from the start)" })).toBeNull();
    expect(within(rowOf("f1")).getByRole("button", { name: "Retry (run from the start)" })).toBeTruthy();
    expect(within(rowOf("f1")).queryByRole("button", { name: "Cancel pending run" })).toBeNull();
  });

  it("cancels a run still waiting for a worker, and offers no cancel once a worker has claimed it", async () => {
    const waiting = run("waiting", [], { state: "available" });
    const claimed = run("claimed", [], { state: "claimed" });
    const { onCancelRun } = renderPage({ rows: [row("c1", { state: "pending", runs: [waiting, claimed] })], filters: { ...filters, workorderId: "c1" } });
    expect(within(document.getElementById("run_claimed")!).queryByRole("button", { name: "Cancel this run" })).toBeNull();
    await userEvent.click(within(document.getElementById("run_waiting")!).getByRole("button", { name: "Cancel this run" }));
    expect(onCancelRun).toHaveBeenCalledWith("waiting");
  });

  it("offers every status to filter by and the fields to search, as the URL has them", async () => {
    renderPage();
    for (const label of ["Include IDs", "Include dataclip names", /^Include inputs/, "Include run logs"])
      expect(screen.getByRole("button", { name: label }).getAttribute("aria-pressed")).toBe(String(label === "Include run logs"));
    await userEvent.click(within(chip("status-filter-chip")).getByRole("button", { name: /Status is any/ }));
    const statuses = ["Enqueued", "Running", "Success", "Failed", "Crashed", "Cancelled", "Killed", "Exception", "Lost", "Rejected"];
    expect(statuses.filter((label) => (screen.getByLabelText(label) as HTMLInputElement).checked)).toEqual([]);
  });

  it("starts no runs for a viewer who can't run workflows", async () => {
    renderPage({ canRunWorkflow: false, rows: [row("p1", { state: "pending" }), row("f1", { state: "failed" })] });
    expect(within(rowOf("p1")).queryByRole("button", { name: "Cancel pending run" })).toBeNull();
    const retry = within(rowOf("f1")).getByRole("button", { name: "Retry (run from the start)" });
    expect(isDisabled(retry)).toBe(true);
    expect(await tooltipOf(retry)).toBe("You are not authorized to start runs for this project.");
    expect(screen.queryByRole("button", { name: /^Export all/ })).toBeNull();

    await userEvent.click(rowOf("f1"));
    expect(within(document.getElementById("step-s-f1")!).getByRole("link", { name: "Job j1" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Run this step with the latest version of this workflow" })).toBeNull();
  });

  it("keeps a wiped work order out of the selection, and says why its input can't be opened", async () => {
    renderPage({ rows: [rows[0]!, row("w1", { dataclipWiped: true })] });
    expect((document.getElementById("select_w1") as HTMLInputElement).disabled).toBe(true);
    await userEvent.click(document.getElementById("select_all")!);
    expect(await bulkOffers("Retry")).toContain("Rerun 1 selected work order from start");

    expect(within(rowOf("w1")).queryByRole("link", { name: "dc-w1" })).toBeNull();
    await userEvent.hover(within(rowOf("w1")).getByText("dc-w1"));
    expect(await screen.findByText(/The input dataclip is unavailable/)).toBeTruthy();
  });

  it("says why a step whose input was lost can't be rerun, and where to change the policy", async () => {
    const wo = row("c1", { runs: [run("r1", [step("s1", "j1", { inputWiped: true })])] });
    const { rerender } = renderPage({ rows: [wo] });
    await userEvent.click(rowOf("c1"));
    const rerun = () => within(document.getElementById("step-s1")!).getByRole("button", { name: "Run this step with the latest version of this workflow" });
    expect((rerun() as HTMLButtonElement).disabled).toBe(true);
    await userEvent.hover(rerun().parentElement!);
    expect((await screen.findByRole("link", { name: "Go to data storage settings" })).getAttribute("href")).toBe("/projects/p1/settings#data-storage");
    await userEvent.unhover(rerun().parentElement!);

    rerender({ rows: [wo], dataStorageHref: null });
    await userEvent.hover(rerun().parentElement!);
    expect(await screen.findByText(/contact one of your project admins/)).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Go to data storage settings" })).toBeNull();
  });

  it("opens a row to its latest run, says when each run reached its state, and shows and hides the earlier ones", async () => {
    const latest = run("new", [step("s2", "j1")], { state: "started", startedAt: "2026-10-14T09:40:00Z" });
    const earlier = run("old", [step("s1", "j1")], { state: "claimed", claimedAt: "2026-10-14T09:20:00Z" });
    renderPage({ rows: [row("c1", { runs: [latest, earlier] })] });
    await userEvent.click(rowOf("c1"));
    expect(document.getElementById("run_new")!.textContent).toContain(`started ${formatRelativeDetailed(latest.startedAt!)}`);
    expect(document.getElementById("run_old")).toBeNull();

    await userEvent.click(screen.getByRole("link", { name: "show previous" }));
    expect(document.getElementById("run_old")!.textContent).toContain(`claimed ${formatRelativeDetailed(earlier.claimedAt!)}`);
    await userEvent.click(screen.getByRole("link", { name: "hide previous" }));
    expect(document.getElementById("run_old")).toBeNull();
  });

  it("marks a step reused from an earlier run", async () => {
    const wo = row("c1", { runs: [run("r1", [step("s1", "j1", { cloned: true }), step("s2", "j2")])] });
    renderPage({ rows: [wo] });
    await userEvent.click(rowOf("c1"));
    const marker = /originally executed in a previous run/;
    expect(within(document.getElementById("step-s1")!).getByRole("img", { name: marker })).toBeTruthy();
    expect(within(document.getElementById("step-s2")!).queryByRole("img", { name: marker })).toBeNull();
  });
});
