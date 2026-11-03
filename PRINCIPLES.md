# Principles

A working document to define the principles that this whole project stands behind.

## Why

The frontend should be decoupled from the backend of Lightning. We think that this will lead to clearer ownership of concerns, faster development and greater security. Previously, all of the code has been quite interlinked with multiple frontends, different patterns scattered around, which made people afraid to make changes in case they would break something.

We are moving towards a future where the application will be used by more and more non-OpenFn staff. This means that we need a product that has good, solid foundations and a great user experience. We want the frontend to look and feel like one product, with patterns shared across screens. Without defined patterns, building with AI gets messy. If each screen comes out right the first time, the patterns are working.

To feel proud of this repo, each part will have a clear defined home and rules. What good looks like: we are able to work on the data fetching mechanism of the frontend and it won't break other parts of it. We want to always work in a way where different areas of responsibility are organised so that we can work on things independently. This is extremely important.

## Where the design comes from

Brandon's design is what we're building towards, and it wins when it differs from Lightning. We take what he designed, not how he built it: every piece is rebuilt by these principles. Lightning still tells us what a page does, so the same tests pass on both. Where we change or drop something Lightning does, it's written in [LIGHTNING-CHANGES.md](./LIGHTNING-CHANGES.md), with why.
## Areas

Each area can change without the others changing. Lint stops imports crossing the lines. We should not overengineer this: the way it is set up proves that each part is configurable. We are separating concerns so each part does its own thing. A first guess, to be tested on the first page:

- **Components:** what things look like. Knows nothing about data or OpenFn.
- **Pages:** what a screen shows and does. Takes props, fetches nothing.
- **Data:** getting and sending data, fake or real. Knows nothing about how it's shown.
- **App shell:** routes, the sidebar, and what hosts the app (LiveView or a standalone React app). The only area that changes when that decision is made.

## Pages

