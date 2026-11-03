#!/usr/bin/env node
// Turn Lightning project exports into (1) a Kickstart scenario for a local
// Lightning and (2) fixtures for the replica, so both apps show the same data.
//
//   node kickstart/sync.mjs        (or: npm run kickstart:sync)
//
// Reads every kickstart/exports/*.yaml (a project exported from Lightning:
// Project settings > Export, or `openfn pull`) and writes:
//
//   kickstart/scenario.yaml                 load into Lightning with
//                                           `mix lightning.kickstart <path>`
//   src/mock-data/generated/kickstart.ts    projects, workflows, graphs,
//                                           credentials and adaptor docs the
//                                           replica's mock-data modules use
//
// Adaptor docs (the IDE's "Adaptor API" list) come from each adaptor version's
// ast.json on cdn.jsdelivr.net, the same source Lightning uses, so this needs
// network access. Pass --offline to skip them.
//
// Ids: Kickstart derives every project, workflow, job, trigger and edge id
// from its name (lib/lightning/kickstart.ex `stable_id/1`). stableId() below is
// the same derivation, so the replica's ids, and so its URLs, match Lightning's.
//
// Members: exports don't carry members, so every project gets MEMBERS below.
// Credential owners must be one of the demo users (USER_IDS); swap personal
// emails in an export for a demo user before committing it.

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import cronstrue from "cronstrue";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

/** The demo seed's users, and their ids in src/mock-data/users.ts. */
const USER_IDS = {
  "demo@openfn.org": "user-amy",
  "editor@openfn.org": "user-esther",
  "viewer@openfn.org": "user-vikram",
  "super@openfn.org": "user-sizwe",
};

const MEMBERS = [
  { email: "demo@openfn.org", role: "owner" },
  { email: "editor@openfn.org", role: "editor" },
  { email: "viewer@openfn.org", role: "viewer" },
];

/** Canvas spacing the replica's other fixtures use (Lightning's dagre layout). */
const RANK = 260;
const SPREAD = 185;

