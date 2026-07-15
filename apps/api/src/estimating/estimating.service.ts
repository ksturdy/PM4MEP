import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@pm4mep/db";
import {
  Decimal,
  calculateLineItemExtendedCost,
  canTransition,
  explodeAssembly,
  resolveSellPrice,
  resolveSellPriceWithTax,
  rollupEstimate,
  type LineItemForRollup,
  type MarkupConfig,
} from "@pm4mep/domain";
import type {
  EstimateCreate,
  EstimateLineItemFromAssemblyCreate,
  EstimateLineItemFromCatalogCreate,
  EstimateLineItemManualCreate,
  EstimateLineItemUpdate,
  EstimateSectionCreate,
  EstimateStatus,
  EstimateUpdate,
} from "@pm4mep/shared-schema";
import { PrismaService } from "../prisma/prisma.service";

// Default starting markup config for a new estimate — hardcoded, not an
// org-level settings screen (explicitly cut from this phase per the plan).
// Reasonable mechanical-trade starting points; the estimator adjusts per
// bid in the builder before submitting.
const DEFAULT_MARKUP_CONFIG = {
  laborMarkupPct: 15,
  materialMarkupPct: 25,
  equipmentMarkupPct: 20,
  subcontractMarkupPct: 10,
  otherMarkupPct: 15,
  overheadPct: 10,
  profitPct: 10,
  contingencyPct: 0,
  taxPct: 0,
};

@Injectable()
export class EstimatingService {
  constructor(private readonly prisma: PrismaService) {}

  async pipelineSummary(orgId: string) {
    return this.prisma.withTenant(orgId, async (tx) => {
      const [statusCounts, openEstimates, upcoming] = await Promise.all([
        tx.estimate.groupBy({ by: ["status"], where: { orgId }, _count: true }),
        tx.estimate.findMany({
          where: { orgId, status: { in: ["Draft", "Submitted"] } },
          select: { calculatedSellPrice: true, finalSellPriceOverride: true },
        }),
        tx.estimate.findMany({
          where: { orgId, status: "Submitted", bidDueDate: { gte: new Date() } },
          orderBy: { bidDueDate: "asc" },
          take: 5,
          include: { customer: { select: { name: true } } },
        }),
      ]);

      const countFor = (status: string) => statusCounts.find((s) => s.status === status)?._count ?? 0;
      const wonCount = countFor("Won");
      const lostCount = countFor("Lost");
      const winRate = wonCount + lostCount === 0 ? null : (wonCount / (wonCount + lostCount)) * 100;

      const openPipelineValue = openEstimates.reduce(
        (sum, e) => sum + Number(e.finalSellPriceOverride ?? e.calculatedSellPrice),
        0,
      );

      return {
        statusCounts: {
          Draft: countFor("Draft"),
          Submitted: countFor("Submitted"),
          Won: wonCount,
          Lost: lostCount,
        },
        openPipelineValue,
        winRate,
        upcomingBidDueDates: upcoming.map((e) => ({
          id: e.id,
          number: e.number,
          name: e.name,
          customerName: e.customer.name,
          bidDueDate: e.bidDueDate,
        })),
      };
    });
  }

  list(orgId: string) {
    return this.prisma
      .withTenant(orgId, (tx) =>
        tx.estimate.findMany({
          where: { orgId },
          orderBy: { createdAt: "desc" },
          include: { customer: true },
        }),
      )
      .then((estimates) =>
        estimates.map((e) => ({
          id: e.id,
          number: e.number,
          name: e.name,
          status: e.status,
          customerName: e.customer.name,
          calculatedSellPrice: e.calculatedSellPrice,
          finalSellPriceOverride: e.finalSellPriceOverride,
          createdAt: e.createdAt,
        })),
      );
  }

  async getById(orgId: string, id: string) {
    return this.prisma.withTenant(orgId, async (tx) => {
      const estimate = await tx.estimate.findUniqueOrThrow({
        where: { id },
        include: {
          customer: true,
          createdBy: true,
          project: { select: { id: true } },
          sections: {
            orderBy: { sortOrder: "asc" },
            include: { lineItems: { orderBy: { sortOrder: "asc" } } },
          },
        },
      });

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

      return {
        ...estimate,
        customerName: estimate.customer.name,
        createdByName: estimate.createdBy.name,
        projectId: estimate.project?.id ?? null,
        rollup: { ...rollup, resolvedSellPrice, resolvedSellPriceWithTax },
      };
    });
  }

