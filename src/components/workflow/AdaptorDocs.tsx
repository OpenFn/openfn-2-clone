// eslint-disable-next-line no-restricted-imports -- wiring: the adaptor registry (catalogue, versions, docs).
import { adaptorFunctions, resolvedAdaptorVersion } from "../../mock-data/adaptors";
import { adaptorShortName, resolveAdaptor } from "../../utils/adaptors";
import EmptyState from "../primitives/EmptyState";
import Disclosure from "../primitives/Disclosure";
import Heading from "../primitives/Heading";
import TextLink from "../primitives/TextLink";
import Text from "../primitives/Text";

/**
 * The IDE's Docs panel (assets/js/adaptor-docs/components/DocsPanel.tsx):
 * package name and version, links, editor tips, and the adaptor's
 * operations as expandable signatures.
 */
export default function AdaptorDocs({ adaptor }: { adaptor: string }) {
  const { package: pkg } = resolveAdaptor(adaptor);
  const short = adaptorShortName(adaptor);
  const version = resolvedAdaptorVersion(adaptor);
  const fns = adaptorFunctions(adaptor);
  return (
    <Text as="div" className="ml-1 space-y-4 overflow-auto">
      <div>
        <Heading size="lg" as="h1" className="mb-2 text-body">
          {pkg} ({version})
        </Heading>
        <div>
          <p className="flex flex-wrap gap-x-2">
            External docs:
            <TextLink to={`https://docs.openfn.org/adaptors/packages/${short}-docs`} external>
              docs.openfn.org
            </TextLink>
          </p>
          <p className="flex flex-wrap gap-x-2">
            Source code:
            <TextLink to={`https://github.com/OpenFn/adaptors/tree/%40openfn/language-${short}%40${version}/packages/${short}/src`} external>
              github.com/OpenFn/adaptors
            </TextLink>
          </p>
        </div>
      </div>
      <Disclosure variant="inline" defaultOpen={false} title="Editor tips & shortcuts">
        <div className="space-y-2 border-l-4 border-strong pl-2">
          <p>
            Most adaptors provide intelligent code suggestions to the editor. Start typing and press TAB or ENTER to accept a
            suggestion, or ESC to cancel
          </p>
          <ul className="ml-4 list-disc">
            <li>Press CTRL+SPACE to show suggestions</li>
            <li>Press CTRL+SPACE again to toggle suggestion details (recommended!)</li>
            <li>Press F1 to show the command menu (not all commands will work!)</li>
          </ul>
        </div>
      </Disclosure>
      <div>
        <Heading size="sm">Adaptor API</Heading>
        <p>These are the operations available for this adaptor:</p>
      </div>
      <div className="ml-4 space-y-1">
        {fns.map((fn) => (
          <Disclosure key={fn.name} variant="inline" defaultOpen={false} title={`${fn.name}(${fn.params.join(", ")})`}>
            <div className="flex flex-col gap-2 pb-4 pl-4">
              <p>{fn.description}</p>
              {fn.example && (
                <>
                  <p className="mt-2 text-body">Example</p>
                  <Text as="pre" variant="code-sm" tone="strong" className="mx-4 mt-1 overflow-x-auto rounded-md border-2 border-subtle bg-sunken py-2 pr-8 pl-4">
                    {fn.example}
                  </Text>
                </>
              )}
            </div>
          </Disclosure>
        ))}
      </div>
    </Text>
  );
}

/** The Metadata tab (metadata-explorer/Empty.tsx): no adaptor in the demo has magic functions. */
export function AdaptorMetadata({ adaptor }: { adaptor: string }) {
  return (
    <EmptyState variant="plain" title={`No metadata found for ${resolveAdaptor(adaptor).package}`} message="This adaptor does not support magic functions yet." />
  );
}
