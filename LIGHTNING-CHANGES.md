# Where we change what Lightning does

Lightning's behaviour is the starting point: the scenario tests check each page against it. Every place this app does something different, or drops something, is listed here, so a failing test can be told apart from a mistake.

Looks don't go here. Brandon's design wins on looks (PRINCIPLES.md, "Where the design comes from"). This file is for what a page does and says.

One line each: the page, what Lightning does, what we do instead, and why.

| Page | Lightning | Here | Why |
|---|---|---|---|
| API tokens | Flashes "Token created successfully" and "Token deleted successfully" | No toast: the new-token box is the create message; the row going (announced) is the delete message | Show a result where it happened (notes/inbox.md); Brandon's design has no toast |
| API tokens | "Copied!" tooltip after copying | The Copy button says "Copied" and announces it | Tooltips explain, they don't report (PRINCIPLES.md, WCAG 4.1.3) |
| API tokens | Delete modal buttons "Yes" / "Cancel" | "Delete token" / "Cancel" | A button says what it does (PRINCIPLES.md, Words) |
