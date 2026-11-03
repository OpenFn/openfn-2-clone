import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RouterProvider, type Router } from "../../routing/router";
import type { LogLine, RunDetail, RunStep } from "../../types/history";
import { RequestError } from "../../utils/errors";
import { ToastProvider } from "../../components/primitives/Toast";
import RunShowPage from "./RunShowPage";
import { tooltipOf } from "../../test/tooltip";

const RUN_ID = "5e9a1c2b-1111-4a4a-8b8b-0123456789ab";
const WO_ID = "7c1d2e3f-2222-4a4a-8b8b-0123456789ab";
const DC_IN = "9a8b7c6d-3333-4a4a-8b8b-0123456789ab";
const DC_OUT = "1f2e3d4c-4444-4a4a-8b8b-0123456789ab";

const run: RunDetail = {
  id: RUN_ID,
  workOrderId: WO_ID,
  state: "started",
  startedBy: "Webhook trigger",
  insertedAt: "2026-10-14T09:30:00Z",
  startedAt: "2026-10-14T09:30:01Z",
  finishedAt: null,
  finalDataclipId: null,
  snapshot: { id: "abcdef1234", lockVersion: 2, insertedAt: "2026-10-13T08:00:00Z" },
};

const workflow = { id: "wf-1", name: "Register patients", lockVersion: 2 };

const steps: RunStep[] = [
  {
    id: "step-a",
    jobId: "job-a",
    jobName: "Map to FHIR",
    exitReason: "success",
    startedAt: "2026-10-14T09:30:01Z",
    finishedAt: "2026-10-14T09:30:02Z",
    insertedAt: "2026-10-14T09:30:01Z",
    inputDataclipId: DC_IN,
    outputDataclipId: DC_OUT,
    snapshotLockVersion: 2,
  },
  {
    id: "step-b",
    jobId: "job-b",
    jobName: "Post to OpenHIM",
    exitReason: null,
    startedAt: "2026-10-14T09:30:02Z",
    finishedAt: null,
    insertedAt: "2026-10-14T09:29:00Z",
    inputDataclipId: DC_OUT,
    outputDataclipId: null,
    snapshotLockVersion: 1,
  },
];

const logs: LogLine[] = [
  { timestamp: "2026-10-14T09:30:01.100Z", source: "R/T", level: "info", message: "Starting operation 1" },
  { timestamp: "2026-10-14T09:30:01.200Z", source: "JOB", level: "debug", message: "mapping", stepId: "step-a" },
];

function renderPage(props: Partial<React.ComponentProps<typeof RunShowPage>> = {}, initialHash = "") {
  let hash = initialHash;
  const router: Router = {
    // Moves the hash the way a real router would.
    navigate: vi.fn((to: string) => {
      const i = to.indexOf("#");
      goTo(i < 0 ? "" : to.slice(i));
    }),
    useHref: (to) => to,
    useLocation: () => ({ pathname: `/projects/p1/runs/${RUN_ID}`, search: "?step=step-a", hash }),
  };
  const onCancel = vi.fn(() => Promise.resolve());
  const onLogLevelChange = vi.fn();
  const page = () => (
    <RouterProvider value={router}>
      <ToastProvider>
        <RunShowPage
          project={{ id: "p1", parentId: null, color: null }}
          projectLabel="Malawi HIV"
          runId={RUN_ID}
          loading={false}
          run={run}
          workflow={workflow}
          steps={steps}
          selectedStepId={null}
          inputDataclip={null}
          outputDataclip={null}
          logs={logs}
          logLevel="info"
          experimentalFeatures={false}
          canRunWorkflow
          canEditDataRetention={false}
          adminContacts={["amy@example.org"]}
          onCancel={onCancel}
          onLogLevelChange={onLogLevelChange}
          {...props}
        />
      </ToastProvider>
    </RouterProvider>
  );
  const { rerender } = render(page());
  /** Moves to another history entry, as Back or Forward would. */
  const goTo = (next: string) => {
    hash = next;
    rerender(page());
  };
  return { router, onCancel, onLogLevelChange, goTo };
}

const detail = () => document.getElementById(`run-detail-${RUN_ID}`)!;

