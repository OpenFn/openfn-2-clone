import type { ReactNode } from "react";
import { cn } from "../../utils/cn";

/** The spacing scale between siblings: 4, 8, 16 and 24px. */
const gaps = { xs: "gap-1", sm: "gap-2", md: "gap-4", lg: "gap-6" };
type Gap = keyof typeof gaps;

interface Props {
  gap?: Gap;
  as?: "div" | "ul" | "ol" | "section";
  /** Layout and sizing only. */
  className?: string | undefined;
  children: ReactNode;
}

/** Children in a column, with the gap between them. The parent owns the space, not the children's margins. */
export function Stack({ gap = "md", as: As = "div", className, children }: Props) {
  return (
    <As data-ui="stack" className={cn("flex flex-col", gaps[gap], className)}>
      {children}
    </As>
  );
}

/** Children in a line, centred on each other, with the gap between them. */
export function Row({
  gap = "sm",
  wrap = false,
  justify = "start",
  as: As = "div",
  className,
  children,
}: Props & { wrap?: boolean; justify?: "start" | "between" | "end" }) {
  return (
    <As
      data-ui="row"
      className={cn(
        "flex items-center",
        gaps[gap],
        wrap && "flex-wrap",
        justify === "between" && "justify-between",
        justify === "end" && "justify-end",
        className,
      )}
    >
      {children}
    </As>
  );
}
