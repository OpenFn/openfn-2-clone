# Where the replica differs from Lightning on purpose

The replica copies what Lightning does and says (CLAUDE.md). When it looks or
behaves differently on purpose, the difference is listed here, so a
comparison run doesn't "fix" it back. Each entry says what Lightning does,
where, and why the replica differs.

Wording and behaviour stay Lightning's. Most entries are where Lightning styles
the same thing two ways and the replica picks one.

Add an entry in the PR that makes the difference; delete it if the replica
goes back to Lightning's way.

## Buttons

- **Pending buttons, and disabled buttons that say why, keep keyboard focus.**
  They're `aria-disabled` and ignore presses, so focus isn't lost when a
  button goes pending and Tab reaches the tooltip's reason. Lightning
  disables them natively (`new_inputs.ex:268-280`, `phx-disable-with`), which
  drops focus and hides the reason from the keyboard. A disabled button with
  no reason is natively disabled in both.
- **Disabled buttons are their enabled colour at half strength.** Lightning
  gives each look its own disabled colours (`new_inputs.ex:232-247`, e.g.
  success turns a mint `bg-green-300`). One rule for every look, and no mint green.
- **One focus ring colour.** Lightning's danger and success buttons draw a
  red or green focus outline (`new_inputs.ex:244,249`); the replica uses the
  focus colour on every button, so focus always looks the same.
- **A pending button's spinner replaces its icon.** Lightning's Run button
  swaps its play icon for a spinning `hero-arrow-path`
  (`collaborative-editor/components/NewRunButton.tsx:62`); the replica uses
  Button's own spinner, as every pending button does. The "Processing" label
  is Lightning's.
- **Icons in medium buttons are 16px.** Lightning draws 20px in two places
  (Generate New Token in the empty tokens list, Add Additional Collaborator)
  and 16px in the rest.
- **Icon buttons share Button's heights**: a square of 28, 32, 36 or
  40px, so an icon lines up with the text buttons beside it. Lightning sizes
  each one by hand, from a bare 20px modal X to 28px editor buttons.
- **The AI chat's send button is a primary button, at half strength when disabled.**
  Lightning turns it grey (`collaborative-editor/components/ChatInput.tsx:368`).
- **The cancel-run X is grey, darker on hover**. Lightning turns it
  red on hover (`run_live/workorder_component.ex:262,422`). Red is kept for
  what can't be undone, like deleting a token
  (`tokens_live/index.html.heex:104`); a cancelled run can be retried.
- **Icon buttons have no hover background.** Hover darkens the icon only, so
  it looks the same on white and grey surfaces. Some Lightning icon buttons
  add a grey square on hover, others don't.

## Page header

- **A page inside a project names itself under the bar.** Lightning's bar
  holds the breadcrumb and, on some pages, the main button, and the page name
  is only the last crumb (`LayoutComponents.header`). The replica keeps the
  bar with the breadcrumb, and adds a row under it with the page title, its
  count and the main button or search: "Workflows (3)" with "Create new
  workflow". Lightning put those in the body's `table_title` on Workflows,
  Sandboxes and Channels, so every page now names itself in one place.
- **Top-level pages keep their title in the bar, and their main button moves
  up beside it.** Lightning puts "Create project" and "Create collection"
  under a second "Projects (3)" / "Collections (3)" title in the body
  (`dashboard_live/user_projects_section.ex:74`, `collection_live/index.ex:99`);
  the replica shows the count in the bar title and drops the repeat.
- **History's Work Orders / Channel Logs tabs sit beside its title.**
  Lightning puts them in the bar (`run_live/index.html.heex:22`).
- **A detail page's short id is in its title, as plain text.** Lightning
  ends the breadcrumb with "Run" and a light short id (or a mono one for a
  channel request); the replica's breadcrumb ends with "Run" and the title
  row reads "Run 5e9a1c2b". How a short id looks is still open (G155). A
  run's snapshot chip ("latest") sits beside the workflow's name in the
  run's details, since it names that workflow's version; Lightning puts it
  after the id in the breadcrumb.