describe("RunShowPage", () => {
  it("shows the loading rows before the run arrives, and the error when it never does", () => {
    const { unmount } = (() => {
      renderPage({ loading: true, run: null, workflow: null, steps: [] });
      return { unmount: () => {} };
    })();
    expect(document.getElementById("run-loading")).not.toBeNull();
    expect(screen.getByRole("heading", { level: 1, name: `Run ${RUN_ID.slice(0, 8)}` })).toBeTruthy();
    unmount();
    document.body.innerHTML = "";
    renderPage({ loading: false, run: null, workflow: null, steps: [] });
    expect(screen.getByText("there was an error loading the run")).toBeTruthy();
  });

  it("lists the run's details with links pinned to the version it ran", () => {
    renderPage();
    const d = detail();
    expect(within(d).getByRole("link", { name: "Register patients" }).getAttribute("href")).toBe(
      `/projects/p1/w/wf-1?run=${RUN_ID}`
    );
    expect(within(d).getByRole("link", { name: WO_ID.slice(0, 8) }).getAttribute("href")).toBe(
      `/projects/p1/history?filters[workorder_id]=${WO_ID}`
    );
    expect(d.textContent).toContain("Webhook trigger");
    expect(d.textContent).toContain("Running");
    expect(screen.getByLabelText("This run is based on the latest version of this workflow.").textContent).toBe("latest");
  });

  it("pins an older snapshot with v=, or as_run= with experimental features, and names the snapshot", () => {
    renderPage({ run: { ...run, snapshot: { ...run.snapshot, lockVersion: 1 } } });
    expect(within(detail()).getByRole("link", { name: "Register patients" }).getAttribute("href")).toBe(
      `/projects/p1/w/wf-1?run=${RUN_ID}&v=1`
    );
    expect(
      screen.getByLabelText("This run is based on a snapshot of this workflow that was taken on 2026-10-13 at 08:00:00")
        .textContent
    ).toBe("abcdef1");
    document.body.innerHTML = "";
    renderPage({ run: { ...run, snapshot: { ...run.snapshot, lockVersion: 1 } }, experimentalFeatures: true });
    expect(within(detail()).getByRole("link", { name: "Register patients" }).getAttribute("href")).toBe(
      `/projects/p1/w/wf-1?run=${RUN_ID}&as_run=${RUN_ID}`
    );
  });

  it("lists the steps, marks a cloned one, and inspects a step on its own snapshot", () => {
    const { router } = renderPage({ selectedStepId: "step-a" });
    const a = document.querySelector("[data-step-id='step-a']")!;
    const b = document.querySelector("[data-step-id='step-b']")!;
    expect(a.textContent).toContain("Map to FHIR");
    expect(a.textContent).toContain("1 s");
    expect(within(a as HTMLElement).getByRole("link", { name: /Map to FHIR/ }).getAttribute("href")).toBe("?step=step-a");
    expect(within(a as HTMLElement).getByRole("link", { name: /Map to FHIR/ }).className).toContain("border-selected");
    expect(b.querySelector(".hero-paper-clip-mini")).not.toBeNull();

    fireEvent.click(within(b as HTMLElement).getByRole("link", { name: "Inspect Step" }));
    expect(router.navigate).toHaveBeenCalledWith(`/projects/p1/w/wf-1?run=${RUN_ID}&panel=editor&job=job-b&v=1#log`);
  });

  it("pins no version for a step on the latest snapshot, and pins with as_run under experimental features", () => {
    const step = (id: string) => document.querySelector(`[data-step-id='${id}']`) as HTMLElement;
    const latest = renderPage();
    fireEvent.click(within(step("step-a")).getByRole("link", { name: "Inspect Step" }));
    expect(latest.router.navigate).toHaveBeenCalledWith(`/projects/p1/w/wf-1?run=${RUN_ID}&panel=editor&job=job-a#log`);

    document.body.innerHTML = "";
    const experimental = renderPage({ experimentalFeatures: true });
    fireEvent.click(within(step("step-b")).getByRole("link", { name: "Inspect Step" }));
    expect(experimental.router.navigate).toHaveBeenCalledWith(`/projects/p1/w/wf-1?run=${RUN_ID}&panel=editor&job=job-b&as_run=${RUN_ID}#log`);
  });

  it("shows the log with the step's lines marked, and remembers a new level", () => {
    const { onLogLevelChange } = renderPage({ selectedStepId: "step-a", logLevel: "debug" });
    expect(screen.getByText(/Starting operation 1/)).toBeTruthy();
    expect(screen.getByText(/mapping/)).toBeTruthy();
    expect(document.querySelector("[data-highlighted]")?.textContent).toBe("JOB mapping");

    fireEvent.click(screen.getByRole("button", { name: "Log level: debug" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "error" }));
    expect(onLogLevelChange).toHaveBeenCalledWith("error");
    expect(screen.queryByText(/Starting operation 1/)).toBeNull();
  });

  it("says what it is waiting for, and that no logs came for a finished run", () => {
    renderPage({ logs: [], run: { ...run, state: "claimed" } });
    expect(screen.getByText("Creating runtime & installing adaptors")).toBeTruthy();
    document.body.innerHTML = "";
    renderPage({ logs: [], run: { ...run, state: "failed", finishedAt: "2026-10-14T09:31:00Z" } });
    expect(screen.getByText("No logs were received for this run.")).toBeTruthy();
  });

  it("keeps Input and Output closed until a step is selected, then opens them through the hash", () => {
    const { router } = renderPage({ selectedStepId: "step-a", inputDataclip: { id: DC_IN, wiped: false, body: { text: '{\n  "x": 1\n}' } } });
    const input = screen.getByRole("tab", { name: "Input" });
    expect(input.getAttribute("aria-disabled")).not.toBe("true");
    fireEvent.click(input);
    expect(router.navigate).toHaveBeenCalledWith(`/projects/p1/runs/${RUN_ID}?step=step-a#input`);
    expect(screen.getByText(/"x"/)).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: "Output" }));
    expect(screen.getByText("Nothing yet")).toBeTruthy();
  });

  it("shows why a step's data could not be loaded, with nothing to copy", () => {
    renderPage({ selectedStepId: "step-a", inputDataclip: { id: DC_IN, wiped: false, body: { error: "Dataclip not found" } } }, "#input");
    expect(screen.getByText("Dataclip not found")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Copy to clipboard" })).toBeNull();
  });

  it("starts on the tab in the URL hash", async () => {
    renderPage({ selectedStepId: "step-a", outputDataclip: { id: DC_OUT, wiped: true } }, "#output");
    expect(screen.getByRole("tab", { name: "Output" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByText("No Output Data here!")).toBeTruthy();
    expect(await tooltipOf(screen.getByText("project admins"))).toBe("amy@example.org");
  });

  it("goes back to Log when the URL names no tab, and step links keep the tab that is open", () => {
    const { goTo } = renderPage({ selectedStepId: "step-a", inputDataclip: { id: DC_IN, wiped: false, body: { text: '{\n  "x": 1\n}' } } }, "#input");
    expect(screen.getByRole("tab", { name: "Input" }).getAttribute("aria-selected")).toBe("true");
    const b = document.querySelector("[data-step-id='step-b']") as HTMLElement;
    expect(within(b).getByRole("link", { name: /Post to OpenHIM/ }).getAttribute("href")).toBe("?step=step-b#input");

    goTo("");
    expect(screen.getByRole("tab", { name: "Log" }).getAttribute("aria-selected")).toBe("true");
  });

  it("adds no history entry when the open tab is clicked again", () => {
    const { router } = renderPage({ selectedStepId: "step-a", inputDataclip: { id: DC_IN, wiped: false, body: { text: '{\n  "x": 1\n}' } } }, "#input");
    fireEvent.click(screen.getByRole("tab", { name: "Input" }));
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it("disables Input and Output when the URL names a step the run does not have", () => {
    renderPage({ selectedStepId: "nope" });
    expect(screen.getByRole("tab", { name: "Input" }).getAttribute("aria-disabled")).toBe("true");
  });

  it("offers Cancel only on an enqueued run the viewer may run, and reports a refusal", async () => {
    renderPage();
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
    document.body.innerHTML = "";
    renderPage({ run: { ...run, state: "available" }, canRunWorkflow: false });
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
    document.body.innerHTML = "";

    const onCancel = vi.fn(() => Promise.reject(new RequestError("Run not found.")));
    renderPage({ run: { ...run, state: "available" }, onCancel });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    });
    expect(onCancel).toHaveBeenCalled();
    expect(screen.getByText("Run not found.")).toBeTruthy();
  });

  it("shows Cancel as busy while the cancel runs", () => {
    renderPage({ run: { ...run, state: "available" }, onCancel: () => new Promise(() => {}) });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByText("Cancel").closest("button")!.getAttribute("aria-busy")).toBe("true");
  });
});
