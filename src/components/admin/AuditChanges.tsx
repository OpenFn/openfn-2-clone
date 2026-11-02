import type { AuditEvent, AuditValue } from "../../types/admin";
import Card from "../primitives/Card";
import { Td } from "../primitives/Table";
import Text from "../primitives/Text";
import { Stack } from "../primitives/Stack";

/** Values print as Lightning's HEEx prints them: `true` as "true", nil as "". */
const show = (value: AuditValue) => (value === null ? "" : String(value));

/**
 * The change strip under each audit row (AuditLive.Index `diff`): every
 * changed field as `field old → new` (old struck through), then any
 * encrypted credential bodies, or "No changes". Renders a full-width <td>.
 */
export default function AuditChanges({ audit }: { audit: AuditEvent }) {
  const before = audit.changes.before ?? {};
  const after = audit.changes.after ?? {};
  const changes = [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .sort()
    .map((key) => ({ key, old: before[key] ?? null, next: after[key] ?? null }));
  const bodies = Object.entries(audit.credentialBodies ?? {})
    .map(([key, value]) => [key.replace(/^body:/, ""), value] as const)
    .sort(([a], [b]) => a.localeCompare(b));

  if (changes.length === 0 && bodies.length === 0) {
    return (
      // eslint-disable-next-line local/primitive-classname -- debt: F526 box (p-6!)
      <Td colSpan={4} className="p-6! break-all">
        <Text as="div" variant="code-sm">
          No changes
        </Text>
      </Td>
    );
  }

  return (
    // eslint-disable-next-line local/primitive-classname -- debt: F526 box (p-4!)
    <Td colSpan={4} className="p-4! break-all">
      <Text as="div" variant="code-sm">
        {changes.length > 0 && (
          // eslint-disable-next-line local/primitive-classname -- debt: F525 margin (mb-3)
          <Card variant="muted" padding="sm" as="ul" className="mb-3 space-y-2">
            {changes.map(({ key, old, next }) => (
              <li key={key}>
                <span className="font-semibold">{key}</span>&nbsp;{" "}
                {old !== null && (
                  <>
                    <span className="text-muted line-through">{show(old)}</span>{" "}
                    <span className="hero-arrow-right mx-2 h-4 w-4 text-faint" />{" "}
                  </>
                )}
                <span className="text-strong">{show(next)}</span>
              </li>
            ))}
          </Card>
        )}
        {bodies.length > 0 && (
          <Card variant="muted" padding="sm">
            <Stack as="ul" gap="sm">
              {bodies.map(([env, body]) => (
                <li key={env}>
                  <span className="font-semibold">body:{env}</span>&nbsp; <span className="text-body">{body}</span>
                </li>
              ))}
            </Stack>
          </Card>
        )}
      </Text>
    </Td>
  );
}
