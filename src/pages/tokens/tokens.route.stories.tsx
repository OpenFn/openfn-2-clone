import type { Meta, StoryObj } from "@storybook/react-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { expect, userEvent, within } from "storybook/test";
import { failNext, resetFakeApi } from "@/lib/api/client";
import { TokensRoute } from "./tokens.route";

// A fresh client per story, made before it renders, so a re-render (a theme switch) keeps its cache.
let client: QueryClient;

// The page on the stand-in API, through the real client and TanStack Query: what the app runs.
const meta = {
  title: "pages/Tokens/On the API",
  component: TokensRoute,
  parameters: { layout: "fullscreen" },
  beforeEach: () => {
    resetFakeApi();
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  },
  decorators: [
    (Story) => (
      <QueryClientProvider client={client}>
        <Story />
      </QueryClientProvider>
    ),
  ],
} satisfies Meta<typeof TokensRoute>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Generate one, then delete it: the list reloads after each. */
export const GenerateThenDelete: Story = {
  play: async ({ canvas }) => {
    const table = await canvas.findByRole("table", { name: "API tokens" });
    const rows = within(table).getAllByRole("row").length;
    await userEvent.click(canvas.getByRole("button", { name: "Generate new token" }));
    const token = (await canvas.findByRole("textbox", { name: "New token" })) as HTMLInputElement;
    await expect(within(table).getAllByRole("row")).toHaveLength(rows + 1);
    const masked = `${token.value.slice(0, 5)}…${token.value.slice(-5)}`;
    await userEvent.click(canvas.getByRole("button", { name: `Delete token ${masked}` }));
    await userEvent.click(await canvas.findByRole("button", { name: "Delete token" }));
    await expect(await canvas.findByText("Token deleted")).toBeInTheDocument();
    await expect(within(table).getAllByRole("row")).toHaveLength(rows);
  },
};
/** Lightning refuses with step_up_required: shown above the table, saying asking for the password isn't built. */
export const StepUpRequired: Story = {
  play: async ({ canvas }) => {
    await canvas.findByRole("table", { name: "API tokens" });
    failNext("POST /api/me/tokens", { status: 403, code: "step_up_required", detail: "Enter your password or an MFA code again to do this." });
    await userEvent.click(canvas.getByRole("button", { name: "Generate new token" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent("Asking for it here isn't built yet.");
  },
};
/** The list fails to load, then loads on Try again. */
export const LoadFailed: Story = {
  beforeEach: () => failNext("GET /api/me/tokens", { status: 500, code: "internal", detail: "Something went wrong in Lightning." }),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Something went wrong in Lightning.")).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Try again" }));
    await expect(await canvas.findByRole("table", { name: "API tokens" })).toBeVisible();
  },
};
