import Disclosure from "../../components/primitives/Disclosure";
import { DetailItem, DetailList } from "../../components/primitives/DetailList";
import Header from "../../components/primitives/Header";
import { Centered, PageContent } from "../../components/primitives/PageContent";
import Pill from "../../components/primitives/Pill";
import ProjectBreadcrumbs from "../../components/shell/ProjectBreadcrumbs";
import {
  BodyViewer,
  HeadersList,
  ResponseEmpty,
  SectionSizeBadge,
  StatusCodeBadge,
} from "../../components/history/ChannelRequestParts";
import ChannelRequestSummary from "../../components/history/ChannelRequestSummary";
import ChannelTiming from "../../components/history/ChannelTiming";
import WipedDataViewer from "../../components/history/WipedDataViewer";
import { errorCategory, humanizeError } from "../../components/history/channelErrors";
import type { ChannelRequestChannel, ChannelRequestDetail } from "../../types/channels";
import type { CurrentProject } from "../../types/projects";
import { shortUuid } from "../../utils/format";
import { primaryEvent } from "../../utils/history";

const sizeNote = (size: number | null) => (size ? <SectionSizeBadge size={size} /> : null);

/** The contract between this page and whatever feeds it (the replica wrapper, later Lightning). */
export interface ChannelRequestShowPageProps {
  project: CurrentProject;
  /** The picker's label, "parent/child" for a sandbox. */
  projectLabel: string;
  /** The request, with its primary event; the host has already checked it belongs to the project. */
  request: ChannelRequestDetail;
  /** The channel as it is now (the Context section shows the snapshot it ran on). */
  channel: ChannelRequestChannel;
  canEditDataRetention: boolean;
  /** Admin and owner emails, shown to viewers who can't change the retention policy when the data was wiped. */
  adminContacts: string[];
}

/**
 * Inventory view `channel-request-show` (ChannelRequestLive.Show): what one
 * request through a channel sent and got back, how long it took, and the
 * config it ran on. Props only, so it can run unchanged in Lightning; the
 * replica's data and routing live in ChannelRequestShowPage.replica.tsx.
 */
export default function ChannelRequestShowPage({
  project,
  projectLabel,
  request,
  channel,
  canEditDataRetention,
  adminContacts,
}: ChannelRequestShowPageProps) {
  const event = primaryEvent(request);
  const errorCat = event?.errorMessage ? errorCategory(event.errorMessage) : null;
  const configChanged = request.snapshot.lockVersion !== channel.lockVersion;
  const showRequestBody = event && !(event.requestBodyPreview == null && event.requestBodySize == null);
  const showResponseBody =
    event && errorCat === null && !(event.responseBodyPreview == null && event.responseBodySize == null);

  const header = (
    <Header
      breadcrumbs={
        <ProjectBreadcrumbs
          project={project}
          label={projectLabel}
          items={[
            ["History", `/projects/${project.id}/history`],
            ["Channels", `/projects/${project.id}/history/channels`],
          ]}
          current="Channel Request"
        />
      }
      title={`Channel Request ${shortUuid(request.id)}`}
    />
  );

  return (
    <PageContent header={header}>
      <Centered>
        {/* eslint-disable-next-line no-restricted-syntax -- debt: a child would change in a flex column */}
        <div className="space-y-4">
          <ChannelRequestSummary request={request} event={event} channel={channel} />

          {errorCat !== "credential" && <ChannelTiming event={event} />}

          {request.isWiped ? (
            <WipedDataViewer
              dataLabel="request_response"
              projectId={project.id}
              canEditDataRetention={canEditDataRetention}
              adminContacts={adminContacts}
            />
          ) : (
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
              <Disclosure
                variant="card"
                id="request-section"
                title="Request"
                padding="none"
                titleRight={event?.requestBodySize ? <SectionSizeBadge size={event.requestBodySize} /> : undefined}
              >
                {event?.requestHeaders && (
                  <Disclosure variant="section" title="Headers">
                    <HeadersList headers={event.requestHeaders} />
                  </Disclosure>
                )}
                {event && showRequestBody && (
                  <Disclosure variant="section" title="Body" titleRight={sizeNote(event.requestBodySize)}>
                    <BodyViewer
                      preview={event.requestBodyPreview}
                      hash={event.requestBodyHash}
                      size={event.requestBodySize}
                      headers={event.requestHeaders}
                    />
                  </Disclosure>
                )}
              </Disclosure>

              <Disclosure
                variant="card"
                id="response-section"
                title="Response"
                padding="none"
                titleRight={
                  <>
                    {event?.responseStatus && <StatusCodeBadge status={event.responseStatus} />}
                    {event?.responseBodySize ? <SectionSizeBadge size={event.responseBodySize} /> : null}
                  </>
                }
              >
                {errorCat && event?.errorMessage ? (
                  <ResponseEmpty
                    type={errorCat}
                    errorCode={event.errorMessage}
                    humanMessage={humanizeError(event.errorMessage)}
                  />
                ) : (
                  <>
                    {event?.responseHeaders && (
                      <Disclosure variant="section" title="Headers">
                        <HeadersList headers={event.responseHeaders} />
                      </Disclosure>
                    )}
                    {event && showResponseBody && (
                      <Disclosure variant="section" title="Body" titleRight={sizeNote(event.responseBodySize)}>
                        <BodyViewer
                          preview={event.responseBodyPreview}
                          hash={event.responseBodyHash}
                          size={event.responseBodySize}
                          headers={event.responseHeaders}
                        />
                      </Disclosure>
                    )}
                  </>
                )}
              </Disclosure>
            </div>
          )}

          <Disclosure variant="card" id="context-section" title="Context" defaultOpen={false}>
            <DetailList layout="grid" className="md:grid-cols-3">
              <DetailItem label="Destination URL" variant="code">
                {request.snapshot.destinationUrl}
              </DetailItem>
              <DetailItem label="Channel Name">{request.snapshot.name}</DetailItem>
              <DetailItem label="Config Version">
                {request.snapshot.lockVersion}
                {configChanged && (
                  // eslint-disable-next-line local/primitive-classname -- debt: margin (ml-2)
                  <Pill tone="warning" className="ml-2">
                    Config changed
                  </Pill>
                )}
              </DetailItem>
            </DetailList>
          </Disclosure>
        </div>
      </Centered>
    </PageContent>
  );
}
