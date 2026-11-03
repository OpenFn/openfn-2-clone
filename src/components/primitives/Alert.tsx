import type { ReactNode } from "react";
import { cn } from "../../utils/cn";
import type { Tone } from "./tone";
import Heading from "./Heading";
import Text from "./Text";

export type AlertTone = Extract<Tone, "info" | "success" | "warning" | "danger">;

// Lightning's Common.alert_classes/1, written out in full for Tailwind.
const classes: Record<AlertTone, { bg: string; icon: string; header: string; text: string; iconName: string }> = {
  success: {
    bg: "bg-success",
    icon: "text-success-icon",
    header: "text-success-strong",
    text: "text-success",
    iconName: "hero-check-circle-solid",
  },
  warning: {
    bg: "bg-warning",
    icon: "text-warning-icon",
    header: "text-warning-strong",
    text: "text-warning",
    iconName: "hero-exclamation-triangle",
  },
  danger: {
    bg: "bg-danger",
    icon: "text-danger-icon",
    header: "text-danger-strong",
    text: "text-danger",
    iconName: "hero-x-circle-solid",
  },
  info: {
    bg: "bg-info",
    icon: "text-info-icon",
    header: "text-info-strong",
    text: "text-info",
    iconName: "hero-information-circle-solid",
  },
};

interface Props {
  tone: AlertTone;
  header?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}

/**
 * Lightning's `Common.alert` (live/components/common.ex): a tinted,
 * rounded box with a tone icon, an optional header and a message.
 */
export default function Alert({ tone, header, children, className, id }: Props) {
  const c = classes[tone];
  return (
    <div id={id} className={cn("rounded-md p-4 text-wrap", c.bg, className)} data-ui="alert" data-tone={tone} role={tone === "danger" ? "alert" : "status"}>
      <div className={cn("flex", header ? "items-start" : "items-center")}>
        <div className="shrink-0">
          <span className={cn(c.iconName, "block h-5 w-5", c.icon)} />
        </div>
        <div className="ml-3 min-w-0 flex-1">
          {header ? (
            <>
              <Heading size="sm" className={c.header}>
                {header}
              </Heading>
              <Text as="div" className={cn("mt-2", c.text)}>
                {children}
              </Text>
            </>
          ) : (
            <Text as="div" className={c.text}>
              {children}
            </Text>
          )}
        </div>
      </div>
    </div>
  );
}
