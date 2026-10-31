import Header from "../../components/primitives/Header";
import { Centered, PageContent } from "../../components/primitives/PageContent";
import EmptyState from "../../components/primitives/EmptyState";
import ProjectBreadcrumbs from "../../components/shell/ProjectBreadcrumbs";
import DataclipDetailsCard, { DataclipBodyCard } from "../../components/history/DataclipDetailsCard";
import JsonViewer from "../../components/history/JsonViewer";
import type { DataclipBody, DataclipDetail } from "../../types/history";
import type { CurrentProject } from "../../types/projects";
import { shortUuid } from "../../utils/format";
import { Stack } from "../../components/primitives/Stack";

export interface DataclipShowPageProps {
  project: CurrentProject;
  projectLabel: string;
  dataclip: DataclipDetail;
  /** The body (pretty-printed text) or why it could not be loaded; undefined while the host fetches it. Never shown for a wiped dataclip. */
  body: DataclipBody | undefined;
}

/** Inventory view `dataclip-show` (DataclipLive.Show, dataclip_live/show.ex). */
export default function DataclipShowPage({ project, projectLabel, dataclip, body }: DataclipShowPageProps) {
  return (
    <PageContent
      header={
        <Header
          breadcrumbs={
            <ProjectBreadcrumbs
              project={project}
              label={projectLabel}
              current="Dataclip"
            />
          }
          title={`Dataclip ${shortUuid(dataclip.id)}`}
        />
      }
    >
      <Centered>
        <Stack gap="lg">
        <DataclipDetailsCard dataclip={dataclip} />
        <DataclipBodyCard>
          {dataclip.wipedAt !== null ? (
            <EmptyState
              variant="plain"
              fill
              icon="hero-eye-slash"
              title="No Data Available"
              message="This dataclip's data has been wiped in accordance with the project's data retention policy."
            />
          ) : (
            <JsonViewer body={body} />
          )}
        </DataclipBodyCard>
        </Stack>
      </Centered>
    </PageContent>
  );
}
