import { z } from "zod";

export const OrganizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200),
  createdAt: z.coerce.date(),
});

export type Organization = z.infer<typeof OrganizationSchema>;

// GET /organization's shape: the full letterhead/contact fields, in
// addition to the base identity fields above. Nullable (not optional-with-
// blank-transform) on the read path, same reasoning as CustomerSchema —
// these come back from the database as-is, never re-validated against a
// stricter write-time rule.
export const OrganizationDetailSchema = OrganizationSchema.extend({
  addressLine1: z.string().nullable(),
  addressLine2: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  postalCode: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  licenseNumber: z.string().nullable(),
  logoUrl: z.string().nullable(),
});

export type OrganizationDetail = z.infer<typeof OrganizationDetailSchema>;

export const OrganizationUpdateSchema = z.object({
  name: z.string().min(1).max(200),
  addressLine1: z.string().max(300).optional(),
  addressLine2: z.string().max(300).optional(),
  city: z.string().max(200).optional(),
  state: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  phone: z.string().max(50).optional(),
  // Same blank-to-undefined transform as CustomerCreateSchema — a blank
  // form field submits "", which should clear the value (become undefined,
  // i.e. "don't set"/NULL), not fail .email() validation.
  email: z
    .string()
    .email()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  licenseNumber: z.string().max(100).optional(),
  logoUrl: z.string().url().optional(),
});

export type OrganizationUpdate = z.infer<typeof OrganizationUpdateSchema>;

// Shared between the web upload control and R2Service's presigned-URL
// generation, so both sides agree on exactly which image types are
// allowed. Limited to what @react-pdf/renderer's <Image> can actually
// decode (PNG/JPEG) — proposal-document.tsx renders this logo into the
// letterhead, and WEBP/SVG aren't reliably supported there, which would
// otherwise let an upload succeed while silently breaking every proposal.
export const LOGO_CONTENT_TYPES = ["image/png", "image/jpeg"] as const;

export const LogoUploadUrlRequestSchema = z.object({
  contentType: z.enum(LOGO_CONTENT_TYPES),
});

export type LogoUploadUrlRequest = z.infer<typeof LogoUploadUrlRequestSchema>;
