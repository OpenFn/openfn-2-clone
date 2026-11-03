import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HEALTH_LOAD_ERROR } from "../../../constants";
import type { ErrorSignatures, HealthQuery, Outcomes, RunVolume } from "../../../types/workflow-health";
import { formatMonthDayIn } from "../../../utils/format";
import { FAILED } from "./palette";
import WorkflowHealth from "./WorkflowHealth";

const range = { from: "2026-10-07T10:00:00.000Z", to: "2026-10-14T10:00:00.000Z" };
const zero = { success: 0, cancelled: 0, failed: 0, crashed: 0, killed: 0, exception: 0, lost: 0, rejected: 0 };
const outcomes: Outcomes = { window: range, counts: { ...zero, success: 9, failed: 1, crashed: 1, cancelled: 2 } };
const failures: ErrorSignatures = {
  window: range,
  signatures: [
    { count: 2, exit_reason: "fail", error_type: "RuntimeError", job_id: "job-load", step_name: "Load", adaptor: null },
    { count: 1, exit_reason: "rejected", error_type: "RunLimitExceeded", job_id: null, step_name: null, adaptor: null },
  ],
};
const bucket = (at: string, failed: number, success = 0) => ({ at, success, cancelled: 0, failed, crashed: 0, killed: 0, exception: 0, lost: 0 });
const runs: RunVolume = {
  window: range,
  timezone: "Africa/Nairobi",
  bucket_hours: 2,
  buckets: [bucket("2026-10-14T09:00:00.000Z", 1), bucket("2026-10-14T11:00:00.000Z", 0, 3), bucket("2026-10-14T13:00:00.000Z", 2, 1)],
};
const ok = <T,>(data: T): HealthQuery<T> => ({ data, error: null });

function renderHealth(props: Partial<React.ComponentProps<typeof WorkflowHealth>> = {}) {
  render(
    <WorkflowHealth
      projectId="p1"
      workflowId="wf-1"
      days="7"
      outcomes={ok(outcomes)}
      failures={ok(failures)}
      runs={ok(runs)}
      {...props}
    />
  );
}

const card = (title: string) => screen.getByRole("heading", { name: title }).closest<HTMLElement>("[data-ui=card]")!;
const params = (href: string | null) => new URL(href!, "http://x").searchParams;

describe("WorkflowHealth panels", () => {
  it("shows a loading frame per panel, with no numbers, meta, empty message or error", () => {
    const loading = { data: null, error: null };
    renderHealth({ outcomes: loading, failures: loading, runs: loading });
    expect(screen.getAllByRole("status", { name: "Loading…" })).toHaveLength(4);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByText(/work orders?$/)).toBeNull();
    expect(screen.queryByText(/^No (failures|finished)/)).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("shows one endpoint's failure in its own panels, beside another's numbers", () => {
    renderHealth({ failures: { data: null, error: HEALTH_LOAD_ERROR } });
    const alerts = screen.getAllByRole("alert");
    expect(alerts).toHaveLength(2);
    expect(alerts.every((a) => a.textContent === HEALTH_LOAD_ERROR)).toBe(true);
    expect(within(card("Steps with failures")).getByRole("alert")).toBeTruthy();
    expect(within(card("Outcomes")).getByRole("link", { name: /^Success 9\b/ })).toBeTruthy();
    expect(within(card("Outcomes")).getByText("13 work orders")).toBeTruthy();
  });

  it("keeps the last numbers through a failed refresh, and stays quiet", () => {
    renderHealth({ failures: { data: failures, error: HEALTH_LOAD_ERROR } });
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText("fail:RuntimeError @ Load")).toBeTruthy();
  });
});

