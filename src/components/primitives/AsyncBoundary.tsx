import type { ReactNode } from "react";
import type { ResourceStatus } from "../../types/resource";
import Alert from "./Alert";
import EmptyState from "./EmptyState";
import Spinner from "./Spinner";

/**
 * STANDARDS pattern 5: what a page shows while its data loads, or when it
 * can't. Loading is a spinner; not found and no access are Lightning's nav
 * errors (live_helpers.ex), worded as it words them; any other failure is the
 * server's message in a danger Alert. Ready renders the children.
 */
export default function AsyncBoundary({ status, children }: { status: ResourceStatus; children?: ReactNode }) {
  switch (status.state) {
    case "ready":
      return children;
    case "loading":
      return (
        <div data-ui="async-boundary" className="flex justify-center py-12">
          <Spinner size="md" />
        </div>
      );
    case "notFound":
      return <EmptyState variant="plain" icon={null} title="Not Found" message="Sorry, we can't find anything here for you." />;
    case "forbidden":
      return <EmptyState variant="plain" icon={null} title="No Access" message="Sorry, you don't have access to that." />;
    case "error":
      return <Alert tone="danger">{status.message}</Alert>;
  }
}