- A page doesn't know what hosts it. It takes props, whether they come from LiveView or a React route.
- A page is one folder. Everything about it lives there. Delete the folder and nothing is left behind. ([Bulletproof React](https://github.com/alan2207/bulletproof-react))
- Pages take everything as props: data, the user, what they're allowed to do. One file per page fetches; swapping fake data for real touches only that file.
- Pages hold no styling. They arrange components. Once that's true, a better look is a change to the components, not to every page.
- Pages don't import each other. Something two pages share moves to a shared place.
- Every page has the same frame: breadcrumb, title, main action on the right, then content.

## Components

- One job, one component. When two do the same thing, delete one.
- **Name it for its job**, never its look or the page it was first used on (for example, `ConfirmModal`, not `RedModal`).
- Compose, don't configure: content goes in through `children` and named slots, not a pile of boolean props.

```
   // Good: Composable
   <Card>
   <CardHeader>
       <CardTitle>Tasks</CardTitle>
   </CardHeader>
   <CardBody>
       <TaskList tasks={tasks} />
   </CardBody>
   </Card>

   // Avoid: Over-configured
   <Card
   title="Tasks"
   headerVariant="large"
   bodyPadding="md"
   content={<TaskList tasks={tasks} />}
   />
```

- Primitive components know nothing about OpenFn: no product words, no permissions.
- The parent owns the space between children. A component has no outer margin.
- Anything common comes from tokens: colour, type, spacing, radius. Never raw values.
- A component's stories are its spec: one per state (empty, loading, error, disabled, long text).
- Design for the longest real value. User-typed text truncates in a one-line slot and wraps in a block.

## Buttons

A button's look says how important the action is and what it does, nothing else.

- Two settings: how loud (`primary`, `secondary`, `plain`) and what it means (`danger`, `success`).
- One `primary` per page or dialog, as a rule rather than a law. `secondary` for the rest, `plain` for minor actions like Dismiss.
- Removing one thing from a list is `secondary` + `danger` with its word ("Delete", "Remove"), never a bare icon.
- Inside a tool panel (the editor, the assistant), the main action is dark, so it doesn't compete with the page's main action. Not built until the editor or assistant needs it.
- Someone else's brand never colours a button. Connecting GitHub is a `secondary` button with GitHub's icon.

## Data and state

- What the server decides, the server decides. The page shows it, and doesn't re-check it.
- A value the page doesn't recognise shows as "unknown". It never crashes the page.
- Each piece of state has one home. What's selected (tab, run, filter) lives in the URL.
- Most effects aren't needed. Work things out while rendering; don't copy state from one place to another with an effect. ([React docs](https://react.dev/learn/you-might-not-need-an-effect))
- One way to fetch, used everywhere. A reply that arrives after you've moved on is ignored.
- The server decides who can do what, and sends it with the data, with a reason when the answer is no. The page shows that answer; it never works out a permission from someone's role. The server checks again when the action arrives.

## When things go wrong

- An error is never shown as "nothing here". Failed and empty look different.
- Every list has an empty state. Every action has a pending state and an error state.
- Errors stay until dismissed and say what to do next. Success messages fade.
- Nothing loses what the user typed.

## Everyone can use it

We meet [WCAG 2.2 level AA](https://www.w3.org/TR/WCAG22/). The story checks run axe on every story in both themes, but axe catches only part of AA, so keyboard and screen-reader checks are still ours to do. The lines below are the parts we get wrong most often.

- Contrast 4.5:1 for text. Colour is never the only signal.
- A blocked control stays visible and says why ("Only owners can delete projects"). It's hidden only if this person could never do it.
- Everything works by keyboard. A shortcut does exactly what its button does, and never fires while you're typing.
- A dialog keeps focus inside while it's open and gives it back when it closes. A menu moves with the arrow keys. Every input has a label.
- General web rules follow Vercel's [web interface guidelines](https://github.com/vercel-labs/web-interface-guidelines). Where they clash with Lightning's wording, ask if Lightning wins.

## Words

- Where Brandon's design has the screen, its words win. Where it doesn't, Lightning's do.
- Sentence case on buttons and headings. A button says what it does ("Delete project", not "OK").

## How we verify

- We test behaviour, not markup. A test passes on old and new Lightning, or we know why it doesn't.
- A failing test isn't fixed blind. It might be a difference we meant.
- Every check is proven once by an independent agent: plant the bug it's meant to catch, and confirm the check fails.
- An independent reviewer checks the work, not the one who built it.
- Lint enforces what it can. A rule only written in a doc gets broken. Write lint checks at least during this build phase. 
- The repo only holds code we're proud of. Claude copies what's nearby.

## Conventions (lint enforces these)

The detail behind the principles above. Lint fails on each one, so they hold without anyone remembering.

- Spacing uses only Tailwind's steps 0, 0.5, 1, 1.5, 2, 3, 4, 6 and 8. Lint bans the rest. 0.5 and 1.5 are for the small gaps inside controls.
- Corners come in four sizes, one per job: `rounded-md` for controls (buttons, inputs), `rounded-lg` for things on the page (cards, tables, callouts), `rounded-xl` for things above or framing the page (dialogs, the page header), `rounded-full` for pills and avatars. Lint bans the rest.
- No component sets a fixed width or height. Layout decides how much space it gets, so making the app responsive later is a change to layout, not to every component. Layout components and the app shell may set sizes; icons use `size-3` to `size-6`.
- What sits on top (menus, dialogs, tooltips) comes from a few named layers, never a `z-` number.
- Classes are joined with `cn()`, never by building a string, so when two classes clash the right one wins.
- IDs come from `useId()`, never written by hand, so a component can appear twice on one page.
- A list's `key` names the thing, never its position, so deleting or reordering a row keeps the right state on the right row.
- Named exports only, so a rename is the same everywhere.
- Imports across folders use `@/` (`@/components`, `@/theme`). `./` only within a folder.
- A file over 300 lines gets split.
- Icons are Lucide (Brandon's), imported only through `@/components/ui/icons`, so switching library is one file.
