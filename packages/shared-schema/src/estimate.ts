import { z } from "zod";
import { CostTypeSchema } from "./cost-code.js";

export const EstimateStatusSchema = z.enum(["Draft", "Submitted", "Won", "Lost"]);
export type EstimateStatus = z.infer<typeof EstimateStatusSchema>;

export const EstimateLineItemSourceTypeSchema = z.enum(["Assembly", "Manual"]);
export type EstimateLineItemSourceType = z.infer<typeof EstimateLineItemSourceTypeSchema>;

// Markup config fields, shared between Estimate's full read shape and the
// update schema — the estimate's percentage fields all get set together
// from one "Markup" panel in the builder UI.
const markupConfigFields = {
  laborMarkupPct: z.coerce.number().min(0).max(1000),
  materialMarkupPct: z.coerce.number().min(0).max(1000),
  equipmentMarkupPct: z.coerce.number().min(0).max(1000),
  subcontractMarkupPct: z.coerce.number().min(0).max(1000),
  otherMarkupPct: z.coerce.number().min(0).max(1000),
  overheadPct: z.coerce.number().min(0).max(1000),
  profitPct: z.coerce.number().min(0).max(1000),
  contingencyPct: z.coerce.number().min(0).max(1000),
  taxPct: z.coerce.number().min(0).max(100),
};

export const EstimateSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  customerId: z.string().uuid(),
  number: z.string(),
  name: z.string(),
  status: EstimateStatusSchema,
  bidDueDate: z.coerce.date().nullable(),
  bidToContactName: z.string().nullable(),
  bidToContactEmail: z.string().nullable(),
  bidToContactPhone: z.string().nullable(),
  createdById: z.string().uuid(),
  ...markupConfigFields,
  calculatedSellPrice: z.coerce.number(),
  finalSellPriceOverride: z.coerce.number().nullable(),
  scopeDescription: z.string().nullable(),
  inclusions: z.string().nullable(),
  exclusions: z.string().nullable(),
  termsAndConditions: z.string().nullable(),
  createdAt: z.coerce.date(),
});

export type Estimate = z.infer<typeof EstimateSchema>;

export const EstimateCreateSchema = z.object({
  customerId: z.string().uuid(),
  name: z.string().min(1).max(300),
  bidDueDate: z.coerce.date().optional(),
  bidToContactName: z.string().max(200).optional(),
  // Transformed to undefined (not persisted as "") when blank — a blank
  // form field submits "" rather than omitting the key. See customer.ts
  // for the real crash this pattern caused when a read schema wasn't
  // equally lenient.
  bidToContactEmail: z
    .string()
    .email()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  bidToContactPhone: z.string().max(50).optional(),
});

export type EstimateCreate = z.infer<typeof EstimateCreateSchema>;

export const EstimateUpdateSchema = z.object({
  name: z.string().min(1).max(300).optional(),
  customerId: z.string().uuid().optional(),
  bidDueDate: z.coerce.date().optional(),
  bidToContactName: z.string().max(200).optional(),
  // Transformed to undefined (not persisted as "") when blank — a blank
  // form field submits "" rather than omitting the key. See customer.ts
  // for the real crash this pattern caused when a read schema wasn't
  // equally lenient.
  bidToContactEmail: z
    .string()
    .email()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  bidToContactPhone: z.string().max(50).optional(),
  laborMarkupPct: z.coerce.number().min(0).max(1000).optional(),
  materialMarkupPct: z.coerce.number().min(0).max(1000).optional(),
  equipmentMarkupPct: z.coerce.number().min(0).max(1000).optional(),
  subcontractMarkupPct: z.coerce.number().min(0).max(1000).optional(),
  otherMarkupPct: z.coerce.number().min(0).max(1000).optional(),
  overheadPct: z.coerce.number().min(0).max(1000).optional(),
  profitPct: z.coerce.number().min(0).max(1000).optional(),
  contingencyPct: z.coerce.number().min(0).max(1000).optional(),
  taxPct: z.coerce.number().min(0).max(100).optional(),
  finalSellPriceOverride: z.coerce.number().nullable().optional(),
  scopeDescription: z.string().max(10000).optional(),
  inclusions: z.string().max(10000).optional(),
  exclusions: z.string().max(10000).optional(),
  termsAndConditions: z.string().max(10000).optional(),
});

export type EstimateUpdate = z.infer<typeof EstimateUpdateSchema>;

// Proposal-facing text fields, edited together from one "Proposal details"
// panel in the builder UI — mirrors the markupConfigFields split above.
export const EstimateScopeDetailsUpdateSchema = EstimateUpdateSchema.pick({
  scopeDescription: true,
  inclusions: true,
  exclusions: true,
  termsAndConditions: true,
});

export type EstimateScopeDetailsUpdate = z.infer<typeof EstimateScopeDetailsUpdateSchema>;

export const EstimateStatusTransitionSchema = z.object({
  status: EstimateStatusSchema,
});

export type EstimateStatusTransition = z.infer<typeof EstimateStatusTransitionSchema>;

export const EstimateSectionSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  estimateId: z.string().uuid(),
  name: z.string(),
  sortOrder: z.number(),
});

export type EstimateSection = z.infer<typeof EstimateSectionSchema>;