/** Kickstart's stable_id/1: a name-based SHA-1 UUID (v5 bits, RFC variant). */
function stableId(scope) {
  const b = createHash("sha1").update("lightning.kickstart.v1" + scope).digest().subarray(0, 16);
  b[6] = (b[6] & 0x0f) | 0x50;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = b.toString("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function userId(email) {
  const id = USER_IDS[email.toLowerCase()];
  if (!id) throw new Error(`${email} isn't a demo user; use one of ${Object.keys(USER_IDS).join(", ")}`);
  return id;
}

/** Top-down tree layout: rank = longest path from a trigger, siblings spread evenly. */
function layout(wf) {
  const rank = {};
  for (const key of Object.keys(wf.triggers ?? {})) rank[`trigger:${key}`] = 0;
  const edges = Object.values(wf.edges ?? {});
  for (let changed = true, guard = 0; changed && guard < 100; guard++) {
    changed = false;
    for (const e of edges) {
      const from = e.source_trigger ? `trigger:${e.source_trigger}` : `job:${e.source_job}`;
      const to = `job:${e.target_job}`;
      if (rank[from] !== undefined && (rank[to] ?? -1) < rank[from] + 1) {
        rank[to] = rank[from] + 1;
        changed = true;
      }
    }
  }
  for (const key of Object.keys(wf.jobs ?? {})) rank[`job:${key}`] ??= 1;
  const rows = {};
  for (const [node, r] of Object.entries(rank)) (rows[r] ??= []).push(node);
  const pos = {};
  for (const [r, nodes] of Object.entries(rows)) {
    nodes.forEach((node, i) => {
      pos[node] = { x: (i - (nodes.length - 1) / 2) * SPREAD * 2, y: Number(r) * RANK };
    });
  }
  return pos;
}

/** The IDE Docs panel's functions: every public operation, export and common helper. */
async function adaptorDocs(specifier) {
  const res = await fetch(`https://cdn.jsdelivr.net/npm/${specifier}/ast.json`);
  if (!res.ok) throw new Error(`${specifier}: ast.json ${res.status}`);
  const ast = await res.json();
  const fns = [...(ast.operations ?? []), ...(ast.exports ?? []), ...(ast.common ?? [])];
  const seen = new Set();
  return fns
    .filter((f) => f.docs?.tags?.some((t) => t.title === "public") && !seen.has(f.name) && seen.add(f.name))
    .map((f) => {
      const example = f.docs.tags.find((t) => t.title === "example")?.description;
      return { name: f.name, params: f.params ?? [], description: f.docs.description ?? "", ...(example ? { example } : {}) };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

const offline = process.argv.includes("--offline");
const adaptorSpecifiers = new Set();

const scenario = { users: [], credentials: [], projects: [] };
const fixtures = { projects: [], workflows: [], graphs: [], credentials: [] };
const emails = new Set(MEMBERS.map((m) => m.email));
const now = new Date().toISOString().slice(0, 10) + "T00:00:00Z";

const exportsDir = path.join(here, "exports");
for (const file of readdirSync(exportsDir).filter((f) => /\.ya?ml$/.test(f)).sort()) {
  const doc = yaml.load(readFileSync(path.join(exportsDir, file), "utf8"));
  const projectScope = `project:${doc.name}`;
  const projectId = stableId(projectScope);

  // Credentials: declared once at the top level, exposed to the project by name.
  const credentialNames = {};
  for (const [key, c] of Object.entries(doc.credentials ?? {})) {
    credentialNames[key] = c.name;
    emails.add(c.owner);
    scenario.credentials.push({ name: c.name, owner: c.owner, ...(c.schema ? { schema: c.schema } : {}) });
    fixtures.credentials.push({
      id: stableId(`${projectScope}/credential:${c.name}`),
      name: c.name,
      schema: c.schema ?? "raw",
      ownerId: userId(c.owner),
      projectIds: [projectId],
      externalId: null,
      environments: ["main"],
      transferStatus: null,
      scheduledDeletion: null,
    });
  }

  const workflows = [];
  for (const wf of Object.values(doc.workflows ?? {})) {
    const scope = `${projectScope}/workflow:${wf.name}`;
    const id = (kind, key) => stableId(`${scope}/${kind}:${key}`);
    const jobs = wf.jobs ?? {};
    const triggers = wf.triggers ?? {};
    const edges = wf.edges ?? {};

    // Kickstart's spec: the export's workflow, as a list entry with its jobs'
    // credentials named by the scenario's credential names.
    workflows.push({
      name: wf.name,
      jobs: Object.fromEntries(
        Object.entries(jobs).map(([k, j]) => [
          k,
          { name: j.name, adaptor: j.adaptor, body: j.body, ...(j.credential ? { credential: credentialNames[j.credential] ?? j.credential } : {}) },
        ])
      ),
      triggers,
      edges,
    });

    for (const j of Object.values(jobs)) adaptorSpecifiers.add(j.adaptor);
    const pos = layout(wf);
    const trigger = Object.entries(triggers)[0];
    fixtures.graphs.push({
      id: stableId(scope),
      projectId,
      name: wf.name,
      lockVersion: 1,
      concurrency: wf.concurrency ?? null,
      enableJobLogs: wf.enable_job_logs ?? true,
      jobs: Object.entries(jobs).map(([k, j]) => ({
        id: id("job", k),
        name: j.name,
        adaptor: j.adaptor,
        body: j.body ?? "",
        credentialName: j.credential ? (credentialNames[j.credential] ?? j.credential) : null,
      })),
      triggers: Object.entries(triggers).map(([k, t]) => ({
        id: id("trigger", k),
        type: t.type,
        enabled: !!t.enabled,
        cronExpression: t.cron_expression ?? null,
        cronDescription: t.cron_expression ? cronstrue.toString(t.cron_expression) : null,
        hasAuthMethod: false,
        webhookReply: t.webhook_reply ?? "before_start",
      })),
      edges: Object.entries(edges).map(([k, e]) => ({
        id: id("edge", k),
        sourceTriggerId: e.source_trigger ? id("trigger", e.source_trigger) : null,
        sourceJobId: e.source_job ? id("job", e.source_job) : null,
        targetJobId: id("job", e.target_job),
        conditionType: e.condition_type,
        conditionLabel: e.condition_label ?? null,
        conditionExpression: e.condition_expression ?? null,
        enabled: e.enabled !== false,
      })),
      positions: Object.fromEntries(
        Object.entries(pos).map(([node, p]) => {
          const [kind, key] = node.split(":");
          return [id(kind, key), p];
        })
      ),
    });
    fixtures.workflows.push({
      id: stableId(scope),
      projectId,
      name: wf.name,
      triggerType: trigger ? trigger[1].type : "webhook",
      enabled: trigger ? !!trigger[1].enabled : false,
      triggerLabel: trigger?.[1].cron_expression ? cronstrue.toString(trigger[1].cron_expression) : "Webhook",
      lastRunAt: null,
      lastRunStatus: null,
      workOrderCount: 0,
      failedWorkOrderCount: 0,
      updatedAt: now,
      insertedAt: now,
    });
  }

  scenario.projects.push({
    name: doc.name,
    ...(doc.description ? { description: doc.description } : {}),
    members: MEMBERS,
    credentials: Object.values(credentialNames),
    ...(doc.collections ? { collections: Object.keys(doc.collections).map((name) => ({ name })) } : {}),
    workflows,
  });
  fixtures.projects.push({
    id: projectId,
    name: doc.name,
    description: doc.description ?? "",
    parentId: null,
    color: null,
    concurrency: null,
    retentionPolicy: "retain_all",
    historyRetentionPeriod: null,
    dataclipRetentionPeriod: null,
    requiresMfa: false,
    members: MEMBERS.map((m) => ({ userId: userId(m.email), role: m.role, failureAlert: false, digest: "never" })),
    lastUpdatedAt: now,
    insertedAt: now,
  });
}

const docs = {};
if (!offline) {
  for (const specifier of [...adaptorSpecifiers].sort()) docs[specifier] = await adaptorDocs(specifier);
}

scenario.users = [...emails].sort().map((email) => ({ email }));

const header = "# Generated by kickstart/sync.mjs from kickstart/exports/. Don't edit by hand.\n";
writeFileSync(path.join(here, "scenario.yaml"), header + yaml.dump(scenario, { lineWidth: 120, noRefs: true }));

const ts = `// Generated by kickstart/sync.mjs from kickstart/exports/. Don't edit by hand;
// change the export and run \`npm run kickstart:sync\`. Ids match the ones
// Kickstart gives the same records in Lightning.
import type { Project } from "../../types/projects";
import type { WorkflowSummary } from "../models/workflows";
import type { WorkflowGraph } from "../../types/workflow-graph";
import type { Credential } from "../models/credentials";
import type { AdaptorFunction } from "../../types/adaptors";

export const kickstartProjects: Project[] = ${JSON.stringify(fixtures.projects, null, 2)};

export const kickstartWorkflows: WorkflowSummary[] = ${JSON.stringify(fixtures.workflows, null, 2)};

export const kickstartGraphs: WorkflowGraph[] = ${JSON.stringify(fixtures.graphs, null, 2)};

export const kickstartCredentials: Credential[] = ${JSON.stringify(fixtures.credentials, null, 2)};

/** The IDE Docs panel's "Adaptor API" list, by adaptor specifier (from its ast.json). */
export const kickstartAdaptorDocs: Record<string, AdaptorFunction[]> = ${JSON.stringify(docs, null, 2)};
`;
mkdirSync(path.join(root, "src/mock-data/generated"), { recursive: true });
writeFileSync(path.join(root, "src/mock-data/generated/kickstart.ts"), ts);

console.log(
  `${fixtures.projects.length} project(s), ${fixtures.graphs.length} workflow(s), ${fixtures.credentials.length} credential(s), ` +
    `docs for ${Object.keys(docs).length} adaptor version(s)\n` +
    `wrote kickstart/scenario.yaml and src/mock-data/generated/kickstart.ts`
);
