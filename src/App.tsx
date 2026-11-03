import { Navigate, Route, Routes, useParams } from "react-router-dom";
import AppShell from "./components/shell/AppShell";

import AuthLoginPage from "./pages/auth/AuthLoginPage.replica";
import AuthRegisterPage from "./pages/auth/AuthRegisterPage";
import AuthResetPasswordPage from "./pages/auth/AuthResetPasswordPage";
import AuthTwoFactorPage from "./pages/auth/AuthTwoFactorPage.replica";
import AuthConfirmAccountPage from "./pages/auth/AuthConfirmAccountPage";
import AuthConfirmationRequiredPage from "./pages/auth/AuthConfirmationRequiredPage.replica";
import AuthConfirmAccessPage from "./pages/auth/AuthConfirmAccessPage.replica";
import FirstSetupPage from "./pages/auth/FirstSetupPage.replica";

import ProjectsDashboardPage from "./pages/projects/ProjectsDashboardPage.replica";
import MfaRequiredPage from "./pages/projects/MfaRequiredPage";
import WorkflowsIndexPage from "./pages/projects/WorkflowsIndexPage.replica";
import WorkflowHealthPage from "./pages/projects/WorkflowHealthPage.replica";
import SandboxesIndexPage from "./pages/projects/SandboxesIndexPage.replica";
import ChannelsIndexPage from "./pages/projects/ChannelsIndexPage.replica";
import WorkflowEditorPage from "./pages/workflow-editor/WorkflowEditorPage";

import HistoryWorkOrdersPage from "./pages/history/HistoryWorkOrdersPage.replica";
import HistoryChannelLogsPage from "./pages/history/HistoryChannelLogsPage.replica";
import ChannelRequestShowPage from "./pages/history/ChannelRequestShowPage.replica";
import RunShowPage from "./pages/history/RunShowPage.replica";
import DataclipShowPage from "./pages/history/DataclipShowPage.replica";

import ProjectSettingsPage from "./pages/project-settings/ProjectSettingsPage.replica";

import CredentialsIndexPage from "./pages/profile/CredentialsIndexPage.replica";
import ProfilePage from "./pages/profile/ProfilePage.replica";
import TokensPage from "./pages/profile/TokensPage.replica";
import BackupCodesPage from "./pages/profile/BackupCodesPage.replica";

import AdminUsersPage from "./pages/admin/AdminUsersPage.replica";
import AdminUserEditPage from "./pages/admin/AdminUserEditPage.replica";
import AdminProjectsPage from "./pages/admin/AdminProjectsPage.replica";
import AdminAuditPage from "./pages/admin/AdminAuditPage.replica";
import AdminMaintenancePage from "./pages/admin/AdminMaintenancePage.replica";
import AdminAuthProvidersPage from "./pages/admin/AdminAuthProvidersPage.replica";
import AdminCollectionsPage from "./pages/admin/AdminCollectionsPage.replica";
import AdminLiveDashboardPage from "./pages/admin/AdminLiveDashboardPage";

function ProjectRoot() {
  const { projectId } = useParams();
  return <Navigate to={`/projects/${projectId}/w`} replace />;
}

/**
 * Every route mirrors a Lightning URL (lib/lightning_web/router.ex) so the
 * demo lines up 1:1 with the audit in OpenFn/lightning `annotations/`.
 * The comment on each route is its INVENTORY.md id.
 */
