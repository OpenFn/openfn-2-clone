import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import CodeEditor from "./CodeEditor";
import { withCanvas } from "../../stories/decorators";

const meta: Meta<typeof CodeEditor> = {
  title: "Primitives/CodeEditor",
  component: CodeEditor,
  decorators: [withCanvas("h-64")],
};
export default meta;
type Story = StoryObj<typeof CodeEditor>;

function EditableDemo() {
  const [value, setValue] = useState("fn(state => state);\n");
  return <CodeEditor value={value} onChange={setValue} ariaLabel="Job code" />;
}

export const Editable: Story = { render: () => <EditableDemo /> };
export const ReadOnly: Story = {
  args: { value: "get('trackedEntityInstances', {\n  ou: 'DiszpKrYNg8',\n});\n", readOnly: true, ariaLabel: "Job code" },
};
export const Json: Story = {
  args: { value: '{\n  "data": {\n    "resourceType": "Patient"\n  }\n}\n', language: "json", readOnly: true, ariaLabel: "Job code" },
};
export const Minimap: Story = {
  args: {
    value: Array.from({ length: 40 }, (_, i) => `fn(state => {\n  // step ${i + 1}\n  return state;\n});`).join("\n"),
    options: { minimap: { enabled: true } },
  },
};
