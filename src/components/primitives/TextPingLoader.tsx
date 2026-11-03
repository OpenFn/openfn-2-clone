import type { ReactNode } from "react";

/** Text with a pinging dot after it (components/loaders.ex `text_ping_loader`). */
export default function TextPingLoader({ children }: { children: ReactNode }) {
  return (
    <span data-ui="text-ping-loader" className="relative inline-flex">
      <div className="inline-flex">{children}</div>
      <span className="flex absolute h-3 w-3 right-0 -mr-5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75" />
        <span className="relative inline-flex rounded-full h-3 w-3 bg-brand" />
      </span>
    </span>
  );
}
