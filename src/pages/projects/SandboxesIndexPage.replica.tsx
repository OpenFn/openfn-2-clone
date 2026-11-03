import { useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { useToast } from "../../components/primitives/Toast";
import { projectLabel } from "../../components/shell/projectPickerItems";
import { sandboxColorPalette } from "../../constants";
import { collectionsIn, purgeDeletedAfterDays } from "../../mock-data/project-settings";
import { findProject, projects } from "../../mock-data/projects";
import { simulateRequest } from "../../mock-data/request";
import { fixturesUnder, mergeFixtures, rootOf, sandboxRow, workspaceFixtures, type SandboxFixture } from "../../mock-data/sandboxes";
import { workflowsIn } from "../../mock-data/workflows";
import { permissionsFor, roleIn } from "../../permissions";
import { useCurrentUser } from "../../session/session";
import type { Project } from "../../types/projects";
import type { ProjectRole } from "../../types/projects";
import type { MergePreviewResult, MergeWorkflowRow, SandboxForm, SandboxValues } from "../../types/sandboxes";
import { RequestError } from "../../utils/errors";
import { urlSafeName } from "../../utils/format";
import SandboxesIndexPage from "./SandboxesIndexPage";

const byName = (a: { name: string }, b: { name: string }) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
const noChanges = { workflows: [], deletedNames: [], credentials: [], collections: [] };

const randomColor = () => sandboxColorPalette[Math.floor(Math.random() * sandboxColorPalette.length)]!;

/**
 * The replica's side of SandboxesIndexPage: the workspace's projects held in
 * state as the server would, the form for /sandboxes/new and
 * /sandboxes/:sandboxId/edit, and the success toasts (Lightning's flashes)
 * and navigation. Lightning replaces this file with a LiveView wrapper.
 */
export default function SandboxesIndexPageReplica() {
  const { projectId } = useParams();
  const project = findProject(projectId);
  const root = project && rootOf(project.id);
  if (!project || !root) return <Navigate to="/projects" replace />;
  // Keyed by workspace, so moving between its projects keeps the changes made here.
  return <Replica key={root.id} project={project} root={root} />;
}

function Replica({ project, root }: { project: Project; root: Project }) {
  const { sandboxId } = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const viewer = useCurrentUser();
  const [all, setAll] = useState<SandboxFixture[]>(workspaceFixtures);
  // Lightning picks a palette colour each time the form opens (form_component.ex), so pick one on each arrival at /new.
  const onNew = pathname.endsWith("/sandboxes/new");
  const [newColor, setNewColor] = useState(() => ({ onNew, color: randomColor() }));
  if (newColor.onNew !== onNew) setNewColor({ onNew, color: randomColor() });
  const back = `/projects/${project.id}/sandboxes`;

  // sandbox_live/index.ex: `:provision_sandbox` to create; owner or admin of the root or of the sandbox to manage
  // (policies/sandboxes.ex). A replica-made sandbox has no project record: its creator owns it, and the rest
  // have their role on the parent, owners as admins, as sandboxes.ex `provision` copies them.
  const { canCreateSandbox } = permissionsFor(project, viewer);
  const roleOn = (f: SandboxFixture): ProjectRole | undefined => {
    if (f.ownerId === viewer.id) return "owner";
    const p = findProject(f.id);
    if (p) return roleIn(p, viewer.id);
    const parent = all.find((x) => x.id === f.parentId);
    const inherited = parent && roleOn(parent);
    return inherited === "owner" ? "admin" : inherited;
  };
  const isAdmin = (f: SandboxFixture) => ["owner", "admin"].includes(roleOn(f) ?? "");
  const rootFixture = all.find((f) => f.id === root.id)!;
  const row = (f: SandboxFixture) => sandboxRow(f, all, isAdmin(rootFixture) || isAdmin(f));
  const createBlockedReason = canCreateSandbox ? null : "You are not authorized to create sandboxes in this workspace";

  const editing = sandboxId ? all.find((f) => f.id === sandboxId && f.parentId !== null) : undefined;
  const form: SandboxForm | null =
    onNew && !createBlockedReason
      ? { mode: "new", parentName: project.name, parentIsSandbox: project.parentId !== null, initialColor: newColor.color }
      : editing && row(editing).canEdit
        ? { mode: "edit", sandboxId: editing.id, initial: { rawName: editing.name, color: editing.color } }
        : null;

  // The subtree, as Lightning's schedule and cancel both act on it (sandboxes.ex).
  const subtree = (id: string) => [id, ...fixturesUnder(all, id).map((f) => f.id)];
  const setScheduled = (ids: string[], at: string | null) =>
    setAll((fs) => fs.map((f) => (ids.includes(f.id) ? { ...f, scheduledDeletion: at } : f)));

  /**
   * index.ex `open-merge-modal` and `confirm-merge`: the sandbox, the live projects outside its subtree, and
   * those the viewer may merge into (owner, admin or editor there).
   */
  const mergeable = (id: string) => {
    const sandbox = all.find((f) => f.id === id);
    if (!sandbox) throw new RequestError("Sandbox not found");
    if (!row(sandbox).canMerge) throw new RequestError("You are not authorized to merge this sandbox");
    const under = subtree(id);
    const outside = [rootFixture, ...fixturesUnder(all, root.id)].filter((f) => !f.scheduledDeletion && !under.includes(f.id));
    const targets = outside.filter((f) => ["owner", "admin", "editor"].includes(roleOn(f) ?? ""));
    return { sandbox, outside, targets };
  };

  /** form_component.ex: the name must be unique among the parent's sandboxes. */
  const checkName = ({ rawName }: SandboxValues, parentId: string, selfId?: string) => {
    const name = urlSafeName(rawName);
    if (all.some((f) => f.parentId === parentId && f.name === name && f.id !== selfId)) {
      throw new RequestError("Sandbox name already exists", { fieldErrors: { rawName: ["Sandbox name already exists"] } });
    }
    return name;
  };

  return (
    <SandboxesIndexPage
      project={{ id: project.id, parentId: project.parentId, color: project.color }}
      projectLabel={projectLabel(project, projects)}
      root={row(rootFixture)}
      rootIsSandbox={root.parentId !== null}
      sandboxes={fixturesUnder(all, root.id).map(row)}
      newHref={`${back}/new`}
      createBlockedReason={createBlockedReason}
      gracePeriodDays={purgeDeletedAfterDays}
      form={form}
      onCloseForm={() => navigate(back)}
      onCreateSandbox={async (values) => {
        await simulateRequest();
        const name = checkName(values, project.id);
        setAll((fs) => [
          ...fs,
          { id: `sbx-${Date.now()}`, name, color: values.color, parentId: project.id, env: "dev", scheduledDeletion: null, ownerId: viewer.id },
        ]);
        toast("Sandbox created");
        // Lightning opens the new sandbox's workflows; the replica's other pages don't know it, so back to the list.
        // Save goes back to the list in Lightning too.
        navigate(back);
      }}
      onUpdateSandbox={async (id, values) => {
        await simulateRequest();
        const parentId = all.find((f) => f.id === id)?.parentId ?? project.id;
        const name = checkName(values, parentId, id);
        setAll((fs) => fs.map((f) => (f.id === id ? { ...f, name, color: values.color } : f)));
        toast("Sandbox updated");
        navigate(back);
      }}
      onDeleteSandbox={async (id, nameConfirmation) => {
        await simulateRequest();
        const sandbox = all.find((f) => f.id === id);
        if (!sandbox) throw new RequestError("Sandbox not found");
        if (nameConfirmation !== sandbox.name) throw new RequestError("must match the sandbox name");
        const ids = subtree(id);
        setScheduled(ids, new Date(Date.now() + purgeDeletedAfterDays * 86_400_000).toISOString());
        toast(`Sandbox ${sandbox.name} scheduled for deletion.`);
        if (ids.includes(project.id)) navigate(`/projects/${sandbox.parentId}/sandboxes`);
      }}
      onCancelDeletion={async (id) => {
        await simulateRequest();
        const sandbox = all.find((f) => f.id === id);
        if (!sandbox) throw new RequestError("Sandbox not found");
        setScheduled(subtree(id), null);
        toast(`Cancelled deletion of sandbox ${sandbox.name}.`);
      }}
      onPreviewMerge={async (id, targetId): Promise<MergePreviewResult> => {
        await simulateRequest();
        const { sandbox, targets } = mergeable(id);
        const target = targets.find((t) => t.id === (targetId ?? sandbox.parentId));
        if (targetId !== null && !target) throw new RequestError("Target project not found");
        // Workflows are matched by name, as merge_projects.ex does. Divergence and deletions are only known against the parent.
        const fx = mergeFixtures[id] ?? noChanges;
        const targetWorkflows = target ? workflowsIn(target.id) : [];
        const atParent = target?.id === sandbox.parentId;
        const workflows: MergeWorkflowRow[] = [
          ...fx.workflows.map((w) => {
            const isNew = !targetWorkflows.some((t) => t.name === w.name);
            return { id: w.id, name: w.name, isNew, isChanged: isNew || !!w.changed, isDiverged: atParent && !!w.diverged, isDeleted: false };
          }),
          ...(atParent ? targetWorkflows.filter((t) => fx.deletedNames.includes(t.name)) : []).map((t) => ({
            id: t.id,
            name: t.name,
            isNew: false,
            isChanged: false,
            isDiverged: false,
            isDeleted: true,
          })),
        ].sort(byName);
        const targetCollections = target ? collectionsIn(target.id).map((c) => c.name) : [];
        return {
          targets: targets.map((t) => ({ id: t.id, name: t.name })),
          targetId: target?.id ?? null,
          workflows,
          credentials: target ? [...fx.credentials].sort(byName) : [],
          collectionsToAdd: target ? fx.collections.filter((c) => !targetCollections.includes(c)) : [],
        };
      }}
      onMergeSandbox={async (id, values) => {
        await simulateRequest();
        const { sandbox, outside, targets } = mergeable(id);
        const target = outside.find((t) => t.id === values.targetId);
        if (!target) throw new RequestError("Target project not found");
        if (!targets.includes(target)) throw new RequestError("You are not authorized to merge into this project");
        // Nothing to change: the replica's workflow pages are fixed data, and its state goes when it leaves the sandboxes page.
        toast(`Successfully merged ${sandbox.name} into ${target.name}. Sandbox scheduled for deletion.`);
        navigate(`/projects/${target.id}/w`);
      }}
    />
  );
}
