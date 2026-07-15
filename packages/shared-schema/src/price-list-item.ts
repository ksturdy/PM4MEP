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
  photoUrls: z.array(z.string().url()),
  specSheetUrl: z.string().url().nullable(),
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
  photoUrls: z.array(z.string().url()).max(6).optional(),
  specSheetUrl: z.string().url().optional(),
});

export type PriceListItemCreate = z.infer<typeof PriceListItemCreateSchema>;

export const PriceListItemUpdateSchema = PriceListItemCreateSchema.partial().extend({
  active: z.boolean().optional(),
});

export type PriceListItemUpdate = z.infer<typeof PriceListItemUpdateSchema>;

// Restricted to what @react-pdf/renderer's <Image> can actually decode
// (PNG/JPEG) — the proposal document renders catalog photos directly into
// the customer-facing PDF, and WEBP/SVG aren't reliably supported there.
export const CATALOG_PHOTO_CONTENT_TYPES = ["image/png", "image/jpeg"] as const;

export const CATALOG_SPEC_SHEET_CONTENT_TYPES = ["application/pdf"] as const;

export const PriceListItemPhotoUploadUrlRequestSchema = z.object({
  contentType: z.enum(CATALOG_PHOTO_CONTENT_TYPES),
});

export type PriceListItemPhotoUploadUrlRequest = z.infer<
  typeof PriceListItemPhotoUploadUrlRequestSchema
>;

export const PriceListItemSpecSheetUploadUrlRequestSchema = z.object({
  contentType: z.enum(CATALOG_SPEC_SHEET_CONTENT_TYPES),
});

export type PriceListItemSpecSheetUploadUrlRequest = z.infer<
  typeof PriceListItemSpecSheetUploadUrlRequestSchema
>;

// Structured result of a web equipment search (see catalog-web-search.service.ts)
// — imageUrl/specSheetUrl point at the source site until re-hosted to R2.
export const CatalogWebSearchResultSchema = z.object({
  manufacturer: z.string().nullable(),
  modelNumber: z.string().nullable(),
  description: z.string(),
  sourceUrl: z.string().url(),
  imageUrl: z.string().url().nullable(),
  specSheetUrl: z.string().url().nullable(),
});

export type CatalogWebSearchResult = z.infer<typeof CatalogWebSearchResultSchema>;

export const CatalogWebSearchRequestSchema = z.object({
  query: z.string().min(1).max(200),
});

export type CatalogWebSearchRequest = z.infer<typeof CatalogWebSearchRequestSchema>;

export const PriceListItemFromWebResultCreateSchema = z.object({
  costCodeId: z.string().uuid(),
  unitCost: z.coerce.number().nonnegative(),
  description: z.string().min(1).max(300),
  manufacturer: z.string().max(200).optional(),
  modelNumber: z.string().max(200).optional(),
  sku: z.string().max(200).optional(),
  unit: z.string().min(1).max(20),
  imageUrl: z.string().url().optional(),
  specSheetUrl: z.string().url().optional(),
});

export type PriceListItemFromWebResultCreate = z.infer<
  typeof PriceListItemFromWebResultCreateSchema
>;
