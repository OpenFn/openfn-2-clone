# Components

## className on a primitive is layout and sizing only

A page or feature component passes a primitive a `className` to place and
size it, never to change how it looks (D299). Lint checks it
(`local/primitive-classname` in eslint.config.js).

Allowed (after `sm:`, `hover:`, `@5xl/main:` prefixes and `!`):

- display: `flex`, `grid`, `block`, `hidden`, `inline-*`, `contents`
- flex and grid: `flex-*`, `grid-*`, `col-*`, `row-*`, `items-*`,
  `justify-*`, `content-*`, `self-*`, `place-*`, `order-*`, `gap-*`,
  `space-x|y-*`
- sizing: `w-*`, `h-*`, `min-*`, `max-*`, `size-*`, `shrink`, `grow`,
  `basis-*`, `aspect-*`
- text overflow: `truncate`, `line-clamp-*`, `whitespace-*`, `break-*`,
  `wrap-*`, `text-wrap|nowrap|balance|pretty|ellipsis|clip`
- `overflow-*`; position: `relative`, `absolute`, `sticky`, `inset-*`,
  `top|right|bottom|left-*`, `z-*`; `sr-only`, `group`, `peer`,
  `isolate`, `@container`

Everything else fails: margin, padding, colour, type (`font-mono`,
`text-center`), borders, rounding, shadows, opacity, cursor, transforms,
animation. Use the primitive's props instead: `tone` for colour (`Text
tone="muted"`), `variant` for a look, `padding`, `wrap` and `maxWidth` on
`Td`. The parent owns the gap between children, so a margin becomes the
parent's `gap`. If no prop fits, don't add one for a single caller: follow
"Where things go" in [PRINCIPLES.md](../../PRINCIPLES.md).

A heading over a block of content is a `Section` (it owns the gaps), not a
`Heading` with a margin.

Never add a `debt:` disable in new work: code that can't pass lint isn't
finished. Only uses that predate the rule are frozen, with
`// eslint-disable-next-line local/primitive-classname -- debt: F5xx …`,
naming the finding (F525 margin, F526 padding/border/background, F527
colour, F528 type, F529 state looks). `grep -rn "primitive-classname" src`
lists them; the count only goes down.