- **A workflow's Health page names the workflow in the header**, with the
  range picker beside it; Lightning puts both at the top of the page body.
- **A `>` follows the project picker in the breadcrumb**, the workflow
  editor's included, and a project page's breadcrumb ends with the page's
  name ("Workflows"). Lightning shows no `>` after the picker, and the
  Workflows page shows the picker alone.
- **Channels' last crumb stays "Channels" while its form is open.**
  Lightning changes it to "New Channel" or "Edit Channel"; the replica's
  form is a modal over the list, so the page underneath hasn't changed.
- **"Create new workflow" is a link**, since it opens a page; disabled, it's a
  disabled button with the reason, as in Lightning, where it's always a
  button.
- **A workflow panel's title stays on one line.** A long node name ends
  in "…", with the full title on hover. Lightning wraps it
  (`collaborative-editor/components/inspector/InspectorLayout.tsx`), which
  makes the header a different height for each node.

## Tags

- **A timed-out channel request is a warning (yellow).** Lightning draws the
  Timeout state pill orange (`channel_state_pill`); the replica puts channel
  states on Pill's tones, which have no orange.
- **Exception and Lost run states are pale grey.** Lightning draws them dark
  grey with white text (`state_pill`); the replica keeps every status pill
  pale, so a list never mixes pale and solid.

## Fields

- **A field with an error turns the typed text red too.** Lightning only
  reddens the border (`new_inputs.ex`). Red text makes the wrong value easy
  to spot. A dropdown's prompt stays dark; only a chosen value turns red.
- **The manual run's JSON error sits under the editor.** Lightning puts it
  above (`manual-run-panel/views/CustomView.tsx:91`). Every field in the
  replica reads label, hint, control, error.
- **The landing screen's "Recommended" badge sits at the right end of the
  label row.** Lightning puts it next to "Build with AI". Every field keeps
  its label, star and info icon on the left and one link or badge on the
  right, as Lightning does for "New Credential".
- **A picked option card has a primary border; the focus outline only shows
  for the keyboard.** Lightning's webhook auth type cards draw the focus
  outline round the picked card, so picked and focused look the same.

- **Info icons are a grey outline everywhere.** Lightning's LiveView pages
  draw a faded primary icon (`Common.tooltip`, `common.ex`); the
  collaborative editor draws a grey outline (`ConfigureAdaptorModal.tsx`).
  The replica uses the grey outline.


- **Contact preference explains itself in a hint.** Lightning hides the
  explanation in an info tooltip. The replica shows a shorter version under
  the label, so people see what "Critical" means before they choose.

- **A form's buttons sit on the right, the main action last.** Lightning's
  settings and admin forms put Save on the left, before Cancel (profile,
  project setup, data storage, MFA, the admin user, project and auth
  provider forms, first setup); its modals put it on the right. The replica
  uses the modal's order everywhere: Cancel, then Save. The auth provider's
  Test sits before Save.
