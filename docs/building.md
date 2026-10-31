# Building with the design system

Which primitive to use, where a new component goes, how to build one, and
how the product handles the tasks that keep coming back. The reasons are in
[PRINCIPLES.md](../PRINCIPLES.md); how a page behaves while it talks to the
server is in [STANDARDS.md](../STANDARDS.md).

## Primitives

Reach for these first. Props are documented on each component and shown in
its stories; read the component before using it.

| Need | Use |
|---|---|
| An action | `Button` (`size="xs" variant="secondary"` for table row actions) |
| A form's values, dirty state and errors | `useForm` from `utils/useForm.ts` (never disable submit for invalid values) |
| A form on a page: its fields, its error, its buttons | `Form`, with `{...form.formProps(save)}` |
| A request in flight | `useAction` (`useActions` for one per row); `Spinner` for anything loading |
| A switch or select saved on every change | `useChosenValue` |
| An icon-only action | `IconButton` (always give it a `label`) |
| The X that closes a modal, toast or panel | `CloseButton` |
| A button that opens a menu | `ButtonMenu`; `SplitButton` when the button also has its own action |
| A form control | `TextInput`, `PasswordInput`, `TextArea`, `Select`, `Checkbox`, `Radio` from `Inputs`; wrap anything else in `Field` with `controlClasses()`, `data-ui="field"` and `useFieldControl()`; a field's `info` and `aside` put a tooltip or a badge beside its label |
| A name that becomes a URL-safe slug | `NameField` |
| A dialog / one form in a dialog / confirming one action | `Modal` / `FormModal` / `ConfirmModal` |
| A list of actions or choices | `Menu` with `MenuItem`, `MenuSection`, `MenuDivider` |
| A floating panel (filters, details) | `Popover` |
| A searchable list you pick from with the keyboard | `SearchList` |
| A command palette that jumps to a page (Cmd/Ctrl+P) | `Picker` |
| Show / hide a section | `Disclosure` |
| Switching views | `Tabs` |
| Picking one value from a few | `SegmentedControl`; `RadioCards` when the options are cards |
| A set of radios or checkboxes under one label | `Field group` |
| Searching or filtering a list | `SearchInput` |
| A filter above a list, as a chip that opens its options | `FilterChip` with `FilterMenu`, `FilterCheckboxes`, `FilterDateRange` |
| A status chip, badge or tag | `Pill` |
| Any bordered panel, tile or card | `Card` |
| A big number on a card | `MetricCard` |
| A heading / any other text | `Heading` / `Text` (see Type) |
| Labelled values | `DetailList` + `DetailItem` |
| A timestamp | `DateTime` |
| A tooltip | `Tooltip`; `InfoTooltip` for the info icon beside a label |
| A short work order, run or dataclip id | `UuidChip` |
| An on/off switch | `Toggle` |
| An inline link | `TextLink` |
| Read-only code, a log or a dataclip | `CodeViewer` |
| Rendered markdown | `Markdown` |
| A file upload or drop area | `FileDropZone` |
| Tabular data | `Table` with `Tr`, `Th`, `Td`; `state` for a list that is loading or failed (a clickable `Tr` ignores clicks on links and buttons inside it) |
| Nothing to show yet: an empty list, panel or viewer | `EmptyState` (`fill` to centre in its box, `loading` to pulse) |
| Sorting and filtering a small table in the browser | `useTableSort` |
| A status message | `Alert` |
| The page frame | `PageContent`, `Header`, `Centered`, `Breadcrumbs` |

Tests pick from a `Select` with `pickOption` (`src/test/select.ts`).

## Where a new component goes

Each folder in `src/components/` is a tier, and imports only go down. Lint
enforces it (`eslint.config.js`, tested in `src/lint-seam.test.ts`).

| Folder | Holds | May import |
|---|---|---|
| `src/pages/` | One Lightning view each | anything |
| `<area>/` (`history/`, `credentials/`, …) | What only that area uses | primitives, `domain/`, `shell/`, its own area |
| `shell/` | The chrome around every page | primitives, `domain/`, `shell/` |
| `domain/` | Lightning pieces two or more areas use | primitives, `domain/` |
| `primitives/` | General pieces | primitives |

