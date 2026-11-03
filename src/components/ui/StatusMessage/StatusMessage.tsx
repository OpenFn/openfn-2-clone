type StatusMessageProps = {
  /** What just happened, said by a screen reader. Change it to announce; empty says nothing. */
  children?: string;
};

/**
 * Announces a result that can't be seen happen (copied, deleted) without moving focus (WCAG 4.1.3). Hidden from
 * view: show the result where it happened too. Render it before there's anything to say, so the change is heard.
 */
export function StatusMessage({ children }: StatusMessageProps) {
  return (
    <p role="status" className="sr-only">
      {children}
    </p>
  );
}
