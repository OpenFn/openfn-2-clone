import { describe, expect, it } from "vitest";
import { formatChipDate, formatChipDateRange, formatQueryDate, formatRunRange, hourIn, prettyJson } from "./format";

describe("prettyJson", () => {
  it("indents a JSON object or array, and leaves anything else as it was", () => {
    expect(prettyJson('{"a":1}')).toBe('{\n  "a": 1\n}');
    expect(prettyJson(" [1,2] ")).toBe("[\n  1,\n  2\n]");
    expect(prettyJson("{not json}")).toBe("{not json}");
    expect(prettyJson("42")).toBe("42");
    expect(prettyJson("Starting step")).toBe("Starting step");
  });
});

describe("History's filter dates", () => {
  const now = new Date("2026-10-31T12:00:00Z");

  it("names a chip date in UTC, adding the year only outside this one", () => {
    expect(formatChipDate("2026-10-14T23:30:00Z", now)).toBe("14-Oct");
    expect(formatChipDate("2025-12-31T23:30:00Z", now)).toBe("31-Dec-2025");
  });

  it("words a received or last-activity range from whichever ends are set", () => {
    expect(formatChipDateRange("2026-10-14T00:00:00Z", "2026-10-20T00:00:00Z", now)).toBe("14-Oct to 20-Oct");
    expect(formatChipDateRange("2026-10-14T00:00:00Z", null, now)).toBe("after 14-Oct");
    expect(formatChipDateRange(null, "2026-10-20T00:00:00Z", now)).toBe("before 20-Oct");
    expect(formatChipDateRange(null, null, now)).toBe("any time");
  });

  it("words a run-created range to the minute, saying UTC once", () => {
    expect(formatRunRange("2026-10-14T09:05:00Z", "2026-10-14T10:00:00Z")).toBe("14-Oct 09:05 – 14-Oct 10:00 UTC");
    expect(formatRunRange("2026-10-14T09:05:00Z", null)).toBe("after 14-Oct 09:05 UTC");
    expect(formatRunRange(null, "2026-10-14T10:00:00Z")).toBe("before 14-Oct 10:00 UTC");
  });

  it("writes a search's date as day/month/year at a 12-hour time", () => {
    expect(formatQueryDate("2026-09-03T16:05:00Z")).toBe("3/9/26 at 4:05pm");
    expect(formatQueryDate("2026-09-03T00:07:00Z")).toBe("3/9/26 at 12:07am");
  });
});

describe("hourIn", () => {
  it("reads the hour in the given time zone, midnight as 0", () => {
    expect(hourIn("2026-10-14T23:30:00Z", "UTC")).toBe(23);
    expect(hourIn("2026-10-14T23:30:00Z", "Africa/Nairobi")).toBe(2);
    expect(hourIn("2026-10-14T00:15:00Z", "UTC")).toBe(0);
  });
});