Every tier may import `src/utils/`, `src/types/`, `src/theme/`,
`src/routing/` and `src/constants.ts`. Utils may import primitives
(`useAction` uses `Toast`) and no other components. Only `App.tsx` and
`src/index.ts` import a page; anything else in a page's file that others
need moves out (shapes to `src/types/`, UI to a component). A primitive that
needs a feature component takes it as `children` or a prop.

Ask in order and stop at the first yes:

1. **Would it make sense in another product?** `primitives/`, even if one
   area uses it. It takes plain values and says none of Lightning's words.
   A Lightning flavour of a general piece still counts (`UuidChip`: a short
   id with a copy tooltip). A piece named for a Lightning thing, or built to
   show one (a run, an adaptor, a credential), fails this step even if all
   it takes is a string. Layouts and charts are judged the same way.
2. **Is it the chrome around every page?** `shell/`.
3. **Do two or more areas use it?** `domain/`. A dialog opened by the admin
   and project settings pages counts. It takes a Lightning record or
   carries Lightning's wording.
4. **Otherwise** the folder of the one area that uses it.

An area's whole panel (a page section with its own tables and dialogs)
shown on another area's page stays in its area (`CredentialIndex` stays in
`credentials/`). A dialog, form, pill or field is never a panel: if two
areas use it, it goes in `domain/`. A primitive filled with
Lightning's words is not a primitive (`ProjectDeletionModal` wraps
`ConfirmModal`).

## Building a component

- **Feature components** are one panel or section of a page
  (`WorkOrdersTable`). Used once is fine. They compose primitives and carry
  no button, input, modal or menu styling of their own. Before adding a
  variant, check whether a primitive covers it: a slightly different look
  beats a second implementation.
- **Fix the primitive, not the caller.** A wrapper span, `title=""` or an
  offset tweak in a caller means the primitive is missing something.
- **Off means off.** A primitive with nothing to show (`Tooltip` with no
  `content`) renders its child unchanged, with no listeners, and keeps the
  same element tree so toggling it never remounts the child and loses focus.
- **No options nobody uses.** Add a prop when a caller needs it.
- **Test a primitive's behaviour in its own test file**, not through each
  caller.
- **Themes** style primitives through `data-ui`, `data-variant`, `data-tone`
  and `data-size`, never element selectors or utilities. A new primitive or
  variant needs its hook. Check the GDS theme after styling changes.
- **Overlays** sit on Headless UI; `Tooltip` on Floating UI. No hand-rolled
  `fixed inset-0` overlays, click-outside handlers or `absolute` dropdowns.
  One library per job, so focus, Escape and stacking agree; if a primitive
  needs workarounds against its library, swap the library (as `Tooltip`
  left Radix).

### Prop names

| Prop | Answers | Values |
|---|---|---|
| `tone` | What does it mean? | `neutral`, `info`, `success`, `warning`, `danger`. Leave off for the usual colour |
| `variant` | How loud, or which of its looks? | The component's own list, loudest first (Button `primary`, `secondary`, `plain`) |
| `size` | How big? | `xs` to `xl`. Button and IconButton share one height per step |

