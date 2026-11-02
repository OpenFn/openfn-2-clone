import { useMemo, useState } from "react";
// eslint-disable-next-line no-restricted-imports -- wiring: the adaptor registry (catalogue, versions, docs).
import { adaptors, resolvedAdaptorVersion } from "../../mock-data/adaptors";
import type { Adaptor } from "../../types/adaptors";
import Alert from "../primitives/Alert";
import Modal from "../primitives/Modal";
import AdaptorIcon from "./AdaptorIcon";
import SearchList, { type SearchListSection } from "../primitives/SearchList";
import { matchesQuery } from "../../utils/search";
import Text from "../primitives/Text";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (adaptorPackage: string) => void;
  /** Short names of adaptors already used in the project, listed first. */
  adaptorsInUse?: string[];
}

/** The fallback offered when nothing matches. */
const HTTP = { id: "http", name: "HTTP" };
type Row = Pick<Adaptor, "id" | "name">;

function RowContent({ id, title, size }: { id: string; title: string; size: "sm" | "md" }) {
  const pkg = `@openfn/language-${id}`;
  return (
    <>
      <AdaptorIcon name={pkg} size={size} />
      <div className="text-strong">
        {title}
        <Text as="div" tone="muted">Latest: {resolvedAdaptorVersion(pkg)}</Text>
      </div>
    </>
  );
}

/**
 * Searchable adaptor picker (AdaptorSelectionModal.tsx + SearchableList):
 * "Adaptors in this project" first, then all adaptors, with the HTTP hint
 * when nothing matches. Arrow keys move through both lists and Enter picks.
 */
export default function AdaptorSelectionModal({ isOpen, onClose, onSelect, adaptorsInUse = [] }: Props) {
  const [query, setQuery] = useState("");
  const matches = useMemo(() => adaptors.filter((a) => matchesQuery(query, a.name, a.id)), [query]);
  const inProject = matches.filter((a) => adaptorsInUse.includes(a.id));
  const rest = matches.filter((a) => !adaptorsInUse.includes(a.id));
  const fallback = matches.length === 0;
  const pick = (row: Row) => {
    onSelect(`@openfn/language-${row.id}`);
    onClose();
  };

  const sections: SearchListSection<Row>[] = fallback
    ? [{ key: "fallback", items: [HTTP] }]
    : [
        { key: "in-project", heading: "Adaptors in this project", items: inProject },
        { key: "all", heading: inProject.length > 0 ? "All adaptors" : "Available adaptors", items: rest },
      ];

  return (
    <Modal open={isOpen} onClose={onClose} size="md" label="Select an adaptor">
      <SearchList<Row>
        variant="field"
        listLabel="Adaptor options"
        placeholder="Search for an adaptor to connect..."
        query={query}
        onQueryChange={setQuery}
        sections={sections}
        getKey={(a) => a.id}
        onSelect={pick}
        header={
          fallback && (
            <Alert tone="info">
              <div className="flex flex-col gap-1">
                <p>
                  <span className="font-medium">No adaptor found</span> for "{query}"
                </p>
                <p>Try the HTTP adaptor below to connect to any system with a REST API.</p>
              </div>
            </Alert>
          )
        }
        renderItem={(a) => <RowContent id={a.id} title={a.name} size={!fallback && adaptorsInUse.includes(a.id) ? "md" : "sm"} />}
      />
    </Modal>
  );
}
