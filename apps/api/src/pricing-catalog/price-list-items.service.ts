import { Injectable } from "@nestjs/common";
import type { PriceListItemCreate, PriceListItemUpdate } from "@pm4mep/shared-schema";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PriceListItemsService {
  constructor(private readonly prisma: PrismaService) {}

  list(orgId: string) {
    return this.prisma.withTenant(orgId, (tx) =>
      tx.priceListItem.findMany({ where: { orgId }, orderBy: { description: "asc" } }),
    );
  }

  create(orgId: string, input: PriceListItemCreate) {
    return this.prisma.withTenant(orgId, (tx) =>
      tx.priceListItem.create({ data: { ...input, orgId } }),
    );
  }

  update(orgId: string, id: string, input: PriceListItemUpdate) {
    return this.prisma.withTenant(orgId, (tx) => tx.priceListItem.update({ where: { id }, data: input }));
  }
}
