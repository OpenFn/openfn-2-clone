import { useState, type ReactNode } from "react";
import { formatNumber } from "../../../utils/format";
import type {
  ErrorSignatures,
  HealthQuery,
  HealthRange,
  Outcomes,
  RunVolume,
  WorkOrderStateCounts,
} from "../../../types/workflow-health";
import { FailureBreakdownDonut, OutcomesDonut } from "./HealthDonuts";
import StepFailureBars from "./StepFailureBars";
import TriageTable from "./TriageTable";
import Alert from "../../primitives/Alert";
import Card from "../../primitives/Card";
import Section from "../../primitives/Section";
import Spinner from "../../primitives/Spinner";
import Tabs from "../../primitives/Tabs";
import Text from "../../primitives/Text";
import VolumeBars from "./VolumeBars";
import { FRAME } from "./palette";
import { Stack } from "../../primitives/Stack";

type Tab = "Work orders" | "Runs";

const windowLabel = (days: HealthRange["days"]) => (days === "1" ? "24 hours" : `${days} days`);

const workOrders = (counts: WorkOrderStateCounts) => {
  const n = Object.values(counts).reduce((sum, c) => sum + c, 0);
  return `${formatNumber(n)} work order${n === 1 ? "" : "s"}`;
};

/**
 * The workflow health page body (assets/js/health/WorkflowHealth.tsx), under
 * the page header's workflow name and range picker: Work orders / Runs tabs over the
 * Outcomes, Failure breakdown and Steps with failures cards (or Runs over
 * time), and the triage table. Each endpoint's reply comes in on its own, so
 * one panel can be loading or failed while the others show numbers.
 */
export default function WorkflowHealth({
  projectId,
  workflowId,
  days,
  outcomes,
  failures,
  runs,
}: {
  projectId: string;
  workflowId: string;
  /** The selected range (the page header's RangePicker sets it). */
  days: HealthRange["days"];
  /** The `outcomes` reply: both donuts. */
  outcomes: HealthQuery<Outcomes>;
  /** The `failures` reply: Steps with failures and the triage table. */
  failures: HealthQuery<ErrorSignatures>;
  /** The `runs` reply: Runs over time. */
  runs: HealthQuery<RunVolume>;
}) {
  const [tab, setTab] = useState<Tab>("Work orders");
  const empty = (noun = "finished work orders") => `No ${noun} in the last ${windowLabel(days)}`;
  const links = { projectId, workflowId };

  return (
    <Stack gap="lg">
      <Tabs<Tab>
        tabs={[
          { id: "Work orders", label: "Work orders" },
          { id: "Runs", label: "Runs" },
        ]}
        active={tab}
        onChange={setTab}
        label="Count by"
        // eslint-disable-next-line local/primitive-classname -- debt: F526 box (border-b-0)
        className="border-b-0"
      />
      {tab === "Work orders" ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card padding="lg" title="Outcomes" action={outcomes.data && meta(workOrders(outcomes.data.counts))} className="flex flex-col">
            <Panel query={outcomes}>
              {({ counts, window }) => <OutcomesDonut counts={counts} emptyMessage={empty()} {...links} from={window.from} />}
            </Panel>
          </Card>
          <Card padding="lg" title="Failure breakdown" className="flex flex-col">
            <Panel query={outcomes}>
              {({ counts, window }) => <FailureBreakdownDonut counts={counts} emptyMessage={empty("failures")} {...links} from={window.from} />}
            </Panel>
          </Card>
          <Card padding="lg" title="Steps with failures" className="flex flex-col">
            <Panel query={failures}>{({ signatures }) => <StepFailureBars signatures={signatures} emptyMessage={empty("failures")} />}</Panel>
          </Card>
        </div>
      ) : (
        <Card
          padding="lg"
          title="Runs over time"
          action={runs.data && meta(`${runs.data.bucket_hours >= 24 ? "daily" : `${runs.data.bucket_hours}-hour`} buckets · ${runs.data.timezone}`)}
        >
          <Panel query={runs}>
            {({ buckets, bucket_hours, timezone }) => (
              <VolumeBars buckets={buckets} hours={bucket_hours} timezone={timezone} emptyMessage={empty("runs")} {...links} />
            )}
          </Panel>
        </Card>
      )}

      <Section title="Triage - grouped by failure type">
        <Panel query={failures} card>
          {({ signatures, window }) => <TriageTable signatures={signatures} emptyMessage={empty("failures")} {...links} from={window.from} />}
        </Panel>
      </Section>
    </Stack>
  );
}

/**
 * One panel's reply. Numbers win over an error, so a failed refresh keeps
 * what is on screen; an error with nothing to keep says so; neither is loading.
 * `card` puts those two in a card of their own (the triage table has none).
 */
function Panel<T>({ query, card = false, children }: { query: HealthQuery<T>; card?: boolean; children: (data: T) => ReactNode }) {
  if (query.data) return children(query.data);
  const status = query.error ? (
    <Alert tone="danger">{query.error}</Alert>
  ) : (
    <div className={`${FRAME} flex items-center justify-center text-faint`} aria-busy="true">
      <Spinner size="md" label="Loading…" />
    </div>
  );
  return card ? <Card padding="lg">{status}</Card> : status;
}

/** The small gray note at the right of a card's title. */
const meta = (text: string) => <Text variant="body-sm" tone="muted">{text}</Text>;
