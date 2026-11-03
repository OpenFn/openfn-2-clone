import type { ReactNode } from "react";
import { cn } from "@/components/ui/cn";

type Align = { align?: "start" | "end" };

/**
 * A bordered table of records. Compose it: `Table` > `TableHead` (of `TableHeader`s) and `TableBody` (of
 * `TableRow`s of `TableCell`s). Name it with `aria-label` when no heading right above says what it lists.
 */
export function Table({ children, "aria-label": label }: { children: ReactNode; "aria-label"?: string }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-subtle bg-surface">
      <table aria-label={label} className="w-full border-collapse">
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-subtle bg-subtle">
      <tr>{children}</tr>
    </thead>
  );
}

/** A column's heading. An actions column still gets words, `hidden` from view, so a screen reader can say it. */
export function TableHeader({ children, align = "start", hidden }: { children: string; hidden?: boolean } & Align) {
  return (
    <th scope="col" className={cn("px-4 py-3 text-xs font-medium tracking-wider text-muted uppercase", align === "end" ? "text-right" : "text-left")}>
      {hidden ? <span className="sr-only">{children}</span> : children}
    </th>
  );
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-subtle">{children}</tbody>;
}

export function TableRow({ children }: { children: ReactNode }) {
  return <tr className="hover:bg-hover">{children}</tr>;
}

/** `strong` for the cell that names the row; the rest are quieter. */
export function TableCell({ children, align = "start", strong }: { children: ReactNode; strong?: boolean } & Align) {
  return (
    <td className={cn("px-4 py-3 text-sm", strong ? "text-strong" : "text-muted", align === "end" && "text-right")}>{children}</td>
  );
}
