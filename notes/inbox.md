# Inbox

Things that came up while building and aren't principles yet. Add anything.

## Accessibility
- Covered by WCAG 2.2 AA in PRINCIPLES.md. Worth writing out only if one keeps going wrong: focus always visible, real elements first, 24px targets, announced changes, reduced motion, 200% zoom.

## Components
- Every action has a pending state: Button needs one (a spinner, stays in place, ignores clicks).
- A blocked button says why: needs Tooltip; until then Button uses plain `disabled`.
- Who owns the words inside a component ("Cancel", "Close", "Copy")?
- Headings inside dialogs and notices: which level?
- Table cells: truncate or wrap long values?
- Tooltips close on Escape?

## Layout
- A few layout components own all layout (shell, page, section, Stack, Row). Pages and layout respond to the screen; components to the space they're given.
- Who uses OpenFn on a small screen, and for what? Decides how much responsiveness matters.

## Colour
- `colour.md` here is the colour rules from PR 78 (colour-roles branch, latest). `api.md` is the data and API principles from main. Both to fold into PRINCIPLES.md.
- Text on a red button: its own role, or the same white as the primary button?
- An icon colour role (`faint`)?
- Input borders are under 3:1.

## Actions
- Which actions ask "are you sure?" first. Candidate: anything that can't be undone and reaches beyond this screen (revoking a token breaks every script using it). Seen once, on tokens.
- An action the server wants your password for (`step_up_required`) asks in a popup, then carries on; it never sends you to another page. Seen once, on tokens.
- Show an action's result where it happened (the row goes, the box appears, the error sits in its dialog). A toast only when there's nowhere on screen for it: an action that navigates away, or finishes in the background. Seen once, on tokens (no toast there).
