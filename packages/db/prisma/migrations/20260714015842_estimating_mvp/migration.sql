-- CreateEnum
CREATE TYPE "EstimateStatus" AS ENUM ('Draft', 'Submitted', 'Won', 'Lost');

-- CreateEnum
CREATE TYPE "EstimateLineItemSourceType" AS ENUM ('Assembly', 'Manual');

-- CreateEnum
CREATE TYPE "AssemblyComponentType" AS ENUM ('PriceListItem', 'LaborRate');

-- AlterTable
ALTER TABLE "cost_codes" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "address_line1" TEXT,
ADD COLUMN     "address_line2" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "license_number" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "postal_code" TEXT,
ADD COLUMN     "state" TEXT;

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address_line1" TEXT NOT NULL,
    "address_line2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postal_code" TEXT NOT NULL,
    "primary_contact_name" TEXT,
    "primary_contact_email" TEXT,
    "primary_contact_phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_list_items" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "cost_code_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "manufacturer" TEXT,
    "model_number" TEXT,
    "sku" TEXT,
    "unit" TEXT NOT NULL,
    "unit_cost" DECIMAL(12,4) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_list_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "labor_rates" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "cost_code_id" TEXT NOT NULL,
    "classification" TEXT NOT NULL,
    "burdened_hourly_rate" DECIMAL(12,4) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "labor_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assemblies" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL,
    "category" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assemblies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assembly_components" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "assembly_id" TEXT NOT NULL,
    "component_type" "AssemblyComponentType" NOT NULL,
    "price_list_item_id" TEXT,
    "labor_rate_id" TEXT,
    "quantity_per_unit" DECIMAL(12,4) NOT NULL,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "assembly_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_sequences" (
    "org_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "current_value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "org_sequences_pkey" PRIMARY KEY ("org_id","key")
);

-- CreateTable
CREATE TABLE "estimates" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "EstimateStatus" NOT NULL DEFAULT 'Draft',
    "bid_due_date" TIMESTAMP(3),
    "bid_to_contact_name" TEXT,
    "bid_to_contact_email" TEXT,
    "bid_to_contact_phone" TEXT,
    "created_by_id" TEXT NOT NULL,
    "labor_markup_pct" DECIMAL(5,2) NOT NULL,
    "material_markup_pct" DECIMAL(5,2) NOT NULL,
    "equipment_markup_pct" DECIMAL(5,2) NOT NULL,
    "subcontract_markup_pct" DECIMAL(5,2) NOT NULL,
    "other_markup_pct" DECIMAL(5,2) NOT NULL,
    "overhead_pct" DECIMAL(5,2) NOT NULL,
    "profit_pct" DECIMAL(5,2) NOT NULL,
    "contingency_pct" DECIMAL(5,2) NOT NULL,
    "tax_pct" DECIMAL(5,2) NOT NULL,
    "calculated_sell_price" DECIMAL(12,2) NOT NULL,
    "final_sell_price_override" DECIMAL(12,2),
    "scope_description" TEXT,
    "inclusions" TEXT,
    "exclusions" TEXT,
    "terms_and_conditions" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estimates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estimate_sections" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "estimate_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "estimate_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estimate_line_items" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "source_type" "EstimateLineItemSourceType" NOT NULL,
    "assembly_id" TEXT,
    "price_list_item_id" TEXT,
    "labor_rate_id" TEXT,
    "cost_code_id" TEXT,
    "description" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "unit_cost" DECIMAL(12,4) NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL,
    "extended_cost" DECIMAL(12,2) NOT NULL,
    "cost_type" "CostType" NOT NULL,
    "markup_override_pct" DECIMAL(5,2),
    "sort_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estimate_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customers_org_id_idx" ON "customers"("org_id");

-- CreateIndex
CREATE INDEX "customers_org_id_name_idx" ON "customers"("org_id", "name");

