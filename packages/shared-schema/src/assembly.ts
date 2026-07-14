import { z } from "zod";
import { CostTypeSchema } from "./cost-code.js";

export const AssemblyComponentTypeSchema = z.enum(["PriceListItem", "LaborRate"]);
export type AssemblyComponentType = z.infer<typeof AssemblyComponentTypeSchema>;

export const AssemblySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  name: z.string().min(1).max(300),
  description: z.string().max(2000).nullable(),
  unit: z.string().min(1).max(20),
  category: z.string().max(200).nullable(),
  active: z.boolean(),
  createdAt: z.coerce.date(),
});

export type Assembly = z.infer<typeof AssemblySchema>;

export const AssemblyCreateSchema = z.object({
  name: z.string().min(1).max(300),
  description: z.string().max(2000).optional(),
  unit: z.string().min(1).max(20),
  category: z.string().max(200).optional(),
});

export type AssemblyCreate = z.infer<typeof AssemblyCreateSchema>;

export const AssemblyUpdateSchema = AssemblyCreateSchema.partial().extend({
  active: z.boolean().optional(),
});

export type AssemblyUpdate = z.infer<typeof AssemblyUpdateSchema>;

// Read shape for a component, with just enough of the referenced
// PriceListItem/LaborRate resolved to render + explode client-side —
// not the full referenced record.
export const AssemblyComponentSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  assemblyId: z.string().uuid(),
  componentType: AssemblyComponentTypeSchema,
  priceListItemId: z.string().uuid().nullable(),
  laborRateId: z.string().uuid().nullable(),
  quantityPerUnit: z.coerce.number(),
  sortOrder: z.number(),
  description: z.string(),
  unit: z.string(),
  unitCost: z.coerce.number(),
  costType: CostTypeSchema,
});

export type AssemblyComponentDetail = z.infer<typeof AssemblyComponentSchema>;

export const AssemblyWithComponentsSchema = AssemblySchema.extend({
  components: AssemblyComponentSchema.array(),
});

export type AssemblyWithComponents = z.infer<typeof AssemblyWithComponentsSchema>;

export const AssemblyComponentCreateSchema = z
  .object({
    componentType: AssemblyComponentTypeSchema,
    priceListItemId: z.string().uuid().optional(),
    laborRateId: z.string().uuid().optional(),
    quantityPerUnit: z.coerce.number().positive(),
  })
  .refine((data) => Boolean(data.priceListItemId) !== Boolean(data.laborRateId), {
    message: "Exactly one of priceListItemId or laborRateId must be set",
  });

export type AssemblyComponentCreate = z.infer<typeof AssemblyComponentCreateSchema>;
