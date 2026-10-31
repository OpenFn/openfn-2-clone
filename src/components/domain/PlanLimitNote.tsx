import type { ReactNode } from "react";
import { Row } from "../primitives/Stack";
import Text from "../primitives/Text";

/**
 * Why a setting is locked by the plan, under the control it locks: a lock and
 * the hosted plan's message. Every plan limit says it this way, so a change to
 * plans shows up the same everywhere.
 */
export default function PlanLimitNote({ children }: { children: ReactNode }) {
  return (
    <Row gap="xs" className="items-start">
      <span className="hero-lock-closed-micro mt-0.75 size-2.5 flex-none text-muted" aria-hidden="true" />
      <Text variant="body-sm" tone="muted">
        {children}
      </Text>
    </Row>
  );
}
