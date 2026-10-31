import Header from "../../components/primitives/Header";
import { Centered, PageContent } from "../../components/primitives/PageContent";
import MaintenanceCard from "../../components/admin/MaintenanceCard";
import { useAction } from "../../utils/useAction";
import { Stack } from "../../components/primitives/Stack";

/** The contract between this page and whatever feeds it (the replica wrapper, later Lightning). */
export interface AdminMaintenancePageProps {
  /** Queues a registry refresh. Resolves when the host has taken it; the host announces the result. */
  onRefreshAdaptors: () => Promise<void>;
  /** Starts the icon refresh, which the host reports when it finishes. */
  onRefreshIcons: () => Promise<void>;
}

/**
 * Inventory view `admin-maintenance` (MaintenanceLive.Index): two actions a
 * superuser can run. Props only, so it can run unchanged in Lightning; the
 * replica's toasts live in AdminMaintenancePage.replica.tsx. A refusal or a
 * lost connection is said here; success is the host's.
 */
export default function AdminMaintenancePage({ onRefreshAdaptors, onRefreshIcons }: AdminMaintenancePageProps) {
  const adaptors = useAction(onRefreshAdaptors, { onError: "toast" });
  const icons = useAction(onRefreshIcons, { onError: "toast" });
  return (
    <PageContent header={<Header title="Maintenance" />}>
      <Centered>
        <Stack>
          <MaintenanceCard
            id="refresh-adaptors-card"
            buttonId="refresh-adaptors-button"
            title="Refresh Adaptor Registry"
            description="Re-fetch the list of available adaptors and their versions."
            onRun={() => void adaptors.run()}
            pending={adaptors.pending}
          />
          <MaintenanceCard
            id="refresh-icons-card"
            buttonId="refresh-icons-button"
            title="Refresh Adaptor Icons"
            description="Re-fetch icons for every adaptor and replace rows whose icon has changed. Does not touch adaptor metadata or version history."
            onRun={() => void icons.run()}
            pending={icons.pending}
          />
        </Stack>
      </Centered>
    </PageContent>
  );
}
