import { Injectable } from "@nestjs/common";
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
}
