import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";

// Guards against the exact mistake Phase 1 flagged as a real risk: adding a
// tenant-scoped table and forgetting the hand-written RLS policy SQL (there
// is no `prisma migrate` safety net for RLS — see prisma/rls/*.sql). Any
// table with an org_id column that lacks RLS + a policy fails this test
// instead of silently leaking cross-tenant data in production.
const prisma = new PrismaClient();

interface RlsCoverageRow {
  table_name: string;
  rls_enabled: boolean;
  has_policy: boolean;
}

afterAll(async () => {
  await prisma.$disconnect();
});

describe("RLS coverage", () => {
  it("every table with an org_id column has row-level security enabled and a policy", async () => {
    const rows = await prisma.$queryRaw<RlsCoverageRow[]>`
      select
        c.relname as table_name,
        c.relrowsecurity as rls_enabled,
        exists (
          select 1 from pg_policies p
          where p.schemaname = n.nspname and p.tablename = c.relname
        ) as has_policy
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind = 'r'
        and exists (
          select 1 from information_schema.columns col
          where col.table_schema = 'public'
            and col.table_name = c.relname
            and col.column_name = 'org_id'
        )
      order by c.relname;
    `;

    expect(rows.length).toBeGreaterThan(0);

    const missing = rows.filter((row) => !row.rls_enabled || !row.has_policy);
    expect(missing, `tables missing RLS or a policy: ${JSON.stringify(missing)}`).toEqual([]);
  });
});