  async create(orgId: string, userId: string, input: EstimateCreate) {
    return this.prisma.withTenant(orgId, async (tx) => {
      // Row lock from the update serializes concurrent numbering within an
      // org — see packages/db/prisma/schema.prisma's OrgSequence.
      const seq = await tx.orgSequence.upsert({
        where: { orgId_key: { orgId, key: "estimate" } },
        create: { orgId, key: "estimate", currentValue: 1 },
        update: { currentValue: { increment: 1 } },
      });
      const number = `EST-${String(seq.currentValue).padStart(4, "0")}`;

      return tx.estimate.create({
        data: {
          orgId,
          customerId: input.customerId,
          number,
          name: input.name,
          bidDueDate: input.bidDueDate,
          bidToContactName: input.bidToContactName,
          bidToContactEmail: input.bidToContactEmail,
          bidToContactPhone: input.bidToContactPhone,
          createdById: userId,
          ...DEFAULT_MARKUP_CONFIG,
          calculatedSellPrice: 0,
        },
      });
    });
  }

  async update(orgId: string, id: string, input: EstimateUpdate) {
    return this.prisma.withTenant(orgId, async (tx) => {
      await tx.estimate.update({ where: { id }, data: input });
      await recalculate(tx, id);
    });
  }

  async transitionStatus(orgId: string, id: string, newStatus: EstimateStatus) {
    return this.prisma.withTenant(orgId, async (tx) => {
      const estimate = await tx.estimate.findUniqueOrThrow({ where: { id }, include: { project: true } });
      if (!canTransition(estimate.status as EstimateStatus, newStatus)) {
        throw new BadRequestException(`Cannot transition an estimate from ${estimate.status} to ${newStatus}`);
      }
      // Won -> Draft is otherwise a valid correction path, but once a
      // Project has been created off this estimate (see
      // POST /projects/from-estimate/:estimateId), reverting the source
      // estimate to Draft would leave the Project pointing at a
      // now-non-Won estimate with no defined meaning.
      if (estimate.status === "Won" && newStatus === "Draft" && estimate.project) {
        throw new BadRequestException(
          "Cannot revert this estimate to Draft — a project has already been created from it",
        );
      }
      return tx.estimate.update({ where: { id }, data: { status: newStatus } });
    });
  }

  async addSection(orgId: string, estimateId: string, input: EstimateSectionCreate) {
    return this.prisma.withTenant(orgId, async (tx) => {
      const sortOrder = await tx.estimateSection.count({ where: { estimateId } });
      return tx.estimateSection.create({ data: { orgId, estimateId, name: input.name, sortOrder } });
    });
  }

  async renameSection(orgId: string, sectionId: string, name: string) {
    return this.prisma.withTenant(orgId, (tx) => tx.estimateSection.update({ where: { id: sectionId }, data: { name } }));
  }

  async removeSection(orgId: string, estimateId: string, sectionId: string) {
    return this.prisma.withTenant(orgId, async (tx) => {
      await tx.estimateSection.delete({ where: { id: sectionId } });
      await recalculate(tx, estimateId);
    });
  }

  async addManualLineItem(
    orgId: string,
    estimateId: string,
    sectionId: string,
    input: EstimateLineItemManualCreate,
  ) {
    return this.prisma.withTenant(orgId, async (tx) => {
      const extendedCost = calculateLineItemExtendedCost(new Decimal(input.unitCost), new Decimal(input.quantity));
      const sortOrder = await tx.estimateLineItem.count({ where: { sectionId } });

      await tx.estimateLineItem.create({
        data: {
          orgId,
          sectionId,
          sourceType: "Manual",
          costCodeId: input.costCodeId ?? null,
          description: input.description,
          unit: input.unit,
          unitCost: input.unitCost,
          quantity: input.quantity,
          extendedCost: extendedCost.toNumber(),
          costType: input.costType,
          markupOverridePct: input.markupOverridePct ?? null,
          sortOrder,
        },
      });

      await recalculate(tx, estimateId);
    });
  }

  // Snapshots live catalog pricing into a new EstimateLineItem, same
  // freeze-at-insert-time rule as addFromAssembly. Uses findFirst with an
  // explicit orgId filter rather than findUniqueOrThrow(id) — price_list_items
  // has no RLS policy today, so this is the only tenant boundary in play;
  // dropping it would let any authenticated user pull another org's catalog
  // item (and its cost) into their own estimate by guessing/observing a UUID.
  async addFromCatalog(
    orgId: string,
    estimateId: string,
    sectionId: string,
    input: EstimateLineItemFromCatalogCreate,
  ) {
    return this.prisma.withTenant(orgId, async (tx) => {
      const priceListItem = await tx.priceListItem.findFirst({
        where: { id: input.priceListItemId, orgId },
        include: { costCode: true },
      });
      if (!priceListItem || !priceListItem.active) {
        throw new NotFoundException("Catalog item not found");
      }

      const quantity = new Decimal(input.quantity);
      const unitCost = new Decimal(priceListItem.unitCost);
      const extendedCost = calculateLineItemExtendedCost(unitCost, quantity);
      const sortOrder = await tx.estimateLineItem.count({ where: { sectionId } });

      await tx.estimateLineItem.create({
        data: {
          orgId,
          sectionId,
          sourceType: "Catalog",
          priceListItemId: priceListItem.id,
          costCodeId: priceListItem.costCodeId,
          description: priceListItem.description,
          unit: priceListItem.unit,
          unitCost: unitCost.toNumber(),
          quantity: quantity.toNumber(),
          extendedCost: extendedCost.toNumber(),
          costType: priceListItem.costCode.costType,
          sortOrder,
        },
      });

      await recalculate(tx, estimateId);
    });
  }

