import { cn } from "../../utils/cn";
import TextLink from "../primitives/TextLink";
import Text from "../primitives/Text";
import { Row } from "../primitives/Stack";

/** "Please use AI responsibly. Never share PII." (AIDisclaimerFooter.tsx). `muted` is the quieter one, without the icon. */
export default function AIDisclaimerFooter({ variant = "default" }: { variant?: "default" | "muted" }) {
  const muted = variant === "muted";
  return (
    <Row gap="sm" data-testid="ai-disclaimer-footer">
      {!muted && <span className="hero-shield-exclamation h-3.5 w-3.5 shrink-0 text-warning-icon" />}
      <Text variant={muted ? "body-sm" : "label-sm"} tone="muted">
        Please use AI responsibly. Never share PII.{" "}
        <TextLink
          variant="plain"
          to="https://www.openfn.org/ai"
          external
          // eslint-disable-next-line local/primitive-classname -- debt: F528 type, F527 colour (underline hover:text-strong hover:text-body)
          className={cn("underline hover:text-strong", muted && "hover:text-body")}
        >
          Learn more.
        </TextLink>
      </Text>
    </Row>
  );
}
