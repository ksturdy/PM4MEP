import { Injectable } from "@nestjs/common";
import type { LaborRateCreate, LaborRateUpdate } from "@pm4mep/shared-schema";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class LaborRatesService {
  constructor(private readonly prisma: PrismaService) {}

  list(orgId: string) {
    return this.prisma.withTenant(orgId, (tx) =>
      tx.laborRate.findMany({ where: { orgId }, orderBy: { classification: "asc" } }),
    );
  }

  create(orgId: string, input: LaborRateCreate) {
    return this.prisma.withTenant(orgId, (tx) => tx.laborRate.create({ data: { ...input, orgId } }));
  }

  update(orgId: string, id: string, input: LaborRateUpdate) {
    return this.prisma.withTenant(orgId, (tx) => tx.laborRate.update({ where: { id }, data: input }));
  }
}
