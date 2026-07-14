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
  // Not .email() here: this is the read path, and re-validating a stricter
  // format than what's actually in the database risks exactly the crash
  // this comment replaced — a stored value that doesn't match a tightened
  // rule throws on every read. Email format is enforced once, at write
  // time (CustomerCreateSchema below); "" is treated as no value.
  primaryContactEmail: z
    .string()
    .nullable()
    .transform((v) => v || null),
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
  // A blank form field submits "" (not absence) — accept it, but
  // transform to undefined so it's never persisted as an empty string
  // (Prisma treats undefined as "don't set", leaving the column NULL).
  // Storing "" instead of NULL is exactly what caused a real crash: the
  // read schema above couldn't parse "" as a valid/nullable email.
  primaryContactEmail: z
    .string()
    .email()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  primaryContactPhone: z.string().max(50).optional(),
});

export type CustomerCreate = z.infer<typeof CustomerCreateSchema>;

export const CustomerUpdateSchema = CustomerCreateSchema.partial().extend({
  active: z.boolean().optional(),
});

export type CustomerUpdate = z.infer<typeof CustomerUpdateSchema>;
