---
paths:
  - "eslint.config.js"
  - "src/test/lint.test.ts"
---

# Lint rules

A lint rule that matches nothing looks exactly like one that works: both
pass. So every rule is proved.

- **Add a case to `src/test/lint.test.ts`** with the rule: `bad`, the real
  mistake the rule exists for (the one you just found in the code, not an
  invented one), and `good`, the right way to write it. The test checks
  that `bad` fails with the rule's message and `good` passes.
- **Break the rule once to see the case fail**, then put it back: change
  its selector so it matches nothing, run
  `npx vitest run --project unit src/test/lint.test.ts`, see that case go
  red. A case that stays green when the rule is gone proves nothing.
- **Run `npm run lint` on the whole repo** before committing a new rule.
  Fix what it finds, or freeze each one with a `debt:` disable that names
  a finding, so the count only goes down.
- The message says what to use instead and where the rule is written
  (a decision id, `docs/building.md`, a finding).
- **The styling counts only go down.** CI runs
  `node scripts/design-system-metrics.mjs --check` against
  `scripts/design-system-baseline.json`. When yours go down, run it with
  `--update` and commit the baseline. A new rule that freezes old breaches
  as `debt:` raises the count once: update the baseline in that PR and say
  why.