describe("WorkflowHealth links", () => {
  it("opens a legend row's states from the window's start, in the same tab", () => {
    renderHealth();
    const link = within(card("Outcomes")).getByRole("link", { name: /^Failed 2\b/ });
    expect(link.getAttribute("target")).toBeNull();
    const p = params(link.getAttribute("href"));
    expect(p.get("filters[workflow_id]")).toBe("wf-1");
    expect(p.get("filters[date_after]")).toBe(range.from);
    for (const state of ["failed", "crashed", "killed", "exception", "lost", "rejected"]) expect(p.get(`filters[${state}]`)).toBe("true");
    expect(p.get("filters[success]")).toBeNull();
  });

  it("opens a triage row's signature in the same tab, and a rejected row's state", () => {
    renderHealth();
    const [fail, rejected] = screen.getAllByRole("link", { name: /View history/ });
    expect(fail!.getAttribute("target")).toBeNull();
    const p = params(fail!.getAttribute("href"));
    expect(p.get("filters[date_after]")).toBe(range.from);
    expect(p.get("filters[error_signature_exit_reason]")).toBe("fail");
    expect(p.get("filters[error_signature_error_type]")).toBe("RuntimeError");
    expect(p.get("filters[error_signature_job_id]")).toBe("job-load");
    expect(params(rejected!.getAttribute("href")).get("filters[rejected]")).toBe("true");
  });

  it("opens a wedge's states like its legend row, and a breakdown row's one state", () => {
    renderHealth();
    const outcomesCard = card("Outcomes");
    const wedge = outcomesCard.querySelector(`path[fill="${FAILED}"]`)!.closest("a")!;
    expect(wedge.getAttribute("target")).toBeNull();
    expect(wedge.getAttribute("href")).toBe(within(outcomesCard).getByRole("link", { name: /^Failed 2\b/ }).getAttribute("href"));

    const p = params(within(card("Failure breakdown")).getByRole("link", { name: /^crashed 1\b/ }).getAttribute("href"));
    expect(p.get("filters[crashed]")).toBe("true");
    expect(p.get("filters[failed]")).toBeNull();
    expect(p.get("filters[date_after]")).toBe(range.from);
  });
});

describe("WorkflowHealth runs over time", () => {
  const openRuns = (props: Partial<React.ComponentProps<typeof WorkflowHealth>> = {}) => {
    renderHealth(props);
    fireEvent.click(screen.getByRole("tab", { name: "Runs" }));
    return card("Runs over time");
  };

  it("shows its own failure with no meta, and the reply's bucket size and clock once loaded", () => {
    const failed = openRuns({ runs: { data: null, error: HEALTH_LOAD_ERROR } });
    expect(within(failed).getAllByRole("alert")).toHaveLength(1);
    expect(within(failed).queryByText(/buckets/)).toBeNull();
    cleanup();

    expect(within(openRuns()).getByText("2-hour buckets · Africa/Nairobi")).toBeTruthy();
    cleanup();
    expect(within(openRuns({ runs: ok({ ...runs, bucket_hours: 12 }) })).getByText("12-hour buckets · Africa/Nairobi")).toBeTruthy();
    cleanup();
    expect(within(openRuns({ runs: ok({ ...runs, bucket_hours: 24 }) })).getByText("daily buckets · Africa/Nairobi")).toBeTruthy();
  });

  it("draws a red SVG band per bar with failures, opening that bar's failed runs in the same tab", () => {
    const chart = openRuns();
    const red = chart.querySelectorAll(`path[fill="${FAILED}"]`);
    expect(red).toHaveLength(2);
    const link = red[1]!.closest("a")!;
    expect(link.getAttribute("target")).toBeNull();
    const p = params(link.getAttribute("href"));
    expect(p.get("filters[run_date_after]")).toBe("2026-10-14T13:00:00.000Z");
    expect(p.get("filters[run_date_before]")).toBeNull();
    expect(p.getAll("filters[run_status][]")).toEqual(["failed", "crashed", "killed", "exception", "lost"]);
    expect(params(red[0]!.closest("a")!.getAttribute("href")).get("filters[run_date_before]")).toBe("2026-10-14T11:00:00.000Z");
  });

  it("names a hovered bar's slot on the reader's clock, with its counts", () => {
    const chart = openRuns();
    const column = chart.querySelectorAll(`path[fill="${FAILED}"]`)[1]!.closest("svg")!.parentElement!;
    fireEvent.mouseEnter(column);
    const day = formatMonthDayIn("2026-10-14T13:00:00.000Z", "Africa/Nairobi");
    const label = within(chart).getByText(`${day}, 16:00 – 18:00`);
    expect(label.parentElement!.textContent).toMatch(/Success\s*1.*Failed\s*2/);
  });
});

