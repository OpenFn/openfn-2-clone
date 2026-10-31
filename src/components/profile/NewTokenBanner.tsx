import Alert from "../primitives/Alert";
import CopyButton from "../primitives/CopyButton";
import { TextInput } from "../primitives/Inputs";

/**
 * The banner shown once after "Generate New Token"
 * (tokens_live/index.html.heex `data-entity="new_token"`).
 */
export default function NewTokenBanner({ token }: { token: string }) {
  return (
    <div data-entity="new_token">
      <Alert tone="info" header="Make sure to copy your token now as you will not be able to see it again.">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line local/primitive-classname -- debt: F528 type (font-mono) */}
          <TextInput id="new_token" aria-label="New token" value={token} readOnly className="font-mono" fieldClassName="min-w-0 flex-1" />
          <CopyButton id="copy" value={token} />
        </div>
      </Alert>
    </div>
  );
}
