import { Combobox, ComboboxInput, ComboboxOption, ComboboxOptions } from "@headlessui/react";
import EmptyState from "./EmptyState";
import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "../../utils/cn";
import Heading from "./Heading";
import SearchInput from "./SearchInput";

export interface SearchListSection<T> {
  key: string;
  /** Eyebrow heading above the section's items. */
  heading?: ReactNode;
  items: T[];
  /** Shown in place of the items when the section has none (e.g. "No projects found"). */
  empty?: ReactNode;
}

export interface SearchListItemState {
  /** Highlighted with the arrow keys or the mouse; Enter picks it. */
  active: boolean;
  /** The caller's current choice (`isSelected`), e.g. the project you're in. */
  selected: boolean;
}

interface Props<T> {
  /** One section with no heading gives a flat list. */
  sections: SearchListSection<T>[];
  getKey: (item: T) => string;
  /** The row's content. The row itself (padding, highlight) comes from `variant`. */
  renderItem: (item: T, state: SearchListItemState) => ReactNode;
  isSelected?: (item: T) => boolean;
  /** The search text. The caller filters `sections` with it. */
  query: string;
  onQueryChange: (query: string) => void;
  /** Click or Enter on a row. */
  onSelect: (item: T) => void;
  placeholder?: string;
  /** Content between the search box and the rows, e.g. an alert. */
  header?: ReactNode;
  /** Extra content at the end of the search box (palette only), e.g. a keyboard hint. */
  inputAddon?: ReactNode;
  /** The row highlighted when the list opens; the first row otherwise. */
  initialActive?: T | undefined;
  /**
   * `palette`: a command palette: a borderless search row over full-width rows
   * that turn primary when highlighted, sections divided by a rule.
   * `field`: a search field over rounded rows that turn gray, headed sections.
   */
  variant?: "palette" | "field";
  /** id of the list (the combobox's `aria-controls`). */
  listId?: string;
  /** Accessible name for the list. */
  listLabel?: string;
}

const looks = {
  palette: {
    list: "max-h-80 overflow-y-auto py-2",
    section: "",
    heading: "px-4 py-2",
    option:
      "group flex cursor-pointer select-none items-center px-4 py-3 text-strong hover:bg-primary-600 hover:text-inverse data-focus:bg-primary-600 data-focus:text-inverse",
  },
  field: {
    list: "max-h-96 space-y-4 overflow-y-auto",
    section: "space-y-1",
    heading: "px-3 py-2",
    option: "flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-hover data-focus:bg-hover",
  },
};

// Headless UI skips its own key handling when the React event says
// `defaultPrevented`. Marking only the React event (not the native one)
// leaves the key to the browser and the surrounding Dialog: Tab moves focus
// instead of picking the highlighted row, and Escape closes the modal at once.
function leaveToBrowser(e: KeyboardEvent) {
  Object.defineProperty(e, "defaultPrevented", { value: true });
}

/**
 * A search box over a list you pick from with the mouse or the keyboard
 * (Headless UI `Combobox`, always open). Arrow keys move the highlight and
 * wrap around at either end, Enter picks, Escape is left to the modal.
 * Filtering is the caller's: pass the matching `sections`.
 */
export default function SearchList<T>({
  sections,
  getKey,
  renderItem,
  isSelected = () => false,
  query,
  onQueryChange,
  onSelect,
  placeholder = "Search",
  header,
  inputAddon,
  initialActive,
  variant = "palette",
  listId,
  listLabel,
}: Props<T>) {
  const look = looks[variant];
  const listRef = useRef<HTMLDivElement>(null);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Tab" || e.key === "Escape") return leaveToBrowser(e);
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    // Wrap around at the ends (Headless UI stops there): from the last row
    // jump to the first with PageUp, from the first to the last with PageDown.
    const input = e.currentTarget;
    const options = Array.from(listRef.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? []);
    const active = input.getAttribute("aria-activedescendant");
    if (!active || options.length === 0) return;
    const edge = e.key === "ArrowDown" ? options[options.length - 1] : options[0];
    if (edge?.id !== active) return;
    e.preventDefault();
    input.dispatchEvent(new globalThis.KeyboardEvent("keydown", { key: e.key === "ArrowDown" ? "PageUp" : "PageDown", bubbles: true }));
  };

  const inputProps = {
    autoFocus: true,
    onKeyDown,
    // Keeps the box in step with `query` whenever Headless UI resets it.
    displayValue: () => query,
  };

  const shown = sections.filter((section) => section.items.length > 0 || section.empty);
  return (
    // `value` only seeds the highlight: Headless UI opens on the row matching it.
    <Combobox value={initialActive ?? null} onChange={(item: T | null) => item !== null && onSelect(item)} immediate>
      <div data-ui="search-list" data-variant={variant} className={cn(variant === "field" && "flex flex-col gap-3")}>
        {variant === "palette" ? (
          <div className="flex items-center border-b border-subtle px-4">
            <span className="hero-magnifying-glass h-5 w-5 shrink-0 text-faint" />
            <ComboboxInput
              {...inputProps}
              type="text"
              spellCheck="false"
              autoComplete="off"
              placeholder={placeholder}
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              className="w-full border-0 py-4 pl-3 pr-4 text-base text-strong placeholder:text-faint focus:ring-0"
            />
            {inputAddon}
          </div>
        ) : (
          <SearchInput {...inputProps} inputAs={ComboboxInput} value={query} onChange={onQueryChange} placeholder={placeholder} size="sm" />
        )}
        <ComboboxOptions static ref={listRef} id={listId} aria-label={listLabel} className={look.list}>
          {header}
          {shown.map((section, i) => {
            const divider = variant === "palette" && i > 0 && section.items.length > 0;
            // A border, not a separator element: a listbox may hold only options and groups.
            return (
              <div key={section.key} role="group" className={cn(look.section, divider && "mt-2 border-t border-subtle pt-2")}>
                {section.heading && (
                  <Heading size="xs" className={look.heading}>
                    {section.heading}
                  </Heading>
                )}
                {section.items.length === 0 && <EmptyState variant="plain" message={section.empty} />}
                {section.items.map((item) => {
                  const selected = isSelected(item);
                  return (
                    <ComboboxOption
                      key={getKey(item)}
                      value={item}
                      aria-selected={selected}
                      className={look.option}
                    >
                      {({ focus }) => <>{renderItem(item, { active: focus, selected })}</>}
                    </ComboboxOption>
                  );
                })}
              </div>
            );
          })}
        </ComboboxOptions>
      </div>
    </Combobox>
  );
}
