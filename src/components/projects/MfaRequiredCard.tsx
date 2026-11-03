import Button from "../primitives/Button";
import Card from "../primitives/Card";
import Heading from "../primitives/Heading";
import TextLink from "../primitives/TextLink";
import Text from "../primitives/Text";
import { Stack } from "../primitives/Stack";

/**
 * The "MFA Required for Project" card (project_live/mfa_required.html.heex):
 * a red warning icon, why access is blocked, and a link to the profile page
 * where MFA is turned on.
 */
export default function MfaRequiredCard({ title = "MFA Required for Project" }: { title?: string }) {
  return (
    <Card padding="lg" className="max-w-lg space-y-5">
      <div className="flex items-start gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger-badge">
          <span className="hero-exclamation-triangle h-6 w-6 text-danger-icon" aria-hidden="true" />
        </span>
        <Stack gap="sm">
          <Heading>{title}</Heading>
          <Text as="p" tone="muted">
            This project requires all members to use multi-factor authentication. Please enable MFA for{" "}
            <TextLink to="/profile">your account</TextLink> in order to gain access.
          </Text>
        </Stack>
      </div>
      <div className="flex justify-end">
        <Button to="/profile">Visit your account</Button>
      </div>
    </Card>
  );
}
