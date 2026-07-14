import { z } from "zod";

export const LaborRateSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  costCodeId: z.string().uuid(),
  classification: z.string().min(1).max(200),
  burdenedHourlyRate: z.coerce.number().nonnegative(),
  active: z.boolean(),
  createdAt: z.coerce.date(),
});

export type LaborRate = z.infer<typeof LaborRateSchema>;

export const LaborRateCreateSchema = z.object({
  costCodeId: z.string().uuid(),
  classification: z.string().min(1).max(200),
  burdenedHourlyRate: z.coerce.number().nonnegative(),
});

export type LaborRateCreate = z.infer<typeof LaborRateCreateSchema>;

export const LaborRateUpdateSchema = LaborRateCreateSchema.partial().extend({
  active: z.boolean().optional(),
});

export type LaborRateUpdate = z.infer<typeof LaborRateUpdateSchema>;
