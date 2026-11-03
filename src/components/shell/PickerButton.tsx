import { cn } from "../../utils/cn";
import { prefersDarkText } from "../../utils/colour";
import Tooltip from "../primitives/Tooltip";

interface Props {
  label: string;
  /** Hero icon class, e.g. `hero-folder`. */
  icon?: string;
  /** Event dispatched on `document.body`; the matching Picker listens for it. */
  openEvent?: string;
  isSandbox?: boolean;
  /** Accent icon in sandbox mode. */
  accentIcon?: string;
  /** Sandbox accent background. */
  color?: string | null;
}

/**
 * The project picker trigger at the start of the breadcrumbs (Lightning's
 * assets/js/picker/PickerButton.tsx). Sandboxes render in their own colour
 * with a beaker, and a deep path is shortened to its last two parts.
 */
export default function PickerButton({
  label,
  icon = "hero-folder",
  openEvent = "open-project-picker",
  isSandbox = false,
  accentIcon = "hero-beaker",
  color,
}: Props) {
  const parts = label.split("/");
  const truncated = isSandbox && parts.length > 2;
  const visible = truncated ? parts.slice(-2) : parts;
  // Lightning always writes white on the sandbox colour; a light colour gets dark text instead, for contrast.
  const onLight = isSandbox && !!color && prefersDarkText(color);
  const accent = onLight ? "text-on-light" : "text-on-dark";

  const button = (
    // eslint-disable-next-line no-restricted-syntax -- debt: a secondary Button that takes the sandbox colour at runtime
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        document.body.dispatchEvent(new CustomEvent(openEvent));
      }}
      className={cn(
        // eslint-disable-next-line no-restricted-syntax -- a control that owns its type: the picker button
        "flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm font-medium transition-colors",
        isSandbox
          ? cn("border-transparent hover:opacity-90", onLight ? "text-on-light" : "text-on-dark")
          : "border-strong bg-surface text-body hover:border-emphasis hover:bg-hover"
      )}
      style={isSandbox ? { backgroundColor: color ?? "var(--background-color-brand)" } : undefined}
    >
      <span className={cn("h-4 w-4", isSandbox ? `${accentIcon} ${accent}` : `${icon} text-muted`)} />
      <span>
        {isSandbox && parts.length > 1 ? (
          <>
            {truncated && <span className="opacity-50">…</span>}
            {visible.map((part, i) => (
              <span key={i}>
                {(i > 0 || truncated) && <span>:</span>}
                {part}
              </span>
            ))}
          </>
        ) : (
          label
        )}
      </span>
      <span className={cn("hero-chevron-down h-4 w-4 shrink-0", isSandbox ? accent : "text-faint")} />
    </button>
  );
  return <Tooltip content={truncated ? parts.join(" > ") : undefined}>{button}</Tooltip>;
}
