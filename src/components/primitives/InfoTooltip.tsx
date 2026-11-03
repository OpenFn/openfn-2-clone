import { cn } from "../../utils/cn";
import Tooltip from "./Tooltip";

interface Props {
  /** Tooltip text, shown on hover. */
  title: string;
  icon?: string;
  iconClass?: string;
  className?: string;
}

/**
 * A grey outline info icon next to a label, with its tooltip above, as the
 * collaborative editor draws it (ConfigureAdaptorModal.tsx). Lightning's
 * LiveView pages use a faded primary icon instead (`Common.tooltip`).
 */
export default function InfoTooltip({
  title,
  icon = "hero-information-circle",
  iconClass = "-mt-0.5 h-4 w-4 text-faint hover:text-muted",
  className,
}: Props) {
  return (
    <Tooltip content={title} side="top">
      <button
        data-ui="info-tooltip"
        type="button"
        className={cn(
          "relative ml-1 cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
          className,
        )}
        aria-label={title}
      >
        <span className={cn(icon, iconClass)} />
      </button>
    </Tooltip>
  );
}
