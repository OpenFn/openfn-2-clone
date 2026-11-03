const date = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

/** A day from the API, in the reader's own time zone and words ("4 Feb 2025"). One that can't be read is "Unknown". */
export function formatDate(iso: string): string {
  const day = new Date(iso);
  return Number.isNaN(day.getTime()) ? "Unknown" : date.format(day);
}
