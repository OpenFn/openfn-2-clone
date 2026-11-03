import { DisclosureButton, DisclosurePanel, Disclosure as HeadlessDisclosure } from "@headlessui/react";
import type { ReactNode } from "react";
import { cn } from "../../utils/cn";
import Card from "./Card";
import Heading from "./Heading";
import Text from "./Text";

export type DisclosureVariant = "card" | "section" | "inline";

interface Props {
  id?: string;
  title: ReactNode;
  /** Shown after the title, e.g. a status pill or a count. */
  titleRight?: ReactNode;
  /** A muted note in brackets after the title (`inline` only). */
  note?: ReactNode;
  defaultOpen?: boolean;
  /**
   * `card`: a white card whose header toggles it. `section`: a collapsible
   * sub-panel inside a card, under a divider. `inline`: a small text toggle
   * inside a form.
   */
  variant?: DisclosureVariant;
  /** Body padding (`card` only); `none` for full-bleed content such as code. */
  padding?: "md" | "none";
  children: ReactNode;
}

/**
 * A header that shows and hides its body, with the open state exposed to
 * assistive tech. The chevron points down when open and right when closed.
 */
export default function Disclosure({ id, title, titleRight, note, defaultOpen = true, variant = "card", padding = "md", children }: Props) {
  const chevron = (size: string) => (
    <span className={cn("hero-chevron-down-mini shrink-0 text-faint transition-transform group-data-open:rotate-0 -rotate-90", size)} />
  );

  if (variant === "inline") {
    return (
      <HeadlessDisclosure as="div" id={id} defaultOpen={defaultOpen} data-ui="disclosure" data-variant="inline">
        <DisclosureButton className="group flex items-center gap-1.5 text-strong">
          {chevron("h-3.5 w-3.5")}
          <Text variant="label-md">{title}</Text>
          {note && <Text variant="body-sm" className="text-muted">({note})</Text>}
          {titleRight}
        </DisclosureButton>
        <DisclosurePanel className="mt-2">{children}</DisclosurePanel>
      </HeadlessDisclosure>
    );
  }

  if (variant === "section") {
    return (
      <HeadlessDisclosure as="div" id={id} defaultOpen={defaultOpen} data-ui="disclosure" data-variant="section" className="border-t border-subtle">
        <DisclosureButton className="group flex w-full items-center gap-2 px-4 py-2.5">
          <Heading size="xs" as="p">
            {title}
          </Heading>
          {titleRight}
          <span className="ml-auto">{chevron("h-4 w-4")}</span>
        </DisclosureButton>
        <DisclosurePanel className="px-4 pb-3">{children}</DisclosurePanel>
      </HeadlessDisclosure>
    );
  }

  return (
    <Card id={id} padding="none">
      <HeadlessDisclosure defaultOpen={defaultOpen}>
        <DisclosureButton className="group flex w-full items-center gap-3 p-4">
          <Heading size="sm">{title}</Heading>
          {titleRight}
          <span className="ml-auto">{chevron("h-5 w-5")}</span>
        </DisclosureButton>
        <DisclosurePanel className={cn(padding === "md" && "px-4 pb-4")}>{children}</DisclosurePanel>
      </HeadlessDisclosure>
    </Card>
  );
}
