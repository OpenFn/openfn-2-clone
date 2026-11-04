import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button/Button";
import { cn } from "@/components/ui/cn";
import { Check, Copy } from "@/components/ui/icons";
import { StatusMessage } from "@/components/ui/StatusMessage/StatusMessage";
import { TextInput } from "@/components/ui/TextInput/TextInput";

type CopyValueProps = {
  value: string;
  /** Names the box for a screen reader ("New token"). */
  label: string;
  /** Focus the value when it appears, for a value that's just been made. */
  autoFocus?: boolean;
};

/** How long the button says "Copied" before it goes back to "Copy". */
const COPIED_FOR_MS = 2000;

/**
 * A value to paste somewhere else, with a button that copies it. The button says "Copied" with a tick for two
 * seconds and a screen reader hears it. If the browser won't copy, the value is focused and selected, and it says so.
 */
export function CopyValue({ value, label, autoFocus }: CopyValueProps) {
  const input = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [result, setResult] = useState<"copied" | "failed">();

  const copy = () =>
    navigator.clipboard.writeText(value).then(
      () => {
        clearTimeout(timer.current);
        setResult("copied");
        timer.current = setTimeout(() => setResult(undefined), COPIED_FOR_MS);
      },
      () => {
        input.current?.focus();
        input.current?.select();
        setResult("failed");
      },
    );

  const copied = result === "copied";
  return (
    <div className="flex gap-2">
      <TextInput ref={input} readOnly value={value} aria-label={label} monospace autoFocus={autoFocus} className="flex-1" />
      <Button variant="secondary" icon={copied ? Check : Copy} onClick={copy}>
        {/* Both words sit in one grid cell and the hidden one keeps its width, so the button doesn't change size. */}
        <span className="grid">
          <span className={cn("col-start-1 row-start-1", copied && "invisible")}>Copy</span>
          <span className={cn("col-start-1 row-start-1", !copied && "invisible")} aria-hidden={!copied}>
            Copied
          </span>
        </span>
      </Button>
      <StatusMessage>{copied ? "Copied" : result === "failed" ? "Couldn't copy. It's selected for you to copy yourself." : ""}</StatusMessage>
    </div>
  );
}
