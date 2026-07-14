import { Injectable } from "@nestjs/common";
import type { CustomerCreate, CustomerUpdate } from "@pm4mep/shared-schema";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  list(orgId: string) {
    return this.prisma.withTenant(orgId, (tx) =>
      tx.customer.findMany({ where: { orgId }, orderBy: { name: "asc" } }),
    );
  }

  create(orgId: string, input: CustomerCreate) {
    return this.prisma.withTenant(orgId, (tx) => tx.customer.create({ data: { ...input, orgId } }));
  }

  update(orgId: string, id: string, input: CustomerUpdate) {
    return this.prisma.withTenant(orgId, (tx) => tx.customer.update({ where: { id }, data: input }));
  }
}
