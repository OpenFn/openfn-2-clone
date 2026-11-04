import { useLocation, useNavigate, useParams } from "react-router-dom";
import { channelFormValues, channelRow, useChannelIndex, useChannelSaves } from "../../api/channels";
import { useWorkspace } from "../../api/projects";
import { useToast } from "../../components/primitives/Toast";
import { permissionsForRole } from "../../permissions";
import { useCurrentUser } from "../../session/session";
import type { ChannelForm } from "../../types/channels";
import type { ResourceStatus } from "../../types/resource";
import ChannelsIndexPage from "./ChannelsIndexPage";

/**
 * The replica's side of ChannelsIndexPage: the channels, what the form picks
 * from, who may change them, and every save come from Lightning's API (or its
 * stand-in), and the project and its label from the workspace. Here are the
 * form for /channels/new and /channels/:channelId/edit, the success toasts
 * (Lightning's flashes) and closing the form. Lightning replaces this file
 * with a LiveView wrapper.
 */
export default function ChannelsIndexPageReplica() {
  const { projectId = "", channelId } = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const viewer = useCurrentUser();
  const workspace = useWorkspace(projectId);
  const index = useChannelIndex(projectId);
  const saves = useChannelSaves(projectId);
  const status: ResourceStatus = workspace.status.state === "ready" ? index.status : workspace.status;
  const logs = `/projects/${projectId}/history/channels`;

  const { canCreateChannel, canEditChannel, canDeleteChannel } = permissionsForRole(workspace.viewerRole, viewer);
  const editing = channelId ? index.channels.find((c) => c.id === channelId) : undefined;
  const form: ChannelForm | null =
    status.state === "ready" && ((pathname.endsWith("/channels/new") && canCreateChannel) || (editing && canEditChannel))
      ? {
          channel: editing && channelFormValues(editing),
          credentialOptions: index.credentialOptions,
          authMethodOptions: index.authMethodOptions,
        }
      : null;

  return (
    <ChannelsIndexPage
      status={status}
      project={{ id: projectId, parentId: workspace.project?.parentId ?? null, color: null }}
      projectLabel={workspace.label}
      channels={index.channels.map((c) => channelRow(c, logs))}
      totalChannels={index.channels.length}
      totalRequests={index.totalRequests}
      logsHref={logs}
      canCreateChannel={canCreateChannel}
      canEditChannel={canEditChannel}
      canDeleteChannel={canDeleteChannel}
      form={form}
      onToggle={async (id, v) => {
        await saves.onToggle(id, v);
        toast("Channel updated");
      }}
      onDelete={async (id) => {
        await saves.onDelete(id);
        toast("Channel deleted.");
      }}
      onSave={async (values) => {
        await saves.onSave(values, editing);
        toast(editing ? "Channel updated successfully." : "Channel created successfully.");
        // The host owns the form's route, so it closes the form. Replace, as
        // Cancel does, so Back doesn't reopen it.
        navigate(`/projects/${projectId}/channels`, { replace: true });
      }}
    />
  );
}
