/**
 * PROTOTYPE: the Environments tab. On the main project it manages the
 * environments (named sets of credential values); on a sandbox it picks
 * which environment the sandbox runs with.
 */
import { useState } from "react";
import Alert from "../primitives/Alert";
import Button from "../primitives/Button";
import Card from "../primitives/Card";
import ConfirmModal from "../primitives/ConfirmModal";
import FormModal from "../primitives/FormModal";
import { PasswordInput, TextArea, TextInput } from "../primitives/Inputs";
import Pill from "../primitives/Pill";
import SectionHeader from "../primitives/SectionHeader";
import Text from "../primitives/Text";
import TextLink from "../primitives/TextLink";
import { Table, Td, Th, Tr } from "../primitives/Table";
import { useToast } from "../primitives/Toast";
import { credentials as allCredentials } from "../../mock-data/credentials";
import { findProject } from "../../mock-data/projects";
import { cn } from "../../utils/cn";
import {
  addEnvironment,
  fieldsFor,
  pointProject,
  ROOT_PROJECT_ID,
  saveValue,
  useEnvironments,
  type Environment,
  type EnvironmentsState,
} from "./environmentsStore";

interface Props {
  projectId: string;
  sandbox: boolean;
  parentName?: string | undefined;
}

const rootCredentials = allCredentials.filter((c) => c.projectIds.includes(ROOT_PROJECT_ID));

function coverage(state: EnvironmentsState, envId: string) {
  return rootCredentials.filter((c) => state.values[c.id]?.[envId]).length;
}

function usedBy(state: EnvironmentsState, envId: string) {
  return Object.entries(state.pointers)
    .filter(([, e]) => e === envId)
    .map(([pid]) => findProject(pid))
    .filter((p) => p !== undefined);
}

