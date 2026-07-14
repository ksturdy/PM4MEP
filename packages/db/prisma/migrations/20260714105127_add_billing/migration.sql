-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('Essentials', 'Growth', 'Enterprise');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('Monthly', 'Annual');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('Incomplete', 'IncompleteExpired', 'Trialing', 'Active', 'PastDue', 'Canceled', 'Unpaid', 'Paused');

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "billing_cycle" "BillingCycle",
ADD COLUMN     "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "current_period_end" TIMESTAMP(3),
ADD COLUMN     "plan" "Plan" NOT NULL DEFAULT 'Essentials',
ADD COLUMN     "stripe_customer_id" TEXT,
ADD COLUMN     "stripe_price_id" TEXT,
ADD COLUMN     "stripe_subscription_id" TEXT,
ADD COLUMN     "subscription_status" "SubscriptionStatus" NOT NULL DEFAULT 'Incomplete',
ADD COLUMN     "trial_ends_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "stripe_events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stripe_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_stripe_customer_id_key" ON "organizations"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_stripe_subscription_id_key" ON "organizations"("stripe_subscription_id");

