import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import Button from "../../components/primitives/Button";
import { ToastProvider } from "../../components/primitives/Toast";
import { session } from "../../mock-data/users";
import { sandboxColorPalette } from "../../constants";
import { ReactRouterAdapter } from "../../routing/ReactRouterAdapter";
import SessionProvider from "../../session/SessionProvider";
import SandboxesIndexPageReplica from "./SandboxesIndexPage.replica";

// The stand-in's recorded workspace: openhie-project, its sandbox staging, and staging's fhir-tests.
const ROOT = "4adf2644-ed4e-4f97-a24c-ab35b3cb1efa";
const STAGING = "bf2cd8b2-2380-44ca-a07a-7a79e394cdf9";
const FHIR_TESTS = "1f030fbc-0f76-4f0d-b266-0e96ad34d087";
// The workspace loads a level at a time, then each project's members: several of the stand-in's delays.
const wait = { timeout: 5000 };

function Where() {
  const navigate = useNavigate();
  return (
    <>
      <output data-testid="where">{useLocation().pathname}</output>
      <Button onClick={() => navigate(`/projects/${ROOT}/sandboxes`)}>Go to the root</Button>
      <Button onClick={() => navigate(`/projects/${ROOT}/sandboxes/new`)}>Go to new</Button>
    </>
  );
}

function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <SessionProvider session={session}>
        <ToastProvider>
          <MemoryRouter initialEntries={[path]}>
            <ReactRouterAdapter>
              <Routes>
                {["", "/new", "/:sandboxId/edit"].map((tail) => (
                  <Route key={tail} path={`/projects/:projectId/sandboxes${tail}`} element={<SandboxesIndexPageReplica />} />
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

const cardId = (name: string) => screen.getByRole("heading", { name }).closest("[id^=sandbox-card-]")!.id.replace("sandbox-card-", "");

async function create(name: string) {
  fireEvent.change(await screen.findByLabelText(/Name/, {}, wait), { target: { value: name } });
  fireEvent.submit(document.getElementById("sandbox-form")!);
  expect(await screen.findByText("Sandbox created", {}, wait)).toBeTruthy();
  await screen.findByRole("heading", { name: name.toLowerCase().replace(/ /g, "-") }, wait);
}

async function remove(id: string, name: string) {
  fireEvent.click(document.querySelector(`#delete-sandbox-${id} button`)!);
  fireEvent.change(screen.getByLabelText(/Sandbox name/), { target: { value: name } });
  fireEvent.submit(document.getElementById("confirm-delete-sandbox-form")!);
  expect(await screen.findByText(`Sandbox ${name} scheduled for deletion.`, {}, wait)).toBeTruthy();
}

describe("SandboxesIndexPageReplica", () => {
  afterEach(() => vi.restoreAllMocks());

  it("lists every sandbox in the workspace, from the root down", async () => {
    renderAt(`/projects/${FHIR_TESTS}/sandboxes`);
    expect(await screen.findByRole("heading", { name: "fhir-tests" }, wait)).toBeTruthy();
    expect(screen.getByRole("heading", { name: "staging" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "openhie-project" })).toBeTruthy();
  });

  it("picks a new colour each time the Create form opens", async () => {
    const random = vi.spyOn(Math, "random").mockReturnValue(0);
    renderAt(`/projects/${ROOT}/sandboxes/new`);
    expect(((await screen.findByRole("radio", { name: sandboxColorPalette[0]! }, wait)) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    random.mockReturnValue(0.99);
    fireEvent.click(screen.getByRole("button", { name: "Go to new" }));
    const last = sandboxColorPalette[sandboxColorPalette.length - 1]!;
    expect(((await screen.findByRole("radio", { name: last })) as HTMLInputElement).checked).toBe(true);
  });

  it("refuses a name a sibling has, on the field, in Lightning's words", async () => {
    renderAt(`/projects/${ROOT}/sandboxes/new`);
    fireEvent.change(await screen.findByLabelText(/Name/, {}, wait), { target: { value: "Staging" } });
    fireEvent.submit(document.getElementById("sandbox-form")!);
    expect(await screen.findByText("has already been taken", {}, wait)).toBeTruthy();
    expect(screen.getByRole("dialog")).toBeTruthy();
  }, 15_000);

  it("opens the edit form with the stored name", async () => {
    renderAt(`/projects/${ROOT}/sandboxes/${STAGING}/edit`);
    expect(((await screen.findByLabelText(/Name/, {}, wait)) as HTMLInputElement).value).toBe("staging");
  });

  it("refuses a colour on edit, which the API can't save", async () => {
    renderAt(`/projects/${ROOT}/sandboxes/${STAGING}/edit`);
    fireEvent.click(await screen.findByRole("radio", { name: sandboxColorPalette[0]! }, wait));
    fireEvent.submit(document.getElementById("sandbox-form")!);
    expect(await screen.findByText("Lightning's API can't change a sandbox's colour yet.", {}, wait)).toBeTruthy();
  });

  it("renames a sandbox", async () => {
    renderAt(`/projects/${STAGING}/sandboxes/new`);
    await create("Rename Me");
    fireEvent.click(document.querySelector(`#edit-sandbox-${cardId("rename-me")} button`)!);
    fireEvent.change(await screen.findByLabelText(/Name/, {}, wait), { target: { value: "Renamed" } });
    fireEvent.submit(document.getElementById("sandbox-form")!);
    expect(await screen.findByText("Sandbox updated", {}, wait)).toBeTruthy();
    expect(await screen.findByRole("heading", { name: "renamed" }, wait)).toBeTruthy();
  }, 15_000);

  it("leaves the viewer where they are when they delete a sandbox they aren't in", async () => {
    renderAt(`/projects/${ROOT}/sandboxes/new`);
    await create("Child One");
    await remove(cardId("child-one"), "child-one");
    expect(screen.getByTestId("where").textContent).toBe(`/projects/${ROOT}/sandboxes`);
    await waitFor(() => expect(screen.queryByRole("heading", { name: "child-one" })).toBeNull(), wait);
  }, 15_000);

  it("previews the merge into the parent, then toasts the merge and opens the parent's workflows", async () => {
    renderAt(`/projects/${ROOT}/sandboxes/new`);
    await create("To Merge");
    fireEvent.click(document.querySelector(`#branch-rewire-sandbox-${cardId("to-merge")} button`)!);
    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByText("Workflows to merge", {}, wait);
    expect(Array.from(dialog.querySelectorAll("li label")).map((l) => l.textContent)).toEqual(["OpenHIE Workflow"]);
    // Unchanged in the sandbox, so it starts unticked.
    fireEvent.click(within(dialog).getByLabelText("OpenHIE Workflow"));
    fireEvent.submit(document.getElementById("merge-sandbox-form")!);
    // The merge, the scheduling, then every list it touched reloads.
    expect(await screen.findByText("Successfully merged to-merge into openhie-project. Sandbox scheduled for deletion.", {}, { timeout: 12_000 })).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId("where").textContent).toBe(`/projects/${ROOT}/w`));
  }, 25_000);

  // Last: it schedules part of the recorded workspace.
  it("schedules a sandbox with the ones under it and moves the viewer out of it", async () => {
    renderAt(`/projects/${FHIR_TESTS}/sandboxes`);
    await screen.findByRole("heading", { name: "fhir-tests" }, wait);
    await remove(STAGING, "staging");
    await waitFor(() => expect(screen.getByTestId("where").textContent).toBe(`/projects/${ROOT}/sandboxes`));
    await waitFor(() => expect(screen.queryByRole("heading", { name: "fhir-tests" })).toBeNull(), wait);
  }, 15_000);
});
