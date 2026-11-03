# Colour

Colour has two layers. The **palette** is the raw shades (`gray-600`,
`red-100`); only `src/theme/` uses it. The **roles** are tokens named for
a job, in `src/theme/tokens.css`; **everything else uses those**.

- **Use a role, never a shade or a hex.** `text-muted`, not `text-gray-600`.
  If no role fits, see [When to add a role](#when-to-add-a-role). Never
  reach for the palette instead.
- **One role, one job.** Two things that look the same but do different
  jobs (a button's fill and a selected tab) get two roles, so either can
  change alone.
- **Names say the property, the job, then a suffix**: `text-muted`,
  `bg-danger-strong`, `bg-brand-hover`. `-strong` means more contrast than
  the plain role: darker text, the solid fill of a tone, a firmer border.
  `-badge` is a pill's fill; `-hover` and `-disabled` are states. Never a
  colour or a shade, except tags that mean nothing (`tag-red`), where the hue
  is the job.
- **States are roles.** Hover, selected and disabled have their own, and a
  pressed state gets one when something needs it. A theme may work one out from another colour; a component
  never does (no `opacity-50`, no `/90`).
- **A theme sets role values only.** Light, Dark and GDS are each a list of
  role values. A colour a theme needs that the palette lacks goes under the
  theme's own prefix (`--dk-*`), never by redefining a palette shade.
- **Component tokens are the exception**: the `--ui-*` variables in
  `theme.css` and `lightning-shell.css`, for a part no role covers (the side
  menu, the workflow canvas). A new one gets a comment saying its job.

## The roles

The roles are in [src/theme/tokens.css](../src/theme/tokens.css), in groups
(text, backgrounds, borders, focus, brand, disabled, selected, validation,
each tone, tags), each with a comment saying its job. Read it before
picking one: the comment is what tells two similar roles apart.

## Which one

| You want | Use | Not |
|---|---|---|
| Quiet secondary text | `text-muted` | `text-faint`, which is for icons and placeholders |
| A control the user can't use yet | `text-disabled`, `bg-disabled` | `text-faint`, `bg-subtle` |
| Something that navigates | `text-link` (it turns brand on hover too) | `text-brand` |
| The chosen item in a set | `text-selected`, `bg-selected` | `text-link`, `text-brand` |
| Brand text that isn't a link or a selection | `text-brand` | |
| An invalid field's message and border | `text-invalid`, `border-invalid` | `text-danger` |
| Words in a danger panel or pill | `text-danger`; its heading `text-danger-strong` | |
| A pill or badge | `bg-<tone>-badge` | `bg-<tone>`, which is a panel |

## When to add a role

Only when all four hold:

1. **It's a job, not a look.** You can name it and say where it's used
   without a colour word: "the selected item in a list", not "a lighter
   indigo".
2. **No role's job covers it.** Each role in `tokens.css` has a one-line
   comment saying its job. If one fits, even loosely, use it.
3. **Two things need it.** One screen wanting a different colour is a
   one-off; use the nearest role.
4. **Every theme can give it a value that passes contrast** against the
   backgrounds it sits on.

A state of an existing role (its hover, pressed, selected or disabled) meets
these by definition, so add it.

Ask before adding anything else: name, job, the two places, and the nearest
existing role. In an unattended run, use the nearest role, carry on, and
raise the question in the tracker. The role count is in
`scripts/design-system-metrics.mjs`, so a new role shows up as a change to
the baseline and gets seen in review.

## Run states

Run states take a tone and draw its roles wherever they appear (pill,
dot, text, step icon, canvas node, health chart): success → success,
failed → danger, running → info, killed → warning, crashed → severe,
pending, cancelled, lost and exception → neutral. A chart that needs
two greys apart says so with its labels, not a new colour.

## Colours from data

Colours from data, like a sandbox's colour, stay as the user chose
them. Text on them is `text-on-light` or `text-on-dark`, picked by
measuring contrast (`prefersDarkText`).

## Contrast

Contrast is a property of the roles. Every text role passes 4.5:1 on
every background it can sit on, in every theme, and icons and borders 3:1.
`STORYBOOK_THEME=<id> npm run test:stories` runs the axe checks under one
theme. CI runs it for Lightning v2, Light and Dark; GDS joins once its
links pass on grey. A unit test (`src/theme/themes.test.ts`) checks that each
dark theme sets every role, since it can't fall back on the light defaults.