function CoverageBar({ set, total }: { set: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((set / total) * 100);
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="text-muted">Credential values</span>
        <span className="font-medium">
          {set} of {total} set
        </span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={cn("h-full rounded-full", pct === 100 ? "bg-green-500" : "bg-primary-500")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function EnvironmentCard({ env, state }: { env: Environment; state: EnvironmentsState }) {
  const set = coverage(state, env.id);
  const projects = usedBy(state, env.id);
  return (
    <Card padding="md" className="flex flex-col gap-4" id={`env-card-${env.id}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={cn("hero-squares-2x2 size-5", env.protected ? "text-red-600" : "text-primary-600")} />
          <code className="text-base font-semibold">{env.name}</code>
        </div>
        <div className="flex gap-1">
          {env.protected && <Pill tone="danger">Protected</Pill>}
          {env.builtIn && <Pill tone="neutral">Default</Pill>}
        </div>
      </div>
      <Text as="p" className="text-muted">
        {env.description}
      </Text>
      <CoverageBar set={set} total={rootCredentials.length} />
      <div className="text-sm">
        <span className="text-muted">Used by: </span>
        {projects.length === 0 ? (
          <span className="text-muted italic">no projects yet</span>
        ) : (
          projects.map((p, i) => (
            <span key={p.id}>
              {i > 0 && ", "}
              <span className="font-medium">{p.name}</span>
              {p.parentId && <span className="text-muted"> (sandbox)</span>}
            </span>
          ))
        )}
      </div>
    </Card>
  );
}

function ValueModal({
  target,
  state,
  onClose,
}: {
  target: { credentialId: string; envId: string } | null;
  state: EnvironmentsState;
  onClose: () => void;
}) {
  const toast = useToast();
  const cred = rootCredentials.find((c) => c.id === target?.credentialId);
  const existing = target ? state.values[target.credentialId]?.[target.envId] : undefined;
  const [fields, setFields] = useState<Record<string, string>>({});
  const [lastKey, setLastKey] = useState("");
  const key = target ? `${target.credentialId}/${target.envId}` : "";
  if (key !== lastKey) {
    setLastKey(key);
    setFields(existing ?? {});
  }
  if (!target || !cred) return null;
  const schemaFields = fieldsFor(cred.schema);
  return (
    <FormModal
      open
      onClose={onClose}
      formId="environment-value-form"
      title={
        <>
          {cred.name} <span className="text-muted">in</span> <code>{target.envId}</code>
        </>
      }
      description={`These values are only used by projects running with the ${target.envId} environment. Other environments keep their own values.`}
      submitLabel="Save value"
      formClassName="space-y-4"
      onSubmit={() => {
        saveValue(target.credentialId, target.envId, fields);
        toast(`${cred.name} saved for ${target.envId}`);
        onClose();
      }}
    >
      {schemaFields.map((f) =>
        f.secret ? (
          <PasswordInput
            key={f.key}
            id={`env-value-${f.key}`}
            label={f.label}
            placeholder={f.placeholder}
            value={fields[f.key] ?? ""}
            onChange={(e) => setFields({ ...fields, [f.key]: e.target.value })}
          />
        ) : (
          <TextInput
            key={f.key}
            id={`env-value-${f.key}`}
            label={f.label}
            placeholder={f.placeholder}
            value={fields[f.key] ?? ""}
            onChange={(e) => setFields({ ...fields, [f.key]: e.target.value })}
          />
        )
      )}
    </FormModal>
  );
}

function AddEnvironmentModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  return (
    <FormModal
      open={open}
      onClose={onClose}
      formId="add-environment-form"
      title="Add environment"
      description="A new, empty set of credential values. Sandboxes can then point at it."
      submitLabel="Add environment"
      submitDisabled={name.trim() === ""}
      formClassName="space-y-4"
      onSubmit={() => {
        addEnvironment(name, description);
        toast(`Environment ${name.trim().toLowerCase()} added`);
        setName("");
        setDescription("");
        onClose();
      }}
    >
      <TextInput id="env-name" label="Name" placeholder="staging" value={name} onChange={(e) => setName(e.target.value)} />
      <TextArea
        id="env-description"
        label="Description"
        placeholder="What these credentials connect to"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
    </FormModal>
  );
}

function ProjectEnvironments({ state }: { state: EnvironmentsState }) {
  const [editing, setEditing] = useState<{ credentialId: string; envId: string } | null>(null);
  const [adding, setAdding] = useState(false);
  const allEmpty = Object.values(state.values).every((v) => Object.keys(v).length === 0);
  return (
    <>
      <SectionHeader
        size="lg"
        title="Environments"
        subtitle="An environment is a set of credential values. This project and each of its sandboxes run with one environment's values."
        action={
          <Button id="add-environment-button" icon="hero-plus" onClick={() => setAdding(true)}>
            Add environment
          </Button>
        }
      />
      {allEmpty && (
        <Alert tone="info" header="Your environments are ready to fill">
          Every project starts with <code>production</code> and <code>development</code>, both empty. Add a value for
          each credential your workflows use, then point sandboxes at the environment they should use.
        </Alert>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {state.environments.map((env) => (
          <EnvironmentCard key={env.id} env={env} state={state} />
        ))}
      </div>
      <Card
        padding="none"
        title={<span className="block px-4 pt-4">Credential values</span>}
        description={
          <span className="block px-4">
            One row per credential, one column per environment. Each value is saved on its own.
          </span>
        }
      >
        <div className="p-4">
          <Table
            id="environment-values-table"
            header={
              <Tr>
                <Th>Credential</Th>
                {state.environments.map((env) => (
                  <Th key={env.id}>
                    <code>{env.name}</code>
                  </Th>
                ))}
              </Tr>
            }
          >
            {rootCredentials.map((c) => (
              <Tr key={c.id}>
                <Td>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-muted">{c.schema}</div>
                </Td>
                {state.environments.map((env) => {
                  const value = state.values[c.id]?.[env.id];
                  return (
                    <Td key={env.id}>
                      {value ? (
                        <div className="flex items-center gap-2">
                          <Pill tone="success">Set</Pill>
                          <Button
                            size="xs"
                            variant="secondary"
                            onClick={() => setEditing({ credentialId: c.id, envId: env.id })}
                          >
                            Edit
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted">Not set</span>
                          <Button
                            size="xs"
                            variant="secondary"
                            icon="hero-plus"
                            id={`add-value-${c.id}-${env.id}`}
                            onClick={() => setEditing({ credentialId: c.id, envId: env.id })}
                          >
                            Add value
                          </Button>
                        </div>
                      )}
                    </Td>
                  );
                })}
              </Tr>
            ))}
          </Table>
        </div>
      </Card>
      <ValueModal target={editing} state={state} onClose={() => setEditing(null)} />
      <AddEnvironmentModal open={adding} onClose={() => setAdding(false)} />
    </>
  );
}

function SandboxEnvironment({ projectId, parentName, state }: { projectId: string; parentName: string; state: EnvironmentsState }) {
  const toast = useToast();
  const current = state.pointers[projectId] ?? "development";
  const [confirming, setConfirming] = useState<string | null>(null);
  const total = rootCredentials.length;
  const currentEnv = state.environments.find((e) => e.id === current);
  const missing = rootCredentials.filter((c) => !state.values[c.id]?.[current]);

  const choose = (envId: string) => {
    if (envId === current) return;
    const env = state.environments.find((e) => e.id === envId);
    if (env?.protected) {
      setConfirming(envId);
    } else {
      pointProject(projectId, envId);
      toast(`This sandbox now runs with ${envId}`);
    }
  };

  return (
    <>
      <SectionHeader
        size="lg"
        title="Environment"
        subtitle={
          <>
            Pick the set of credential values this sandbox runs with. Environments are managed in{" "}
            <TextLink to={`/projects/${ROOT_PROJECT_ID}/settings#environments`}>{parentName}</TextLink>.
          </>
        }
      />
      <div className="space-y-3" role="radiogroup" aria-label="Environment">
        {state.environments.map((env) => {
          const set = coverage(state, env.id);
          const picked = env.id === current;
          return (
            <button
              key={env.id}
              type="button"
              role="radio"
              aria-checked={picked}
              id={`pick-env-${env.id}`}
              onClick={() => choose(env.id)}
              className={cn(
                "flex w-full items-center justify-between gap-4 rounded-lg border bg-surface p-4 text-left shadow-xs",
                picked ? "border-primary-600 ring-1 ring-primary-600" : "border-gray-300 hover:border-gray-400"
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full border",
                    picked ? "border-primary-600 bg-primary-600" : "border-gray-300"
                  )}
                >
                  {picked && <span className="size-2 rounded-full bg-white" />}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <code className="font-semibold">{env.name}</code>
                    {env.protected && <Pill tone="danger">Protected</Pill>}
                    {picked && <Pill tone="info">Current</Pill>}
                  </div>
                  <Text as="p" className="text-muted">
                    {env.description}
                  </Text>
                </div>
              </div>
              <span className="shrink-0 text-sm text-muted">
                {set} of {total} credentials set
              </span>
            </button>
          );
        })}
      </div>
      {missing.length > 0 ? (
        <Alert tone="warning" header={`${missing.length} credential${missing.length === 1 ? " has" : "s have"} no ${current} value`}>
          Steps that use {missing.map((c) => c.name).join(", ")} will fail in this sandbox until someone adds a{" "}
          <code>{current}</code> value in <TextLink to={`/projects/${ROOT_PROJECT_ID}/settings#environments`}>{parentName}</TextLink>.
        </Alert>
      ) : (
        <Alert tone="success" header={`Every credential has a ${current} value`}>
          Runs in this sandbox use {currentEnv?.name} values for all {total} credentials.
        </Alert>
      )}
      <ConfirmModal
        open={confirming !== null}
        onClose={() => setConfirming(null)}
        title="Run this sandbox with production credentials?"
        confirmLabel="Use production"
        tone="danger"
        onConfirm={() => {
          if (confirming) {
            pointProject(projectId, confirming);
            toast(`This sandbox now runs with ${confirming}`);
          }
          setConfirming(null);
        }}
        confirmation={{ id: "confirm-production", label: 'Type "production" to confirm', expected: "production" }}
      >
        <Text as="p">
          Workflows in this sandbox will read from and write to live systems. Only project admins of {parentName} can
          make this change, and it is recorded in the audit trail.
        </Text>
      </ConfirmModal>
    </>
  );
}

export default function EnvironmentsPanel({ projectId, sandbox, parentName }: Props) {
  const state = useEnvironments();
  return sandbox ? (
    <SandboxEnvironment projectId={projectId} parentName={parentName ?? "the parent project"} state={state} />
  ) : (
    <ProjectEnvironments state={state} />
  );
}
