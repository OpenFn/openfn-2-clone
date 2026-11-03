import { useState } from "react";
// eslint-disable-next-line no-restricted-imports -- debt: the workflow editor takes the replica's models until it is split into page and .replica.tsx wrapper (STANDARDS §11).
import type { Dataclip } from "../../mock-data/models/history";
import { cn } from "../../utils/cn";
import DataclipTypePill from "../domain/DataclipTypePill";
import Button from "../primitives/Button";
import Card from "../primitives/Card";
import FileDropZone from "../primitives/FileDropZone";
import Heading from "../primitives/Heading";
import CloseButton from "../primitives/CloseButton";
import IconButton from "../primitives/IconButton";
import { Field } from "../primitives/Inputs";
import CodeEditor from "../primitives/CodeEditor";
import Tabs from "../primitives/Tabs";
import InspectorLayout, { InspectorFooter } from "./InspectorLayout";
import NewRunButton from "./NewRunButton";
import SearchInput from "../primitives/SearchInput";
import { matchesQuery } from "../../utils/search";
import { formatLocalDate, formatShortLocalDateTime, prettyJson, shortUuid, uuidOf } from "../../utils/format";
import Tooltip from "../primitives/Tooltip";
import EmptyState from "../primitives/EmptyState";
import Text from "../primitives/Text";
import { Row } from "../primitives/Stack";

type Tab = "empty" | "custom" | "existing";

export interface ManualRunInput {
  kind: Tab;
  dataclipId?: string;
  body?: string;
}

interface Props {
  title: string;
  /** `standalone` floats over the canvas; `embedded` fills the IDE's right panel. */
  mode?: "standalone" | "embedded";
  dataclips: Dataclip[];
  /** Started from a path: nothing to run from. */
  fromEdge?: boolean;
  onClose: () => void;
  onRun: (input: ManualRunInput) => void;
  /** Embedded only: the X beside the tabs. */
  onClosePanel?: () => void;
  /** "Run with custom input" opens on the Custom tab. */
  initialTab?: Tab;
}

/**
 * Manual run panel (ManualRunPanel.tsx + manual-run-panel/views): choose the
 * input (Empty, a custom JSON body, or an existing dataclip) and run from
 * the selected job or trigger. Standalone it is a fixed-height inspector
 * card with "Run From Here"; embedded in the IDE the header's Run is used.
 */
