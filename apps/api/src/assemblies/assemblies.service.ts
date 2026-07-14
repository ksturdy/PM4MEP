import { Injectable, InternalServerErrorException } from "@nestjs/common";
import type { AssemblyComponentCreate, AssemblyCreate, AssemblyUpdate } from "@pm4mep/shared-schema";
import { PrismaService } from "../prisma/prisma.service";

// AssemblyComponent stores only a reference (priceListItemId/laborRateId) +
// quantity, never a snapshot — assemblies are reusable recipes, not
// committed estimates, so components should always reflect live catalog
// pricing. Snapshotting only happens once a component is exploded into an
// EstimateLineItem (Phase 1 step 6), same principle as PriceListItem/
// LaborRate not carrying their own costType.
@Injectable()
export class AssembliesService {
  constructor(private readonly prisma: PrismaService) {}

  list(orgId: string) {
    return this.prisma.withTenant(orgId, (tx) =>
      tx.assembly.findMany({
        where: { orgId },
        orderBy: { name: "asc" },
        include: { _count: { select: { components: true } } },
      }),
    );
  }

  async getById(orgId: string, id: string) {
    const assembly = await this.prisma.withTenant(orgId, (tx) =>
      tx.assembly.findUniqueOrThrow({
        where: { id },
        include: {
          components: {
            orderBy: { sortOrder: "asc" },
            include: {
              priceListItem: { include: { costCode: true } },
              laborRate: { include: { costCode: true } },
            },
          },
        },
      }),
    );

    return {
      ...assembly,
      components: assembly.components.map((component) => {
        if (component.componentType === "LaborRate") {
          if (!component.laborRate) {
            throw new InternalServerErrorException("Labor rate component missing its labor rate");
          }
          return {
            id: component.id,
            orgId: component.orgId,
            assemblyId: component.assemblyId,
            componentType: component.componentType,
            priceListItemId: component.priceListItemId,
            laborRateId: component.laborRateId,
            quantityPerUnit: component.quantityPerUnit,
            sortOrder: component.sortOrder,
            description: component.laborRate.classification,
            unit: "HR",
            unitCost: component.laborRate.burdenedHourlyRate,
            costType: component.laborRate.costCode.costType,
          };
        }

        if (!component.priceListItem) {
          throw new InternalServerErrorException("Price list component missing its price list item");
        }
        return {
          id: component.id,
          orgId: component.orgId,
          assemblyId: component.assemblyId,
          componentType: component.componentType,
          priceListItemId: component.priceListItemId,
          laborRateId: component.laborRateId,
          quantityPerUnit: component.quantityPerUnit,
          sortOrder: component.sortOrder,
          description: component.priceListItem.description,
          unit: component.priceListItem.unit,
          unitCost: component.priceListItem.unitCost,
          costType: component.priceListItem.costCode.costType,
        };
      }),
    };
  }

  create(orgId: string, input: AssemblyCreate) {
    return this.prisma.withTenant(orgId, (tx) => tx.assembly.create({ data: { ...input, orgId } }));
  }

  update(orgId: string, id: string, input: AssemblyUpdate) {
    return this.prisma.withTenant(orgId, (tx) => tx.assembly.update({ where: { id }, data: input }));
  }

  addComponent(orgId: string, assemblyId: string, input: AssemblyComponentCreate) {
    return this.prisma.withTenant(orgId, async (tx) => {
      const sortOrder = await tx.assemblyComponent.count({ where: { assemblyId } });
      return tx.assemblyComponent.create({
        data: {
          orgId,
          assemblyId,
          componentType: input.componentType,
          priceListItemId: input.priceListItemId ?? null,
          laborRateId: input.laborRateId ?? null,
          quantityPerUnit: input.quantityPerUnit,
          sortOrder,
        },
      });
    });
  }

  removeComponent(orgId: string, componentId: string) {
    return this.prisma.withTenant(orgId, (tx) =>
      tx.assemblyComponent.delete({ where: { id: componentId } }),
    );
  }
}
