import Pill from "../primitives/Pill";
import Tooltip from "../primitives/Tooltip";

/**
 * The workflow version a run used (Common.snapshot_version_chip): "latest"
 * in primary, or an older snapshot's version number in yellow. The tooltip
 * is also the chip's label, as Lightning's Tooltip hook made it.
 */
export default function SnapshotVersionChip({ version, tooltip }: { version: string; tooltip?: string }) {
  return (
    <Tooltip content={tooltip}>
      {/* Pill takes no ref, so this span is the tooltip's trigger. */}
      <span aria-label={tooltip}>
        {version === "latest" ? (
          <Pill variant="square" color="primary">
            {version}
          </Pill>
        ) : (
          <Pill variant="square" tone="warning">
            {version}
          </Pill>
        )}
      </span>
    </Tooltip>
  );
}
