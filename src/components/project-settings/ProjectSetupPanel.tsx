import { useState } from "react";
import Button from "../primitives/Button";
import { TextArea } from "../primitives/Inputs";
import SectionHeader from "../primitives/SectionHeader";
import NameField from "../primitives/NameField";
import TextLink from "../primitives/TextLink";
import SandboxSettingsBanner from "./SandboxSettingsBanner";
import Card from "../primitives/Card";
import ConfirmModal from "../primitives/ConfirmModal";
import Form from "../primitives/Form";
import { useToast } from "../primitives/Toast";
import Toggle from "../primitives/Toggle";
import type { ParentProjectRef, ProjectIdentityValues, SetupSettings } from "../../types/project-settings";
import { errorMessage } from "../../utils/errors";
import { urlSafeName } from "../../utils/format";
import { useChosenValue } from "../../utils/useChosenValue";
import { useForm } from "../../utils/useForm";
import { blank } from "../../utils/validate";
import PlanLimitNote from "../domain/PlanLimitNote";

interface Props {
  setup: SetupSettings;
  /** The parent, when the project is a sandbox. */
  parent: ParentProjectRef | null;
  /** Saves Project Identity. Rejects with field errors (`rawName`) or a message, which the form shows inline. */
  onSaveIdentity: (values: ProjectIdentityValues) => Promise<void>;
  /** Saves Concurrency Override: 1 for one run at a time, null for parallel. */
  onSaveConcurrency: (concurrency: number | null) => Promise<void>;
}

/**
 * The Setup tab (`#project`, settings.html.heex:67-313): Project Identity
 * form, Concurrency Override, Export, and the danger zone. As in Lightning,
 * Identity's Save is enabled whenever the user can edit. Concurrency is a
 * switch that saves at once.
 */
export default function ProjectSetupPanel({ setup, parent, onSaveIdentity, onSaveConcurrency }: Props) {
  const { canEditProject, canDeleteProject } = setup;
  const sandbox = parent !== null;
  const identity = useForm<ProjectIdentityValues>({
    initial: { rawName: setup.name, description: setup.description },
    validate: ({ rawName }) => ({ rawName: blank(urlSafeName(rawName)) }),
  });
  const toast = useToast();
  // One setting, so it saves as you switch it (a switch takes effect now), after a confirm when turning it on.
  const serial = useChosenValue(setup.concurrency === 1, (on: boolean) => onSaveConcurrency(on ? 1 : null), (e) =>
    toast(errorMessage(e), "danger")
  );
  const [confirmingSerial, setConfirmingSerial] = useState(false);

  return (
    <>
      <SectionHeader
        size="lg"
        title={sandbox ? "Sandbox setup" : "Project setup"}
        subtitle={
          sandbox
            ? "Sandboxes are isolated copies of a project for safe experimentation."
            : "Projects are isolated workspaces that contain workflows, accessible to certain users."
        }
        permissionsSection={canEditProject ? undefined : "basic settings, but you can export a copy."}
      />
      {sandbox && <SandboxSettingsBanner scope="local" />}
      <Card
        title={sandbox ? "Sandbox Identity" : "Project Identity"}
        description={
          parent ? (
            <>
              Identifies this sandbox within its parent: <TextLink to={parent.settingsHref}>{parent.name}</TextLink>
            </>
          ) : (
            "This metadata helps you identify the types of workflows managed in this project and the people that have access."
          )
        }
      >
        <Form
          id="project-settings-form"
          {...identity.formProps(onSaveIdentity)}
          actions={
            <Button id="project-identity-submit-btn" type="submit" disabled={!canEditProject}>
              Save
            </Button>
          }
        >
          <NameField
            id="project-settings-form_raw_name"
            label="Project name"
            disabled={!canEditProject}
            {...identity.fieldProps("rawName")}
            badgeLabel="Your project will be named"
          />
          <TextArea
            id="project-settings-form_description"
            label="Project description"
            hint="A short description of a project (max 240 characters)"
            disabled={!canEditProject}
            maxLength={240}
            {...identity.fieldProps("description")}
          />
        </Form>
      </Card>

      <Card
        title="Concurrency Override"
        description={
          <span className="block space-y-2">
            <span className="block">
              By default, runs are executed concurrently in accordance to limits set on individual workflows. In some
              situations, you may want to prevent concurrent execution across all workflows in a project.
            </span>
            <span className="block">
              Disabling parallel run execution ensures that only one run is executed at a time, regardless of
              workflow, for this entire project.
            </span>
          </span>
        }
      >
        <Toggle
          id="project-concurrency-switch"
          checked={serial.value}
          onChange={(on) => (on ? setConfirmingSerial(true) : serial.choose(false))}
          disabled={!canEditProject || setup.concurrencyLimitMessage !== null}
          label="Disable parallel execution"
          note="(No more than one run at a time)"
          // The plan's reason, under the switch it locks and read with it.
          description={setup.concurrencyLimitMessage && <PlanLimitNote>{setup.concurrencyLimitMessage}</PlanLimitNote>}
        />
        <ConfirmModal
          open={confirmingSerial}
          onClose={() => setConfirmingSerial(false)}
          title="Disable parallel execution"
          confirmLabel="Disable parallel execution"
          onConfirm={() => {
            serial.choose(true);
            setConfirmingSerial(false);
          }}
        >
          <p>Disabling parallel run execution may significantly reduce the overall throughput of your project.</p>
        </ConfirmModal>
      </Card>

      <Card
        title="Export your Project"
        description="Export your project as code, to save this version or edit your project locally."
      >
        <Button href={setup.exportHref} target="_blank">
          Export project
        </Button>
      </Card>

      {canDeleteProject && (
        <Card
          title="The danger zone"
          description={
            sandbox
              ? "Deleting this sandbox is irreversible. It removes every workflow, trigger, version, keychain clone, and dataclip that lives only inside it."
              : "Deleting your project is irreversible"
          }
        >
          <Button tone="danger" to={setup.deleteHref}>
            {sandbox ? "Delete sandbox" : "Delete project"}
          </Button>
        </Card>
      )}
    </>
  );
}
