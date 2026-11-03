import type { Meta, StoryObj } from "@storybook/react";
import Button from "./Button";
import IconButton from "./IconButton";
import Menu, { MenuDivider, MenuHeader, MenuItem, MenuLink, MenuSection } from "./Menu";
import { withRouter } from "../../stories/decorators";

const meta: Meta<typeof Menu> = {
  title: "Primitives/Menu",
  component: Menu,
  decorators: [withRouter, (Story) => <div className="flex justify-center p-8 pb-64"><Story /></div>],
  args: {
    trigger: (
      <Button variant="secondary" icon="hero-chevron-down" iconPosition="right">
        Options
      </Button>
    ),
    children: (
      <>
        <MenuItem icon="hero-pencil-square">Edit</MenuItem>
        <MenuItem icon="hero-document-duplicate">Duplicate</MenuItem>
        <MenuItem icon="hero-arrow-down-tray" disabled>
          Export
        </MenuItem>
        <MenuDivider />
        <MenuItem icon="hero-trash" tone="danger">
          Delete
        </MenuItem>
      </>
    ),
  },
};
export default meta;
type Story = StoryObj<typeof Menu>;

export const Default: Story = {};

export const IconTrigger: Story = {
  args: { trigger: <IconButton icon="hero-ellipsis-vertical" label="More actions" /> },
};

export const Choices: Story = {
  args: {
    align: "start",
    trigger: (
      <Button variant="secondary" icon="hero-chevron-down" iconPosition="right">
        Version: latest
      </Button>
    ),
    children: (
      <>
        <MenuItem selected description="Saved 2 minutes ago">latest</MenuItem>
        <MenuItem description="Saved yesterday">v12</MenuItem>
        <MenuItem description="Saved last week">v11</MenuItem>
      </>
    ),
  },
};

export const WithSectionsAndHeader: Story = {
  args: {
    children: (
      <>
        <MenuHeader>
          <p className="text-muted">Signed in as</p>
          <p className="truncate font-medium text-strong">amy@openfn.org</p>
        </MenuHeader>
        <MenuDivider />
        <MenuSection heading="Account">
          <MenuItem icon="hero-user-circle" to="/profile">
            User Profile
          </MenuItem>
          <MenuItem icon="hero-key" to="/credentials">
            Credentials
          </MenuItem>
        </MenuSection>
        <MenuDivider />
        <MenuItem icon="hero-arrow-right-on-rectangle">Log out</MenuItem>
      </>
    ),
  },
};

/** A link inside a notice: a menu item the arrow keys reach, in the notice's colour. */
export const WithInlineLink: Story = {
  args: {
    children: (
      <>
        <div className="bg-warning px-4 py-3">
          <p className="text-xs text-muted">You're using features that are still being built.</p>
          <p className="mt-1.5 text-xs text-warning">
            <MenuLink to="/profile">Turn off in your profile</MenuLink>
          </p>
        </div>
        <MenuDivider />
        <MenuItem icon="hero-user-circle" to="/profile">
          User Profile
        </MenuItem>
      </>
    ),
  },
};

/** `panelProps` reach the portalled panel, so the annotations panel can find its `data-annotation`. */
export const WithPanelProps: Story = { args: { panelProps: { "data-annotation": "workflow-editor-versions-and-promote" } } };
