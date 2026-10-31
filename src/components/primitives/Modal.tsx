import { Description, Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { Fragment, type ReactNode } from "react";
import { cn } from "../../utils/cn";
import CloseButton from "./CloseButton";
import Heading from "./Heading";
import Text from "./Text";

export type ModalSize = "sm" | "md" | "lg" | "xl" | "2xl";

const sizes: Record<ModalSize, string> = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-xl",
  xl: "max-w-3xl",
  "2xl": "max-w-5xl",
};

interface Props {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  /** A line under the title. */
  description?: ReactNode;
  children: ReactNode;
  /** Buttons, right-aligned. The row is reversed, so put the primary action first. */
  footer?: ReactNode;
  size?: ModalSize;
  /**
   * `bare` renders only the panel, with no header, padding or footer, for
   * modals that lay out their own content (pickers, browsers, wizards).
   */
  variant?: "default" | "bare";
  /** Names the dialog for screen readers when no `title` is shown (none given, or `bare`). */
  label?: string;
  className?: string;
}

/**
 * The modal: a blurred backdrop and a white rounded-xl panel with a title,
 * optional description, body and footer. Escape and clicking outside close
 * it; focus is trapped inside while it's open.
 */
export default function Modal({ open, onClose, title, description, children, footer, size = "lg", variant = "default", label, className }: Props) {
  const bare = variant === "bare";
  return (
    <Dialog open={open} onClose={onClose} transition aria-label={title && !bare ? undefined : label} className="relative z-200" data-ui="modal">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-overlay backdrop-blur-xs transition-opacity duration-200 ease-out data-closed:opacity-0"
      />
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <DialogPanel
            transition
            className={cn(
              // eslint-disable-next-line no-restricted-syntax -- a faint gray-700 tint on the ring and shadow, as Lightning's modal; no named colour is a tint
              "relative w-full rounded-xl bg-surface text-left shadow-lg shadow-gray-700/10 ring-1 ring-gray-700/10",
              "transition duration-200 ease-out data-closed:translate-y-2 data-closed:opacity-0",
              !bare && "py-6",
              sizes[size],
              className
            )}
          >
            {bare ? (
              children
            ) : (
              <>
                {title && (
                  <>
                    <header className="flex items-start justify-between gap-4 px-6">
                      <div>
                        <DialogTitle as={Fragment}>
                          <Heading size="lg" as="h2">
                            {title}
                          </Heading>
                        </DialogTitle>
                        {description && (
                          <Description as={Fragment}>
                            <Text as="p" className="mt-2 text-muted">
                              {description}
                            </Text>
                          </Description>
                        )}
                      </div>
                      <CloseButton onClick={onClose} />
                    </header>
                    <div className="my-4 h-0.5 bg-emphasis" />
                  </>
                )}
                <section className="px-6">{children}</section>
                {footer && <footer className="mt-4 flex flex-col-reverse gap-3 px-6 sm:flex-row-reverse">{footer}</footer>}
              </>
            )}
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
