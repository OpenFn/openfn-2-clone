import { useId, type ReactNode } from "react";
import { cn } from "../../utils/cn";
import IconButton from "./IconButton";
import { Checkbox, TextInput } from "./Inputs";
import Menu, { MenuItem } from "./Menu";
import Popover from "./Popover";
import Text from "./Text";

/**
 * A filter chip that shows a filter's state and opens its dropdown
 * (components/pills.ex `filter_chip`). Gray when inactive, indigo when the
 * filter is set; an active chip with `onClear` gets a small x button.
 */
export default function FilterChip({
  id,
  active = false,
  onClear,
  menu,
  dropdown,
  dropdownClassName = "w-60",
  children,
}: {
  id?: string;
  active?: boolean;
  onClear?: () => void;
  /** Choices shown in a menu under the chip (FilterMenu); the menu closes on select. */
  menu?: ReactNode;
  /** Panel shown under the chip when it's clicked. Receives a close callback. */
  dropdown?: (close: () => void) => ReactNode;
  /** Width (and padding) classes for the dropdown panel. */
  dropdownClassName?: string;
  children: ReactNode;
}) {
  const clearable = active && onClear;
  const label = (
    <button type="button" className={cn("py-1.5 pl-3", clearable ? "pr-0" : "pr-3")}>
      {children}
    </button>
  );

  return (
    // Not a Pill: the chip is text-sm with a border, its label is the menu
    // trigger and its x is styled to the chip, so it only shares the hook.
    <div
      id={id}
      data-ui="tag"
      data-variant={active ? "active" : "default"}
      className={cn(
        "inline-flex items-center gap-x-1 rounded-full border text-sm font-medium transition-colors",
        active ? "border-selected bg-selected text-selected" : "border-subtle bg-sunken text-body hover:bg-emphasis",
        clearable && "pr-1.5"
      )}
    >
      {menu ? (
        <Menu trigger={label} align="start" className={dropdownClassName}>
          {menu}
        </Menu>
      ) : dropdown ? (
        <Popover trigger={label} className={dropdownClassName}>
          {(close) => dropdown(close)}
        </Popover>
      ) : (
        label
      )}
      {clearable && (
        <IconButton
          icon="hero-x-mark-solid"
          label="Clear filter"
          size="xs"
          className="rounded-full text-selected hover:bg-selected-hover hover:text-link-hover"
          onClick={onClear}
        />
      )}
    </div>
  );
}

/** The options of a filter chip's menu (workflow / channel). */
export function FilterMenu<T extends string | null>({
  options,
  selected,
  onSelect,
}: {
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (value: T) => void;
}) {
  return options.map((o) => (
    <MenuItem key={o.value ?? "any"} selected={o.value === selected} onClick={() => onSelect(o.value)}>
      {o.label}
    </MenuItem>
  ));
}

/** Checkbox list for the status chip's dropdown. */
export function FilterCheckboxes({
  options,
  checked,
  onToggle,
}: {
  options: { id: string; label: string }[];
  checked: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-1 px-4 pb-2 pt-3">
      {options.map((o) => (
        <Checkbox key={o.id} label={o.label} checked={checked.includes(o.id)} onChange={() => onToggle(o.id)} />
      ))}
    </div>
  );
}

/** The "Filter by …" panel with two datetime-local inputs (date chips). */
export function FilterDateRange({
  title,
  afterLabel,
  beforeLabel,
  after,
  before,
  onChange,
}: {
  title: string;
  afterLabel: string;
  beforeLabel: string;
  after: string;
  before: string;
  onChange: (after: string, before: string) => void;
}) {
  const id = useId();
  return (
    <div className="space-y-3 px-4 py-3">
      <Text as="div" className="text-muted">{title}</Text>
      <TextInput
        id={`${id}-after`}
        type="datetime-local"
        label={afterLabel}
        value={after}
        onChange={(e) => onChange(e.target.value, before)}
      />
      <TextInput
        id={`${id}-before`}
        type="datetime-local"
        label={beforeLabel}
        value={before}
        onChange={(e) => onChange(after, e.target.value)}
      />
    </div>
  );
}
