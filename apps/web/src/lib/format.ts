// Shared currency display helpers. Totals/sums/dashboard figures round to
// whole dollars — a few cents of rounding noise doesn't matter at that
// scale and commas-without-cents keeps tables scannable. Per-unit rates and
// unit costs keep 2 decimals since those are often genuinely fractional
// (e.g. $4.25/lb) and rounding would misrepresent the actual price. Both
// use Intl.NumberFormat for locale-correct comma grouping rather than
// manual string formatting.
const wholeDollarFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const preciseDollarFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Totals, sums, budgets, sell prices, dashboard figures — anything
// answering "how much in total." e.g. formatCurrency(45461.64) -> "$45,462"
export function formatCurrency(value: number): string {
  return wholeDollarFormatter.format(value);
}

// Per-unit rates and unit costs — anything answering "at what rate."
// e.g. formatCurrencyPrecise(4.25) -> "$4.25"
export function formatCurrencyPrecise(value: number): string {
  return preciseDollarFormatter.format(value);
}
