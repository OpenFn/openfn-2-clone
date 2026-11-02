import Button from "../primitives/Button";
import Text from "../primitives/Text";
import type { SsoProvider } from "../../types/auth";
import { Row } from "../primitives/Stack";

/**
 * The "or / via external provider" block under the login button, shown when
 * an OIDC auth provider is configured (Lightning's `@auth_handler_url`).
 */
export default function SsoLogin({ provider }: { provider: SsoProvider }) {
  return (
    <>
      <Text as="div" variant="body-sm" tone="body">
        <Row gap="sm">
          <hr className="flex-1 border-subtle" />
          or
          <hr className="flex-1 border-subtle" />
        </Row>
      </Text>
      <Button variant="secondary" href={provider.handlerUrl} tooltip={provider.name} className="w-full" icon="hero-identification">
        via external provider
      </Button>
    </>
  );
}
