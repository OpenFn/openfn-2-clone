import { useState, type ReactNode } from "react";
import { webhookUrl } from "../../utils/urls";
import type { EditorTrigger } from "../../types/workflow-graph";
import { cn } from "../../utils/cn";
import Button from "../primitives/Button";
import Card from "../primitives/Card";
import Disclosure from "../primitives/Disclosure";
import { Field, Radio, TextInput } from "../primitives/Inputs";
import Pill from "../primitives/Pill";
import TextLink from "../primitives/TextLink";
import InspectorLayout, { InspectorFooter } from "./InspectorLayout";
import CopyButton from "../primitives/CopyButton";
import Text from "../primitives/Text";
import { Stack, Row } from "../primitives/Stack";

const TITLES = { webhook: "On webhook call", cron: "On a schedule" } as const;

const IMMEDIATELY = {
  value: "before_start",
  label: "Immediately",
  description: "Responds immediately with a confirmation and work order ID. (Best for long running or queued workflows)",
  shortDescription: "Responds immediately with a confirmation and work order ID.",
} as const;
const ON_COMPLETE = {
  value: "after_completion",
  label: "On Complete",
  description: "Responds when the workflow completes, then returns the result.",
  shortDescription: "Responds when the workflow completes, then returns the result.",
} as const;

/** Green trigger-type pill (trigger/TriggerTypeBadge.tsx). */
export function TriggerTypeBadge({ type = "webhook" }: { type?: "webhook" | "cron" }) {
  const [icon, label] = type === "cron" ? ["hero-clock-mini", "Schedule / Cron"] : ["hero-globe-alt-mini", "Webhook"];
  return (
    <Pill color="green">
      <span className={cn(icon, "h-4 w-4")} />
      {label}
    </Pill>
  );
}

function ReadOnlyField({ id, label, value }: { id: string; label: string; value: string }) {
  // eslint-disable-next-line local/primitive-classname -- debt: F527 colour (text-muted)
  return <TextInput id={id} label={label} value={value} readOnly className="text-muted" />;
}

/** "Webhook URL" with its help text, over the URL box(es). */
function WebhookUrlField({ children }: { children: ReactNode }) {
  return (
    <Field label="Webhook URL" hint="Send a POST request to these URLs to start this event.">
      {children}
    </Field>
  );
}

function EditFooter({ onEdit }: { onEdit: () => void }) {
  return (
    <InspectorFooter
      leftButtons={
        <Button variant="secondary" onClick={onEdit} tooltip="Edit trigger">
          Edit
        </Button>
      }
    />
  );
}

function WizardBreadcrumb({ step, onChoose }: { step: "choose" | "configure"; onChoose?: () => void }) {
  return (
    <nav aria-label="Wizard steps">
      <Text as="div" variant="body-sm">
        <Row gap="sm">
          {step === "configure" && onChoose ? (
            // eslint-disable-next-line local/primitive-classname -- debt: F527 colour (text-faint hover:text-muted)
            <TextLink onClick={onChoose} className="text-faint hover:text-muted">
              Choose
            </TextLink>
          ) : (
            <span className={step === "choose" ? "font-semibold text-strong underline" : "text-faint"}>Choose</span>
          )}
          <span aria-hidden="true" className="text-faint">
            ›
          </span>
          <span className={step === "configure" ? "font-semibold text-strong underline" : "text-faint"}>Configure</span>
        </Row>
      </Text>
    </nav>
  );
}

function WizardFooter({ label, onPrimary, onCancel }: { label: string; onPrimary: () => void; onCancel?: (() => void) | undefined }) {
  const primary = (
    <Button onClick={onPrimary} className={onCancel ? undefined : "w-full"} icon="hero-arrow-right-micro" iconPosition="right">
      {label}
    </Button>
  );
  return onCancel ? (
    <InspectorFooter
      leftButtons={
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      }
      rightButtons={primary}
    />
  ) : (
    primary
  );
}

interface Props {
  trigger: EditorTrigger;
  onChange: (patch: Partial<EditorTrigger>) => void;
  onClose: () => void;
}

/**
 * The trigger inspector (inspector/TriggerInspector.tsx): a read-only "show"
 * panel per type (webhook URL, Authentication, Response; or Frequency and
 * Cron Input Source), and Edit, which steps through Choose › Configure over
 * a draft. The wizard is simplified: Configure offers the response type for
 * webhooks and a raw cron expression for schedules.
 */
