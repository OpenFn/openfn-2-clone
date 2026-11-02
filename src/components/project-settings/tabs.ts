import type { Tab } from "../primitives/Tabs";

/** The project settings tabs, in Lightning's order (settings.html.heex:31-66). */
export const projectSettingsTabs: Tab[] = [
  { id: "project", to: "#project", label: "Setup", icon: "hero-clipboard" },
  { id: "credentials", to: "#credentials", label: "Credentials", icon: "hero-key" },
  { id: "environments", to: "#environments", label: "Environments", icon: "hero-squares-2x2" },
  { id: "collections", to: "#collections", label: "Collections", icon: "hero-circle-stack" },
  { id: "webhook_security", to: "#webhook_security", label: "Webhook Security", icon: "hero-lock-closed" },
  { id: "collaboration", to: "#collaboration", label: "Collaboration", icon: "hero-users" },
  { id: "security", to: "#security", label: "Security", icon: "hero-lock-closed" },
  { id: "vcs", to: "#vcs", label: "Sync to GitHub", icon: "hero-arrow-path" },
  { id: "data-storage", to: "#data-storage", label: "Data Storage", icon: "hero-square-3-stack-3d" },
  { id: "history-exports", to: "#history-exports", label: "History Exports", icon: "hero-folder-arrow-down" },
];

/** Tabbed.container's `default_hash`. */
export const defaultSettingsHash = "project";
