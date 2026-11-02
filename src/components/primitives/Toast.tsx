import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode, type SyntheticEvent } from "react";
import { cn } from "../../utils/cn";
import CloseButton from "./CloseButton";
import type { Tone } from "./tone";

export type ToastTone = Extract<Tone, "info" | "danger">;

interface ToastItem {
  id: number;
  tone: ToastTone;
  message: ReactNode;
}

type ShowToast = (message: ReactNode, tone?: ToastTone) => void;

const ToastContext = createContext<ShowToast>(() => {});

/** How long a success toast stays up once nobody is pointing at or focused on it, as Lightning's flash. An error stays until dismissed, so a failure is never missed. */
const DURATION_MS = 5000;

const tones: Record<ToastTone, { box: string; icon: string }> = {
  info: { box: "bg-info text-info-strong ring-info", icon: "hero-check-circle-solid text-info-icon" },
  danger: { box: "bg-danger text-danger-strong ring-danger", icon: "hero-exclamation-circle-solid text-danger-icon" },
};

/**
 * The confirmation Lightning shows after an action: LiveView's `put_flash`
 * ("Token created successfully") and the editor's Sonner toasts ("Workflow
 * saved") are one bottom-centred toast here. Mount once near the root, then
 * call `useToast()` from anything that saves, deletes or starts something.
 *
 * A host that already draws toasts elsewhere passes `show`: the provider then
 * hands that to `useToast()` and draws nothing itself, so a page has one stack.
 */
export function ToastProvider({ children, show }: { children: ReactNode; show?: ShowToast | undefined }) {
  if (show) return <ToastContext.Provider value={show}>{children}</ToastContext.Provider>;
  return <ToastStack>{children}</ToastStack>;
}

function ToastStack({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((ts) => ts.filter((t) => t.id !== id)), []);

  const show = useCallback<ShowToast>((message, tone = "info") => {
    const id = nextId.current++;
    setToasts((ts) => [...ts, { id, tone, message }]);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex flex-col items-center gap-2 px-4" aria-live="polite">
        {toasts.map((t) => (
          <Toast key={t.id} tone={t.tone} onClose={() => dismiss(t.id)} timeout={t.tone === "danger" ? undefined : DURATION_MS}>
            {t.message}
          </Toast>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** Returns `toast(message, tone?)`. Outside a provider it does nothing, so stories don't need one. */
// eslint-disable-next-line react-refresh/only-export-components -- useToast belongs beside ToastProvider
export function useToast(): ShowToast {
  return useContext(ToastContext);
}

interface ToastProps {
  tone?: ToastTone;
  children: ReactNode;
  onClose?: () => void;
  /** Closes itself after this many ms, paused while pointed at or focused, restarting in full after. */
  timeout?: number | undefined;
}

/**
 * One toast. Clicking anywhere on it closes it, and so do its X and Escape
 * while focus is inside; focus then goes back where it came from. Rendered by
 * `ToastProvider`; exported for stories.
 */
export function Toast({ tone = "info", children, onClose, timeout }: ToastProps) {
  const c = tones[tone];
  const [held, setHeld] = useState({ pointer: false, focus: false });
  const paused = held.pointer || held.focus;
  // The latest onClose, so a parent re-render doesn't restart the wait
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });
  // Where focus came from when it moved into the toast, so closing it hands focus back rather than dropping it on the page.
  const cameFrom = useRef<HTMLElement | null>(null);
  const closeByHand =
    onClose &&
    ((e: SyntheticEvent<HTMLElement>) => {
      if (e.currentTarget.contains(document.activeElement) && cameFrom.current?.isConnected) cameFrom.current.focus();
      onClose();
    });

  // Someone still reading or working in it keeps it (WCAG 2.2.1); leaving starts the full wait again.
  useEffect(() => {
    if (timeout === undefined || paused) return;
    const timer = window.setTimeout(() => close.current?.(), timeout);
    return () => window.clearTimeout(timer);
  }, [timeout, paused]);

  return (
    <div
      className={cn(
        "pointer-events-auto flex items-center gap-3 rounded-md px-4 py-3 text-sm shadow-lg ring-1",
        onClose && "cursor-pointer",
        c.box
      )}
      data-ui="toast"
      data-tone={tone}
      role={tone === "danger" ? "alert" : "status"}
      onClick={closeByHand}
      onKeyDown={(e) => {
        if (e.key === "Escape" && closeByHand) {
          e.preventDefault();
          closeByHand(e);
        }
      }}
      onPointerEnter={() => setHeld((h) => ({ ...h, pointer: true }))}
      onPointerLeave={() => setHeld((h) => ({ ...h, pointer: false }))}
      onFocus={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) cameFrom.current = e.relatedTarget as HTMLElement | null;
        setHeld((h) => ({ ...h, focus: true }));
      }}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setHeld((h) => ({ ...h, focus: false }))}
    >
      <span className={cn(c.icon, "h-5 w-5 shrink-0")} />
      <span>{children}</span>
      {onClose && <CloseButton size="xs" />}
    </div>
  );
}
