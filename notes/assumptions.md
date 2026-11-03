# Assumptions

What an agent assumed while working unattended, where, and what changes if it's wrong. Newest first. Lucy goes through these; a settled one moves into PRINCIPLES.md or gets undone, and comes out of here.

| Date | Assumed | Where | If wrong |
|---|---|---|---|
| 3 Nov | The new-token callout is `info` (indigo), not Brandon's amber `warning`: there are no warning roles yet, and one use isn't enough to add them (colour rules). | `Callout` tones | Add the warning roles to both themes and a `warning` tone; the page changes one word |
| 3 Nov | Dialog is the browser's `<dialog>` (top layer, page behind inert), plus our own Escape and Tab wrap so it behaves the same everywhere and tests can drive it. No close ✕: Escape, Cancel or a click outside close it (no icon button yet: the page doesn't need one). | `ui/Dialog/Dialog.tsx` | Add an icon button and a ✕ in the dialog's header |
| 3 Nov | When the button that opened a dialog is gone (the deleted token's row), focus isn't placed anywhere in particular. | `ui/Dialog/Dialog.tsx` `open()` | Give Dialog a "return focus to" prop, or the page moves focus to the section heading |
| 3 Nov | Table is composed from parts (`Table`, `TableHead`, `TableHeader`, `TableBody`, `TableRow`, `TableCell`), not Brandon's `columns` array (PRINCIPLES "compose, don't configure"). Long values wrap; the table scrolls sideways. | `ui/Table/Table.tsx` | Swap to a columns API; pages change |
| 3 Nov | ConfirmDialog owns the word "Cancel" and its error shows the rejection's `message`. | `ui/ConfirmDialog/ConfirmDialog.tsx` | Take the cancel words as a prop (inbox: who owns the words inside a component) |
| 3 Nov | Pending Button: `aria-busy`, a spinner in the icon's place, clicks ignored, keeps focus and colour (hover still shows). | `ui/Button/Button.tsx` | Fade it, or say "Deleting…" |
| 3 Nov | Copy falls back to selecting the value when the browser won't write to the clipboard (no permission, plain http). | `ui/CopyValue/CopyValue.tsx` | Show an error instead |
| 3 Nov | Added `bg-selected` and `text-selected` (the chosen item in a set) to both themes: a state, which the colour rules allow without asking. Basic is Brandon's indigo-50/700. | `src/theme/roles.css`, `dark.css` | Rename or fold into the info roles |
| 3 Nov | A settings section that isn't built (Profile, Credentials) is a greyed link with no href, read out but not focusable. It doesn't say why: that needs the tooltip, not built yet. | `layout/SettingsNav/SettingsNav.tsx` | Hide them, or add the tooltip |
| 3 Nov | Breadcrumbs and the side menu are plain `<a href>`: a full page load until the app decides on a router. | `layout/Breadcrumbs`, `layout/SettingsNav` | Take a link component as a prop, or render the router's `Link` |
| 3 Nov | Lint's no-fixed-sizes rule let `min-w-0` through: it's the flex overflow fix, not a size. | `eslint.config.js` `FIXED_SIZE` | Ban it again and find another way to let long text shrink |
