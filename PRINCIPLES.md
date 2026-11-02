# Design system principles

The goal: A person or an agent can build a new Lightning screen fast, from parts that
already exist, and it looks and behaves like every other screen. If a page
needs its own styling, the system has failed, not the page.

We know it's working when there's one way to do each thing, pages hold no
styling (`className` only for placement), and agents applying these
principles agree on a finding 95% of the time.

Organise first, then improve the look: once pages hold no styling, a better
look is a change to the primitives. General web and accessibility rules are
Vercel's [web interface guidelines](https://github.com/vercel-labs/web-interface-guidelines);
where they clash with Lightning's wording, Lightning wins. How to apply all
this is in [docs/building.md](./docs/building.md).

## Components

- One job, one component. When two do the same thing, delete one.
- Name it for its job, never its look or the page it was first used on: a
  name holding a colour, size or page name gets renamed (`RedModal` →
  `ConfirmModal`, `HistoryPill` → `RunStatePill`).
- Compose, don't configure: content through `children` and named slots
  (`title`, `footer`), not boolean props that change what it does.
- A prop that changes the look is one `variant`, not a boolean; `can*`
  permissions and states (`disabled`, `pending`) stay booleans.
- Primitives know nothing about Lightning: no product wording, permissions
  or sandbox logic.
- `className` on a primitive is layout and sizing only (`flex-1`, `w-full`,
  `min-w-0`), never for how it looks. The list is in src/components/CLAUDE.md.
- Never work around a primitive. If it can't do the job, extend it (within reason!)
- The parent owns the space between children. No outer margins.
- A component's stories are its spec: one per state (empty, loading, error,
  disabled, pending, long text).

## Look and behaviour

- Tokens only.
- Colour means something: red is an error or a destructive action, yellow a
  warning, green success, blue information; run states use run colours.
  If taking the colour away loses nothing, it's grey.
- Contrast 4.5:1 for text, 3:1 for large text and icons. Colour is never the
  only signal.
- A control the user is blocked from (by permission, plan or state) stays
  focusable and its tooltip says why ("Only owners can delete projects").
  Native `disabled` only when there's nothing to explain.
- Text a user typed has a known home. In a one-line slot (table cell,
  breadcrumb, pill, tab, menu item, button) it truncates and shows the whole
  value on hover, through `Td truncate` or `Truncated`, never by hand. In a
  block (heading, detail list, description, toast) it wraps, breaking long
  words and URLs. Every story with user text has a Long variant.
- Every list has an empty state. Every action has pending and error states.

## One way to do each thing

- **Page:** breadcrumb, title, main action on the right, tabs, content.
- **Switch or checkbox:** a switch takes effect now; a checkbox is part of a
  form you submit. The workflow editor's on/off settings stay switches,
  because the editor is one draft saved as a whole.
- **Status:** one badge per kind of status, same words and colours
  everywhere.
- **Row actions:** up to two quiet buttons, the rest in one menu.
- **Confirm:** one dialog that names the thing. Delete goes last in the
  menu, in red.
- **Loading:** a placeholder for content, a spinner inside the button for
  actions, one full-screen loader.
- **Icon button:** always a label and a tooltip.

## Forms

A form is four blocks: a container (card, pop-up or sign-in card), a `Form`,
a `Field` per question, and the control. A page fills them in and never lays
out labels, errors or buttons itself.

- One order: label, hint, control, error.
- The label row: label, required star and info icon on the left; at most one
  link or badge on the right. Explain a choice in the hint, not an info icon.
- Every control has a name, visible or `aria-label`.
- Radios or checkboxes that answer one question sit under one label as a
  group.
- One look for every control, one red for errors.
- Errors show when you leave a field or press Save, never while typing. The
  browser's own bubbles are off.
- Never disable Save for invalid values. Show the errors on Save and focus
  the first.
- Buttons on the right, main action last. The sign-in card's single button
  runs the full width.
- A search box or the AI chat box isn't a form; its button sits in the box.

## Where we're heading

These change what Lightning does or says, so they wait until a page is
redesigned on purpose, and each is listed in
[docs/lightning-differences.md](./docs/lightning-differences.md) when it
lands. Until then, copy Lightning.

- Row actions beyond two go in a ••• menu, not one labelled "Actions".
- A confirm button repeats the action ("Remove collaborator"), never
  "Confirm".
- Choose the container by the size of the task: a menu to pick, a side
  panel to edit what's selected, a pop-up for one short task, a step-by-step
  pop-up for set-up, a page for anything long. A pop-up never opens another.
- Switches save instantly and offer Undo; forms use Save and Cancel; the
  editor shows "Unsaved changes" or "Saved".
- Success messages fade; errors stay until dismissed and say what to do.
- Undo for anything reversible. Type the name to delete a project or account.
- Step-by-step pop-ups show "Step 1 of 2", keep their size, Back left, Next
  right.
- Lists paginate from 25 rows.
- One "search everything" on Ctrl/Cmd+K, and a project switcher on every
  page.
- Sentence case. Buttons are a verb and a noun. One word per thing, from a
  shared glossary.
- One primary action per screen.