- **No browser validation bubbles.** Lightning's forms let the browser show
  "Please fill in this field" for a required field. The replica turns that
  off, so only the field's own error shows, in the same red as every other.
  Our checks cover what the browser did: blank required fields, and an email
  without an @ ("must have the @ sign and no spaces", Lightning's own words).
- **After a refused Save, focus moves to the first field with an error.**
  Lightning leaves focus on the button.

- **Data storage shows one card per setting.** Lightning puts its three
  settings in one card, each with a heading, a paragraph and a divider
  (`settings.html.heex:862-1053`). The replica gives each its own card with
  a title and description, like every other settings tab, and one Save below
  them. The plan's limit note is the History dropdown's hint. When the
  Input/Output retention period doesn't apply, its dropdown is disabled;
  Lightning also fades that section's title and description.

- **A setting that waits for Save is a checkbox, not a switch.** Lightning
  uses switches for the admin user's Support User and a channel's Enabled,
  though neither applies until you press Save. The replica keeps switches for
  things that take effect at once (enabling from a table, requiring MFA,
  support access, experimental features), and for on/off settings in the
  workflow editor (PRINCIPLES.md).
- **Profile MFA has "Set up MFA" and "Disable MFA" buttons.** Lightning's
  switch looks instant but starts a set-up form or asks to confirm, so the
  replica shows the action it is.

- **Disable parallel execution saves as you switch it, after a confirm.**
  Lightning puts the switch in a form with its own Save and shows the "Heads
  Up!" warning once switched. The replica asks first, with the same words,
  and saves on confirm; switching it back off saves at once.
  Lightning lets the hosted plan swap in its own control here; the replica
  keeps the switch and shows the plan's reason ("Not allowed on Free plans")
  under it, disabled.

- **The login password is required.** Lightning marks only the email as
  required on the login form. The replica marks both, and says "can't be
  blank" for an empty password.

- **Save stays pressable in the collaborator and YAML import modals.**
  Lightning disables Save until every row has an email and a role, and
  disables Create until the YAML looks right. The replica keeps them
  pressable and says what's missing when pressed ("can't be blank", "Enter
  YAML content to create workflow"), and shows a row's email error only
  then, not while typing.
- **A disabled Run says why on hover.** When the manual run's JSON doesn't
  parse, "Run From Here" shows "Fix the JSON input to run".

- **Two-factor and confirm access are ordinary fields.** Lightning gives the
  panel a large heading ("Password", "Authentication Code") and puts the help
  text under the Verify or Confirm button. The replica uses a field label,
  then the help text as its hint, then the box, as on every other form.
- **Profile's first Save says why it's disabled.** Until something changes,
  hovering or focusing it shows "No changes to save".

## File uploads

- **One drop zone for both uploads.** Lightning styles the manual run upload
  (`manual-run-panel/FileUploader.tsx`) and the YAML import
  (`yaml-import/YAMLFileDropzone.tsx`) differently: a link-coloured "Upload a
  file" in one, a grey icon tile and primary "YML"/"YAML" in the other. The
  replica uses one look for both.
- **An error shows inside the zone and stays.** Lightning's manual run error
  is a red box that vanishes after 3.5 seconds, and its YAML error is red text
  under a grey zone. The replica tints the zone red, puts the message in place
  of the hint, and keeps it until a valid file comes in, so nobody misses it.
- **File types are checked by extension.** Lightning's manual run checks the
  type the browser reports, which some systems leave empty; the replica checks
  the extension in both, as Lightning's YAML import does.
- **The 8MB limit applies to both.** Lightning only enforces it on YAML import;
  the manual run hint promises it but never checks.
- **"Only 1 file can be uploaded".** Lightning's manual run says "Only 1 files
  can be uploaded".

## Toasts

- **An error toast stays until dismissed.** Lightning hides every toast
  after 5 seconds, so a failure reported after a redirect is easy to miss
  (its own audit flags this: `shared-flash-messages.md`, section 6.2).
  Success toasts still fade after 5 seconds.

## Empty states

- **One look for "nothing here" and "loading".** Lightning builds them a
  dozen ways: the table's dashed `empty_state` (`table.ex:313`), History's
  `async_filler` row, centred muted text in the run viewer and manual run
  panel, its own blocks in MiniHistory and the sandboxes list. The replica
  uses `EmptyState` for all of them, and `Table`'s `state` for a list that
  is loading or failed. History's loading and error messages sit under the
  table's header, not in a row of the body.
- **No header-only table when a list is empty.** Lightning's API tokens page
  shows the table's header, then the empty state with a second Generate New
  Token button (`tokens_live/index.html.heex`); the replica shows only the
  empty state, as every other list does, and the button stays in the header.
- **14px text.** Lightning's dashed `empty_state` is 12px (`text-xs`); its
  other empty states are 14px. The replica uses 14px in every one.
- **24px icon.** Lightning's dashed `empty_state` icon is 48px (`w-12 h-12`)
  and its other empty states use 32px; the replica uses 24px in every one.

## Type

- **The waiting messages in the log and dataclip viewers stay 12px.**
  Lightning grows them to 16px when the panel is wide
  (`viewers.ex:106,277`), the only text it sizes by panel width. In the
  replica every piece of text has one size, from `Text`.
- **A modal's title has a normal line height.** Lightning squeezes it to
  20px (`modal.ex:109`); the replica uses `Heading size="lg"` as it is, so
  the title lines up with the close button.
- **Workflow Health's "Triage - grouped by failure type" is a normal
  section heading.** Lightning makes it a small grey uppercase label
  (`assets/js/health/WorkflowHealth.tsx:172`), unlike the card titles
  beside it; the replica uses `Section`'s heading, so it matches Outcomes
  and Failure breakdown.

## Colour

- **Muted, faint and link text are a shade darker.** Lightning uses
  gray-500 for muted text, gray-400 for faint and primary-400 for links;
  the replica uses gray-600, gray-500 and primary-600, so text meets WCAG AA
  contrast on white and on the grey page (`npm run test:stories` checks it).
- **The release version under the sidebar logo is full strength.** Lightning
  fades it to half (`opacity-50`), which falls below AA contrast on the
  sidebar.
- **Work-order states, field errors and the success button are darker.**
  Lightning writes work-order states in the 500 shades next to their dot,
  field errors in danger-600, and fills the success button with
  success-600; the replica uses the 700s (success text 800), which meet AA.
- **A sandbox chip on a light colour has dark text.** Lightning always writes
  white on the sandbox's colour, which is unreadable on amber or green; the
  replica picks dark or white text by the colour's luminance
  (`prefersDarkText` in `src/utils/colour.ts`).
- **Faded text is solid instead.** Lightning fades the read-only adaptor
  (`AdaptorDisplay.tsx:197`, `opacity-50`) and the admin project form's
  users with no role (`opacity-60`); the replica writes them in muted or
  faint text, which reads as quieter but meets AA.
- **The channel timing bars are a shade lighter.** Lightning draws them in
  orange-400 and blue-400 behind 900 text (`timing.ex:277-388`); the replica
  uses the 300s, so the text on them meets AA.
- **A danger link darkens on hover.** Lightning lightens it to red-600
  (`app.css:176`), below AA on the grey page; the replica goes to
  danger-800, as other links go darker on hover.

## Accessible names

- **A control's hidden name contains the text it shows.** Lightning's log
  level button has no hidden name, and its adaptor picker names each option
  "Select <name> adaptor" (`SearchableList/ListRow.tsx:42`). The replica
  names the log level button "Log level: info", the adaptor button "Change
  adaptor: http" and the proxy URL "Copy proxy URL: <url>", and an adaptor
  option by its own text, so voice control users can say what they see.

## Keyboard

- **Picking a step or path with the keyboard moves focus into its
  inspector.** In Lightning, Enter selects a React Flow node and focus stays
  on it, so the inspector is only reached by tabbing past the rest of the
  diagram. The replica puts focus on the inspector's first field, and when
  the inspector closes, focus goes back to the step. A click leaves focus
  where it is, as in Lightning.
- **Escape closes the inspector from inside one of its fields.** Lightning's
  keyboard provider ignores Escape in inputs, so a keyboard user in the
  inspector would have no way back to the diagram. Elsewhere in the editor,
  Escape in an input still does nothing.
- **Clickable table rows can be reached from the keyboard.** Lightning's
  clickable rows only respond to a click. In the replica each one holds a link
  (projects, workflows) or a toggle button (history work orders) that Tab
  reaches, and a click on the row clicks it (D303).
