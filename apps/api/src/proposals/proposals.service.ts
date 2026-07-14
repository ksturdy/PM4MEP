import { Injectable } from "@nestjs/common";
import type { Prisma } from "@pm4mep/db";
import {
  Decimal,
  resolveSellPrice,
  resolveSellPriceWithTax,
  rollupEstimate,
  type LineItemForRollup,
  type MarkupConfig,
} from "@pm4mep/domain";
import { PrismaService } from "../prisma/prisma.service";

// Reads Estimate data directly rather than through EstimatingService —
// deliberate, per the Phase 1 plan: proposal rendering has a different,
// heavier dependency (@react-pdf/renderer) than plain CRUD, and there's no
// real payoff from service-to-service indirection at this codebase's size.
// The rollup-computation helpers below are intentionally duplicated from
// estimating.service.ts for the same reason.
@Injectable()
export class ProposalsService {
  constructor(private readonly prisma: PrismaService) {}

  async getProposalData(orgId: string, estimateId: string) {
    return this.prisma.withTenant(orgId, async (tx) => {
      const [org, estimate] = await Promise.all([
        tx.organization.findUniqueOrThrow({ where: { id: orgId } }),
        tx.estimate.findUniqueOrThrow({
          where: { id: estimateId },
          include: {
            customer: true,
            createdBy: true,
            sections: {
              orderBy: { sortOrder: "asc" },
              include: { lineItems: { orderBy: { sortOrder: "asc" } } },
            },
          },
        }),
      ]);

      const allLineItems = estimate.sections.flatMap((s) => s.lineItems);
      const rollup = rollupEstimate(allLineItems.map(toLineItemForRollup), toMarkupConfig(estimate));
      const resolvedSellPrice = resolveSellPrice({
        calculatedSellPrice: rollup.calculatedSellPrice,
        finalSellPriceOverride: estimate.finalSellPriceOverride
          ? new Decimal(estimate.finalSellPriceOverride)
          : null,
      });
      const resolvedSellPriceWithTax = resolveSellPriceWithTax({
        calculatedSellPrice: rollup.calculatedSellPrice,
        finalSellPriceOverride: estimate.finalSellPriceOverride
          ? new Decimal(estimate.finalSellPriceOverride)
          : null,
        taxPct: new Decimal(estimate.taxPct),
      });

      return { org, estimate, rollup, resolvedSellPrice, resolvedSellPriceWithTax };
    });
  }
}

function toLineItemForRollup(lineItem: {
  costType: string;
  extendedCost: Prisma.Decimal;
  markupOverridePct: Prisma.Decimal | null;
}): LineItemForRollup {
  return {
    costType: lineItem.costType as LineItemForRollup["costType"],
    extendedCost: new Decimal(lineItem.extendedCost),
    markupOverridePct: lineItem.markupOverridePct ? new Decimal(lineItem.markupOverridePct) : null,
  };
}

function toMarkupConfig(estimate: {
  laborMarkupPct: Prisma.Decimal;
  materialMarkupPct: Prisma.Decimal;
  equipmentMarkupPct: Prisma.Decimal;
  subcontractMarkupPct: Prisma.Decimal;
  otherMarkupPct: Prisma.Decimal;
  overheadPct: Prisma.Decimal;
  profitPct: Prisma.Decimal;
  contingencyPct: Prisma.Decimal;
}): MarkupConfig {
  return {
    markupPctByType: {
      labor: new Decimal(estimate.laborMarkupPct),
      material: new Decimal(estimate.materialMarkupPct),
      equipment: new Decimal(estimate.equipmentMarkupPct),
      subcontract: new Decimal(estimate.subcontractMarkupPct),
      other: new Decimal(estimate.otherMarkupPct),
    },
    overheadPct: new Decimal(estimate.overheadPct),
    profitPct: new Decimal(estimate.profitPct),
    contingencyPct: new Decimal(estimate.contingencyPct),
  };
}
