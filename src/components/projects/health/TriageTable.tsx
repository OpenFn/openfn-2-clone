import { formatNumber } from "../../../utils/format";
import { historyUrl, stateUrl } from "../../../utils/history";
import type { ErrorSignature, FailureState } from "../../../types/workflow-health";
import Button from "../../primitives/Button";
import Card from "../../primitives/Card";
import Pill from "../../primitives/Pill";
import { Table, Td, Th, Tr } from "../../primitives/Table";
import Text from "../../primitives/Text";
import { DOT, EMPTY, FAILURE_COLORS, adaptorLabel } from "./palette";
import { Stack } from "../../primitives/Stack";

// One tip per error type the worker reports (TriageTable.tsx `TIPS`).
const TIPS: Record<string, string> = {
  RuntimeError: "Job code hit a value it didn't expect, often a missing input field.",
  JobError: "The job code intentionally threw this error.",
  AdaptorError: "An error occurred while an adaptor operation was underway.",
  CompileError: "Job code couldn't be compiled, so no step ever ran.",
  RuntimeCrash: "Job code threw an error the runtime couldn't recover from, so the run was abandoned.",
  ReferenceError: "Job code referred to something that doesn't exist, often a typo or a missing import.",
  SyntaxError: "Job code tried to parse text that wasn't in the format it expected, most often JSON.",
  ValidationError: "The workflow or a job isn't in a shape the runtime accepts, so nothing ran.",
  ImportError: "A module or adaptor the job imports couldn't be loaded, so nothing ran.",
  EdgeConditionError: "An edge condition failed to evaluate, so the run couldn't pick a next step.",
  InputError: "The run's starting input couldn't be used, so nothing ran.",
  DataClipError: "The run's input data couldn't be loaded, so no step ever started.",
  ExitError: "The process running this workflow exited before finishing.",
  OOMError: "The run used more memory than it's allowed and was stopped.",
  StateTooLargeError: "The state passed between steps grew past its size limit.",
  TimeoutError: "The run hit its time limit and was stopped part-way through.",
  SecurityError: "The job tried something the worker doesn't allow and was stopped.",
  AutoinstallError: "The adaptor this workflow needs couldn't be installed, so nothing ran.",
  CredentialLoadError: "A credential couldn't be loaded, so no step could authenticate.",
  ExecutionError: "Something failed inside OpenFn rather than in this workflow.",
  LostAfterClaim: "The run was picked up but never started, so nothing ran.",
  LostAfterStart: "The run started but never reported back, so how far it got is unknown.",
  RunLimitExceeded: "The project was over its run limit, so no run was created for this request.",
  default: "The step failed without a recognised error type; check its logs.",
};

const OUTCOMES: Partial<Record<string, FailureState>> = {
  fail: "failed",
  crash: "crashed",
  kill: "killed",
  exception: "exception",
  lost: "lost",
  rejected: "rejected",
};

// A rejected work order has no run for the signature filter to match, so its
// row uses History's `rejected` flag. Other rows set no status filter: the
// signature filter already keeps to failed work orders (TriageTable.tsx).
function signatureUrl(projectId: string, workflowId: string, from: string, s: ErrorSignature) {
  if (s.exit_reason === "rejected") return stateUrl(projectId, workflowId, from, "rejected");
  return historyUrl(projectId, workflowId, {
    date_after: from,
    error_signature_exit_reason: s.exit_reason,
    error_signature_error_type: s.error_type,
    error_signature_job_id: s.job_id,
  });
}

const errorTypeOf = ({ error_type }: ErrorSignature) => error_type || "unknown";

function Signature({ signature }: { signature: ErrorSignature }) {
  const state = OUTCOMES[signature.exit_reason];
  const color = state && FAILURE_COLORS[state];
  return (
    <Stack gap="sm">
      <p className="flex items-center gap-2 font-medium text-strong capitalize">
        {color && <span aria-hidden="true" className={DOT} style={{ backgroundColor: color }} />}
        {state ?? errorTypeOf(signature)}
      </p>
      {/* eslint-disable-next-line local/primitive-classname -- debt: F526 box (border-l-2 border-strong pl-2) */}
      <Text as="p" variant="code-md" tone="strong" className="border-l-2 border-strong pl-2" style={{ borderColor: color }}>
        {signature.exit_reason}:{errorTypeOf(signature)}
        {signature.step_name && ` @ ${signature.step_name}`}
      </Text>
      {signature.adaptor && (
        <Text as="p" variant="code-md" tone="muted">
          {adaptorLabel(signature.adaptor)}
        </Text>
      )}
    </Stack>
  );
}

/**
 * "Triage - grouped by failure type": failed work orders grouped by error
 * signature, largest first, each with a suggestion and a link to History
 * (TriageTable.tsx). With no failures it's a card with the
 * empty message.
 */
export default function TriageTable({
  signatures,
  emptyMessage,
  projectId,
  workflowId,
  from,
}: {
  signatures: ErrorSignature[];
  emptyMessage: string;
  projectId: string;
  workflowId: string;
  /** The reply's `window.from`: where every row's History link starts. */
  from: string;
}) {
  if (signatures.length === 0) {
    return (
      <Card padding="lg">
        <Text as="p" tone="muted" className={EMPTY}>{emptyMessage}</Text>
      </Card>
    );
  }
  return (
    <div className="overflow-x-auto">
      <Table
        header={
          <Tr>
            <Th className="w-1/8">Work orders</Th>
            <Th>Signature</Th>
            <Th>Suggestion</Th>
            <Th actions align="right">Actions</Th>
          </Tr>
        }
      >
        {signatures.map((s) => (
          <Tr key={[s.exit_reason, s.error_type, s.step_name, s.adaptor, s.job_id].join("|")}>
            <Td>
              {/* eslint-disable-next-line local/primitive-classname -- debt: F528 type (tabular-nums) */}
              <Pill className="tabular-nums">{formatNumber(s.count)}</Pill>
            </Td>
            <Td>
              <Signature signature={s} />
            </Td>
            <Td>{(s.error_type && TIPS[s.error_type]) || TIPS["default"]}</Td>
            <Td actions>
              {s.exit_reason && (
                <Button variant="secondary" to={signatureUrl(projectId, workflowId, from, s)} className="whitespace-nowrap">
                  View history
                </Button>
              )}
            </Td>
          </Tr>
        ))}
      </Table>
    </div>
  );
}