`danger` is a `tone`, never a `variant`. Lint rejects `theme`, `type`,
`color`, `appearance` and `kind` (`color` stays on Pill's tag colours). A
prop that picks content takes a content name (Sidebar's `menu`). Modal's
sizes are widths, a separate scale from control heights.

### Tooltips

Every tooltip is a `Tooltip`, never `title`. An icon-only control shows its
name (`IconButton`'s `label`); the close X is the exception. A text button
gets one only to add a shortcut or say why it's disabled; a disabled control
shows no shortcut. Put it on what it describes (the icon, not a full-width
row). Text is the name, then the shortcut: "Close IDE (Esc)".

### Type

Text gets its look from `Heading` or `Text`; lint bans `text-xs`…`text-9xl`,
`leading-*` and `tracking-*` outside `primitives/`. A control that owns its
type (`PickerButton`) disables the rule on its line with the reason.

- **`Heading`** titles what follows. `as` is its outline level, `size` its
  look. The small capitals above a section are `size="xs"`.
- **`Text`** is everything else, with a `variant`:

| `variant` | Looks like | For |
|---|---|---|
| `body-md` | 14px | Copy. The default |
| `body-sm` | 12px | Secondary notes: sizes, times |
| `label-md` / `label-sm` | 14px / 12px medium | The name of a value or field |
| `code-md` / `code-sm` | 14px / 12px mono | Ids, paths, hashes, log lines |
| `stat-lg` / `stat-md` / `stat-sm` | 30px / 24px / 18px | A metric's number, a chart total, a count in a cell |

Colour is `tone` (`<Text tone="muted">`). Emphasis inside a sentence is
`font-medium`, not a nested `Text`. A block of copy is one `Text`
(`<Text as="div" className="space-y-3">` around its paragraphs). One size
per piece of text: nothing grows with the viewport (`@md:text-base`).
Primitives own the type of their parts and callers don't restyle them; a
primitive that needs a smaller form takes a prop (`DetailList size="sm"`).
A new variant is added only when a role in use has none.

## Patterns

Lightning's wording wins wherever Lightning has the screen.

### Page frame and lists

- `<PageContent header={<Header … />}>` with a `<Centered>` body.
- `Header` names the page once: `title`, `count`, and the main button and a
  list's `SearchInput` as children (History's tabs too; its search stays in
  the body). Inside a project it also takes
  `breadcrumbs` (`ProjectBreadcrumbs`). Don't repeat the title in the body;
  a settings tab opens with `SectionHeader size="lg"`.
- Row actions go in `<Td actions>` as `Button size="xs" variant="secondary"`
  with Lightning's verb. More than two go in a `ButtonMenu` labelled
  "Actions". A page with several tables puts each in a `Section`.
- A titled block with a body is a `Section` (`size`, `variant="eyebrow"`
  for a group of facts inside a card); it owns the gaps. A bare
  `SectionHeader` only when there is no body or the parent already owns
  the gap.
- An empty list is `EmptyState` with Lightning's message. If the list has a
  create action, the empty state is that action (`buttonText`, `onClick`),
  `disabled` when the user can't create. `variant="plain"` inside a card.
- A panel or viewer with nothing to show (no step selected, no logs) is a
  plain `EmptyState` with `fill`. A list still loading or failed is
  `Table`'s `state`, not an empty state of its own.

Examples: `Primitives/Header` (WithBreadcrumbsAndTitle), `Primitives/Table`
(Default, Loading, LoadError), `Primitives/EmptyState` (WithAction, Default, Plain, Fill).

### Destructive action

- `ConfirmModal tone="danger"`, mounted only while open and keyed by what it
  is about (STANDARDS pattern 6). A row's button opens it; it does the
  deleting.
- Title and button are the action and the thing ("Delete credential"),
  unless Lightning words it otherwise (`CollectionDeleteModal` says
  "Delete", `RemoveCollaboratorModal` "Confirm"). The body says what will
  happen.
- Typed confirmation only where Lightning asks: deleting a project, sandbox
  or user account. A new action asks only if it deletes a whole project or
  account.

Examples: `Primitives/ConfirmModal` (Danger, TypeToConfirm),
`Credentials/Modals` (DeleteCredential).

### Can't do it yet

- **Not allowed** (a permission): keep the button, disable it, give the
  reason as its `tooltip`. Hide it only if Lightning does. A gated section
  adds `SectionHeader`'s `permissionsSection`.
- **Not ready** (a user who still owns projects, a credential with audited
  runs): the button stays enabled and opens a plain `Modal` that says why,
  with one secondary button in Lightning's words ("Cancel" by default). No
  confirm button, not even a disabled one.

Examples: `Domain/UserDeletionModal` (Blocked), `Credentials/Modals`
(CredentialMarkedForDeletion), `Project settings/SecurityPanel`
(NoPermission).

### Settings

A tab or page of settings starts with a `SectionHeader`, then one `Card` per
group with `title` and `description`. A card that holds a single setting
has no title: the control's `Field` `label` and `hint` name and explain
it, as in any form (`Project settings/DataStoragePanel`). SecurityPanel,
ProjectSetupPanel, ExperimentalFeaturesCard and MaintenanceCard still have
titles (G187 is open). A switch or select saves on change
with `useChosenValue`; if the save fails, it goes back and an error toast
says why. Text fields save with `useForm` and a Save button at the bottom of
the card.

Examples: `Profile/ExperimentalFeaturesCard`, `Project settings/SecurityPanel`,
`Profile/ProfileForms` (BasicInfo).
