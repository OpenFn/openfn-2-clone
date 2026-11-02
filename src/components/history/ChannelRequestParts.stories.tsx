import type { Meta, StoryObj } from "@storybook/react";
import Disclosure from "../primitives/Disclosure";
import { channelRequests } from "../../mock-data/channel-requests";
import {
  BodyViewer,
  HeadersList,
  MethodBadge,
  RequestPathDisplay,
  ResponseEmpty,
  SectionSizeBadge,
  StatusCodeBadge,
} from "./ChannelRequestParts";

const event = channelRequests[0]!.events[0]!;

const meta = {
  title: "History/ChannelRequestParts",
  component: Disclosure,
  args: { variant: "card" },
} satisfies Meta<typeof Disclosure>;
export default meta;
type Story = StoryObj<typeof meta>;

export const RequestSection: Story = {
  args: { title: "Request", padding: "none", children: null },
  render: (args) => (
    <Disclosure {...args}>
      <Disclosure variant="section" title="Headers">
        <HeadersList headers={event.requestHeaders!} />
      </Disclosure>
      <Disclosure variant="section" title="Body" titleRight={<SectionSizeBadge size={152} />}>
        <BodyViewer
          preview={event.requestBodyPreview}
          hash={event.requestBodyHash}
          size={event.requestBodySize}
          headers={event.requestHeaders}
        />
      </Disclosure>
    </Disclosure>
  ),
};

export const Collapsed: Story = {
  args: { title: "Context", defaultOpen: false, children: <p className="text-sm">Hidden</p> },
};

export const Badges: Story = {
  args: { title: "", children: null },
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <MethodBadge method="POST" />
      <MethodBadge method="GET" />
      <MethodBadge method="DELETE" />
      <RequestPathDisplay event={channelRequests[1]!.events[0]!} />
      <StatusCodeBadge status={201} />
      <StatusCodeBadge status={302} />
      <StatusCodeBadge status={404} />
      <StatusCodeBadge status={502} />
      <StatusCodeBadge status={null} />
    </div>
  ),
};

export const NoResponse: Story = {
  args: { title: "Response", padding: "none", children: null },
  render: (args) => (
    <Disclosure {...args}>
      <ResponseEmpty
        type="transport"
        errorCode="econnrefused"
        humanMessage="Connection refused — the destination server is not accepting connections on this port"
      />
    </Disclosure>
  ),
};

export const CredentialError: Story = {
  args: { title: "Response", padding: "none", children: null },
  render: (args) => (
    <Disclosure {...args}>
      <ResponseEmpty
        type="credential"
        errorCode="oauth_refresh_failed"
        humanMessage="OAuth token refresh failed — the destination credential could not be renewed"
      />
    </Disclosure>
  ),
};

export const RedactedHeader: Story = {
  args: { title: "Headers", padding: "none", children: null },
  render: (args) => (
    <Disclosure {...args}>
      <HeadersList
        headers={[
          ["content-type", "application/json"],
          ["authorization", "[REDACTED]"],
        ]}
      />
    </Disclosure>
  ),
};

const json: [string, string][] = [["content-type", "application/json"]];
const body = (props: Parameters<typeof BodyViewer>[0]): Story => ({
  args: { title: "Body", padding: "none", children: null },
  render: (args) => (
    <Disclosure {...args}>
      <BodyViewer {...props} />
    </Disclosure>
  ),
});
export const NoBody = body({ preview: null, hash: null, size: 0, headers: json });
export const BinaryBody = body({ preview: null, hash: "9f86d081884c7d659a2feaa0c55ad015", size: 48_213, headers: [["content-type", "application/pdf"]] });
export const BodyNotCaptured = body({ preview: null, hash: null, size: 2_048, headers: json });
export const BodyPreviewTruncated = body({ preview: '{"entry":[{"resource":', hash: null, size: 120_000, headers: json });
