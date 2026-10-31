import ButtonMenu from "../primitives/ButtonMenu";
import { MenuItem } from "../primitives/Menu";
import Pill from "../primitives/Pill";
import { showCredentialModal, userCredentialMenuOptions, type NewCredentialOption } from "./credentialModalEvents";

interface Props {
  id?: string;
  options?: NewCredentialOption[];
}

/**
 * The "Add new" dropdown (Components.Credentials.new_credential_menu_button).
 * Each entry opens the matching modal in the CredentialIndex on the page.
 */
export default function NewCredentialMenuButton({ id = "credential-options-menu-button", options = userCredentialMenuOptions }: Props) {
  return (
    <div id={id}>
      <ButtonMenu label="Add new" variant="primary">
        {options.map((o) => (
          <MenuItem key={o.target} disabled={o.disabled} onClick={() => showCredentialModal(o.target)}>
            {/* eslint-disable-next-line no-restricted-syntax -- debt: F557 Stack/Row can't render this element */}
            <span className="flex items-center gap-2">
              {o.label}
              {o.badge && <Pill>{o.badge}</Pill>}
            </span>
          </MenuItem>
        ))}
      </ButtonMenu>
    </div>
  );
}
// eslint-disable-next-line react-refresh/only-export-components -- re-exported so pages import the menu and its option presets together
export { projectCredentialMenuOptions, userCredentialMenuOptions } from "./credentialModalEvents";
