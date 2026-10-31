import Tooltip from "./Tooltip";

/**
 * A value people paste somewhere else (an external id, a keychain path): a
 * grey monospace chip, cut off with an ellipsis when its box is narrow.
 * Hover or focus shows the whole value; a click copies it.
 */
export default function CopyChip({ value }: { value: string }) {
  return (
    <Tooltip content={value} copy={value}>
      <button
        type="button"
        aria-label={`Copy ${value}`}
        data-ui="copy-chip"
        className="block max-w-full cursor-pointer truncate rounded-md bg-subtle px-2 py-0.5 font-mono text-xs text-body hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        {value}
      </button>
    </Tooltip>
  );
}
