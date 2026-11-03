import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button/Button";
import { Check, Copy } from "@/components/ui/icons";
import { StatusMessage } from "@/components/ui/StatusMessage/StatusMessage";
import { TextInput } from "@/components/ui/TextInput/TextInput";

type CopyValueProps = {
  value: string;
  /** Names the box for a screen reader ("New token"). */
  label: string;
};

/** How long the button says "Copied" before it goes back to "Copy". */
const COPIED_FOR_MS = 2000;

/**
 * A value to paste somewhere else, with a button that copies it. The button says "Copied" with a tick for two
 * seconds and a screen reader hears it. If the browser won't copy, the value is selected for the person to copy.
 */
export function CopyValue({ value, label }: CopyValueProps) {
  const input = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  const copy = () =>
    navigator.clipboard.writeText(value).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), COPIED_FOR_MS);
      },
      () => input.current?.select(),
    );

  return (
    <div className="flex gap-2">
      <TextInput ref={input} readOnly value={value} aria-label={label} monospace className="flex-1" />
      <Button variant="secondary" icon={copied ? Check : Copy} onClick={copy}>
        {copied ? "Copied" : "Copy"}
      </Button>
      <StatusMessage>{copied ? "Copied" : ""}</StatusMessage>
    </div>
  );
}
