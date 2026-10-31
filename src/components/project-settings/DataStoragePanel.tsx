import Alert from "../primitives/Alert";
import Button from "../primitives/Button";
import Card from "../primitives/Card";
import Form from "../primitives/Form";
import { Field, Radio, Select } from "../primitives/Inputs";
import SectionHeader from "../primitives/SectionHeader";
import TextLink from "../primitives/TextLink";
import SandboxSettingsBanner from "./SandboxSettingsBanner";
import type { DataStorageSettings, DataStorageValues } from "../../types/project-settings";
import type { RetentionPolicy } from "../../types/projects";
import { useForm } from "../../utils/useForm";

interface Props {
  dataStorage: DataStorageSettings;
  sandbox: boolean;
  /** Saves the form. Rejects with field errors or a message, which the form shows. */
  onSave: (values: DataStorageValues) => Promise<void>;
}

const policies: [RetentionPolicy, string][] = [
  ["retain_all", "Retain all input/output data"],
  ["erase_all", "Never retain input/output data (zero-persistence)"],
];

/** The selects hold a period as a string, "" for none. */
const toForm = (v: DataStorageValues) => ({
  historyRetentionPeriod: v.historyRetentionPeriod === null ? "" : String(v.historyRetentionPeriod),
  dataclipRetentionPeriod: v.dataclipRetentionPeriod === null ? "" : String(v.dataclipRetentionPeriod),
  retentionPolicy: v.retentionPolicy,
});
const toPeriod = (v: string) => (v === "" ? null : Number(v));


/**
 * The Data Storage tab (`#data-storage`, settings.html.heex:862-1053):
 * history retention, the input/output storage policy, and the dataclip
 * retention period. Cancel puts back the saved values.
 */
export default function DataStoragePanel({ dataStorage, sandbox, onSave }: Props) {
  const { periods, limitMessage, canEdit } = dataStorage;
  const form = useForm({
    initial: toForm(dataStorage),
    validate: ({ historyRetentionPeriod, dataclipRetentionPeriod }) => ({
      dataclipRetentionPeriod:
        historyRetentionPeriod !== "" && dataclipRetentionPeriod !== "" && Number(dataclipRetentionPeriod) > Number(historyRetentionPeriod)
          ? ["dataclip retention period must be less or equal to the history retention period"]
          : [],
    }),
  });
  const options = periods.map((d) => [`${d} Days`, String(d)] as [string, string]);
  const eraseAll = form.values.retentionPolicy === "erase_all";
  const noHistory = form.values.historyRetentionPeriod === "";

  return (
    <>
      <SectionHeader
        size="lg"
        title="Data storage"
        subtitle="View or modify data storage settings for this project."
        permissionsSection={canEdit ? undefined : "data storage settings."}
      />
      {sandbox && <SandboxSettingsBanner scope="local" />}
      {/* One card per setting, each a Field named by its label (D253); they save together, as in Lightning. */}
      <Form
        id="retention-settings-form"
        actions={
          <>
            <Button variant="secondary" disabled={!canEdit} onClick={() => form.reset()}>
              Cancel
            </Button>
            <Button id="input-output-retention-period-submit-btn" type="submit" disabled={!canEdit}>
              Save
            </Button>
          </>
        }
          {...form.formProps((v) =>
            onSave({
              historyRetentionPeriod: toPeriod(v.historyRetentionPeriod),
              dataclipRetentionPeriod: toPeriod(v.dataclipRetentionPeriod),
              retentionPolicy: v.retentionPolicy,
            })
          )}
      >
        <Card>
          {/* The plan's note (why the periods are limited) ends the hint, so it's read with the dropdown. */}
          <Select
            id="project_history_retention_period"
            label="History Retention Period"
            hint={
              <>
                Select how long your run history is stored in OpenFn before being removed from the servers.{" "}
                <TextLink href="https://docs.openfn.org/documentation/manage-projects/retention-periods" external>
                  Learn more
                </TextLink>
                <span className="block">This includes all Work Orders, Runs, and Logs.</span>
                {limitMessage && <span className="block">{limitMessage}</span>}
              </>
            }
            prompt="Select Period"
            options={options}
            disabled={!canEdit || periods.length === 1}
            className="w-fit"
            {...form.fieldProps("historyRetentionPeriod")}
          />
        </Card>
        <Card>
          <Field
            group
            label="Input/Output Data Storage Policy"
            hint={
              <>
                The input and output data associated with workflow runs and channel requests is useful for debugging.
                However it can contain sensitive PII. Should OpenFn store this data?{" "}
                <TextLink href="https://docs.openfn.org/documentation/manage-projects/io-data-storage" external>
                  Learn more
                </TextLink>
              </>
            }
            disabled={!canEdit}
          >
            <div className="space-y-2">
              {policies.map(([value, text]) => (
                <Radio
                  key={value}
                  id={value}
                  name="retention_policy"
                  value={value}
                  label={text}
                  checked={form.values.retentionPolicy === value}
                  onChange={() => {
                    form.set("retentionPolicy", value);
                    // settings.ex `validate`: zero-persistence keeps no input/output data, so no period either.
                    if (value === "erase_all") form.set("dataclipRetentionPeriod", "");
                  }}
                />
              ))}
            </div>
          </Field>
          {form.values.retentionPolicy !== "retain_all" && (
            <Alert tone="warning" header="Heads Up!">
              <p>
                When enabled, you will no longer be able to retry workflow runs, and channel request/response payloads
                will not be stored.
              </p>
            </Alert>
          )}
        </Card>
        <Card>
          <Select
            id="project_dataclip_retention_period"
            label="Input/Output Data Retention Period"
            hint="Select how long input/output data is stored. Once input/output data is removed for a given run, you will no longer be able to retry that run."
            prompt="Select Period"
            options={options}
            disabled={!canEdit || noHistory || eraseAll}
            className="w-fit"
            {...form.fieldProps("dataclipRetentionPeriod")}
          />
        </Card>
      </Form>
    </>
  );
}
