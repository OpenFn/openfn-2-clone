import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent } from "storybook/test";
import { TokensPage, type TokenRow } from "./TokensPage";

const tokens: TokenRow[] = [
  { id: "a", masked: "demo.…f1a01", createdAt: "2026-10-28T09:12:44Z", lastUsedAt: null },
  { id: "b", masked: "demo.…b4c5d", createdAt: "2026-09-14T16:40:02Z", lastUsedAt: "2026-10-30T11:02:00Z" },
];

const meta = {
  title: "pages/Tokens",
  component: TokensPage,
  parameters: { layout: "fullscreen" },
  args: {
    status: { state: "ready" },
    tokens,
    onGenerate: fn(() => Promise.resolve("demo.fake-token-not-real.4f1c9a2b-7d3e-4b8a-9c1f-2e6d5a0b3c7e")),
    onDelete: fn(() => Promise.resolve()),
    onRetry: fn(),
  },
  beforeEach: () => {
    const real = Object.getOwnPropertyDescriptor(navigator, "clipboard");
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: () => Promise.resolve() } });
    return () => {
      if (real) Object.defineProperty(navigator, "clipboard", real);
    };
  },
} satisfies Meta<typeof TokensPage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const WithTokens: Story = {};
export const Loading: Story = { args: { status: { state: "loading" }, tokens: [] } };
/** Nothing yet: the empty state, never mistaken for a failure. */
export const Empty: Story = { args: { tokens: [] } };
/** The list didn't load: an error that says what to do, not an empty list. */
export const LoadFailed: Story = {
  args: { status: { state: "error", message: "Lightning didn't answer. Check your connection." }, tokens: [] },
  play: async ({ canvas, args }) => {
    await expect(canvas.queryByText("No personal access tokens")).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "Try again" }));
    await expect(args.onRetry).toHaveBeenCalledOnce();
  },
};
/** A date the page can't read says "Unknown". */
export const LongValues: Story = {
  args: {
    tokens: [
      { id: "c", masked: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…Ministry-of-Health-production", createdAt: "not a date", lastUsedAt: null },
      ...tokens,
    ],
  },
};
/** Generate: the new token shows once, ready to copy, and Copy says Copied. */
export const Generate: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Generate new token" }));
    await expect(await canvas.findByText("Copy your token now. You won't be able to see it again.")).toBeVisible();
    await expect(canvas.getByRole("textbox", { name: "New token" })).toHaveValue("demo.fake-token-not-real.4f1c9a2b-7d3e-4b8a-9c1f-2e6d5a0b3c7e");
    await userEvent.click(canvas.getByRole("button", { name: "Copy" }));
    await expect(await canvas.findByRole("button", { name: "Copied" })).toBeVisible();
  },
};
/** Lightning wants your password again first (not built yet): the error sits above the table until dismissed. */
export const GenerateRefused: Story = {
  args: {
    onGenerate: fn(() => Promise.reject(new Error("Enter your password or an MFA code again to do this. Asking for it here isn't built yet."))),
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Generate new token" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent("Couldn't generate a token");
    await userEvent.click(canvas.getByRole("button", { name: "Dismiss" }));
    await expect(canvas.queryByRole("alert")).not.toBeInTheDocument();
  },
};
/** By keyboard: Delete asks first, Delete token deletes, and a screen reader hears it went. */
export const Delete: Story = {
  play: async ({ canvas, args }) => {
    canvas.getByRole("button", { name: "Delete token demo.…f1a01" }).focus();
    await userEvent.keyboard("{Enter}");
    await expect(await canvas.findByRole("dialog", { name: "Delete token?" })).toHaveTextContent("will no longer be able to access the API");
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    await expect(args.onDelete).toHaveBeenCalledWith("a");
    await expect(canvas.queryByRole("dialog")).not.toBeInTheDocument();
    await expect(canvas.getByRole("status")).toHaveTextContent("Token deleted");
  },
};
/** Deleting failed: the error stays in the dialog. */
export const DeleteFailed: Story = {
  args: { onDelete: fn(() => Promise.reject(new Error("This token doesn't exist."))) },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Delete token demo.…f1a01" }));
    await userEvent.click(await canvas.findByRole("button", { name: "Delete token" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent("This token doesn't exist.");
    await expect(canvas.getByRole("dialog")).toBeInTheDocument();
  },
};
