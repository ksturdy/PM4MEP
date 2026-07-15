# PM4MEP

## Conventions

### Currency formatting (apps/web)

Use the shared helpers in `apps/web/src/lib/format.ts` for every dollar amount displayed in the UI — never `.toFixed(2)` or manual string concatenation with `$`.

- `formatCurrency(value)` — whole dollars with comma grouping, no decimals (e.g. `$45,462`). Use for totals, sums, budgets, sell prices, and dashboard/table aggregate figures — anything answering "how much in total."
- `formatCurrencyPrecise(value)` — commas with 2 decimals (e.g. `$4.25`). Use for per-unit rates and unit costs — anything answering "at what rate," where cents are often meaningful (e.g. `$4.25/lb`, `$68.00/hr`).

Both are built on `Intl.NumberFormat` for locale-correct grouping. If a value is a `Decimal` (decimal.js, from `@pm4mep/domain`), call `.toNumber()` before passing it in.

This does not apply to the PDF proposal document (`apps/api/src/proposals/templates/proposal-document.tsx`), which intentionally shows 2-decimal precision throughout as a formal bid document.
