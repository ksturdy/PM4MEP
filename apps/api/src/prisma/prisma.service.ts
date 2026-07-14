import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Prisma, PrismaClient } from "@pm4mep/db";

// Nest-managed singleton wrapping the shared @pm4mep/db PrismaClient.
// Tenant-scoped queries (memberships, cost_codes, and future domain tables)
// must go through withTenant(), not the plain client, so Postgres RLS
// (packages/db/prisma/rls/001_enable_rls.sql) is enforced on the connection
// in addition to the org_id filters applied in queries themselves.
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async withTenant<T>(
    orgId: string,
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.$transaction(async (tx) => {
      // set_config (not a raw `SET LOCAL ...` string) so orgId is bound as a
      // real query parameter — SET does not accept parameters over the wire
      // protocol, but a SELECT calling set_config() does.
      await tx.$executeRaw`SELECT set_config('app.current_org_id', ${orgId}, true)`;
      return fn(tx);
    });
  }
}