export default function App() {
  return (
    <Routes>
      {/* Auth and onboarding: no side menu. */}
      <Route path="/users/log_in" element={<AuthLoginPage />} /> {/* auth-login */}
      <Route path="/users/log_out" element={<Navigate to="/users/log_in" replace />} /> {/* main.tsx signs out first */}
      <Route path="/users/register" element={<AuthRegisterPage />} /> {/* auth-register */}
      <Route path="/users/reset_password" element={<AuthResetPasswordPage />} /> {/* auth-reset-password */}
      <Route path="/users/reset_password/:token" element={<AuthResetPasswordPage />} />
      <Route path="/users/two-factor" element={<AuthTwoFactorPage />} /> {/* auth-two-factor */}
      <Route path="/users/confirm" element={<AuthConfirmAccountPage />} /> {/* auth-confirm-account */}
      <Route path="/users/confirm/:token" element={<AuthConfirmAccountPage />} />
      <Route path="/users/confirm-required" element={<AuthConfirmationRequiredPage />} /> {/* auth-confirmation-required */}
      <Route path="/auth/confirm_access" element={<AuthConfirmAccessPage />} /> {/* auth-confirm-access */}
      <Route path="/first_setup" element={<FirstSetupPage />} /> {/* first-setup */}

      {/* Phoenix LiveDashboard is a full page of its own, outside Lightning's layout. */}
      <Route path="/dashboard" element={<AdminLiveDashboardPage />} /> {/* admin-live-dashboard */}

      <Route element={<AppShell />}>
        <Route path="/" element={<Navigate to="/projects" replace />} />
        <Route path="/projects" element={<ProjectsDashboardPage />} /> {/* projects-dashboard */}
        <Route path="/mfa_required" element={<MfaRequiredPage />} /> {/* mfa-required */}

        <Route path="/projects/:projectId" element={<ProjectRoot />} />
        <Route path="/projects/:projectId/w" element={<WorkflowsIndexPage />} /> {/* workflows-index */}
        {/* workflow-editor-*: canvas, new, inspectors, IDE, manual run, run viewer, AI, versions */}
        <Route path="/projects/:projectId/w/new" element={<WorkflowEditorPage />} />
        <Route path="/projects/:projectId/w/:workflowId" element={<WorkflowEditorPage />} />
        <Route path="/projects/:projectId/w/:workflowId/health" element={<WorkflowHealthPage />} /> {/* workflow-health */}
        <Route path="/projects/:projectId/sandboxes" element={<SandboxesIndexPage />} /> {/* sandboxes-index */}
        <Route path="/projects/:projectId/sandboxes/new" element={<SandboxesIndexPage />} />
        <Route path="/projects/:projectId/sandboxes/:sandboxId/edit" element={<SandboxesIndexPage />} />
        <Route path="/projects/:projectId/channels" element={<ChannelsIndexPage />} /> {/* channels-index */}
        <Route path="/projects/:projectId/channels/new" element={<ChannelsIndexPage />} />
        <Route path="/projects/:projectId/channels/:channelId/edit" element={<ChannelsIndexPage />} />

        <Route path="/projects/:projectId/history" element={<HistoryWorkOrdersPage />} /> {/* history-work-orders */}
        <Route path="/projects/:projectId/history/channels" element={<HistoryChannelLogsPage />} /> {/* history-channel-logs */}
        <Route path="/projects/:projectId/history/channels/:requestId" element={<ChannelRequestShowPage />} /> {/* channel-request-show */}
        <Route path="/projects/:projectId/runs/:runId" element={<RunShowPage />} /> {/* run-show */}
        <Route path="/projects/:projectId/dataclips/:dataclipId/show" element={<DataclipShowPage />} /> {/* dataclip-show */}

        {/* project-settings-*: one page, panels picked by the URL hash. */}
        <Route path="/projects/:projectId/settings" element={<ProjectSettingsPage />} />
        <Route path="/projects/:projectId/settings/delete" element={<ProjectSettingsPage />} />

        <Route path="/credentials" element={<CredentialsIndexPage />} /> {/* credentials-index */}
        <Route path="/profile" element={<ProfilePage />} /> {/* profile-* */}
        <Route path="/profile/:userId/delete" element={<ProfilePage />} /> {/* profile-delete-account */}
        <Route path="/profile/tokens" element={<TokensPage />} /> {/* profile-tokens */}
        <Route path="/profile/tokens/:tokenId/delete" element={<TokensPage />} />
        <Route path="/profile/auth/backup_codes" element={<BackupCodesPage />} /> {/* profile-backup-codes */}

        {/* Admin (superuser) */}
        <Route path="/settings" element={<Navigate to="/settings/projects" replace />} />
        <Route path="/settings/users" element={<AdminUsersPage />} /> {/* admin-users */}
        <Route path="/settings/users/:userId/delete" element={<AdminUsersPage />} />
        <Route path="/settings/users/new" element={<AdminUserEditPage />} /> {/* admin-user-edit */}
        <Route path="/settings/users/:userId" element={<AdminUserEditPage />} />
        <Route path="/settings/projects" element={<AdminProjectsPage />} /> {/* admin-projects */}
        <Route path="/settings/projects/new" element={<AdminProjectsPage />} />
        <Route path="/settings/projects/:projectId" element={<AdminProjectsPage />} />
        <Route path="/settings/projects/:projectId/delete" element={<AdminProjectsPage />} />
        <Route path="/settings/audit" element={<AdminAuditPage />} /> {/* admin-audit */}
        <Route path="/settings/maintenance" element={<AdminMaintenancePage />} /> {/* admin-maintenance */}
        <Route path="/settings/authentication" element={<AdminAuthProvidersPage />} /> {/* admin-auth-providers */}
        <Route path="/settings/authentication/new" element={<AdminAuthProvidersPage />} />
        <Route path="/settings/collections" element={<AdminCollectionsPage />} /> {/* admin-collections */}

        <Route path="*" element={<Navigate to="/projects" replace />} />
      </Route>
    </Routes>
  );
}
