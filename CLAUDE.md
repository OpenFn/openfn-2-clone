# CLAUDE.md

## What this is

This project is the decoupled frontend of Lightning. We have previously proved that migrating to a new frontend with AI is possible. We have built tests, verification checks and defined principles to help us make sure we are confident that we are building something high quality that does not lose functionality.

This branch stands alone and is the source of truth. It should not use main as a reference point: don't read main's code, copy from it or import from it. Nothing from main or anywhere else applies here until it's been brought in on purpose.

Built with React 19, TypeScript, Vite, Tailwind 4 and Storybook. No backend yet: pages run on fake data shaped like the API contract in `api/`.

## How we got here

- We built a 1:1 clone with React (on the main branch).
- Brandon built a new information architecture that is similar but moving to a new reality.
- This branch tries to combine them.

We want to now move towards a frontend that we're proud of and that has strongly defined principles from the start, which is why we are starting with docs before we start iterating and building out the pieces.

## The pieces

- `api/` on this branch is the API documentation, copied from main as we need it.
- https://github.com/OpenFn/lightning/tree/full-api-test is the branch where Brandon took what Stu and Frank did and iterated on it, for us to mimic the API.
- This branch is the new reality.
- Brandon's repo, https://github.com/brandonjackson/openfn-ia-demo, looks better and the user experience is better, but it was built as a prototype, so its architecture isn't built to scale.
- The main branch of this repo also has quite a lot of flaws, because some principles weren't established from the beginning and it was iterated on with Claude for a proof of concept.
- The collaborative editor will use websockets regardless of the solution and will import design system components.

What's already decided about how the frontend works is in [PRINCIPLES.md](./PRINCIPLES.md).

## Not decided

- Whether this will roll out as a single page React application with a backend API (still not built) OR importing the page level components into Lightning's current backend with LiveView and React islands per page. That's why we are keeping things open: the solution stays flexible in case the decision goes either way.
- How all the pieces will fit together.
- How the collaborative editor will define its contract, and how this design system fits in with the current components: whether there is refactoring needed.

Claude should not assume that we use the old look of the main branch. We should be moving towards Brandon's version responsibly, so that this is an application many people can work on.

## What not to do

I really don't want to iterate with Claude and create a lot of mess. I want us to establish strong conventions and for us to understand where to find things together. It should be easy to make changes, and this should match a strongly architected frontend.

## What to read for your task

| You're… | Read |
|---|---|
| Doing anything | [PRINCIPLES.md](./PRINCIPLES.md): the rules |
| Deciding where a file goes | [STRUCTURE.md](./STRUCTURE.md) |
| Building a component | Brandon's version and its story first. Rebuild it by PRINCIPLES.md, never by copying his code |
| Building a page | What Lightning's page does and says: its annotation in Lightning, `annotations/views/<page>.md` on branch `experiment/overnight-1` |
| Changing or dropping something Lightning does | [LIGHTNING-CHANGES.md](./LIGHTNING-CHANGES.md): add a line, with why |
| Shaping data | `api/`: the contract with Lightning |

`notes/` is rough thinking, not rules: don't follow it, but read it when a principle seems missing.

## How to work

- Build only what PRINCIPLES.md and STRUCTURE.md cover. When the work needs a rule they don't have, stop and ask. A guess copied across ten files is expensive to undo.
- Working unattended (Lucy has kicked off a run and gone): don't stop at a gap. Take the simplest choice that's cheap to undo, keep going, and write each assumption down as you make it in `notes/assumptions.md`: what you assumed, where in the code, and what would change if it's wrong. Keep the assumption in one place rather than copying it across files. If a gap would force a choice that's expensive to undo, build around it and leave it for Lucy. The hand-back starts with that list.
- A component is done when it looks like Brandon's in the same state and every check passes. Where his look and a principle clash, stop and ask.
- This file stays short and points to PRINCIPLES.md. Rules for one kind of file sit next to that kind of file.
- A new rule comes with an example of it done right.

## Commands

- `npm run dev` (the app), `npm run storybook` (port 6006).

## When to check

| When | Run |
|---|---|
| While you work | Only what you touched: `npm run lint`, and the stories you changed (`npm run test:stories -- Button`). Stop Storybook first |
| Before you say it's done | `npm run lint` (warnings fail), `npm run build` (typechecks), `npm test`. An interactive piece also has a story that tests the keyboard |
| Before you commit | The full `npm run test:stories`: every story, with axe, in both themes |
| Once, when components are ready to show Lucy | For everything added or changed in that piece of work together: one screenshot of each beside Brandon's (where he has one), then the design-system and accessibility reviewers once over the lot |
| Once, when a page is ready to show Lucy | One screenshot of the page beside Brandon's, then all four reviewers (React, design system, accessibility, architecture) once over the whole page |

Never after each edit or each component: once per piece of work. Fix what the reviewers clearly get right; bring Lucy only the calls that are hers.
