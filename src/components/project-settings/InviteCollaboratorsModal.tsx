import { useState } from "react";
import FormModal from "../primitives/FormModal";
import { TextInput } from "../primitives/Inputs";
import IconButton from "../primitives/IconButton";
import RoleSelect from "./RoleSelect";
import type { CollaboratorValues, InviteValues } from "../../types/project-settings";
import type { ProjectRole } from "../../types/projects";
import { RequestError } from "../../utils/errors";
import { blank } from "../../utils/validate";

interface InviteDraft {
  firstName: string;
  lastName: string;
  email: string;
  role: ProjectRole | "";
}

interface Props {
  /** Prefilled from the emails that had no OpenFn account. */
  initial: CollaboratorValues[];
  onCancel: () => void;
  /**
   * May be async: the modal shows pending and stays open with the error if it rejects. Field errors
   * keyed by row and field (`"1.email"`) show on that field; any other key fails with the message.
   */
  onInvite: (invites: InviteValues[]) => void | Promise<void>;
}

/** InviteCollaboratorComponent (project_live/invite_collaborator_component.html.heex). */
export default function InviteCollaboratorsModal({ initial, onCancel, onInvite }: Props) {
  const [rows, setRows] = useState<InviteDraft[]>(
    (initial.length ? initial : [{ email: "", role: "" as const }]).map((r) => ({ firstName: "", lastName: "", ...r }))
  );
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const update = (i: number, patch: Partial<InviteDraft>) => {
    setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
    if ("email" in patch) setErrors({ ...errors, [`${i}.email`]: [] });
  };
  // Errors show once Save is pressed, not while typing; Save stays pressable (PRINCIPLES.md, Forms).
  const [submitted, setSubmitted] = useState(false);
  const blankIn = (text: string) => (submitted ? blank(text) : []);
  const valid = rows.every((r) => r.firstName.trim() && r.lastName.trim() && r.email.trim() && r.role);

  return (
    <FormModal
      open
      onClose={onCancel}
      size="xl"
      title="Invite new user(s) to join OpenFn"
      description="The following users don't have OpenFn accounts, you can invite them to join and grant access to this project"
      formId="invite_collaborators_modal_form"
      formClassName="space-y-5"
      onSubmit={async () => {
        setSubmitted(true);
        if (!valid) return;
        try {
          await onInvite(rows as InviteValues[]);
        } catch (e) {
          if (!(e instanceof RequestError && e.hasFieldErrors)) throw e;
          setErrors(e.fieldErrors);
          if (!Object.keys(e.fieldErrors).every((k) => /^\d+\.email$/.test(k))) throw e;
        }
      }}
      submitLabel={<>Invite new user{rows.length > 1 ? "s" : ""}</>}
    >
      {rows.map((r, i) => (
        <div key={i} className="flex items-start gap-4">
          <TextInput
            fieldClassName="flex-1"
            aria-label="First Name"
            placeholder="First Name"
            required
            value={r.firstName}
            errors={blankIn(r.firstName)}
            onChange={(e) => update(i, { firstName: e.target.value })}
          />
          <TextInput
            fieldClassName="flex-1"
            aria-label="Last Name"
            placeholder="Last Name"
            required
            value={r.lastName}
            errors={blankIn(r.lastName)}
            onChange={(e) => update(i, { lastName: e.target.value })}
          />
          <TextInput
            fieldClassName="flex-1"
            type="email"
            aria-label="Email"
            required
            value={r.email}
            errors={[...blankIn(r.email), ...(errors[`${i}.email`] ?? [])]}
            onChange={(e) => update(i, { email: e.target.value })}
          />
          <RoleSelect value={r.role} errors={submitted && !r.role ? ["can't be blank"] : []} onChange={(role) => update(i, { role })} />
          {rows.length > 1 && (
            <IconButton
              icon="hero-minus-circle"
              label="Remove row"
              // eslint-disable-next-line local/primitive-classname -- debt: F525 margin (mt-2)
              className="mt-2"
              onClick={() => {
                setRows(rows.filter((_, j) => j !== i));
                setErrors({});
              }}
            />
          )}
        </div>
      ))}
    </FormModal>
  );
}
