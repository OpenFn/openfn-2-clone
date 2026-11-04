import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { describe, expect, it } from "vitest";
import Button from "../../components/primitives/Button";
import { ToastProvider } from "../../components/primitives/Toast";
import { session } from "../../mock-data/users";
import { ReactRouterAdapter } from "../../routing/ReactRouterAdapter";
import SessionProvider from "../../session/SessionProvider";
import ChannelsIndexPageReplica from "./ChannelsIndexPage.replica";

// kickstart-me on the stand-in: two recorded channels, orders-proxy and legacy-sms.
const PROJECT = "1da97d81-152f-5f7d-a0fc-8416bd411706";
const ORDERS = "e4351c88-87e9-48df-a049-833a8e584cc9";
// The workspace loads a level at a time, then the members: several of the stand-in's delays.
const wait = { timeout: 5000 };

function Where() {
  const navigate = useNavigate();
  return (
    <>
      <output data-testid="where">{useLocation().pathname}</output>
      <Button onClick={() => navigate(-1)}>Back</Button>
    </>
  );
}

function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <SessionProvider session={session}>
        <ToastProvider>
          <MemoryRouter initialEntries={["/before", path]} initialIndex={1}>
            <ReactRouterAdapter>
              <Routes>
                {["", "/new", "/:channelId/edit"].map((tail) => (
                  <Route key={tail} path={`/projects/:projectId/channels${tail}`} element={<ChannelsIndexPageReplica />} />
                ))}
              </Routes>
              <Where />
            </ReactRouterAdapter>
          </MemoryRouter>
        </ToastProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}

describe("ChannelsIndexPageReplica", () => {
  it("lists the project's channels", async () => {
    renderAt(`/projects/${PROJECT}/channels`);
    expect(await screen.findByText("orders-proxy", {}, wait)).toBeTruthy();
    expect(screen.getByText("legacy-sms")).toBeTruthy();
  });

  it("creates a channel, then closes the form by replacing the history entry, so Back doesn't reopen it", async () => {
    renderAt(`/projects/${PROJECT}/channels/new`);
    fireEvent.change(await screen.findByLabelText("Name", {}, wait), { target: { value: "new-channel" } });
    fireEvent.change(screen.getByLabelText("Destination URL"), { target: { value: "https://example.com" } });
    fireEvent.submit(document.getElementById("channel-form-new")!);
    expect(await screen.findByText("Channel created successfully.", {}, wait)).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId("where").textContent).toBe(`/projects/${PROJECT}/channels`));
    expect(await screen.findByText("new-channel", {}, wait)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    await waitFor(() => expect(screen.getByTestId("where").textContent).toBe("/before"));
  });

  it("shows Lightning's refusal on the field it names", async () => {
    renderAt(`/projects/${PROJECT}/channels/${ORDERS}/edit`);
    fireEvent.change(await screen.findByLabelText("Name", {}, wait), { target: { value: "legacy-sms" } });
    fireEvent.submit(document.getElementById(`channel-form-${ORDERS}`)!);
    expect(await screen.findByText("A channel with this name already exists in this project", {}, wait)).toBeTruthy();
  });

  it("sends an edit of a channel the project doesn't have back to the list with 'Channel not found'", async () => {
    renderAt(`/projects/${PROJECT}/channels/00000000-0000-4000-8000-000000000000/edit`);
    expect(await screen.findByText("Channel not found", {}, wait)).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId("where").textContent).toBe(`/projects/${PROJECT}/channels`));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  // Last: it deletes a recorded channel.
  it("deletes a channel", async () => {
    renderAt(`/projects/${PROJECT}/channels`);
    const row = (await screen.findByText("orders-proxy", {}, wait)).closest("tr")!;
    fireEvent.click(within(row).getByRole("button", { name: "Delete" }));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Delete" }));
    expect(await screen.findByText("Channel deleted.", {}, wait)).toBeTruthy();
    await waitFor(() => expect(screen.queryByText("orders-proxy")).toBeNull(), wait);
  });
});
