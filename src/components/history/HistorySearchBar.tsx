import { useState } from "react";
import Button from "../primitives/Button";
import IconButton from "../primitives/IconButton";
import type { SearchFieldId } from "../../types/history";
import SearchInput from "../primitives/SearchInput";
import Text from "../primitives/Text";
import Tooltip from "../primitives/Tooltip";

/**
 * History's search row (run_live/index.html.heex): the search input, "by",
 * the segmented toggles choosing what to search, and the Search button.
 */
export default function HistorySearchBar({
  fields,
  selected,
  onToggle,
  term,
  onSearch,
}: {
  fields: { id: SearchFieldId; icon: string; label: string }[];
  selected: SearchFieldId[];
  onToggle: (id: SearchFieldId) => void;
  term: string;
  onSearch: (term: string) => void;
}) {
  const [value, setValue] = useState(term);
  // The term lives in the URL, so Back or a link can change it under the box: follow it.
  const [shown, setShown] = useState(term);
  if (shown !== term) {
    setShown(term);
    setValue(term);
  }

  return (
    <div className="flex items-center gap-2">
      <form
        className="flex-1"
        onSubmit={(e) => {
          e.preventDefault();
          onSearch(value);
        }}
        id="run-search-form"
      >
        <SearchInput value={value} onChange={setValue} onClear={() => onSearch("")} placeholder="Search work orders..." />
      </form>
      <Text tone="muted">by</Text>
      <div id="search_button_group" className="flex items-center gap-2">
        <div className="inline-flex gap-0.5 rounded-md bg-surface p-1 ring-1 ring-inset ring-strong">
          {fields.map((f) => (
            <Tooltip key={f.id} content={f.label} side="top">
              <IconButton
                icon={f.icon}
                label={f.label}
                tooltip={false}
                active={selected.includes(f.id)}
                onClick={() => onToggle(f.id)}
              />
            </Tooltip>
          ))}
        </div>
        <Button type="submit" form="run-search-form">
          Search
        </Button>
      </div>
    </div>
  );
}
