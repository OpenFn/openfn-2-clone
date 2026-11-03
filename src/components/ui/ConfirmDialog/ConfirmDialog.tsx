import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button/Button";
import { Callout } from "@/components/ui/Callout/Callout";
import { Dialog } from "@/components/ui/Dialog/Dialog";

type ConfirmDialogProps = {
  title: string;
  /** What will happen, and that it can't be undone. */
  children: ReactNode;
  /** Says what the button does ("Delete token"), never "Yes" or "OK". */
  confirmLabel: string;
  /** `danger` when confirming destroys something. */
  tone?: "danger";
  /** Does the thing. The dialog waits, then closes when it resolves, or shows the error's message if it rejects. */
  onConfirm: () => Promise<unknown>;
  /** Cancel, Escape, or the action done. The parent stops rendering the dialog. */
  onClose: () => void;
};

/** "Are you sure?" before an action that can't be undone. Its error stays inside it, where the person acted. */
export function ConfirmDialog({ title, children, confirmLabel, tone, onConfirm, onClose }: ConfirmDialogProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  const confirm = async () => {
    setPending(true);
    setError(undefined);
    try {
      await onConfirm();
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Something went wrong. Try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog
      title={title}
      onClose={pending ? () => {} : onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button tone={tone} onClick={confirm} pending={pending}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
      {error && <Callout tone="danger" role="alert" title={error} />}
    </Dialog>
  );
}
