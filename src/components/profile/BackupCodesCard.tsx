import Alert from "../primitives/Alert";
import Button from "../primitives/Button";
import Card from "../primitives/Card";
import InfoTooltip from "../primitives/InfoTooltip";
import SectionHeader from "../primitives/SectionHeader";
import type { BackupCode } from "../../types/tokens";
import { useCopy } from "../../utils/useCopy";
import Text from "../primitives/Text";

/**
 * The recovery codes card (backup_codes_live/index.html.heex): the codes
 * (used ones struck through), Print and Copy, and "Generate new backup codes".
 */
export default function BackupCodesCard({
  codes,
  onRegenerate,
  pending = false,
  onPrint,
}: {
  codes: BackupCode[];
  onRegenerate?: () => void;
  /** Shows the regenerate button pending. */
  pending?: boolean;
  /** Opens the printable copy. */
  onPrint?: () => void;
}) {
  const { copied, copy } = useCopy(codes.map((c) => c.code).join("\n\n"));
  return (
    <Card padding="none" className="divide-y divide-strong">
      <div className="p-6">
        <SectionHeader
          title="Backup Codes"
          subtitle="Keep your backup codes as safe as your password. We recommend saving them with a password manager."
        />
      </div>
      <Alert tone="warning">
        Keep your recovery codes in a safe spot. These codes are the last resort for accessing your account in case
        you lose your authenticator device.
      </Alert>
      <div className="grid gap-4 p-6 md:grid-cols-2">
        {codes.map((c) => (
          // eslint-disable-next-line no-restricted-syntax -- a backup code is spaced out so it reads one character at a time
          <div key={c.code} className="text-center tracking-widest">
            {c.usedAt ? (
              <Text tone="faint">
                <span className="line-through">{c.code}</span>
                <InfoTooltip title={`Code used on ${c.usedAt.slice(0, 19).replace("T", " ")}`} />
              </Text>
            ) : (
              c.code
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-4 p-6">
        <Button variant="secondary" size="lg" onClick={onPrint} icon="hero-printer">
          Print Codes
        </Button>
        <Button id="copy-codes-button" variant="secondary" size="lg" onClick={copy} icon="hero-document-duplicate">
          Copy Codes
        </Button>
        {copied && (
          <Alert id="codes-copied-alert" tone="success" className="p-2">
            Copied!
          </Alert>
        )}
      </div>
      <div className="p-6">
        <SectionHeader
          title="Generate new backup codes"
          subtitle="When you generate new backup codes, you must copy or print the new codes. Your old codes won't work anymore."
          action={
            <Button variant="secondary" size="lg" onClick={onRegenerate} pending={pending}>
              Generate new backup codes
            </Button>
          }
        />
      </div>
    </Card>
  );
}
