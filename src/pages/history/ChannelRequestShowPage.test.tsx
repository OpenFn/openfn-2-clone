import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RouterProvider, type Router } from "../../routing/router";
import type { ChannelEvent, ChannelRequestChannel, ChannelRequestDetail } from "../../types/channels";
import ChannelRequestShowPage from "./ChannelRequestShowPage";
import { tooltipOf } from "../../test/tooltip";

const channel: ChannelRequestChannel = {
  id: "c1",
  projectId: "p1",
  name: "orders-proxy",
  destinationUrl: "https://destination.example.com/api",
  lockVersion: 3,
};

const event = (overrides: Partial<ChannelEvent> = {}): ChannelEvent => ({
  type: "destination_response",
  requestMethod: "POST",
  requestPath: "/api/v1/data",
  requestQueryString: "format=json",
  requestHeaders: [
    ["content-type", "application/json"],
    ["authorization", "[REDACTED]"],
  ],
  requestBodyPreview: '{"key":"value"}',
  requestBodySize: 15,
  requestBodyHash: "abcdef0123456789deadbeef",
  responseStatus: 200,
  responseHeaders: [["content-type", "application/json"]],
  responseBodyPreview: '{"status":"ok"}',
  responseBodySize: 15,
  responseBodyHash: null,
  latencyUs: 350_000,
  ttfbUs: null,
  queueUs: null,
  connectUs: null,
  requestSendUs: null,
  responseDurationUs: null,
  reusedConnection: false,
  errorMessage: null,
  ...overrides,
});

const request = (overrides: Partial<ChannelRequestDetail> = {}, ev: Partial<ChannelEvent> | null = {}): ChannelRequestDetail => ({
  id: "4f1c9a8e-2b6d-4e1f-9c3a-7d5e8b2a1f60",
  state: "success",
  startedAt: "2026-04-10T10:00:00.000000Z",
  completedAt: "2026-04-10T10:00:00.350000Z",
  clientIdentity: "192.168.1.1",
  clientAuth: "Prod API key (API key)",
  destinationAuth: "Destination API",
  isWiped: false,
  snapshot: { name: "orders-proxy", destinationUrl: "https://snapshot.example.com/api", lockVersion: 3 },
  events: ev ? [event(ev)] : [],
  ...overrides,
});

const errorEvent = (errorMessage: string, overrides: Partial<ChannelEvent> = {}): Partial<ChannelEvent> => ({
  type: "error",
  errorMessage,
  responseStatus: null,
  responseHeaders: null,
  responseBodyPreview: null,
  responseBodySize: null,
  ...overrides,
});

function renderPage(props: Partial<React.ComponentProps<typeof ChannelRequestShowPage>> = {}) {
  const router: Router = { navigate: vi.fn(), useHref: (to) => to, useLocation: () => ({ pathname: "/projects/p1/history/channels/x", search: "", hash: "" }) };
  render(
    <RouterProvider value={router}>
      <ChannelRequestShowPage
        project={{ id: "p1", parentId: null, color: null }}
        projectLabel="Malawi HIV"
        request={request()}
        channel={channel}
        canEditDataRetention={false}
        adminContacts={[]}
        {...props}
      />
    </RouterProvider>
  );
}

/** The tooltip on each timing bar, left to right. */
async function titles() {
  const bars = Array.from(document.querySelectorAll("#timing-section .h-7 > div"));
  const tips: (string | null)[] = [];
  for (const bar of bars) tips.push(await tooltipOf(bar));
  return tips;
}
const section = (id: string) => document.getElementById(id);

