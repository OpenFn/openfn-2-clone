import type { Meta, StoryObj } from "@storybook/react-vite";
import { cn } from "@/components/ui/cn";

// Every colour role, each shown on what it sits on, so Basic and Dark can be checked side by side from the toolbar.
// The story's axe check tests each text pair's contrast in whichever theme is on.
// Class names are written out whole so Tailwind finds them.

interface Chip {
  className: string;
  label: string;
  icon?: string;
}

interface Role {
  name: string;
  job: string;
  chips: Chip[];
}

const onGrounds = (text: string): Chip[] => [
  { className: `bg-page ${text}`, label: "on page" },
  { className: `bg-surface ${text}`, label: "on surface" },
  { className: `bg-subtle ${text}`, label: "on subtle" },
  { className: `bg-hover ${text}`, label: "on hover" },
];

const groups: { title: string; roles: Role[] }[] = [
  {
    title: "Text",
    roles: [
      { name: "text-strong", job: "Headings, labels, values", chips: onGrounds("text-strong") },
      { name: "text-body", job: "Button and panel copy", chips: onGrounds("text-body") },
      { name: "text-muted", job: "Descriptions, table cells, icons", chips: onGrounds("text-muted") },
      { name: "text-inverse", job: "On bg-inverse", chips: [{ className: "bg-inverse text-inverse", label: "on inverse" }] },
    ],
  },
  {
    title: "Backgrounds",
    roles: [
      { name: "bg-page", job: "The ground behind everything", chips: [{ className: "bg-page text-strong border border-subtle", label: "page" }] },
      { name: "bg-surface", job: "Card, table, dialog, input", chips: [{ className: "bg-surface text-strong border border-subtle", label: "surface" }] },
      { name: "bg-subtle", job: "Table header, empty state, a value to copy, a blocked control", chips: [{ className: "bg-subtle text-strong", label: "subtle" }] },
      { name: "bg-hover", job: "A row or a quiet control, hovered", chips: [{ className: "bg-hover text-strong", label: "hover" }] },
      { name: "bg-inverse", job: "Tooltip", chips: [{ className: "bg-inverse text-inverse", label: "inverse" }] },
      { name: "bg-overlay", job: "The scrim behind a dialog", chips: [{ className: "bg-overlay size-10", label: "" }] },
    ],
  },
  {
    title: "Borders and focus",
    roles: [
      { name: "border-subtle", job: "Tables, dialogs, dividers, a blocked control", chips: [{ className: "bg-surface text-strong border-2 border-subtle", label: "subtle" }] },
      { name: "border-strong", job: "Buttons, inputs, dashed empty states", chips: [{ className: "bg-surface text-strong border-2 border-strong", label: "strong" }] },
      { name: "outline-focus", job: "The keyboard focus outline", chips: [{ className: "bg-surface text-strong outline-2 outline-offset-2 outline-focus", label: "focused" }] },
    ],
  },
  {
    title: "Selected",
    roles: [
      { name: "bg-selected, text-selected", job: "The chosen item in a set: the current page in a side menu", chips: [{ className: "bg-selected text-selected", label: "API tokens" }] },
    ],
  },
  {
    title: "Brand",
    roles: [
      { name: "bg-brand", job: "Primary button", chips: [{ className: "bg-brand text-on-brand", label: "Generate" }] },
      { name: "bg-brand-hover", job: "Primary button, hovered", chips: [{ className: "bg-brand-hover text-on-brand", label: "Generate" }] },
      { name: "text-on-brand", job: "Text and icons on the brand fill", chips: [{ className: "bg-brand text-on-brand", label: "on brand", icon: "hero-plus" }] },
    ],
  },
  {
    title: "Danger",
    roles: [
      { name: "bg-danger-strong", job: "The danger solid: a destructive button", chips: [{ className: "bg-danger-strong text-on-brand", label: "Delete" }] },
      { name: "bg-danger-hover", job: "The danger solid, hovered", chips: [{ className: "bg-danger-hover text-on-brand", label: "Delete" }] },
      { name: "bg-danger", job: "A danger panel", chips: [{ className: "bg-danger text-danger border border-danger", label: "panel" }] },
      { name: "border-danger", job: "A danger panel's edge", chips: [{ className: "bg-danger text-danger border-2 border-danger", label: "edge" }] },
      { name: "text-danger", job: "Text on a danger panel", chips: [{ className: "bg-danger text-danger", label: "on danger panel" }] },
      { name: "text-danger-strong", job: "A danger panel's heading", chips: [{ className: "bg-danger text-danger-strong font-semibold", label: "on danger panel" }] },
      { name: "text-danger-icon", job: "A danger panel's icon", chips: [{ className: "bg-danger text-danger", label: "icon", icon: "hero-exclamation-triangle text-danger-icon" }] },
    ],
  },
  {
    title: "Warning",
    roles: [
      { name: "bg-warning", job: "A warning panel", chips: [{ className: "bg-warning text-warning border border-warning", label: "panel" }] },
      { name: "border-warning", job: "A warning panel's edge", chips: [{ className: "bg-warning text-warning border-2 border-warning", label: "edge" }] },
      { name: "text-warning", job: "Text on a warning panel", chips: [{ className: "bg-warning text-warning", label: "on warning panel" }] },
      { name: "text-warning-strong", job: "A warning panel's heading", chips: [{ className: "bg-warning text-warning-strong font-semibold", label: "on warning panel" }] },
      { name: "text-warning-icon", job: "A warning panel's icon", chips: [{ className: "bg-warning text-warning", label: "icon", icon: "hero-information-circle text-warning-icon" }] },
    ],
  },
  {
    title: "Info",
    roles: [
      { name: "bg-info", job: "An info panel", chips: [{ className: "bg-info text-info border border-info", label: "panel" }] },
      { name: "border-info", job: "An info panel's edge", chips: [{ className: "bg-info text-info border-2 border-info", label: "edge" }] },
      { name: "text-info", job: "Text on an info panel", chips: [{ className: "bg-info text-info", label: "on info panel" }] },
      { name: "text-info-strong", job: "An info panel's heading", chips: [{ className: "bg-info text-info-strong font-semibold", label: "on info panel" }] },
      { name: "text-info-icon", job: "An info panel's icon", chips: [{ className: "bg-info text-info", label: "icon", icon: "hero-information-circle text-info-icon" }] },
    ],
  },
];

function Roles() {
  return (
    <div className="space-y-8 bg-page p-6">
      {groups.map((group) => (
        <section key={group.title}>
          <h2 className="mb-3 text-lg font-semibold text-strong">{group.title}</h2>
          <div className="divide-y divide-subtle rounded-lg border border-subtle bg-surface">
            {group.roles.map((role) => (
              <div key={role.name} className="grid grid-cols-3 items-center gap-4 px-4 py-3">
                <code className="font-mono text-sm text-strong">{role.name}</code>
                <p className="text-sm text-muted">{role.job}</p>
                <div className="flex flex-wrap gap-2">
                  {role.chips.map((chip) => (
                    <span key={chip.label + chip.className} className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm", chip.className)}>
                      {chip.icon && <span aria-hidden className={cn(chip.icon, "size-4")} />}
                      {chip.label}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

const meta = { title: "theme/Roles", component: Roles, parameters: { layout: "fullscreen" } } satisfies Meta<typeof Roles>;
export default meta;

export const AllRoles: StoryObj<typeof meta> = {};
