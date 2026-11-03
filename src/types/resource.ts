/** Where a page's data stands while its host loads it (STANDARDS pattern 5). Types only: no data, no behaviour. */
export type ResourceStatus =
  | { state: "loading" }
  | { state: "ready" }
  | { state: "notFound" }
  | { state: "forbidden" }
  /** Anything else; `message` is the server's own wording. */
  | { state: "error"; message: string };
