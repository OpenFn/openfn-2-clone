import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@/components/ui/Button/Button";
import { KeyRound, Plus, Terminal, UserRound } from "@/components/ui/icons";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs/Breadcrumbs";
import { SectionHeading } from "@/components/layout/SectionHeading/SectionHeading";
import { SettingsNav, SettingsNavItem } from "@/components/layout/SettingsNav/SettingsNav";
import { SettingsLayout } from "./SettingsLayout";

const meta = {
  title: "layout/SettingsLayout",
  component: SettingsLayout,
  parameters: { layout: "fullscreen" },
  args: {
    breadcrumbs: <Breadcrumbs trail={[{ label: "User settings", href: "/user-settings" }]} current="API tokens" />,
    title: "User settings",
    description: "Manage your profile, personal credentials and API tokens.",
    nav: (
      <SettingsNav label="User settings">
        <SettingsNavItem icon={UserRound}>Profile</SettingsNavItem>
        <SettingsNavItem icon={KeyRound} href="/user-settings/credentials">Credentials</SettingsNavItem>
        <SettingsNavItem icon={Terminal} href="/user-settings/api-tokens" current>API tokens</SettingsNavItem>
      </SettingsNav>
    ),
    children: (
      <SectionHeading
        title="API tokens"
        description="Personal access tokens let the OpenFn CLI and API act as you."
        action={<Button size="sm" icon={Plus}>Generate new token</Button>}
      />
    ),
  },
} satisfies Meta<typeof SettingsLayout>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Profile isn't built yet, so it's greyed; Credentials is a link; API tokens is the page you're on. */
export const Default: Story = {};
export const LongText: Story = {
  args: {
    breadcrumbs: <Breadcrumbs trail={[{ label: "User settings for the Ministry of Health integration account", href: "/user-settings" }]} current="API tokens and other ways scripts sign in" />,
    title: "User settings for the Ministry of Health production integration account",
  },
};
