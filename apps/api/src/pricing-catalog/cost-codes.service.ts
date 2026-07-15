import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { CostCodeCreate, CostCodeUpdate } from "@pm4mep/shared-schema";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CostCodesService {
  constructor(private readonly prisma: PrismaService) {}

  list(orgId: string) {
    return this.prisma.withTenant(orgId, (tx) =>
      tx.costCode.findMany({ where: { orgId }, orderBy: { code: "asc" } }),
    );
  }

  create(orgId: string, input: CostCodeCreate) {
    return this.prisma.withTenant(orgId, (tx) => tx.costCode.create({ data: { ...input, orgId } }));
  }

  update(orgId: string, id: string, input: CostCodeUpdate) {
    return this.prisma.withTenant(orgId, (tx) => tx.costCode.update({ where: { id }, data: input }));
  }

  remove(orgId: string, id: string) {
    return this.prisma.withTenant(orgId, async (tx) => {
      const costCode = await tx.costCode.findUnique({ where: { id } });
      if (!costCode || costCode.orgId !== orgId) {
        throw new NotFoundException("Cost code not found");
      }

      const [priceListItems, laborRates, estimateLineItems, projectBudgetLines, projectCostEntries] =
        await Promise.all([
          tx.priceListItem.count({ where: { costCodeId: id } }),
          tx.laborRate.count({ where: { costCodeId: id } }),
          tx.estimateLineItem.count({ where: { costCodeId: id } }),
          tx.projectBudgetLine.count({ where: { costCodeId: id } }),
          tx.projectCostEntry.count({ where: { costCodeId: id } }),
        ]);

      if (priceListItems + laborRates + estimateLineItems + projectBudgetLines + projectCostEntries > 0) {
        throw new ConflictException(
          "This cost code is in use and can't be deleted — deactivate it instead",
        );
      }

      await tx.costCode.delete({ where: { id } });
    });
  }
}
