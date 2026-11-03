import { useId, type KeyboardEvent, type ReactNode } from "react";

type DialogProps = {
  title: string;
  /** Escape, a click on the backdrop, or the footer's cancel. The parent stops rendering the dialog. */
  onClose: () => void;
  children: ReactNode;
  /** Buttons, cancel first and the main action last. */
  footer?: ReactNode;
};

// Outside the component, so React calls it once when the dialog mounts and its cleanup once when it unmounts.
function open(dialog: HTMLDialogElement | null) {
  if (!dialog || dialog.open) return;
  const before = document.activeElement;
  dialog.showModal();
  return () => {
    // Close first: while it's modal, everything behind it is inert and can't take focus.
    dialog.close();
    if (before instanceof HTMLElement && before.isConnected) before.focus();
  };
}

const FOCUSABLE = "a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])";

/** Escape closes; Tab and Shift+Tab wrap round inside rather than leaving for the browser's own controls. */
function keys(event: KeyboardEvent<HTMLDialogElement>, onClose: () => void) {
  if (event.key === "Escape") {
    event.preventDefault();
    onClose();
  }
  if (event.key !== "Tab") return;
  const focusable = [...event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE)];
  const [first, last] = [focusable[0], focusable.at(-1)];
  const edge = event.shiftKey ? first : last;
  if (document.activeElement === edge) {
    event.preventDefault();
    (event.shiftKey ? last : first)?.focus();
  }
}

/**
 * A modal dialog (the ARIA dialog pattern), on the browser's own `<dialog>`: it sits above everything, keeps focus
 * inside and makes the page behind it inert. Render it to open it and stop rendering it to close it; focus goes back
 * to what was focused before, if it's still there.
 */
export function Dialog({ title, onClose, children, footer }: DialogProps) {
  const titleId = useId();

  return (
    <dialog
      ref={open}
      aria-labelledby={titleId}
      onKeyDown={(event) => keys(event, onClose)}
      // Any other way the browser asks to close it (a phone's back gesture): the parent decides, so React stays in charge.
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      // The dialog fills the backdrop's box only outside its panel, so a click on itself is a click on the backdrop.
      onClick={(event) => event.target === event.currentTarget && onClose()}
      className="m-auto max-w-md rounded-xl border border-subtle bg-surface p-0 text-strong shadow-xl backdrop:bg-overlay"
    >
      <div className="flex flex-col gap-4 p-6">
        <h2 id={titleId} className="text-base font-semibold text-strong">
          {title}
        </h2>
        <div className="flex flex-col gap-3 text-sm text-body">{children}</div>
        {footer && <div className="flex justify-end gap-2">{footer}</div>}
      </div>
    </dialog>
  );
}
