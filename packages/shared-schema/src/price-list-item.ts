import { z } from "zod";

// Money/quantity fields are plain numbers at this JSON/form boundary — a
// single input value from a form field has nowhere near enough magnitude
// to hit floating-point precision issues. The "never do money math in JS
// floats" rule applies to arithmetic (all of which goes through
// @pm4mep/domain's Decimal-based functions), not to how one number is
// carried over the wire.
export const PriceListItemSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  costCodeId: z.string().uuid(),
  description: z.string().min(1).max(300),
  manufacturer: z.string().max(200).nullable(),
  modelNumber: z.string().max(200).nullable(),
  sku: z.string().max(200).nullable(),
  unit: z.string().min(1).max(20),
  unitCost: z.coerce.number().nonnegative(),
  active: z.boolean(),
  createdAt: z.coerce.date(),
});

export type PriceListItem = z.infer<typeof PriceListItemSchema>;

export const PriceListItemCreateSchema = z.object({
  costCodeId: z.string().uuid(),
  description: z.string().min(1).max(300),
  manufacturer: z.string().max(200).optional(),
  modelNumber: z.string().max(200).optional(),
  sku: z.string().max(200).optional(),
  unit: z.string().min(1).max(20),
  unitCost: z.coerce.number().nonnegative(),
});

export type PriceListItemCreate = z.infer<typeof PriceListItemCreateSchema>;

export const PriceListItemUpdateSchema = PriceListItemCreateSchema.partial().extend({
  active: z.boolean().optional(),
});

export type PriceListItemUpdate = z.infer<typeof PriceListItemUpdateSchema>;
