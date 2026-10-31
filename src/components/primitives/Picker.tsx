import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "../../routing/router";
import { cn } from "../../utils/cn";
import Modal from "./Modal";
import SearchList from "./SearchList";
import Text from "./Text";
import { matchesQuery } from "../../utils/search";

/**
 * Generic command-palette picker. Content-agnostic: the server ships a
 * pre-flattened list of items plus display strings, and this component
 * renders the modal, handles search, keyboard navigation, and navigation.
 *
 * Used by the project picker today. The same component will back a billing
 * account picker (and any future context-scoped picker) — the only thing
 * that changes is which data the layout feeds in.
 */

export interface PickerItem {
  id: string;
  /** The leaf label shown on the row (e.g. project name). */
  label: string;
  /** Full path used for search matching (e.g. "parent/child/leaf"). */
  searchLabel: string;
  /** Indent level; 0 for top-level items. */
  depth: number;
  /** Optional accent color (sandboxes, account tiers). */
  color?: string | null;
  /** Where to navigate when selected. Pre-computed server-side. */
  href: string;
  /**
   * True when `href` targets the same section as the current URL. The
   * picker uses this to decide whether to preserve the current URL's hash
   * when navigating — it's only meaningful on same-section switches.
   */
  sameSection?: boolean;
  /** Hero icon class for the row (e.g. `hero-folder`). */
  icon: string;
}

interface PickerProps {
  items: PickerItem[];
  currentId?: string | undefined;
  placeholder: string;
  emptyMessage: string;
  viewAllLabel: string;
  viewAllHref: string;
  /**
   * Event name the picker listens for on `document.body` to open.
   * The matching trigger button dispatches this event.
   */
  openEvent: string;
  /** Start open (stories and screenshots). */
  defaultOpen?: boolean;
}

/**
 * The items whose `searchLabel` contains `term`, plus the ancestors that
 * lead to each match so the indentation still reads (Lightning's picker
 * filter). `items` must be in pre-order, as a depth-first walk of a tree gives.
 */
function filterPickerItems(items: PickerItem[], term: string): PickerItem[] {
  if (!term.trim()) return items;
  const matches = items.map((i) => matchesQuery(term, i.searchLabel));
  const include = [...matches];
  items.forEach((item, i) => {
    if (!matches[i]) return;
    // The parent is the most recent item with a strictly smaller depth.
    let depth = item.depth;
    for (let j = i - 1; j >= 0 && depth > 0; j--) {
      if (items[j]!.depth < depth) {
        include[j] = true;
        depth = items[j]!.depth;
      }
    }
  });
  return items.filter((_, i) => include[i]);
}

/** The "View all" row, always first. */
const VIEW_ALL = { id: "__view_all__" } as const;
type Row = PickerItem | typeof VIEW_ALL;
const isViewAll = (row: Row): row is typeof VIEW_ALL => row === VIEW_ALL;

const iconClasses = (active: boolean) => cn("shrink-0 group-hover:text-white/70", active ? "text-white/70" : "text-faint");

/**
 * Lightning's command-palette picker (assets/js/picker/Picker.tsx), used as
 * the project picker. Opens on Cmd/Ctrl+P or when its trigger button
 * dispatches `openEvent`; search, arrow keys (wrapping) and Enter navigate.
 */
export default function Picker({ items: allItems, currentId, placeholder, emptyMessage, viewAllLabel, viewAllHref, openEvent, defaultOpen = false }: PickerProps) {
  const { navigate, useLocation } = useRouter();
  const { hash } = useLocation();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [searchTerm, setSearchTerm] = useState("");

  const isMac = useMemo(() => typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent), []);

  const items = useMemo(() => filterPickerItems(allItems, searchTerm), [allItems, searchTerm]);

  const openPicker = useCallback(() => {
    setIsOpen(true);
    setSearchTerm("");
  }, []);

  const closePicker = useCallback(() => setIsOpen(false), []);

  // Cmd/Ctrl+P to toggle.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "p") {
        e.preventDefault();
        if (isOpen) closePicker();
        else openPicker();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, openPicker, closePicker]);

  // Listen for the configured open event (dispatched by the trigger button).
  useEffect(() => {
    document.body.addEventListener(openEvent, openPicker);
    return () => document.body.removeEventListener(openEvent, openPicker);
  }, [openPicker, openEvent]);

  const go = (row: Row) => {
    setIsOpen(false);
    if (isViewAll(row)) navigate(viewAllHref);
    else navigate(row.href + (row.sameSection ? hash : ""));
  };

  // Modal brings the backdrop, Escape, click-outside and the focus trap;
  // the panel sits high on the page, like a command palette.
  return (
    // eslint-disable-next-line no-restricted-syntax -- sized to the viewport
    <Modal open={isOpen} onClose={closePicker} variant="bare" label={placeholder} className="mt-[15vh] self-start overflow-hidden">
      <SearchList<Row>
        variant="palette"
        listId="picker-options"
        sections={[
          { key: "all", items: [VIEW_ALL] },
          { key: "items", items, empty: emptyMessage },
        ]}
        // The first project is highlighted on open, as in Lightning.
        initialActive={allItems[0]}
        getKey={(row) => row.id}
        isSelected={(row) => row.id === currentId}
        query={searchTerm}
        onQueryChange={setSearchTerm}
        onSelect={go}
        placeholder={placeholder}
        inputAddon={
          <Text as="kbd" variant="code-sm" className="hidden items-center gap-1 rounded px-2 py-1 text-faint ring-1 ring-strong sm:inline-flex">
            <span>{isMac ? "⌘" : "Ctrl"}</span>
            <span>P</span>
          </Text>
        }
        renderItem={(row, { active, selected }) =>
          isViewAll(row) ? (
            <>
              <span className={cn("hero-rectangle-stack mr-2 h-5 w-5", iconClasses(active))} />
              <span className="grow">{viewAllLabel}</span>
              <span className={cn("hero-arrow-right h-4 w-4", iconClasses(active))} />
            </>
          ) : (
            <>
              {row.depth > 0 && (
                <>
                  <span className="shrink-0" style={{ width: row.depth * 10 }} />
                  <span
                    className={cn(
                      "hero-arrow-turn-down-right mr-2 h-4 w-4 shrink-0 group-hover:text-white/50",
                      active ? "text-white/50" : "text-faint"
                    )}
                  />
                </>
              )}
              <span className={cn(row.icon, "mr-2 h-5 w-5", iconClasses(active))} />
              <span className={cn("grow truncate", selected && "font-semibold")}>{row.label}</span>
              {selected && (
                <span className={cn("hero-check ml-3 h-5 w-5 shrink-0 group-hover:text-inverse", active ? "text-inverse" : "text-primary-600")} />
              )}
            </>
          )
        }
      />
    </Modal>
  );
}
