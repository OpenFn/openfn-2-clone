import type { Meta, StoryObj } from "@storybook/react";
import { withRouter } from "../../stories/decorators";
import { channelRequests } from "../../mock-data/channel-requests";
import { channels } from "../../mock-data/channels";
import type { ChannelLogRow } from "../../types/channels";
import ChannelRequestsTable from "./ChannelRequestsTable";

const rows: ChannelLogRow[] = channelRequests.map((r) => ({
  id: r.id,
  requestId: r.requestId,
  channelId: r.channelId,
  channelName: channels.find((c) => c.id === r.channelId)?.name ?? "",
  startedAt: r.startedAt,
  state: r.state,
  requestPath: r.events.find((e) => e.type === "destination_response")?.requestPath ?? null,
  errorMessage: r.events.find((e) => e.type === "error")?.errorMessage ?? null,
}));

const meta = {
  title: "History/ChannelRequestsTable",
  component: ChannelRequestsTable,
  decorators: [withRouter],
  args: { projectId: "p" },
} satisfies Meta<typeof ChannelRequestsTable>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { rows, page: { number: 1, size: 10, totalEntries: rows.length } } };
export const Empty: Story = { args: { rows: [], page: { number: 1, size: 10, totalEntries: 0 } } };

// An error longer than the 320px cap ends in "…", as in Lightning (channel_logs_component.ex:181).
const longError =
  "connect ECONNREFUSED 10.0.4.17:443 after 3 retries: the destination closed the connection before sending a response";
export const LongErrorMessage: Story = {
  args: {
    rows: rows
      .filter((r) => r.errorMessage)
      .slice(0, 1)
      .map((r) => ({ ...r, errorMessage: longError })),
    page: { number: 1, size: 10, totalEntries: 1 },
  },
};
