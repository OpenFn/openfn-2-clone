/**
 * The sandboxes page's view of the project tree (Lightning's
 * `SandboxLive.Index` decorates each project with an env badge, deletion
 * state and per-sandbox permissions). Built on projects.ts, plus one sandbox
 * scheduled for deletion so that section renders.
 */
import { findProject, projects } from "./projects";
import type { Project } from "../types/projects";
import type { MergePreviewResult, SandboxRow } from "../types/sandboxes";

/** A project in the workspace tree, as the replica's server holds it. */
export interface SandboxFixture {
  id: string;
  name: string;
  color: string | null;
  parentId: string | null;
  env: string | null;
  scheduledDeletion: string | null;
  /** Who created it in the replica. Lightning makes the creator its owner. */
  ownerId?: string;
}

const envs: Record<string, string> = {
  "8c1d2e3f-4a5b-4c6d-9e7f-0a1b2c3d4e5f": "staging",
};

const scheduled: SandboxFixture[] = [
  {
    id: "2b3c4d5e-6f70-4a81-92b3-c4d5e6f70a81",
    name: "old-import-test",
    color: "#5AA1F0",
    parentId: "4adf2644-ed4e-4f97-a24c-ab35b3cb1efa",
    env: null,
    scheduledDeletion: "2026-10-21T00:00:00Z",
  },
];

/** Every project and sandbox, as fixtures the replica can change. */
export function workspaceFixtures(): SandboxFixture[] {
  const live = projects.map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    parentId: p.parentId,
    env: envs[p.id] ?? null,
    scheduledDeletion: null,
  }));
  return [...live, ...scheduled];
}

/** What a sandbox changed since its fork, for the replica's merge preview. */
export interface MergeFixture {
  /** The sandbox's workflows: `changed` in it, `diverged` when its parent changed it too. */
  workflows: { id: string; name: string; changed?: boolean; diverged?: boolean }[];
  /** Parent workflows the sandbox deleted. */
  deletedNames: string[];
  /** Credentials only the sandbox has. */
  credentials: { id: string; name: string }[];
  /** Collections only the sandbox has. */
  collections: string[];
}

export const mergeFixtures: Record<string, MergeFixture> = {
  "8c1d2e3f-4a5b-4c6d-9e7f-0a1b2c3d4e5f": {
    workflows: [
      { id: "wf-fhir-openhie", name: "OpenHIE Workflow", changed: true, diverged: true },
      { id: "wf-fhir-referrals", name: "Referral follow-ups" },
      { id: "wf-fhir-bundle", name: "FHIR bundle export" },
    ],
    deletedNames: ["Facility registry sync"],
    credentials: [{ id: "pc-fhir-sandbox", name: "FHIR sandbox server" }],
    collections: ["fhir-staging-cache"],
  },
};

/** The top of the tree the current project sits in. */
export function rootOf(projectId: string): Project | undefined {
  let p = findProject(projectId);
  while (p?.parentId) p = findProject(p.parentId);
  return p;
}

/** Every fixture under `rootId`, at any depth, sorted by name (projects.ex `list_descendants`). */
export function fixturesUnder(all: SandboxFixture[], rootId: string): SandboxFixture[] {
  const out: SandboxFixture[] = [];
  const walk = (parentId: string) => {
    for (const f of all.filter((x) => x.parentId === parentId)) {
      out.push(f);
      walk(f.id);
    }
  };
  walk(rootId);
  return out.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

/** One fixture as the page's row. `canManage` is Lightning's owner-or-admin rule (on the root or on the sandbox). */
export function sandboxRow(f: SandboxFixture, all: SandboxFixture[], canManage = true): SandboxRow {
  const scheduledNow = f.scheduledDeletion !== null;
  return {
    id: f.id,
    name: f.name,
    color: f.color,
    env: f.env,
    scheduledDeletion: f.scheduledDeletion,
    workflowsHref: `/projects/${f.id}/w`,
    editHref: f.parentId ? `/projects/${f.parentId}/sandboxes/${f.id}/edit` : null,
    canEdit: canManage && !scheduledNow,
    canDelete: canManage && !scheduledNow,
    canMerge: canManage && !scheduledNow,
    canCancelDeletion: canManage && scheduledNow,
    restoreBlockedReason: null,
    activeDescendantCount: fixturesUnder(all, f.id).filter((d) => !d.scheduledDeletion).length,
  };
}

/** For stories: every row under `rootId`. */
export function sandboxRowsUnder(rootId: string): SandboxRow[] {
  const all = workspaceFixtures();
  return fixturesUnder(all, rootId).map((f) => sandboxRow(f, all));
}

/** For stories: one row. */
export function findSandboxRow(id: string | undefined): SandboxRow | undefined {
  const all = workspaceFixtures();
  const f = all.find((x) => x.id === id);
  return f && sandboxRow(f, all);
}

/** For stories: a merge preview with every badge. */
export const samplePreview: MergePreviewResult = {
  targets: [
    { id: "p-root", name: "openhie-project" },
    { id: "p-staging", name: "staging" },
  ],
  targetId: "p-root",
  workflows: [
    { id: "wf-1", name: "OpenHIE Workflow", isChanged: true, isDiverged: true, isNew: false, isDeleted: false },
    { id: "wf-2", name: "Referral follow-ups", isChanged: false, isDiverged: false, isNew: false, isDeleted: false },
    { id: "wf-3", name: "FHIR bundle export", isChanged: true, isDiverged: false, isNew: true, isDeleted: false },
    { id: "wf-4", name: "Facility registry sync", isChanged: false, isDiverged: false, isNew: false, isDeleted: true },
  ],
  credentials: [{ id: "pc-1", name: "FHIR sandbox server" }],
  collectionsToAdd: ["fhir-staging-cache"],
};
