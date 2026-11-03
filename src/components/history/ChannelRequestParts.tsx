import type { ChannelEvent } from "../../types/channels";
import { cn } from "../../utils/cn";
import Card from "../primitives/Card";
import { DetailItem, DetailList } from "../primitives/DetailList";
import Pill, { type PillColor } from "../primitives/Pill";
import type { Tone } from "../primitives/tone";
import { formatBinaryBytes as formatBytes } from "../../utils/format";
import CopyButton from "../primitives/CopyButton";
import EmptyState from "../primitives/EmptyState";
import Text from "../primitives/Text";
import { Stack } from "../primitives/Stack";

/*
 * Building blocks of the channel request page
 * (channel_request_live/components.ex).
 */

const methodColors: Record<string, PillColor> = {
  GET: "blue",
  POST: "green",
  PUT: "yellow",
  PATCH: "yellow",
  DELETE: "red",
};

export function MethodBadge({ method }: { method: string | null | undefined }) {
  return (
    // eslint-disable-next-line local/primitive-classname -- debt: type (font-bold uppercase)
    <Pill variant="square" color={(method && methodColors[method]) || "gray"} className="font-bold uppercase">
      <code>{method || "—"}</code>
    </Pill>
  );
}

export function RequestPathDisplay({ event }: { event: ChannelEvent | undefined }) {
  return (
    <Text variant="code-md" tone="strong" className="break-all">
      {event?.requestPath}
      {event?.requestQueryString && <span className="text-muted">?{event.requestQueryString}</span>}
    </Text>
  );
}

function statusTone(status: number | null | undefined): Tone {
  if (status == null || status < 200) return "neutral";
  if (status >= 500) return "danger";
  if (status >= 400) return "warning";
  if (status >= 300) return "info";
  return "success";
}

/** An HTTP status code chip, coloured by class (`status_code_display`, `status_code_badge`). */
export function StatusCodeBadge({ status }: { status: number | null | undefined }) {
  return (
    // eslint-disable-next-line local/primitive-classname -- debt: type (font-bold)
    <Pill variant="square" tone={statusTone(status)} className="font-bold">
      <code>{status ?? "—"}</code>
    </Pill>
  );
}

export function SectionSizeBadge({ size }: { size: number }) {
  return <Text variant="code-sm" tone="faint">{formatBytes(size)}</Text>;
}

export function HeadersList({ headers }: { headers: [string, string][] }) {
  return (
    <DetailList size="sm">
      {headers.map(([name, value], i) => (
        // Headers repeat (set-cookie, via), so the key is the position.
        <DetailItem key={i} label={name} variant="code">
          <span className={cn("break-all", value === "[REDACTED]" && "italic text-faint")}>{value}</span>
        </DetailItem>
      ))}
    </DetailList>
  );
}

function contentTypeOf(headers: [string, string][] | null) {
  return headers?.find(([n]) => n.toLowerCase() === "content-type")?.[1] ?? null;
}

function contentTypeLabel(ct: string) {
  if (ct.includes("json")) return "JSON";
  if (ct.includes("xml")) return "XML";
  if (ct.includes("html")) return "HTML";
  if (ct.includes("text/")) return "TEXT";
  return ct;
}

const isText = (ct: string) => ["text/", "json", "xml", "javascript", "html"].some((t) => ct.includes(t));

/** A request or response body preview (`body_viewer`). */
export function BodyViewer({
  preview,
  hash,
  size,
  headers,
}: {
  preview: string | null;
  hash: string | null;
  size: number | null;
  headers: [string, string][] | null;
}) {
  const ct = contentTypeOf(headers);
  if (size === 0 && !preview) {
    return (
      <EmptyState variant="plain" icon="hero-document" message="No body" />
    );
  }
  if (ct && !isText(ct)) {
    return (
      // eslint-disable-next-line local/primitive-classname -- debt: box (py-4)
      <Text as="div" tone="muted" className="flex items-center gap-2 py-4">
        <Pill variant="square">
          <code>{contentTypeLabel(ct)}</code>
        </Pill>
        {size != null && <span>{formatBytes(size)}</span>}
        {hash && <Text variant="code-sm" tone="faint">SHA256: {hash}</Text>}
      </Text>
    );
  }
  // The stored size is in bytes; so is the comparison (components.ex used byte_size).
  const previewBytes = preview == null ? 0 : new TextEncoder().encode(preview).length;
  if (preview == null) {
    return (
      // eslint-disable-next-line local/primitive-classname -- debt: box (py-4)
      <Text as="div" tone="muted" className="py-4">
        Body not captured
        {/* eslint-disable-next-line local/primitive-classname -- debt: margin (ml-1) */}
        {size != null && <Text variant="body-sm" tone="faint" className="ml-1">({formatBytes(size)})</Text>}
      </Text>
    );
  }
  return (
    <Text as="div" variant="body-sm" tone="faint">
      <Stack gap="xs">
        <Card variant="muted" padding="none" className="relative">
          <div className="absolute right-2 top-2 flex items-center gap-1.5">
            {ct && (
              <Pill variant="square">
                <code>{contentTypeLabel(ct)}</code>
              </Pill>
            )}
            {/* eslint-disable-next-line local/primitive-classname -- debt: box (bg-surface) */}
            <CopyButton value={preview} label="Copy body" size="xs" className="bg-surface" />
          </div>
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-all p-3 pr-20 font-mono text-body">{preview}</pre>
        </Card>
        {hash && (
          <div className="flex items-center gap-2 pt-1">
            <span className="font-mono">SHA256: {hash.slice(0, 16)}...</span>
            <CopyButton value={hash} label="Copy hash" size="xs" />
          </div>
        )}
        {size != null && size > previewBytes && (
          <div>
            Preview: {formatBytes(previewBytes)} of {formatBytes(size)}
          </div>
        )}
      </Stack>
    </Text>
  );
}

/** The Response section's placeholder when no response came back (`response_empty`). */
export function ResponseEmpty({
  type,
  errorCode,
  humanMessage,
}: {
  type: "transport" | "credential";
  errorCode: string;
  humanMessage: string;
}) {
  const [icon, label] =
    type === "transport"
      ? ["hero-exclamation-triangle", "No response received"]
      : ["hero-lock-closed", "Request not sent — credential error"];
  return (
    // eslint-disable-next-line local/primitive-classname -- debt: box (border-t border-subtle)
    <EmptyState variant="plain" icon={icon} title={label} message={humanMessage} className="border-t border-subtle">
      <Pill variant="square">
        <code>{errorCode}</code>
      </Pill>
    </EmptyState>
  );
}