export const EstimateSectionCreateSchema = z.object({
  name: z.string().min(1).max(300),
});

export type EstimateSectionCreate = z.infer<typeof EstimateSectionCreateSchema>;

export const EstimateLineItemSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  sectionId: z.string().uuid(),
  sourceType: EstimateLineItemSourceTypeSchema,
  assemblyId: z.string().uuid().nullable(),
  priceListItemId: z.string().uuid().nullable(),
  laborRateId: z.string().uuid().nullable(),
  costCodeId: z.string().uuid().nullable(),
  description: z.string(),
  unit: z.string(),
  unitCost: z.coerce.number(),
  quantity: z.coerce.number(),
  extendedCost: z.coerce.number(),
  costType: CostTypeSchema,
  markupOverridePct: z.coerce.number().nullable(),
  sortOrder: z.number(),
});

export type EstimateLineItem = z.infer<typeof EstimateLineItemSchema>;

export const EstimateLineItemManualCreateSchema = z.object({
  costCodeId: z.string().uuid().optional(),
  description: z.string().min(1).max(500),
  unit: z.string().min(1).max(20),
  unitCost: z.coerce.number(),
  quantity: z.coerce.number(),
  costType: CostTypeSchema,
  markupOverridePct: z.coerce.number().min(0).max(1000).optional(),
});

export type EstimateLineItemManualCreate = z.infer<typeof EstimateLineItemManualCreateSchema>;

export const EstimateLineItemFromAssemblyCreateSchema = z.object({
  assemblyId: z.string().uuid(),
  quantity: z.coerce.number().positive(),
});

export type EstimateLineItemFromAssemblyCreate = z.infer<typeof EstimateLineItemFromAssemblyCreateSchema>;

export const EstimateLineItemUpdateSchema = z.object({
  description: z.string().min(1).max(500).optional(),
  unit: z.string().min(1).max(20).optional(),
  unitCost: z.coerce.number().optional(),
  quantity: z.coerce.number().optional(),
  markupOverridePct: z.coerce.number().min(0).max(1000).nullable().optional(),
});

export type EstimateLineItemUpdate = z.infer<typeof EstimateLineItemUpdateSchema>;

export const EstimateSectionWithLineItemsSchema = EstimateSectionSchema.extend({
  lineItems: EstimateLineItemSchema.array(),
});

export type EstimateSectionWithLineItems = z.infer<typeof EstimateSectionWithLineItemsSchema>;

// Rollup breakdown mirrors packages/domain's EstimateRollupResult shape,
// serialized for the API response (Decimal -> number over the wire).
const costTypeBreakdownSchema = z.object({
  labor: z.coerce.number(),
  material: z.coerce.number(),
  equipment: z.coerce.number(),
  subcontract: z.coerce.number(),
  other: z.coerce.number(),
});

export const EstimateRollupSchema = z.object({
  directCostByType: costTypeBreakdownSchema,
  markedUpByType: costTypeBreakdownSchema,
  totalDirectCost: z.coerce.number(),
  totalMarkedUpCost: z.coerce.number(),
  overheadAmount: z.coerce.number(),
  subtotalWithOverhead: z.coerce.number(),
  profitAmount: z.coerce.number(),
  contingencyAmount: z.coerce.number(),
  calculatedSellPrice: z.coerce.number(),
  resolvedSellPrice: z.coerce.number(),
  resolvedSellPriceWithTax: z.coerce.number(),
});

export type EstimateRollup = z.infer<typeof EstimateRollupSchema>;

export const EstimateWithDetailsSchema = EstimateSchema.extend({
  customerName: z.string(),
  createdByName: z.string(),
  sections: EstimateSectionWithLineItemsSchema.array(),
  rollup: EstimateRollupSchema,
  // Set once a Won estimate has been converted into a Project (see
  // POST /projects/from-estimate/:estimateId) — null otherwise. Detail-only,
  // like rollup, not on the plain EstimateSchema/list item.
  projectId: z.string().uuid().nullable(),
});

export type EstimateWithDetails = z.infer<typeof EstimateWithDetailsSchema>;

export const EstimateListItemSchema = z.object({
  id: z.string().uuid(),
  number: z.string(),
  name: z.string(),
  status: EstimateStatusSchema,
  customerName: z.string(),
  calculatedSellPrice: z.coerce.number(),
  finalSellPriceOverride: z.coerce.number().nullable(),
  createdAt: z.coerce.date(),
});

export type EstimateListItem = z.infer<typeof EstimateListItemSchema>;

export const EstimatePipelineSummarySchema = z.object({
  statusCounts: z.object({
    Draft: z.number(),
    Submitted: z.number(),
    Won: z.number(),
    Lost: z.number(),
  }),
  openPipelineValue: z.coerce.number(),
  // null when there are no decided (Won/Lost) estimates yet to compute a
  // rate from — distinct from 0%, which means decided estimates exist and
  // none were won.
  winRate: z.coerce.number().nullable(),
  upcomingBidDueDates: z
    .object({
      id: z.string().uuid(),
      number: z.string(),
      name: z.string(),
      customerName: z.string(),
      bidDueDate: z.coerce.date().nullable(),
    })
    .array(),
});

export type EstimatePipelineSummary = z.infer<typeof EstimatePipelineSummarySchema>;