describe("WorkflowHealth page body", () => {
  const big: Outcomes = { window: range, counts: { ...zero, success: 1146, failed: 98, crashed: 24, killed: 12, lost: 7 } };

  it("totals its work orders", () => {
    renderHealth({ outcomes: ok(big) });
    expect(screen.getByText("1,287 work orders")).toBeTruthy();
  });

  it("calls a one-day window 24 hours, not 1 day", () => {
    renderHealth({ days: "1", outcomes: ok({ window: range, counts: zero }) });
    expect(screen.getByText("No finished work orders in the last 24 hours")).toBeTruthy();
  });

  it("opens on the Work orders tab, and shows runs over time on the Runs tab", () => {
    renderHealth();
    expect(screen.getByRole("tab", { name: "Work orders" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.queryByRole("heading", { name: "Runs over time" })).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: "Runs" }));
    expect(screen.getByRole("heading", { name: "Runs over time" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Outcomes" })).toBeNull();
  });

  it("folds the failure states into Outcomes and breaks them down in Failure breakdown", () => {
    renderHealth({ outcomes: ok(big) });
    // 98 + 24 + 12 + 7: one reply feeds both donuts, so they can only disagree if the fold drifts.
    expect(within(card("Outcomes")).getByRole("link", { name: /^Failed 141 / })).toBeTruthy();
    const breakdown = within(card("Failure breakdown"));
    expect(breakdown.getByText("failed")).toBeTruthy();
    expect(breakdown.getByText("(69.5%)")).toBeTruthy();
    expect(breakdown.queryByText("cancelled")).toBeNull();
  });

  it("lists the error signatures in the triage table", () => {
    renderHealth();
    expect(screen.getByRole("heading", { name: "Triage - grouped by failure type" })).toBeTruthy();
    expect(screen.getByRole("cell", { name: "2" })).toBeTruthy();
    expect(screen.getByText("Job code hit a value it didn't expect, often a missing input field.")).toBeTruthy();
  });

  it("shows a refused request in every panel, on both tabs, without echoing the server", () => {
    const refused = { data: null, error: HEALTH_LOAD_ERROR };
    renderHealth({ outcomes: refused, failures: refused, runs: refused });
    expect(screen.getAllByText(HEALTH_LOAD_ERROR)).toHaveLength(4);
    // The page stays around its failed panels.
    for (const name of ["Outcomes", "Failure breakdown", "Steps with failures", "Triage - grouped by failure type"]) {
      expect(screen.getByRole("heading", { name })).toBeTruthy();
    }
    fireEvent.click(screen.getByRole("tab", { name: "Runs" }));
    expect(screen.getAllByText(HEALTH_LOAD_ERROR)).toHaveLength(2);
    expect(screen.getByRole("heading", { name: "Runs over time" })).toBeTruthy();
  });

  it("degrades both donuts, and only them, when the outcomes request fails", () => {
    renderHealth({ outcomes: { data: null, error: HEALTH_LOAD_ERROR } });
    expect(screen.getAllByRole("alert")).toHaveLength(2);
    expect(within(card("Outcomes")).getByRole("alert")).toBeTruthy();
    expect(within(card("Failure breakdown")).getByRole("alert")).toBeTruthy();
    expect(screen.getByText("fail:RuntimeError @ Load")).toBeTruthy();
  });

});
