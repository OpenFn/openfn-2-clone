import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { RunBucket } from "../../../types/workflow-health";
import { formatMonthDayIn } from "../../../utils/format";
import { bucket } from "./fixtures";
import VolumeBars from "./VolumeBars";

const links = { projectId: "proj-1", workflowId: "wf-1" };

const bars = (buckets: RunBucket[], { hours = 2, timezone = "Etc/UTC", emptyMessage = "No runs" } = {}) =>
  render(<VolumeBars buckets={buckets} hours={hours} timezone={timezone} emptyMessage={emptyMessage} {...links} />);

const day = formatMonthDayIn;
const params = (a: Element) => new URL(a.getAttribute("href")!, "http://x").searchParams;
const hover = (container: HTMLElement, index: number) =>
  fireEvent.mouseEnter(container.querySelectorAll("svg")[index]!.parentElement!);

describe("VolumeBars", () => {
  it("folds every run failure state into one Failed total", () => {
    bars([
      bucket("2026-09-08T00:00:00Z", { success: 40, failed: 3, crashed: 2 }),
      bucket("2026-09-08T01:00:00Z", { success: 60, killed: 1, exception: 1, lost: 1, cancelled: 4 }),
    ]);
    // 3 + 2 + 1 + 1 + 1 across both buckets.
    expect(screen.getByText("Window totals: Success 100, Cancelled 4, Failed 8.")).toBeTruthy();
    expect(screen.getByText("Success")).toBeTruthy();
    expect(screen.getByText("Cancelled")).toBeTruthy();
    expect(screen.getByText("Failed")).toBeTruthy();
  });

  it("keeps cancelled out of the Failed total", () => {
    bars([bucket("2026-09-08T00:00:00Z", { failed: 2, cancelled: 5 }), bucket("2026-09-08T01:00:00Z")]);
    expect(screen.getByText("Window totals: Success 0, Cancelled 5, Failed 2.")).toBeTruthy();
  });

  it("shows the empty message when no run landed in the window", () => {
    bars([bucket("2026-09-08T00:00:00Z"), bucket("2026-09-08T01:00:00Z")], { emptyMessage: "No runs in the last 30 days" });
    expect(screen.getByText("No runs in the last 30 days")).toBeTruthy();
    expect(screen.queryByText("Failed")).toBeNull();
  });
});

describe("VolumeBars axis and tooltip labels", () => {
  const at = "2026-09-09T14:00:00Z";
  const one = (hours: number, when = at, timezone = "Etc/UTC") => bars([bucket(when, { success: 1 })], { hours, timezone });

  it("clocks the narrow bars and dates the wide ones", () => {
    one(2);
    expect(screen.getByText("14:00")).toBeTruthy();
    cleanup();
    one(24);
    expect(screen.getByText(day(at, "Etc/UTC"))).toBeTruthy();
  });

  it("dates a half-day bar on its morning bar only", () => {
    const { container } = bars([bucket("2026-09-09T00:00:00Z", { success: 1 }), bucket("2026-09-09T12:00:00Z", { success: 1 })], { hours: 12 });
    const axis = within(container).getByText(day("2026-09-09T00:00:00Z", "Etc/UTC")).parentElement!;
    expect([...axis.children].map((s) => s.textContent)).toEqual([day("2026-09-09T00:00:00Z", "Etc/UTC"), ""]);
  });

  it("gives the tooltip the whole slot, with no timezone suffix", () => {
    const wide = one(24);
    hover(wide.container, 0);
    expect(screen.getAllByText(day(at, "Etc/UTC")).length).toBeGreaterThan(1);
    wide.unmount();

    const narrow = one(2);
    hover(narrow.container, 0);
    expect(screen.getByText(`${day(at, "Etc/UTC")}, 14:00 – 16:00`)).toBeTruthy();
  });

  it("closes the last bar of a day at midnight", () => {
    const utc = one(2, "2026-09-09T22:00:00Z");
    hover(utc.container, 0);
    expect(screen.getByText(/22:00 – 00:00$/)).toBeTruthy();
    utc.unmount();

    const london = one(12, "2026-10-25T12:00:00Z", "Europe/London");
    hover(london.container, 0);
    expect(screen.getByText(/12:00 – 00:00$/)).toBeTruthy();
  });

  it("dates a bar on the reader's calendar, not on UTC", () => {
    one(24, "2026-09-08T21:00:00Z", "Africa/Nairobi");
    expect(screen.getByText(day("2026-09-09T00:00:00Z", "Etc/UTC"))).toBeTruthy();
    cleanup();
    one(12, "2026-09-08T21:00:00Z", "Africa/Nairobi");
    expect(screen.getByText(day("2026-09-09T00:00:00Z", "Etc/UTC"))).toBeTruthy();
  });

  it("clocks the off-the-hour zones as whole local hours", () => {
    one(2, "2026-09-08T18:30:00Z", "Asia/Kolkata");
    expect(screen.getByText("00:00")).toBeTruthy();
    cleanup();
    one(2, "2026-09-08T18:15:00Z", "Asia/Kathmandu");
    expect(screen.getByText("00:00")).toBeTruthy();
  });
});

describe("VolumeBars band links", () => {
  const buckets = [
    bucket("2026-09-08T00:00:00Z", { success: 1 }),
    bucket("2026-09-08T02:00:00Z", { success: 1, failed: 1 }),
    bucket("2026-09-08T04:00:00Z", { success: 1 }),
  ];
  // Bands run failed, cancelled, success from the top, so a bar's success band
  // is its last link.
  const band = (index: number, status: string) =>
    [...bars(buckets).container.querySelectorAll("a")].filter((a) => params(a).getAll("filters[run_status][]").includes(status))[index]!;

  it("closes a bar on the next one's start", () => {
    const p = params(band(1, "success"));
    expect(p.get("filters[run_date_after]")).toBe("2026-09-08T02:00:00Z");
    expect(p.get("filters[run_date_before]")).toBe("2026-09-08T04:00:00Z");
  });

  it("leaves the newest bar open-ended", () => {
    const p = params(band(2, "success"));
    expect(p.get("filters[run_date_after]")).toBe("2026-09-08T04:00:00Z");
    expect(p.has("filters[run_date_before]")).toBe(false);
  });

  it("scopes the link to the workflow", () => {
    expect(params(band(0, "success")).get("filters[workflow_id]")).toBe("wf-1");
  });

  it("filters on the band's own run states", () => {
    const failed = params(band(0, "failed"));
    expect(failed.getAll("filters[run_status][]")).toEqual(["failed", "crashed", "killed", "exception", "lost"]);
    expect(failed.has("filters[failed]")).toBe(false);
    expect(params(band(1, "success")).getAll("filters[run_status][]")).toEqual(["success"]);
  });
});
