import { z } from "zod";

export const CustomerSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  name: z.string().min(1).max(300),
  addressLine1: z.string().min(1).max(300),
  addressLine2: z.string().max(300).nullable(),
  city: z.string().min(1).max(200),
  state: z.string().min(1).max(100),
  postalCode: z.string().min(1).max(20),
  primaryContactName: z.string().max(200).nullable(),
  primaryContactEmail: z.string().email().nullable(),
  primaryContactPhone: z.string().max(50).nullable(),
  active: z.boolean(),
  createdAt: z.coerce.date(),
});

export type Customer = z.infer<typeof CustomerSchema>;

export const CustomerCreateSchema = z.object({
  name: z.string().min(1).max(300),
  addressLine1: z.string().min(1).max(300),
  addressLine2: z.string().max(300).optional(),
  city: z.string().min(1).max(200),
  state: z.string().min(1).max(100),
  postalCode: z.string().min(1).max(20),
  primaryContactName: z.string().max(200).optional(),
  primaryContactEmail: z.string().email().optional().or(z.literal("")),
  primaryContactPhone: z.string().max(50).optional(),
});

export type CustomerCreate = z.infer<typeof CustomerCreateSchema>;

export const CustomerUpdateSchema = CustomerCreateSchema.partial().extend({
  active: z.boolean().optional(),
});

export type CustomerUpdate = z.infer<typeof CustomerUpdateSchema>;
