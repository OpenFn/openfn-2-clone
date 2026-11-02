import { useRef, type ComponentProps, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { cn } from "../../utils/cn";
import { errorMessage } from "../../utils/errors";
import { useAction } from "../../utils/useAction";
import Alert from "./Alert";
import Button from "./Button";
import { useFocusFirstError } from "./focusFirstError";
import Modal from "./Modal";

interface Props extends Omit<ComponentProps<typeof Modal>, "footer" | "variant"> {
  /** The form's id; the submit button points at it, so it works from the footer. Keep Lightning's ids. */
  formId: string;
  /**
   * Called on submit (button or Enter), unless `submitDisabled`. May be
   * async: the modal shows pending until it settles, and if it throws the
   * modal stays open and shows the error. Close the modal yourself once it
   * resolves (`await save(); onClose()`).
   */
  onSubmit: () => void | Promise<void>;
  submitLabel: ReactNode;
  submitTone?: "danger" | undefined;
  submitDisabled?: boolean;
  submitId?: string | undefined;
  /** Shown on hover over the submit button, e.g. why it's disabled. */
  submitTooltip?: string | undefined;
  cancelLabel?: ReactNode | undefined;
  cancelId?: string;
  /** Classes for the form, i.e. the spacing between fields. */
  formClassName?: string;
  /** Content above the form, outside it (e.g. an Alert). */
  before?: ReactNode;
}

/**
 * A Modal wrapping one form, with the standard footer: the submit button
 * and a secondary Cancel. Enter submits; nothing happens while
 * `submitDisabled`. While `onSubmit` is pending the submit button spins,
 * Cancel and the backdrop are inert, and a failure shows as an Alert above
 * the form (STANDARDS.md patterns 1 and 2). As in `Form`, only the fields'
 * own errors show (no browser bubbles), and a refused Save moves focus to the
 * first field with an error. Use Modal's `footer` directly for anything else.
 */
export default function FormModal({
  formId,
  onSubmit,
  submitLabel,
  submitTone,
  submitDisabled = false,
  submitId,
  submitTooltip,
  cancelLabel = "Cancel",
  cancelId,
  formClassName = "space-y-6",
  before,
  onClose,
  children,
  ...modal
}: Props) {
  const submit = useAction(onSubmit);
  const form = useRef<HTMLFormElement>(null);
  const focus = useFocusFirstError(form, submit.pending);
  const close = () => {
    if (submit.pending) return;
    submit.reset();
    onClose();
  };

  return (
    <Modal
      onClose={close}
      {...modal}
      footer={
        <>
          <Button
            id={submitId}
            type="submit"
            form={formId}
            tone={submitTone}
            disabled={submitDisabled}
            pending={submit.pending}
            tooltip={submitTooltip}
          >
            {submitLabel}
          </Button>
          <Button id={cancelId} variant="secondary" onClick={close} disabled={submit.pending}>
            {cancelLabel}
          </Button>
        </>
      }
    >
      {before}
      <form
        ref={form}
        id={formId}
        noValidate
        className={cn(formClassName)}
        aria-busy={submit.pending || undefined}
        onSubmit={(e) => {
          e.preventDefault();
          // The modal is portalled, but React still bubbles submit to a form around it (a ConfirmModal inside a FormModal).
          e.stopPropagation();
          if (submitDisabled) return;
          flushSync(() => void submit.run());
          focus.submitted();
        }}
      >
        {children}
      </form>
      {/* As in Form: the form's own error sits after its fields, just above the buttons. */}
      {submit.error && (
        <Alert tone="danger" className="mt-4" id={`${formId}-error`}>
          {errorMessage(submit.error)}
        </Alert>
      )}
    </Modal>
  );
}
