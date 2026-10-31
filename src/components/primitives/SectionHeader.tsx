import { createContext, useContext, type ReactNode } from "react";
import Heading from "./Heading";
import Text from "./Text";

interface Props {
  title: ReactNode;
  subtitle?: ReactNode;
  /** `lg` opens a tab or page of settings; `md` titles a card or a part of one. */
  size?: "lg" | "md";
  /** Right-aligned action, usually a Button. */
  action?: ReactNode;
  /** When set, shows "Role based permissions: You cannot modify this project's {section}". */
  permissionsSection?: string | undefined;
}

const NestedLevel = createContext<"h2" | "h3">("h2");

/**
 * Marks what follows an `lg` SectionHeader, so the `md` headings inside it
 * (card titles) are h3s under its h2. Elsewhere they're h2s, straight under
 * the page title.
 */
export function NestedSections({ children }: { children: ReactNode }) {
  return <NestedLevel.Provider value="h3">{children}</NestedLevel.Provider>;
}

/**
 * A title, a small gray subtitle, an optional permissions warning, and the
 * section's main action on the right (Lightning's
 * `LayoutComponents.section_header`). `Card` uses it for its header.
 */
export default function SectionHeader({ title, subtitle, size = "md", action, permissionsSection }: Props) {
  const nestedLevel = useContext(NestedLevel);
  return (
    <div className="flex items-start justify-between gap-8">
      <div>
        <Heading size={size} as={size === "lg" ? "h2" : nestedLevel}>
          {title}
        </Heading>
        {subtitle && <Text as="p" className="mt-1 text-muted">{subtitle}</Text>}
        {permissionsSection && (
          <Text as="p" className="mt-2 text-danger">
            Role based permissions: You cannot modify this project's {permissionsSection}
          </Text>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
