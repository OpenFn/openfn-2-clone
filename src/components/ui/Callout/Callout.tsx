import type { ReactNode } from "react";
import { cn } from "@/components/ui/cn";
import { CircleAlert, Info, type Icon } from "@/components/ui/icons";

/** What the message is: `info` to know, `danger` when something went wrong. */
export type CalloutTone = "info" | "danger";

const looks: Record<CalloutTone, { box: string; icon: string; title: string; body: string; Icon: Icon }> = {
  info: { box: "border-info bg-info", icon: "text-info-icon", title: "text-info-strong", body: "text-info", Icon: Info },
  danger: { box: "border-danger bg-danger", icon: "text-danger-icon", title: "text-danger-strong", body: "text-danger", Icon: CircleAlert },
};

type CalloutProps = {
  tone?: CalloutTone;
  title: string;
  /** More words, or something to do with the message, like a value to copy. */
  children?: ReactNode;
  /** Buttons on the right, such as Try again or Dismiss. */
  actions?: ReactNode;
  /**
   * `alert` when it appears because something just went wrong, so a screen reader hears it straight away.
   * Leave it out for a message that's there when the page loads.
   */
  role?: "alert";
};

/** A message that sits in the page: a notice, or an error that stays until it's dealt with. */
export function Callout({ tone = "info", title, children, actions, role }: CalloutProps) {
  const look = looks[tone];
  return (
    <div role={role} className={cn("flex items-start gap-3 rounded-lg border px-4 py-3", look.box)}>
      <look.Icon size={18} aria-hidden className={cn("mt-0.5 shrink-0", look.icon)} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className={cn("text-sm font-semibold", look.title)}>{title}</p>
        {children && <div className={cn("text-sm", look.body)}>{children}</div>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