export default function ManualRunPanel({
  title,
  mode = "standalone",
  dataclips,
  fromEdge = false,
  onClose,
  onRun,
  onClosePanel,
  initialTab = "empty",
}: Props) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [selected, setSelected] = useState<Dataclip | null>(null);
  const [body, setBody] = useState("");
  const [query, setQuery] = useState("");
  const [namedOnly, setNamedOnly] = useState(false);
  const embedded = mode === "embedded";

  const tabOptions = [
    { id: "empty" as const, label: "Empty", icon: "hero-document" },
    { id: "custom" as const, label: embedded ? "Custom" : "New", icon: "hero-pencil-square" },
    { id: "existing" as const, label: "Existing", icon: "hero-queue-list" },
  ];

  const visible = dataclips
    .filter((d) => !d.wiped)
    .filter((d) => !namedOnly || d.name)
    .filter((d) => d.id.startsWith(query.trim().toLowerCase()) || matchesQuery(query, d.name))
    .slice(0, 10);

  let parseError: string | null = null;
  if (tab === "custom" && body.trim()) {
    try {
      JSON.parse(body);
    } catch (e) {
      parseError = (e as Error).message;
    }
  }

  const tabContent = (
    <>
      {tab === "empty" && <p className="px-6 pt-4 pb-8 text-center text-muted">Use an empty JSON object as the input for this run.</p>}
      {tab === "custom" && (
        <div className={cn("flex h-full flex-col", embedded ? "pt-2" : "pt-3")}>
          <div className="shrink-0 px-3 pt-2">
            <FileDropZone
              accept=".json"
              label="Upload a file or drag and drop"
              hint="JSON, up to 8MB"
              invalidMessage="Invalid file format. Please only upload: JSON"
              onFile={(file) => void file.text().then((text) => setBody(prettyJson(text)))}
            />
            {/* eslint-disable-next-line local/primitive-classname -- debt: box (py-2 *:bg-emphasis) */}
            <Text as="div" tone="muted" className="flex items-center gap-2 py-2 *:h-px *:flex-1 *:bg-emphasis" aria-hidden="true">
              <span />
              OR
              <span />
            </Text>
          </div>
          <Field errors={parseError ? [parseError] : []} className="flex min-h-48 flex-1 flex-col overflow-hidden">
            <CodeEditor value={body} onChange={setBody} language="json" ariaLabel="Custom input" className="min-h-0 flex-1" />
          </Field>
        </div>
      )}
      {tab === "existing" && (
        // eslint-disable-next-line local/primitive-classname -- debt: box (px-3 pt-4 pb-6)
        <Text as="div" className="flex flex-col gap-3 px-3 pt-4 pb-6">
          <Row>
            <SearchInput value={query} onChange={setQuery} placeholder="Search names or UUID prefixes" size="sm" className="flex-1" />
            <Button>Search</Button>
            <IconButton icon="hero-calendar-days" label="Filter by date created" />
            <IconButton icon="hero-rectangle-group" label="Filter by type" />
            <IconButton icon="hero-tag" label="Named only" active={namedOnly} onClick={() => setNamedOnly((n) => !n)} />
          </Row>
          <div className="flex flex-col gap-3 overflow-auto">
            {visible.length ? (
              visible.map((clip, i) => (
                <Card
                  key={clip.id}
                  as="button"
                  padding="none"
                  onClick={() => setSelected(clip)}
                  // eslint-disable-next-line local/primitive-classname -- debt: box (rounded-md px-3 py-2 shadow-none hover:border-primary-600 hover:bg-hover hover:shadow-none)
                  className="group flex items-center justify-between gap-2 rounded-md px-3 py-2 shadow-none hover:border-primary-600 hover:bg-hover hover:shadow-none"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {i === 0 ? (
                      <Tooltip content="Current dataclip for this step">
                        <span
                          role="img"
                          aria-label="Current dataclip for this step"
                          className="hero-star-solid size-4 shrink-0 text-primary-400 group-hover:text-primary-600"
                        />
                      </Tooltip>
                    ) : (
                      <span className="hero-document-text size-4 shrink-0 group-hover:text-primary-600" />
                    )}
                    <span className="truncate font-mono">{clip.name || shortUuid(uuidOf(clip.id), 7)}</span>
                    <DataclipTypePill type={clip.type} />
                  </div>
                  <Text variant="body-sm" className="truncate">
                    {formatShortLocalDateTime(clip.insertedAt)}
                  </Text>
                </Card>
              ))
            ) : (
              <EmptyState variant="plain" message="No dataclips match the filter." />
            )}
            {visible.length > 0 && <p className="text-center text-muted">Search results are limited to the 10 most recent matches for this step.</p>}
          </div>
        </Text>
      )}
    </>
  );

  const selectedView = selected && (
    <div className="flex h-full flex-col">
      <div className={cn("flex items-center justify-between gap-4 pb-4", embedded ? "px-3 pt-3" : "px-6 pt-4")}>
        <div className="flex min-w-0 flex-col gap-1">
          <Row>
            <Heading className="min-w-0 wrap-break-word">{selected.name || "Unnamed"}</Heading>
            <IconButton icon="hero-pencil" label="Rename" size="xs" />
          </Row>
          <Text as="div" variant="body-sm" tone="muted">
            <Row gap="sm">
              <span className="capitalize">{selected.type.replace("_", " ")}</span>
              <span>•</span>
              <span>{formatLocalDate(selected.insertedAt)}</span>
            </Row>
          </Text>
        </div>
        <IconButton icon="hero-x-mark" label="Unselect dataclip" onClick={() => setSelected(null)} />
      </div>
      <div className="min-h-64 flex-1">
        <CodeEditor value={JSON.stringify(selected.body, null, 2)} language="json" readOnly ariaLabel="Dataclip body" />
      </div>
    </div>
  );

  const edgeMessage = <EmptyState variant="plain" fill message="Select a Step or Trigger to start a Run from" />;

  const run = () => onRun(selected ? { kind: "existing", dataclipId: selected.id } : { kind: tab, body });

  if (embedded) {
    return (
      <div className="flex h-full flex-col" data-annotation="workflow-editor-manual-run">
        {!selected && !fromEdge && (
          <Tabs
            variant="pill"
            fill
            // eslint-disable-next-line local/primitive-classname -- debt: box (px-3 pt-2 pb-1)
            className="shrink-0 px-3 pt-2 pb-1"
            tabs={tabOptions}
            active={tab}
            onChange={setTab}
            after={onClosePanel && <CloseButton label="Close panel" size="xs" onClick={onClosePanel} />}
          />
        )}
        <div className="flex-1 overflow-auto">{fromEdge ? edgeMessage : selected ? selectedView : <div className="flex h-full min-h-0 flex-col">{tabContent}</div>}</div>
      </div>
    );
  }

  return (
    <InspectorLayout
      title={title}
      onClose={onClose}
      fixedHeight
      bare
      onBack={onClose}
      annotation="workflow-editor-manual-run"
      footer={
        <InspectorFooter
          rightButtons={
            <NewRunButton
              onClick={run}
              disabled={fromEdge || !!parseError}
              disabledReason={parseError ? "Fix the JSON input to run" : undefined}
            >
              Run From Here
            </NewRunButton>
          }
        />
      }
    >
      {fromEdge ? (
        edgeMessage
      ) : selected ? (
        selectedView
      ) : (
        <div className="flex h-full min-h-0 flex-col">
          <div className="px-3 pt-4">
            <Tabs variant="pill" fill tabs={tabOptions} active={tab} onChange={setTab} />
          </div>
          {tabContent}
        </div>
      )}
    </InspectorLayout>
  );
}