  // Explodes the assembly using *live* catalog pricing at insertion time,
  // then snapshots the result into EstimateLineItem rows — this is the one
  // place assembly pricing gets frozen; the assembly itself never snapshots
  // (see assemblies.service.ts).
  async addFromAssembly(
    orgId: string,
    estimateId: string,
    sectionId: string,
    input: EstimateLineItemFromAssemblyCreate,
  ) {
    return this.prisma.withTenant(orgId, async (tx) => {
      const assembly = await tx.assembly.findUniqueOrThrow({
        where: { id: input.assemblyId },
        include: {
          components: {
            orderBy: { sortOrder: "asc" },
            include: {
              priceListItem: { include: { costCode: true } },
              laborRate: { include: { costCode: true } },
            },
          },
        },
      });

      const componentsForExplosion = assembly.components.map((component) => {
        if (component.componentType === "LaborRate") {
          if (!component.laborRate) {
            throw new InternalServerErrorException("Labor rate component missing its labor rate");
          }
          return {
            componentType: "LaborRate" as const,
            quantityPerUnit: new Decimal(component.quantityPerUnit),
            description: component.laborRate.classification,
            unit: "HR",
            unitCost: new Decimal(component.laborRate.burdenedHourlyRate),
            costType: component.laborRate.costCode.costType,
            priceListItemId: null,
            laborRateId: component.laborRateId,
            costCodeId: component.laborRate.costCodeId,
          };
        }
        if (!component.priceListItem) {
          throw new InternalServerErrorException("Price list component missing its price list item");
        }
        return {
          componentType: "PriceListItem" as const,
          quantityPerUnit: new Decimal(component.quantityPerUnit),
          description: component.priceListItem.description,
          unit: component.priceListItem.unit,
          unitCost: new Decimal(component.priceListItem.unitCost),
          costType: component.priceListItem.costCode.costType,
          priceListItemId: component.priceListItemId,
          laborRateId: null,
          costCodeId: component.priceListItem.costCodeId,
        };
      });

      const exploded = explodeAssembly(assembly.id, componentsForExplosion, new Decimal(input.quantity));

      let sortOrder = await tx.estimateLineItem.count({ where: { sectionId } });
      for (const line of exploded) {
        await tx.estimateLineItem.create({
          data: {
            orgId,
            sectionId,
            sourceType: "Assembly",
            assemblyId: line.assemblyId,
            priceListItemId: line.priceListItemId,
            laborRateId: line.laborRateId,
            costCodeId: line.costCodeId,
            description: line.description,
            unit: line.unit,
            unitCost: line.unitCost.toNumber(),
            quantity: line.quantity.toNumber(),
            extendedCost: line.extendedCost.toNumber(),
            costType: line.costType,
            sortOrder: sortOrder++,
          },
        });
      }

      await recalculate(tx, estimateId);
    });
  }

  async updateLineItem(
    orgId: string,
    estimateId: string,
    lineItemId: string,
    input: EstimateLineItemUpdate,
  ) {
    return this.prisma.withTenant(orgId, async (tx) => {
      const existing = await tx.estimateLineItem.findUniqueOrThrow({ where: { id: lineItemId } });
      const unitCost = input.unitCost ?? existing.unitCost.toNumber();
      const quantity = input.quantity ?? existing.quantity.toNumber();
      const extendedCost = calculateLineItemExtendedCost(new Decimal(unitCost), new Decimal(quantity));

      await tx.estimateLineItem.update({
        where: { id: lineItemId },
        data: { ...input, extendedCost: extendedCost.toNumber() },
      });

      await recalculate(tx, estimateId);
    });
  }

  async removeLineItem(orgId: string, estimateId: string, lineItemId: string) {
    return this.prisma.withTenant(orgId, async (tx) => {
      await tx.estimateLineItem.delete({ where: { id: lineItemId } });
      await recalculate(tx, estimateId);
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

// Recomputes and persists calculatedSellPrice — called after every mutation
// that could change the rollup (line item add/edit/remove, section
// removal, markup config update). calculatedSellPrice is never
// client-trusted; this is the single place it's written.
async function recalculate(tx: Prisma.TransactionClient, estimateId: string) {
  const estimate = await tx.estimate.findUniqueOrThrow({ where: { id: estimateId } });
  const lineItems = await tx.estimateLineItem.findMany({ where: { section: { estimateId } } });

  const rollup = rollupEstimate(lineItems.map(toLineItemForRollup), toMarkupConfig(estimate));

  await tx.estimate.update({
    where: { id: estimateId },
    data: { calculatedSellPrice: rollup.calculatedSellPrice.toNumber() },
  });
}
