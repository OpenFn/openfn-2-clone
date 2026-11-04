import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { projectsUnder, sandboxRow, useSandboxSaves, useWorkspace } from "../../api/projects";
import { useToast } from "../../components/primitives/Toast";
import { sandboxColorPalette } from "../../constants";
import { permissionsForRole } from "../../permissions";
import { useCurrentUser } from "../../session/session";
import type { SandboxForm } from "../../types/sandboxes";
import { RequestError } from "../../utils/errors";
import SandboxesIndexPage from "./SandboxesIndexPage";

const randomColor = () => sandboxColorPalette[Math.floor(Math.random() * sandboxColorPalette.length)]!;

/**
 * The replica's side of SandboxesIndexPage: the workspace, who may do what in
 * it, and every save come from Lightning's API (or its stand-in). Here are the
 * form for /sandboxes/new and /sandboxes/:sandboxId/edit, the success toasts
 * (Lightning's flashes) and navigation. The API sends no colour or env and
 * leaves out sandboxes scheduled for deletion, so the cards show none.
 * Lightning replaces this file with a LiveView wrapper.
 */
export default function SandboxesIndexPageReplica() {
  const { projectId = "", sandboxId } = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const viewer = useCurrentUser();
  const workspace = useWorkspace(projectId);
  const saves = useSandboxSaves(projectId);
  // Lightning picks a palette colour each time the form opens (form_component.ex), so pick one on each arrival at /new.
  const onNew = pathname.endsWith("/sandboxes/new");
  const [newColor, setNewColor] = useState(() => ({ onNew, color: randomColor() }));
  if (newColor.onNew !== onNew) setNewColor({ onNew, color: randomColor() });
  const back = `/projects/${projectId}/sandboxes`;
  const { project, tree } = workspace;
  const nameOf = (id: string) => tree.find((p) => p.id === id)?.name ?? "";

  // sandbox_live/index.ex: `:provision_sandbox` (editor or above on the project) to create; owner or admin of the
  // root or of the sandbox to manage, which the rows carry.
  const { canCreateSandbox } = permissionsForRole(workspace.viewerRole, viewer);
  const createBlockedReason = canCreateSandbox ? null : "You are not authorized to create sandboxes in this workspace";

  const editing = sandboxId ? workspace.sandboxes.find((s) => s.id === sandboxId) : undefined;
  const form: SandboxForm | null =
    project && onNew && !createBlockedReason
      ? { mode: "new", parentName: project.name, parentIsSandbox: project.parentId !== null, initialColor: newColor.color }
      : editing?.canEdit
        ? // The API sends no colour, so the form starts with none picked.
          { mode: "edit", sandboxId: editing.id, initial: { rawName: editing.name, color: null } }
        : null;

  // index.ex (:edit and :new): a route the viewer may not use sends them back to the list with Lightning's error flash.
  const refusal =
    workspace.status.state !== "ready"
      ? null
      : onNew && createBlockedReason
        ? createBlockedReason
        : editing && !editing.canEdit
          ? "You are not authorized to edit this sandbox"
          : null;
  // Once per refusal: StrictMode runs the effect twice.
  const refusing = useRef(false);
  useEffect(() => {
    if (!refusal || refusing.current) {
      refusing.current = !!refusal;
      return;
    }
    refusing.current = true;
    toast(refusal, "danger");
    navigate(back, { replace: true });
  }, [refusal, toast, navigate, back]);

  return (
    <SandboxesIndexPage
      status={workspace.status}
      project={{ id: projectId, parentId: project?.parentId ?? null, color: null }}
      projectLabel={workspace.label}
      // Until the workspace loads, the page shows its loading state instead of the cards.
      root={workspace.root ?? sandboxRow({ id: projectId, name: "", description: null, parentId: null }, [], false)}
      rootIsSandbox={workspace.rootIsSandbox}
      sandboxes={workspace.sandboxes}
      newHref={`${back}/new`}
      createBlockedReason={createBlockedReason}
      gracePeriodDays={workspace.gracePeriodDays}
      form={form}
      onCloseForm={() => navigate(back)}
      onCreateSandbox={async (values) => {
        await saves.onCreateSandbox(values);
        toast("Sandbox created");
        // Lightning opens the new sandbox's workflows; the replica's other pages don't know it, so back to the list.
        navigate(back);
      }}
      onUpdateSandbox={async (id, values) => {
        await saves.onUpdateSandbox(id, values);
        toast("Sandbox updated");
        navigate(back);
      }}
      onDeleteSandbox={async (id, nameConfirmation) => {
        const sandbox = tree.find((p) => p.id === id);
        if (!sandbox) throw new RequestError("Sandbox not found");
        if (nameConfirmation !== sandbox.name) throw new RequestError("must match the sandbox name");
        const inside = [sandbox, ...projectsUnder(tree, id)].some((p) => p.id === projectId);
        await saves.onDeleteSandbox(id);
        toast(`Sandbox ${sandbox.name} scheduled for deletion.`);
        if (inside) navigate(`/projects/${sandbox.parentId}/sandboxes`);
      }}
      onCancelDeletion={async (id) => {
        const name = nameOf(id);
        await saves.onCancelDeletion(id);
        toast(`Cancelled deletion of sandbox ${name}.`);
      }}
      onPreviewMerge={async (id, targetId) => ({ targets: workspace.mergeTargets(id), ...(await saves.onPreviewMerge(id, targetId)) })}
      onMergeSandbox={async (id, values) => {
        const [sandbox, target] = [nameOf(id), nameOf(values.targetId)];
        // index.ex `format_merge_error`: a merge that fails on Lightning's side says only this.
        const scheduled = await saves.onMergeSandbox(id, values).catch((error: unknown) => {
          throw error instanceof RequestError && (error.status ?? 0) >= 500 ? new RequestError("Couldn't merge this sandbox. Please try again.") : error;
        });
        // index.ex `build_merge_success_message`.
        toast(
          scheduled
            ? `Successfully merged ${sandbox} into ${target}. Sandbox scheduled for deletion.`
            : `Successfully merged ${sandbox} into ${target}, but could not schedule the sandbox for deletion.`
        );
        navigate(`/projects/${values.targetId}/w`);
      }}
    />
  );
}
