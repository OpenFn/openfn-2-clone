import type { ChannelEvent, ChannelRequestChannel, ChannelRequestDetail } from "../../types/channels";
import Card from "../primitives/Card";
import DateTime from "../primitives/DateTime";
import { DetailItem, DetailList } from "../primitives/DetailList";
import Heading from "../primitives/Heading";
import Section from "../primitives/Section";
import TextLink from "../primitives/TextLink";
import Text from "../primitives/Text";
import { MethodBadge, RequestPathDisplay, StatusCodeBadge } from "./ChannelRequestParts";
import { ChannelStatePill } from "../domain/StatePill";
import { humanizeError } from "./channelErrors";
import { formatUs, shortUuid } from "../../utils/format";
import CopyButton from "../primitives/CopyButton";
import { Row } from "../primitives/Stack";

/**
 * The channel request page's summary card (channel_request_live/show.ex
 * `summary_card`): method, path, status code and state, the channel and
 * request id, then Client, Destination and Timing facts.
 */
export default function ChannelRequestSummary({
  request,
  event,
  channel,
}: {
  request: ChannelRequestDetail;
  event: ChannelEvent | undefined;
  channel: ChannelRequestChannel;
}) {
  return (
    <Card padding="lg">
      <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-2">
        <MethodBadge method={event?.requestMethod} />
        <RequestPathDisplay event={event} />
        <StatusCodeBadge status={event?.responseStatus} />
        <ChannelStatePill
          state={request.state}
          title={request.state === "timeout" && event?.errorMessage ? humanizeError(event.errorMessage) : undefined}
        />
        {/* eslint-disable-next-line local/primitive-classname -- debt: margin (ml-auto) */}
        <Text as="div" variant="body-sm" className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1">
          <Row as="span" gap="sm">
            <Heading size="xs" as="span">
              Channel
            </Heading>
            <TextLink to={`/projects/${channel.projectId}/channels/${channel.id}/edit`}>{channel.name}</TextLink>
          </Row>
          <Row as="span" gap="sm">
            <Heading size="xs" as="span">
              Request
            </Heading>
            <span className="font-mono text-strong">{shortUuid(request.id)}</span>
            <CopyButton value={request.id} label="Copy request ID" size="xs" />
          </Row>
        </Text>
      </div>

      <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
        <Section variant="eyebrow" title="Client">
          <DetailList layout="grid" className="md:grid-cols-2">
            <DetailItem label="IP">{request.clientIdentity || "—"}</DetailItem>
            <DetailItem label="Auth">
              <span className="hero-shield-check mr-1 h-4 w-4 text-faint" />
              {request.clientAuth}
            </DetailItem>
          </DetailList>
        </Section>
        <Section variant="eyebrow" title="Destination">
          <DetailList layout="grid" className="md:grid-cols-2">
            <DetailItem label="URL" variant="code">
              {channel.destinationUrl}
            </DetailItem>
            <DetailItem label="Auth">
              <span className="hero-key mr-1 h-4 w-4 text-faint" />
              {request.destinationAuth}
            </DetailItem>
          </DetailList>
        </Section>
        <Section variant="eyebrow" title="Timing" className="md:col-span-2">
          <DetailList layout="grid" className="md:grid-cols-3">
            <DetailItem label="Started">
              <DateTime value={request.startedAt} />
            </DetailItem>
            <DetailItem label="Completed">
              <DateTime value={request.completedAt} />
            </DetailItem>
            <DetailItem label="Latency" variant="code">
              {event?.latencyUs != null ? `${formatUs(event.latencyUs)} ms` : "—"}
            </DetailItem>
          </DetailList>
        </Section>
      </div>
    </Card>
  );
}
