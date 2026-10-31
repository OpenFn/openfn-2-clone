import type { Meta, StoryObj } from "@storybook/react";
import Section from "./Section";
import Button from "./Button";
import Text from "./Text";

const meta: Meta<typeof Section> = {
  title: "Primitives/Section",
  component: Section,
  args: {
    title: "Credentials",
    children: (
      <>
        <Text as="p">Credentials let your workflows sign in to the systems they talk to.</Text>
        <Text as="p">Only the owner can edit one; anyone in the project can use it.</Text>
      </>
    ),
  },
};
export default meta;
type Story = StoryObj<typeof Section>;

export const Default: Story = {};
export const WithAction: Story = {
  args: { description: "View credentials for this project", action: <Button>Add Credential</Button> },
};
export const Large: Story = {
  args: { size: "lg", title: "Data storage", description: "View or modify data storage settings for this project." },
};
export const Small: Story = {
  args: { size: "sm", title: "Concurrency", description: "Control how many of this workflow's runs are executed at the same time" },
};
export const Eyebrow: Story = { args: { variant: "eyebrow", title: "Client" } };
