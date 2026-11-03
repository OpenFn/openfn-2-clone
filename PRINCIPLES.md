# Principles

A working document to define the principles that this whole project stands behind.

## Why

The frontend should be decoupled from the backend of Lightning. We think that this will lead to clearer ownership of concerns, faster development and greater security. Previously, all of the code has been quite interlinked with multiple frontends, different patterns scattered around, which made people afraid to make changes in case they would break something.

We are moving towards a future where the application will be used by more and more non-OpenFn staff. This means that we need a product that has good, solid foundations and a great user experience. We want the frontend to look and feel like one product, with patterns shared across screens. Without defined patterns, building with AI gets messy. If each screen comes out right the first time, the patterns are working.

To feel proud of this repo, each part will have a clear defined home and rules. What good looks like: we are able to work on the data fetching mechanism of the frontend and it won't break other parts of it. We want to always work in a way where different areas of responsibility are organised so that we can work on things independently. This is extremely important.

## Decisions still outstanding

We aren't sure if we are moving to a single page React application + API or importing the page level components into Lightning's current backend with LiveView and React islands per page. We are trying to keep the solution flexible in case the decision goes either way. We should not overengineer this part. The way this is set up proves that each part is configurable. We are separating concerns so each part does its own thing.

## Areas

Each area can change without the others changing. Lint stops imports crossing the lines. A first guess, to be tested on the first page:

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

- Contrast 4.5:1 for text. Colour is never the only signal.
- A blocked control stays visible and says why ("Only owners can delete projects"). It's hidden only if this person could never do it.
- Everything works by keyboard. A shortcut does exactly what its button does, and never fires while you're typing.
- General web rules follow Vercel's [web interface guidelines](https://github.com/vercel-labs/web-interface-guidelines). Where they clash with Lightning's wording, ask if Lightning wins.

## Words

- Same words as Lightning unless we've decided to change them, and then the change is written down.
- Sentence case on buttons and headings. A button says what it does ("Delete project", not "OK").

## How we verify

- We test behaviour, not markup. A test passes on old and new Lightning, or we know why it doesn't.
- A failing test isn't fixed blind. It might be a difference we meant.
- Every check is proven once by an independent agent: plant the bug it's meant to catch, and confirm the check fails.
- An independent reviewer checks the work, not the one who built it.
- Lint enforces what it can. A rule only written in a doc gets broken. Write lint checks at least during this build phase. 

## Working with Claude

- The repo only holds code we're proud of. Claude copies what's nearby. 
- One short CLAUDE.md that points here. Rules for one kind of file sit next to that kind of file.
- A new rule comes with an example of it done right.
