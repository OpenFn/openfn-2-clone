import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Toast, ToastProvider, useToast, type ToastTone } from "./Toast";

function Trigger({ tone }: { tone?: ToastTone | undefined }) {
  const toast = useToast();
  return <button onClick={() => toast("Saved", tone)}>go</button>;
}

const showToast = (tone?: ToastTone) => {
  render(
    <ToastProvider>
      <Trigger tone={tone} />
    </ToastProvider>
  );
  fireEvent.click(screen.getByText("go"));
  return screen.getByText("Saved").closest("[data-ui=toast]") as HTMLElement;
};
const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms));

describe("Toast", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("announces info as a status", () => {
    expect(showToast().getAttribute("role")).toBe("status");
  });

  it("announces an error as an alert", () => {
    expect(showToast("danger").getAttribute("role")).toBe("alert");
  });

  it("closes a success message after 5 seconds", () => {
    showToast();
    wait(4900);
    expect(screen.queryByText("Saved")).toBeTruthy();
    wait(100);
    expect(screen.queryByText("Saved")).toBeNull();
  });

  it("keeps an error up until it is dismissed", () => {
    showToast("danger");
    wait(60_000);
    expect(screen.queryByText("Saved")).toBeTruthy();
  });

  it("stays while pointed at, then waits the full time again after the pointer leaves", () => {
    const box = showToast();
    wait(4000);
    fireEvent.pointerEnter(box);
    wait(10_000);
    expect(screen.queryByText("Saved")).toBeTruthy();
    fireEvent.pointerLeave(box);
    wait(4900);
    expect(screen.queryByText("Saved")).toBeTruthy();
    wait(100);
    expect(screen.queryByText("Saved")).toBeNull();
  });

  it("stays while focus is inside, and Escape closes it", () => {
    const box = showToast();
    fireEvent.focus(screen.getByRole("button", { name: "Close" }));
    wait(10_000);
    expect(screen.queryByText("Saved")).toBeTruthy();
    fireEvent.keyDown(box, { key: "Escape" });
    expect(screen.queryByText("Saved")).toBeNull();
  });

  it("waits the full time again after focus leaves", () => {
    showToast();
    const close = screen.getByRole("button", { name: "Close" });
    fireEvent.focus(close);
    wait(10_000);
    fireEvent.blur(close, { relatedTarget: document.body });
    wait(4900);
    expect(screen.queryByText("Saved")).toBeTruthy();
    wait(100);
    expect(screen.queryByText("Saved")).toBeNull();
  });

  it("hands focus back to where it came from when closed from the keyboard", () => {
    const box = showToast();
    const go = screen.getByRole("button", { name: "go" });
    act(() => go.focus());
    act(() => screen.getByRole("button", { name: "Close" }).focus());
    fireEvent.keyDown(box, { key: "Escape" });
    expect(screen.queryByText("Saved")).toBeNull();
    expect(document.activeElement).toBe(go);
  });

  it("keeps Escape from also reaching the page's own Escape handler", () => {
    // fireEvent returns false once a handler has called preventDefault
    expect(fireEvent.keyDown(showToast(), { key: "Escape" })).toBe(false);
  });

  it("closes once when its X is clicked", () => {
    const onClose = vi.fn();
    render(<Toast onClose={onClose}>Saved</Toast>);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes when clicked anywhere on it", () => {
    fireEvent.click(showToast());
    expect(screen.queryByText("Saved")).toBeNull();
  });

  it("hands toasts to the host's show and draws none itself", () => {
    const show = vi.fn();
    render(
      <ToastProvider show={show}>
        <Trigger tone="danger" />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText("go"));
    expect(show).toHaveBeenCalledWith("Saved", "danger");
    expect(screen.queryByText("Saved")).toBeNull();
  });
});
