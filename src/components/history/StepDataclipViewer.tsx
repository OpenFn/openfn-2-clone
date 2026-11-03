import type { RunStep, StepDataclip } from "../../types/history";
import JsonViewer from "./JsonViewer";
import TextPingLoader from "../primitives/TextPingLoader";
import WipedDataViewer from "./WipedDataViewer";
import EmptyState from "../primitives/EmptyState";
import Text from "../primitives/Text";

/**
 * A selected step's input or output on the run page (viewers.ex
 * `step_dataclip_viewer`): the wiped box, a "could not be saved" note,
 * "Nothing yet" while running, the JSON body, or the reason it could not be
 * loaded. A dataclip whose body has not arrived yet shows an empty viewer, as
 * Lightning's does while it fetches.
 */
export default function StepDataclipViewer({
  step,
  dataclip,
  inputOrOutput,
  runFinished,
  projectId,
  canEditDataRetention,
  adminContacts,
}: {
  step: Pick<RunStep, "inputDataclipId" | "outputDataclipId" | "finishedAt"> | undefined;
  dataclip: StepDataclip | undefined;
  inputOrOutput: "input" | "output";
  runFinished: boolean;
  projectId: string;
  canEditDataRetention: boolean;
  /** Named in the wiped notice when the viewer cannot change the policy. */
  adminContacts?: string[];
}) {
  const field = inputOrOutput === "input" ? step?.inputDataclipId : step?.outputDataclipId;
  const wiped = dataclip?.wiped || (step?.finishedAt && !field);
  if (wiped) {
    return (
      <WipedDataViewer
        dataLabel={inputOrOutput}
        projectId={projectId}
        canEditDataRetention={canEditDataRetention}
        adminContacts={adminContacts ?? []}
      />
    );
  }
  if (!dataclip) {
    return runFinished ? (
      <EmptyState variant="plain" message={`No ${inputOrOutput} state could be saved for this run.`} />
    ) : (
      // eslint-disable-next-line local/primitive-classname -- debt: box, type, colour (rounded-md bg-code p-12 text-center text-code)
      <Text as="div" variant="code-sm" className="rounded-md bg-code p-12 text-center text-code">
        <TextPingLoader>Nothing yet</TextPingLoader>
      </Text>
    );
  }
  return (
    // Monaco fills a sized box; a min-height alone doesn't give it one.
    <div className="relative h-full min-h-96 grow">
      <div className="absolute inset-0">
        <JsonViewer body={dataclip.body} ariaLabel={inputOrOutput === "input" ? "Input" : "Output"} />
      </div>
    </div>
  );
}
