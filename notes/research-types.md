# Where types live, and how they stay in sync

## The answer

Keep what we have. Most well-run React apps type in three layers, and we already do:

1. **The API's shape** (`ApiToken`) sits next to the code that fetches it.
2. **The mapper** (`toToken`) turns the API's shape into the app's.
3. **The props** (`TokenRow`) belong to the component that takes them.

The route joins them, and TypeScript's structural typing checks the join. Nothing here needs a shared `types/` folder. Bulletproof React keeps one only for "shared types used across the application", and puts the rest inside each feature.

The weak link is layer 1. `ApiToken` is copied by hand from markdown, and nothing checks it against the real server. `api/` is all markdown (22 `.md` files, no OpenAPI or JSON Schema anywhere in the repo), so we can't generate types from it yet. If Lightning ever publishes an OpenAPI file, `openapi-typescript` would generate layer 1 and leave the rest alone.

## Recommended strategy for this repo

- **Pages own their props types**, as `TokenRow` does today. A page "takes props" and imports nothing from `lib/api/` (PRINCIPLES.md, STRUCTURE.md). Importing `Token` into the page would cross the line that lint guards. The route is the only place the two meet, and that's where the compiler checks them.
- **`lib/api/<resource>.ts` owns the API's shape and the mapper**, as now. Write the mapper's return type out (`: Token`) so a renamed field fails in `lib/api/`, not in some page. If two resources share a shape (pagination, `LoadStatus`), it goes in `lib/api/`, not a new `types/` folder.
- **Accept the look-alike pairs.** `TokenRow` and `Token` are identical, and so are `TokensStatus` and `LoadStatus`. That's the cost of keeping pages and data apart, and it's cheap. Just know the route checks that the data has "at least these fields", not that the two types match exactly (see below).
- **Check the API's shape at runtime only if it starts to bite.** TkDodo suggests parsing in the `queryFn` (with zod), so a wrong shape becomes a query error instead of a crash later. That fits "a value the page doesn't recognise shows as unknown". Skip it until a real mismatch happens.
- **Components export their props from their own file**, re-exported through `components/index.ts` like `ButtonSize` is today, and only when a page needs to name them. Otherwise `ComponentProps<typeof Button>` works without any export.

## Evidence

**Where types live**
- Bulletproof React: a feature's `types/` folder is "typescript types used within the feature", `src/types` is "shared types used across the application", and `api/` holds "API request declarations and api hooks". https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md
- TkDodo, data transformations: transforming on the backend is best. Otherwise transform in `queryFn` or `select`. `select` "only runs if data exists" and suits mapping, which is what `selectTokens` does. https://tkdodo.eu/blog/react-query-data-transformations
- TkDodo, type-safe React Query: fetch's types are a promise you trust. "Zod lets you … validate at runtime", parsed in the `queryFn`. For end-to-end types he points to tools with "an upfront API definition" (tRPC, zodios). https://tkdodo.eu/blog/type-safe-react-query
- openapi-typescript turns an OpenAPI 3.0/3.1 file into "runtime-free types" (`paths`, `components`). It needs an OpenAPI file, which we don't have. https://openapi-ts.dev/introduction

**Structural typing, and where it stops**
- TypeScript handbook: "`x` is compatible with `y` if `y` has at least the same members as `x`." So the route catches a missing or renamed field, and a changed type. It doesn't catch an extra field, or a field the page no longer uses. https://www.typescriptlang.org/docs/handbook/type-compatibility.html

**Component prop types in design systems**
- React docs: name the props type with `type`/`interface` once there are a few fields, and document each field with JSDoc. They say nothing about a shared types folder. https://react.dev/learn/typescript
- Primer React: "import components and their prop type interfaces" from the package root, e.g. `import {Button, ButtonProps} from '@primer/react'`. Each props type sits in its component's file and goes out through one barrel. https://primer.style/product/getting-started/react/

**Side question (a): the ✕ on dialogs**
- WAI-ARIA APG: it's "strongly recommended" that every dialog has "a visible element with role button that closes the dialog, such as a close icon or cancel button". So a Cancel button is enough. For irreversible steps, focus "the least destructive action". https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
- Atlassian: "A close button in the header should always be used, except in extremely rare circumstances." https://atlassian.design/components/modal-dialog/usage
- Primer: Dialog has an ✕ ("clicking the 'X' in the top-right corner"). ConfirmationDialog's `onClose` reports a `'close-button'` gesture, and focus starts on Cancel when the action is dangerous. https://primer.style/product/components/dialog/ · https://primer.style/product/components/confirmation-dialog/
- GOV.UK has no published modal. It's still a backlog item, and services confirm a deletion on a page instead. https://github.com/alphagov/govuk-design-system-backlog/issues/30
- In short, Atlassian and Primer put an ✕ on dialogs. APG accepts Cancel alone. Our `Dialog` has Escape, the backdrop and Cancel, which meets APG.

**Side question (b): a toast after a visible delete**
- Primer, notification messaging: "Is the success of the action evident on the page? → Additional visual messaging not needed, but state must be conveyed to screen reader users." Also "Use success messaging sparingly and rely more on interaction context." This is what TokensPage does: the row goes, and `StatusMessage` announces "Token deleted". https://primer.style/product/ui-patterns/notification-messaging/
- Shopify App Home: a toast is for "confirmation messages after successful save, create, or update operations", and should "offer an undo option after destructive actions". That makes the toast worth having only if it carries Undo. https://shopify.dev/docs/api/app-home/apis/toast
- GOV.UK: a green notification banner is for "something they're expecting to happen has happened", mainly when it can't be seen otherwise. https://design-system.service.gov.uk/components/notification-banner/
- In short, don't add a toast. Removing the row plus a screen-reader announcement is the recommended pattern. Add a toast only if deleting gets an Undo, which tokens can't have.
