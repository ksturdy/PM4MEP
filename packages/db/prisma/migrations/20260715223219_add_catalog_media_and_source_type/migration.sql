-- AlterEnum
ALTER TYPE "EstimateLineItemSourceType" ADD VALUE 'Catalog';

-- AlterTable
ALTER TABLE "price_list_items" ADD COLUMN     "photo_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "spec_sheet_url" TEXT;
