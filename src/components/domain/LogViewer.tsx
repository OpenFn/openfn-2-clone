import { useMemo, useState } from "react";
import type { LogLine } from "../../types/history";
import { logsAtLevel } from "../../utils/history";
import { cn } from "../../utils/cn";
import { prettyJson } from "../../utils/format";
import CodeViewer, { type LineRange } from "../primitives/CodeViewer";
import Menu, { MenuItem } from "../primitives/Menu";
import EmptyState from "../primitives/EmptyState";
import Text from "../primitives/Text";
import TextPingLoader from "../primitives/TextPingLoader";

export type LogLevel = "debug" | "info" | "warn" | "error";
const levels: LogLevel[] = ["debug", "info", "warn", "error"];

/** The log level dropdown in the viewer's header (viewers.ex `log_level_filter`). */
export function LogLevelFilter({ selected, onChange }: { selected: LogLevel; onChange: (l: LogLevel) => void }) {
  return (
    <Menu
      align="end"
      className="w-32"
      trigger={
        // eslint-disable-next-line no-restricted-syntax -- debt: a text-only menu trigger on the dark log panel; Button has no look for dark surfaces
        <button
          type="button"
          // The visible level stays in the name, so "click info" reaches it by voice.
          aria-label={`Log level: ${selected}`}
          // eslint-disable-next-line no-restricted-syntax -- debt: a control's own type; waits on a Button look for dark surfaces
          className="inline-flex items-center gap-1 text-xs/4 opacity-75 hover:opacity-100 @md:text-sm/6"
        >
          <span className="hero-adjustments-vertical size-4 @md:size-6" />
          <span>{selected}</span>
          <span className="hero-chevron-down size-4" aria-hidden="true" />
        </button>
      }
    >
      {levels.map((l) => (
        <MenuItem key={l} selected={l === selected} onClick={() => onChange(l)}>
          {l}
        </MenuItem>
      ))}
    </Menu>
  );
}

/**
 * A run's log (viewers.ex `log_viewer` + assets/js/log-viewer): a dark
 * slate panel with the level filter on top and the lines in Monaco below,
 * each `SOURCE message`. Lines from the selected step get a yellow bar and
 * the first of them is scrolled near the top; new lines are appended.
 * Shows "No logs were received for this run." for a finished run with no
 * logs, and a pinging "Nothing yet" while it's still going.
 */
export default function LogViewer({
  logs,
  finished,
  selectedStepId,
  waitingMessage = "Nothing yet",
  defaultLevel = "info",
  onLevelChange,
  className,
}: {
  logs: LogLine[];
  /** The run is in a final state. */
  finished: boolean;
  selectedStepId?: string | null;
  waitingMessage?: string;
  defaultLevel?: LogLevel;
  /** The viewer picked a level; the host may remember it. */
  onLevelChange?: (level: LogLevel) => void;
  className?: string;
}) {
  const [level, setLevel] = useState<LogLevel>(defaultLevel);
  const changeLevel = (next: LogLevel) => {
    setLevel(next);
    onLevelChange?.(next);
  };

  // One pass: the text, and the selected step's lines as merged ranges.
  const { text, highlighted } = useMemo(() => {
    const entries: string[] = [];
    const highlighted: LineRange[] = [];
    let lineCount = 0;
    for (const log of logsAtLevel(logs, level)) {
      const entry = `${log.source} ${prettyJson(log.message)}`;
      const start = lineCount + 1;
      lineCount += entry.split("\n").length;
      entries.push(entry);
      if (!selectedStepId || log.stepId !== selectedStepId) continue;
      const last = highlighted.at(-1);
      if (last && last.end === start - 1) last.end = lineCount;
      else highlighted.push({ start, end: lineCount });
    }
    return { text: entries.join("\n"), highlighted };
  }, [logs, level, selectedStepId]);

  // Jump to the step only when it changes, or when its lines first arrive; a
  // level change leaves the reader where they are, as Lightning does.
  const firstLine = highlighted[0]?.start;
  const [reveal, setReveal] = useState({ step: selectedStepId, line: firstLine });
  if (reveal.step !== selectedStepId || (reveal.line === undefined && firstLine !== undefined)) {
    setReveal({ step: selectedStepId, line: firstLine });
  }

  if (finished && logs.length === 0) {
    return <EmptyState variant="plain" message="No logs were received for this run." />;
  }

  return (
    <div className="flex flex-col grow rounded-md bg-code font-mono text-code @container overflow-hidden">
      <div className="flex h-6 flex-row-reverse items-center border-b border-emphasis px-2 @md:h-8">
        <LogLevelFilter selected={level} onChange={changeLevel} />
      </div>
      <div className={cn("flex grow", className)}>
        <div className="relative grow">
          {text === "" ? (
            // eslint-disable-next-line local/primitive-classname -- debt: F526 box, F528 type (p-12 text-center)
            <Text as="div" variant="code-sm" className="p-12 text-center">
              <TextPingLoader>{waitingMessage}</TextPingLoader>
            </Text>
          ) : (
            <div className="absolute inset-0">
              <CodeViewer
                value={text}
                language="openFnLogs"
                ariaLabel="Run log"
                highlighted={highlighted}
                revealLine={reveal.line}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
