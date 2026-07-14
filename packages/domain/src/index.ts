import { Decimal } from "decimal.js";

// Override decimal.js's default banker's rounding (ROUND_HALF_EVEN) —
// accounting and estimators expect conventional half-up rounding, and this
// must be identical wherever this package runs (API server for
// persistence, web client for live preview) or client/server totals will
// visibly disagree by a penny. Set once, here, at the package entry point.
Decimal.set({ rounding: Decimal.ROUND_HALF_UP });

export { Decimal };
export * from "./estimating/types.js";
export * from "./estimating/markup.js";
export * from "./estimating/assembly.js";
export * from "./estimating/status.js";
