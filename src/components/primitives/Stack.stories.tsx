import type { Meta, StoryObj } from "@storybook/react";
import { Row, Stack } from "./Stack";
import Alert from "./Alert";
import Button from "./Button";
import Card from "./Card";
import Text from "./Text";

const meta: Meta<typeof Stack> = { title: "Primitives/Stack", component: Stack };
export default meta;
type Story = StoryObj<typeof Stack>;

/** The four gaps, side by side. */
export const Gaps: Story = {
  render: () => (
    <Row gap="lg" className="items-start">
      {(["xs", "sm", "md", "lg"] as const).map((gap) => (
        <Card key={gap}>
          <Stack gap={gap}>
            <Text variant="label-md">{gap}</Text>
            <Text as="p">First line</Text>
            <Text as="p">Second line</Text>
          </Stack>
        </Card>
      ))}
    </Row>
  ),
};

/** A field and its warning inside one card: the card's Stack keeps them apart. */
export const InACard: Story = {
  render: () => (
    <Card>
      <Stack>
        <Text as="p">Never retain input/output data (zero-persistence)</Text>
        <Alert tone="warning" header="Heads Up!">
          <p>When enabled, you will no longer be able to retry workflow runs.</p>
        </Alert>
      </Stack>
    </Card>
  ),
};

/** Row: buttons in a line, and a toolbar with its ends apart. */
export const Rows: Story = {
  render: () => (
    <Stack>
      <Row>
        <Button variant="secondary">Cancel</Button>
        <Button>Save</Button>
      </Row>
      <Row justify="between">
        <Text variant="label-md">3 credentials</Text>
        <Button size="xs" variant="secondary">Add</Button>
      </Row>
    </Stack>
  ),
};
