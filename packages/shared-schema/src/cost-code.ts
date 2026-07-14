import { z } from "zod";

export const CostTypeSchema = z.enum([
  "labor",
  "material",
  "equipment",
  "subcontract",
  "other",
]);

export type CostType = z.infer<typeof CostTypeSchema>;

export const CostCodeSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  code: z.string().min(1).max(20),
  description: z.string().min(1).max(200),
  costType: CostTypeSchema,
  defaultUnit: z.string().min(1).max(20),
  active: z.boolean(),
  createdAt: z.coerce.date(),
});

export type CostCode = z.infer<typeof CostCodeSchema>;

export const CostCodeCreateSchema = CostCodeSchema.pick({
  code: true,
  description: true,
  costType: true,
  defaultUnit: true,
});

export type CostCodeCreate = z.infer<typeof CostCodeCreateSchema>;

export const CostCodeUpdateSchema = CostCodeCreateSchema.partial().extend({
  active: z.boolean().optional(),
});

export type CostCodeUpdate = z.infer<typeof CostCodeUpdateSchema>;
