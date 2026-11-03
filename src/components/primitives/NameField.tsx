import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils/cn";
import { urlSafeName } from "../../utils/format";
import { TextInput } from "./Inputs";
import NameBadge from "./NameBadge";
import Text from "./Text";

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  id: string;
  label?: ReactNode;
  /** The name as typed. */
  value: string;
  /** Gets the typed name and the URL-safe name it becomes. */
  onChange: (raw: string, name: string) => void;
  /** Words before the badge, e.g. "Your project will be named". */
  badgeLabel: ReactNode;
  hint?: ReactNode;
  errors?: string[];
  /** Hide the badge while there are errors (Lightning's sandbox form does). */
  hideBadgeOnError?: boolean;
  /** While the name is empty, show this in grey instead ("... will be named `my-sandbox`."). */
  exampleName?: string;
  /** Classes for the wrapper, e.g. a width. */
  fieldClassName?: string;
}

/**
 * A name input with the URL-safe name it will get underneath (Lightning's
 * derived name field: `derive_name_param` plus `name_badge`). Used for projects,
 * sandboxes and collections.
 */
export default function NameField({
  id,
  label = "Name",
  value,
  onChange,
  badgeLabel,
  hint,
  errors = [],
  hideBadgeOnError = false,
  exampleName,
  fieldClassName,
  ...rest
}: Props) {
  const name = urlSafeName(value);
  return (
    <div data-ui="name-field" className={cn("space-y-2", fieldClassName)}>
      <TextInput
        id={id}
        label={label}
        hint={hint}
        errors={errors}
        value={value}
        onChange={(e) => onChange(e.target.value, urlSafeName(e.target.value))}
        {...rest}
      />
      {!(hideBadgeOnError && errors.length > 0) && name !== "" && (
        <Text as="p" variant="body-sm" className="text-muted">
          <NameBadge name={name}>{badgeLabel}</NameBadge>
        </Text>
      )}
      {!(hideBadgeOnError && errors.length > 0) && name === "" && exampleName && (
        <Text as="p" variant="body-sm" className="text-faint">
          {badgeLabel}
          <Text variant="code-sm" className="ml-1 rounded-md border border-subtle bg-subtle p-1">{exampleName}</Text>.
        </Text>
      )}
    </div>
  );
}
