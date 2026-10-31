import type { Meta, StoryObj } from "@storybook/react";
import Text, { type TextTone, type TextVariant } from "./Text";

const meta: Meta<typeof Text> = { title: "Primitives/Text", component: Text, args: { children: "Run started 3 minutes ago" } };
export default meta;
type Story = StoryObj<typeof Text>;

export const BodyMd: Story = {};
export const BodySm: Story = { args: { variant: "body-sm", tone: "muted" } };
export const LabelMd: Story = { args: { variant: "label-md", children: "Destination URL" } };
export const LabelSm: Story = { args: { variant: "label-sm", children: "Destination URL" } };
export const CodeMd: Story = { args: { variant: "code-md", children: "/fhir/Patient?identifier=58213" } };
export const CodeSm: Story = { args: { variant: "code-sm", children: "SHA256: 9f86d081884c7d65" } };
export const StatLg: Story = { args: { variant: "stat-lg", children: "1,284" } };
export const StatMd: Story = { args: { variant: "stat-md", children: "1,284" } };
export const StatSm: Story = { args: { variant: "stat-sm", children: "1,284" } };

const all: TextVariant[] = ["body-md", "body-sm", "label-md", "label-sm", "code-md", "code-sm", "stat-lg", "stat-md", "stat-sm"];

/** The whole scale, one row per style. */
export const Scale: Story = {
  render: () => (
    <div className="space-y-3">
      {all.map((v) => (
        <div key={v} className="flex items-baseline gap-6">
          <Text variant="code-sm" tone="muted" className="w-20">
            {v}
          </Text>
          <Text variant={v}>The quick brown fox, 1,284 runs</Text>
        </div>
      ))}
    </div>
  ),
};

export const Block: Story = {
  args: {
    as: "div",
    tone: "muted",
    className: "space-y-3",
    children: (
      <>
        <p>
          This removes <span className="font-medium text-strong">3 work orders</span> and their runs.
        </p>
        <p>
          The request body was <code>application/json</code>, <span className="italic">redacted</span>.
        </p>
      </>
    ),
  },
};

const tones: TextTone[] = ["strong", "body", "muted", "faint", "danger", "success", "warning", "info"];

/** Every tone, on a surface: `faint` and `success` miss AA contrast on the grey page. Unset inherits. */
export const Tones: Story = {
  render: () => (
    <div className="space-y-2 rounded-lg bg-surface p-4">
      {tones.map((t) => (
        <div key={t} className="flex items-baseline gap-6">
          <Text variant="code-sm" tone="muted" className="w-20">
            {t}
          </Text>
          <Text tone={t}>Run started 3 minutes ago</Text>
        </div>
      ))}
    </div>
  ),
};
