import type { ReactNode } from "react";
import Alert from "../primitives/Alert";
import Card from "../primitives/Card";
import Text from "../primitives/Text";
import { cn } from "../../utils/cn";

/**
 * The white form card on logged-out pages: half the centred column on
 * desktop, with the controller's error / info flash at the top. Children
 * stack in a grid, so buttons stretch to the card's width as in Lightning.
 */
export default function AuthCard({
  error,
  info,
  children,
}: {
  error?: ReactNode;
  info?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card padding="lg" className="grid gap-4 sm:w-2/3 md:w-1/2">
      {error && <Alert tone="danger">{error}</Alert>}
      {info && <Alert tone="info">{info}</Alert>}
      {children}
    </Card>
  );
}

/**
 * The small links row at the bottom of a card: one left, one right.
 * `divider` puts Lightning's `Form.divider` rule above it (hidden on mobile).
 */
export function AuthFooterLinks({ left, right, divider = false }: { left?: ReactNode; right?: ReactNode; divider?: boolean }) {
  return (
    <Text as="div" variant="body-sm" tone="body" className={cn("flex justify-between", divider && "sm:border-t sm:border-subtle sm:pt-5")}>
      <div>{left}</div>
      <div>{right}</div>
    </Text>
  );
}
