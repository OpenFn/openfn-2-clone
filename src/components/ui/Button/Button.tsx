import type { ComponentProps, ReactNode } from "react";
import type { Icon } from "@/components/ui/icons";
import { cn } from "@/components/ui/cn";
import { Spinner } from "@/components/ui/Spinner/Spinner";

/** How loud the button is: one `primary` per page as a rule, `secondary` for the rest, `plain` for minor actions. */
export type ButtonVariant = "primary" | "secondary" | "plain";
/** What the action means. `success` comes with its colour roles, when a page needs it. */
export type ButtonTone = "danger";
export type ButtonSize = "xs" | "sm" | "md";

const looks: Record<ButtonVariant, Record<ButtonTone | "none", string>> = {
  primary: {
    none: "border-transparent bg-brand text-on-brand enabled:hover:bg-brand-hover disabled:bg-brand-disabled disabled:text-on-brand-disabled",
    danger: "border-transparent bg-danger-strong text-on-brand enabled:hover:bg-danger-hover disabled:bg-danger-disabled disabled:text-on-brand-disabled",
  },
  secondary: {
    none: "border-strong bg-surface text-body enabled:hover:bg-hover disabled:border-subtle disabled:bg-disabled disabled:text-disabled",
    danger: "border-danger bg-surface text-danger enabled:hover:bg-danger disabled:border-subtle disabled:bg-disabled disabled:text-disabled",
  },
  plain: {
    none: "border-transparent text-muted enabled:hover:bg-hover enabled:hover:text-body disabled:text-disabled",
    danger: "border-transparent text-danger enabled:hover:bg-danger disabled:text-disabled",
  },
};

const sizes: Record<ButtonSize, string> = {
  xs: "px-3 py-1 text-xs",
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
};

type ButtonProps = Omit<ComponentProps<"button">, "className"> & {
  variant?: ButtonVariant;
  tone?: ButtonTone;
  size?: ButtonSize;
  /** Shown before the words. */
  icon?: Icon;
  /**
   * The action is under way: a spinner takes the icon's place and clicks do nothing. Unlike `disabled`, the
   * button keeps its look and its focus, so a keyboard user isn't thrown back to the top of the page.
   */
  pending?: boolean;
  /** Layout only (`w-full`, `self-end`), never how it looks. */
  className?: string;
  children: ReactNode;
};

/**
 * The one button. `variant` says how important the action is, `tone` what it means: removing one thing from a
 * list is `secondary` + `danger`, with its word. Every variant has a border, transparent when there's no edge, so
 * buttons of one size are the same height whatever their variant.
 */
export function Button({ variant = "primary", tone, size = "md", icon: Icon, pending, className, type = "button", onClick, children, ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md border font-medium transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
        "disabled:cursor-not-allowed aria-busy:cursor-wait",
        looks[variant][tone ?? "none"],
        sizes[size],
        className,
      )}
      aria-busy={pending || undefined}
      onClick={pending ? (event) => event.preventDefault() : onClick}
      {...rest}
    >
      {pending ? <Spinner /> : Icon && <Icon size={14} aria-hidden />}
      {children}
    </button>
  );
}