-- CreateIndex
CREATE INDEX "price_list_items_org_id_idx" ON "price_list_items"("org_id");

-- CreateIndex
CREATE INDEX "price_list_items_org_id_cost_code_id_idx" ON "price_list_items"("org_id", "cost_code_id");

-- CreateIndex
CREATE INDEX "labor_rates_org_id_idx" ON "labor_rates"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "labor_rates_org_id_classification_key" ON "labor_rates"("org_id", "classification");

-- CreateIndex
CREATE INDEX "assemblies_org_id_idx" ON "assemblies"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "assemblies_org_id_name_key" ON "assemblies"("org_id", "name");

-- CreateIndex
CREATE INDEX "assembly_components_org_id_idx" ON "assembly_components"("org_id");

-- CreateIndex
CREATE INDEX "assembly_components_assembly_id_idx" ON "assembly_components"("assembly_id");

-- CreateIndex
CREATE INDEX "estimates_org_id_idx" ON "estimates"("org_id");

-- CreateIndex
CREATE INDEX "estimates_org_id_customer_id_idx" ON "estimates"("org_id", "customer_id");

-- CreateIndex
CREATE INDEX "estimates_org_id_status_idx" ON "estimates"("org_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "estimates_org_id_number_key" ON "estimates"("org_id", "number");

-- CreateIndex
CREATE INDEX "estimate_sections_org_id_idx" ON "estimate_sections"("org_id");

-- CreateIndex
CREATE INDEX "estimate_sections_estimate_id_idx" ON "estimate_sections"("estimate_id");

-- CreateIndex
CREATE INDEX "estimate_line_items_org_id_idx" ON "estimate_line_items"("org_id");

-- CreateIndex
CREATE INDEX "estimate_line_items_section_id_idx" ON "estimate_line_items"("section_id");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_list_items" ADD CONSTRAINT "price_list_items_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_list_items" ADD CONSTRAINT "price_list_items_cost_code_id_fkey" FOREIGN KEY ("cost_code_id") REFERENCES "cost_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labor_rates" ADD CONSTRAINT "labor_rates_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labor_rates" ADD CONSTRAINT "labor_rates_cost_code_id_fkey" FOREIGN KEY ("cost_code_id") REFERENCES "cost_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assemblies" ADD CONSTRAINT "assemblies_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assembly_components" ADD CONSTRAINT "assembly_components_assembly_id_fkey" FOREIGN KEY ("assembly_id") REFERENCES "assemblies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assembly_components" ADD CONSTRAINT "assembly_components_price_list_item_id_fkey" FOREIGN KEY ("price_list_item_id") REFERENCES "price_list_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assembly_components" ADD CONSTRAINT "assembly_components_labor_rate_id_fkey" FOREIGN KEY ("labor_rate_id") REFERENCES "labor_rates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_sequences" ADD CONSTRAINT "org_sequences_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimates" ADD CONSTRAINT "estimates_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimates" ADD CONSTRAINT "estimates_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimates" ADD CONSTRAINT "estimates_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_sections" ADD CONSTRAINT "estimate_sections_estimate_id_fkey" FOREIGN KEY ("estimate_id") REFERENCES "estimates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_line_items" ADD CONSTRAINT "estimate_line_items_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "estimate_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_line_items" ADD CONSTRAINT "estimate_line_items_assembly_id_fkey" FOREIGN KEY ("assembly_id") REFERENCES "assemblies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_line_items" ADD CONSTRAINT "estimate_line_items_price_list_item_id_fkey" FOREIGN KEY ("price_list_item_id") REFERENCES "price_list_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_line_items" ADD CONSTRAINT "estimate_line_items_labor_rate_id_fkey" FOREIGN KEY ("labor_rate_id") REFERENCES "labor_rates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_line_items" ADD CONSTRAINT "estimate_line_items_cost_code_id_fkey" FOREIGN KEY ("cost_code_id") REFERENCES "cost_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