describe("ChannelRequestShowPage", () => {
  it("shows the summary, headers with secrets redacted, and both bodies", () => {
    renderPage();
    expect(screen.getByText("POST")).toBeTruthy();
    expect(screen.getByText("/api/v1/data")).toBeTruthy();
    expect(screen.getByText("?format=json")).toBeTruthy();
    // Once in the summary, once on the Response section.
    expect(screen.getAllByText("200")).toHaveLength(2);
    expect(screen.getByText("Success")).toBeTruthy();
    expect(screen.getByRole("link", { name: "orders-proxy" }).getAttribute("href")).toBe("/projects/p1/channels/c1/edit");
    expect(screen.getByText("192.168.1.1")).toBeTruthy();
    expect(screen.getByText(/Prod API key \(API key\)/)).toBeTruthy();
    expect(screen.getByText(/Destination API/)).toBeTruthy();
    expect(screen.getByText("https://destination.example.com/api")).toBeTruthy();
    // The summary's latency, and the timing bar's end.
    expect(screen.getAllByText("350 ms")).toHaveLength(2);
    // The short id beside "Request" (the page title has it too).
    expect(screen.getAllByText("4f1c9a8e")).toHaveLength(1);

    const redacted = screen.getByText("[REDACTED]");
    expect(redacted.className).toContain("italic");
    expect(section("request-section")!.textContent).toContain('{"key":"value"}');
    expect(section("request-section")!.textContent).toContain("SHA256: abcdef0123456789...");
    expect(section("response-section")!.textContent).toContain('{"status":"ok"}');
    expect(screen.getAllByText("JSON").length).toBe(2);
  });

  it("names the breadcrumb trail, and the page with the request's short id", () => {
    renderPage();
    expect(screen.getByRole("link", { name: "History" }).getAttribute("href")).toBe("/projects/p1/history");
    expect(screen.getByRole("link", { name: "Channels" }).getAttribute("href")).toBe("/projects/p1/history/channels");
    expect(screen.getByRole("heading", { level: 1, name: "Channel Request 4f1c9a8e" })).toBeTruthy();
  });

  it("explains a transport error and shows its code, with one timing bar", async () => {
    renderPage({ request: request({ state: "error" }, errorEvent("econnrefused", { latencyUs: 100_000 })) });
    expect(screen.getByText("No response received")).toBeTruthy();
    expect(screen.getByText(/Connection refused/)).toBeTruthy();
    expect(screen.getByText("econnrefused")).toBeTruthy();
    expect(await titles()).toContain("Total: 100 ms");
  });

  it("shows a timed-out request as one thirty-second bar", async () => {
    renderPage({ request: request({ state: "timeout" }, errorEvent("response_timeout", { latencyUs: 30_000_000 })) });
    expect(await titles()).toEqual(["Total: 30000 ms"]);
    expect(section("timing-section")!.textContent).toContain("30.0s");
    expect(screen.getByText("Timeout")).toBeTruthy();
  });

  it("shows the start and, when there is none yet, a dash for the completion", () => {
    renderPage({ request: request({ completedAt: null }) });
    expect(screen.getAllByText("--")).toHaveLength(1);
    document.body.innerHTML = "";
    renderPage();
    expect(screen.queryByText("--")).toBeNull();
  });

  it("says a truncated body is a preview, in bytes", () => {
    const preview = "é".repeat(100);
    renderPage({ request: request({}, { requestBodyPreview: preview, requestBodySize: 10_240, requestBodyHash: null }) });
    expect(section("request-section")!.textContent).toContain("Preview: 200 B of 10.0 KB");
  });

  it("explains a credential error and hides the timing section", () => {
    renderPage({ request: request({ state: "error" }, errorEvent("credential_missing_auth_fields", { latencyUs: null })) });
    expect(screen.getByText("Request not sent — credential error")).toBeTruthy();
    expect(screen.getByText(/missing required authentication fields/)).toBeTruthy();
    expect(screen.getByText("credential_missing_auth_fields")).toBeTruthy();
    expect(section("timing-section")).toBeNull();
  });

  it("draws every phase with the proxy overhead and the TTFB marker", async () => {
    renderPage({
      request: request({}, { queueUs: 2_000, connectUs: 15_000, requestSendUs: 5_000, ttfbUs: 180_000, responseDurationUs: 65_000, latencyUs: 260_000 }),
    });
    expect(await titles()).toEqual(["Queue: 2 ms", "Connect: 15 ms", "Send: 5 ms", "Processing: 158 ms", "Recv: 65 ms"]);
    expect(section("timing-section")!.textContent).toContain("TTFB: 180 ms");
    expect(section("timing-section")!.textContent).toContain("Proxy overhead");
    expect(section("timing-section")!.textContent).toContain("0 ms");
    expect(section("timing-section")!.textContent).toContain("260 ms");
  });

  it("marks a reused connection and computes processing from a missing queue and connect", async () => {
    renderPage({
      request: request({}, { reusedConnection: true, queueUs: 1_000, connectUs: 0, requestSendUs: 4_000, ttfbUs: 120_000, responseDurationUs: 30_000, latencyUs: 155_000 }),
    });
    expect(section("timing-section")!.textContent).toContain("(reused)");

    document.body.innerHTML = "";
    renderPage({
      request: request({}, { queueUs: null, connectUs: null, requestSendUs: 10_000, ttfbUs: 200_000, responseDurationUs: 50_000, latencyUs: 260_000 }),
    });
    expect(await titles()).toContain("Processing: 190 ms");
  });

  it("degrades to TTFB and download, then to one total bar", async () => {
    renderPage({ request: request({}, { ttfbUs: 280_000, latencyUs: 350_000 }) });
    expect(await titles()).toEqual(["TTFB: 280 ms", "Download: 70 ms"]);
    expect(section("timing-section")!.textContent).not.toContain("Proxy overhead");

    document.body.innerHTML = "";
    renderPage({ request: request({}, { latencyUs: 420_000 }) });
    expect(await titles()).toEqual(["Total: 420 ms"]);
    expect(section("timing-section")!.textContent).toContain("420 ms");
  });

  it("positions the TTFB marker on the phases' own scale, not the latency", () => {
    const marker = () => document.querySelector<HTMLElement>("#timing-section .bg-inverse")!.style.left;
    renderPage({
      request: request({}, { queueUs: 10_000, connectUs: 20_000, requestSendUs: 5_000, ttfbUs: 100_000, responseDurationUs: 100_000, latencyUs: 250_000 }),
    });
    expect(marker()).toBe("50%");

    document.body.innerHTML = "";
    renderPage({
      request: request({}, { queueUs: 10_000, connectUs: 20_000, requestSendUs: 5_000, ttfbUs: 100_000, responseDurationUs: 0, latencyUs: 150_000 }),
    });
    expect(marker()).toBe("100%");
  });

  it("shows the snapshot the request ran on, folded away, and flags a config that changed since", () => {
    renderPage();
    const openContext = () => fireEvent.click(within(section("context-section")!).getByRole("button", { name: /Context/ }));
    expect(section("context-section")!.textContent).not.toContain("https://snapshot.example.com/api");
    openContext();
    const context = section("context-section")!;
    expect(context.textContent).toContain("https://snapshot.example.com/api");
    expect(context.textContent).toContain("3");
    expect(context.textContent).not.toContain("Config changed");

    document.body.innerHTML = "";
    renderPage({ channel: { ...channel, lockVersion: 4 } });
    openContext();
    expect(section("context-section")!.textContent).toContain("Config changed");
  });

  it("says when a body was not captured, hides the body when there was none, and shows metadata only for binary content", () => {
    renderPage({ request: request({}, { requestBodyPreview: null, requestBodyHash: null, requestBodySize: 2048 }) });
    expect(within(section("request-section")!).getByText(/Body not captured/)).toBeTruthy();

    document.body.innerHTML = "";
    renderPage({ request: request({}, { requestBodyPreview: null, requestBodyHash: null, requestBodySize: null }) });
    expect(within(section("request-section")!).queryByText(/Body not captured/)).toBeNull();
    expect(within(section("request-section")!).queryByText("Body")).toBeNull();

    document.body.innerHTML = "";
    renderPage({
      request: request({}, {
        responseHeaders: [["content-type", "application/octet-stream"]],
        responseBodyPreview: null,
        responseBodySize: 4096,
        responseBodyHash: "binaryhash123",
      }),
    });
    const response = section("response-section")!;
    expect(response.textContent).toContain("application/octet-stream");
    expect(response.textContent).toContain("4.0 KB");
    expect(response.textContent).toContain("SHA256: binaryhash123");
    expect(response.querySelector("pre")).toBeNull();
  });

  it("replaces the request and response with the wiped notice, pointing admins at the policy", () => {
    renderPage({ request: request({ isWiped: true, clientIdentity: null }, { requestPath: null, requestHeaders: null, requestBodyPreview: null, responseHeaders: null, responseBodyPreview: null }), canEditDataRetention: true });
    expect(screen.getByText("No Request/Response Data here!")).toBeTruthy();
    expect(screen.getByText(/Request\/Response data for this channel request/)).toBeTruthy();
    expect(screen.getByText(/for future requests/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "this policy" }).getAttribute("href")).toBe("/projects/p1/settings#data-storage");
    expect(document.body.textContent).not.toContain("rerun this work order");
    expect(section("request-section")).toBeNull();
    expect(section("response-section")).toBeNull();
  });

  it("tells others whom to contact about a wiped request, naming the admins", async () => {
    renderPage({ request: request({ isWiped: true }), canEditDataRetention: false, adminContacts: ["admin@example.com"] });
    expect(screen.getByText(/Contact one of your/)).toBeTruthy();
    expect(await tooltipOf(screen.getByText("project admins"))).toBe("admin@example.com");
    expect(document.body.textContent).not.toContain("for future requests");
    expect(screen.queryByRole("link", { name: "this policy" })).toBeNull();
  });
});
