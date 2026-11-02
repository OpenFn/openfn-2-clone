import type { WorkOrderDisplayState } from "../../types/workflows";
import { cn } from "../../utils/cn";
import DateTime from "../primitives/DateTime";
import { stateLabel } from "../../utils/history";
import { WORK_ORDER_DOT as DOT, WORK_ORDER_TEXT as TEXT } from "../../theme/runStateColours";
import Text from "../primitives/Text";

/**
 * The "Latest Work Order" cell (DashboardComponents.state_card /
 * status_card): a coloured dot (pinging while active), the state, and when.
 * With no work order it reads "Nothing last 30 days".
 */
export default function WorkOrderStatus({
  state,
  updatedAt,
  period = "last 30 days",
}: {
  state: WorkOrderDisplayState | null;
  updatedAt?: string | undefined;
  period?: string;
}) {
  if (!state) {
    return (
      <div className="flex items-center gap-x-2">
        <span className="h-2 w-2 rounded-full bg-emphasis" />
        <span className="italic">Nothing {period}</span>
      </div>
    );
  }
  const active = state === "pending" || state === "running";
  const text = stateLabel(state);
  return (
    <div>
      <div className="flex items-center gap-x-2">
        <span className="relative flex h-2 w-2">
          {active && <span className={cn("absolute h-full w-full animate-ping rounded-full opacity-75", DOT[state])} />}
          <span className={cn("relative h-2 w-2 rounded-full", DOT[state])} />
        </span>
        <span className={cn(TEXT[state], "font-medium")}>{text}</span>
      </div>
      {updatedAt && (
        // eslint-disable-next-line local/primitive-classname -- debt: F525 margin (mt-1 ml-4)
        <Text variant="body-sm" className="mt-1 ml-4 block">
          <DateTime value={updatedAt} className="block" />
        </Text>
      )}
    </div>
  );
}
