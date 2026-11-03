import Button from "../primitives/Button";
import EmptyState from "../primitives/EmptyState";

/**
 * What a route shows when its page crashes, in the words of Lightning's
 * editor (collaborative-editor ManualRunPanelErrorBoundary): "Something went
 * wrong", the error's message, and "Try again", which draws the page again.
 */
export default function ErrorPage({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="py-12">
      <EmptyState variant="plain" icon="hero-exclamation-triangle" title="Something went wrong" message={message || "An unexpected error occurred."}>
        <div className="mt-4">
          <Button variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        </div>
      </EmptyState>
    </div>
  );
}