export default function TriggerInspector({ trigger, onChange, onClose }: Props) {
  const [view, setView] = useState<"show" | "choose" | "configure">("show");
  const [draft, setDraft] = useState(trigger);

  const startEdit = () => {
    setDraft(trigger);
    setView("choose");
  };

  if (view === "choose") {
    const isCron = draft.type === "cron";
    return (
      <InspectorLayout
        title={TITLES[draft.type]}
        onClose={onClose}
        onBack={isCron ? () => setView("show") : undefined}
        footer={<WizardFooter label="Next" onPrimary={() => setView("configure")} onCancel={isCron ? undefined : () => setView("show")} />}
      >
        <WizardBreadcrumb step="choose" />
        <Card padding="sm" className="flex items-center justify-between">
          <TriggerTypeBadge type={draft.type} />
          <Text>
            <TextLink
              // eslint-disable-next-line local/primitive-classname -- debt: F528 type (font-semibold)
              className="font-semibold"
              onClick={() =>
                setDraft((d) =>
                  d.type === "webhook"
                    ? { ...d, type: "cron", cronExpression: d.cronExpression ?? "0 0 * * *", cronDescription: d.cronDescription ?? "At 12:00 AM" }
                    : { ...d, type: "webhook" }
                )
              }
            >
              Change
            </TextLink>
          </Text>
        </Card>
      </InspectorLayout>
    );
  }

  if (view === "configure") {
    return (
      <InspectorLayout
        title={TITLES[draft.type]}
        onClose={onClose}
        onBack={() => setView("choose")}
        footer={
          <WizardFooter
            label="Finish"
            onPrimary={() => {
              onChange(draft);
              setView("show");
            }}
          />
        }
      >
        <WizardBreadcrumb step="configure" onChoose={() => setView("choose")} />
        {draft.type === "webhook" ? (
          <>
            <WebhookUrlField>
              <Card padding="sm">
                <Text as="div" variant="code-sm" tone="muted" className="break-all">
                  {webhookUrl(draft.id)}
                </Text>
              </Card>
            </WebhookUrlField>
            <Field group label="Response">
              <Stack gap="sm">
                {[IMMEDIATELY, ON_COMPLETE].map((o) => (
                  // eslint-disable-next-line local/primitive-classname -- debt: F526 box (hover:bg-hover)
                  <Card key={o.value} padding="sm" className="hover:bg-hover">
                    <Radio
                      name="webhook-reply"
                      label={o.label}
                      hint={o.description}
                      checked={draft.webhookReply === o.value}
                      onChange={() => setDraft((d) => ({ ...d, webhookReply: o.value }))}
                    />
                  </Card>
                ))}
              </Stack>
            </Field>
          </>
        ) : (
          <TextInput
            id="cron-expression"
            label="Cron Expression"
            hint="Minute, hour, day of month, month, day of week (UTC)."
            value={draft.cronExpression ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, cronExpression: e.target.value, cronDescription: e.target.value }))}
            // eslint-disable-next-line local/primitive-classname -- debt: F528 type (font-mono)
            className="font-mono"
          />
        )}
      </InspectorLayout>
    );
  }

  if (trigger.type === "cron") {
    return (
      <InspectorLayout title={TITLES.cron} onClose={onClose} footer={<EditFooter onEdit={startEdit} />}>
        <Card padding="sm">
          <TriggerTypeBadge type="cron" />
        </Card>
        <ReadOnlyField id="frequency" label="Frequency" value={trigger.cronDescription ?? trigger.cronExpression ?? "Invalid schedule"} />
        <ReadOnlyField id="cron-input-source" label="Cron Input Source" value="Final run state (default)" />
      </InspectorLayout>
    );
  }

  const url = webhookUrl(trigger.id);
  const response = trigger.webhookReply === "after_completion" ? ON_COMPLETE : IMMEDIATELY;
  return (
    <InspectorLayout title={TITLES.webhook} onClose={onClose} footer={<EditFooter onEdit={startEdit} />}>
      <TriggerTypeBadge />
      <WebhookUrlField>
        <Card padding="sm">
          <Stack gap="xs">
            <Row justify="between">
              <Pill>Default</Pill>
              <CopyButton value={url} label="Copy Default URL" size="xs" />
            </Row>
            <Text as="div" variant="code-sm" tone="muted" className="break-all">
              {url}
            </Text>
          </Stack>
        </Card>
      </WebhookUrlField>
      <Disclosure variant="inline" defaultOpen={false} title="Authentication" note={trigger.hasAuthMethod ? "1 configured" : "none configured"}>
        {trigger.hasAuthMethod ? (
          <Text as="div" variant="body-sm">
            <Row gap="sm">
              <span className="hero-shield-check-micro h-4 w-4 text-success-icon" />
              <span className="font-medium text-body">CommCare webhook key</span>
              <span className="text-faint">(API Key)</span>
            </Row>
          </Text>
        ) : (
          <Text as="p" variant="body-sm" tone="muted">
            No authentication configured.{" "}
            {/* eslint-disable-next-line local/primitive-classname -- debt: F528 type (font-medium) */}
            <TextLink onClick={startEdit} className="font-medium">
              Add authentication
            </TextLink>
          </Text>
        )}
      </Disclosure>
      <Disclosure variant="inline" defaultOpen={false} title="Response">
        <Text as="p" variant="body-sm" tone="muted">
          {response.shortDescription}{" "}
          <TextLink to="https://docs.openfn.org/documentation/build/triggers#webhook-responses" external>
            learn more
          </TextLink>
        </Text>
      </Disclosure>
    </InspectorLayout>
  );
}
