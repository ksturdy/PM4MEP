-- Row-Level Security for tenant isolation.
--
-- Applied manually (not via `prisma migrate`) after each schema migration
-- that adds a new tenant-scoped table, because Prisma does not manage RLS
-- policies. Run this against the target database after `prisma migrate
-- deploy`. The api verifies its own JWT (issued at login by
-- apps/api/src/auth/auth.service.ts, which embeds org id + role directly in
-- the token) and issues `SELECT set_config('app.current_org_id', ...)` at
-- the start of every tenant-scoped request transaction (see
-- apps/api/src/prisma/prisma.service.ts's withTenant()) — Postgres then
-- enforces isolation independently of application-level org_id filtering.

alter table memberships enable row level security;
alter table cost_codes enable row level security;

-- organizations is deliberately NOT row-level-secured: every lookup is by a
-- unique id/slug the caller already legitimately possesses (from their own
-- JWT, or a slug they typed in themselves), so it can never return another
-- tenant's row by accident. RLS earns its keep on tables that hold many rows
-- across many tenants where a missing WHERE clause could leak a whole list;
-- it has no such job to do on a table that's already looked up by unique key.
drop policy if exists tenant_isolation on memberships;
create policy tenant_isolation on memberships
  -- No ::uuid cast: Prisma's default `String @id @default(uuid())` columns
  -- are Postgres `text`, not the native `uuid` type, so both sides must
  -- stay text or comparison fails with "operator does not exist: text = uuid".
  using (org_id = current_setting('app.current_org_id', true));

drop policy if exists tenant_isolation on cost_codes;
create policy tenant_isolation on cost_codes
  -- No ::uuid cast: Prisma's default `String @id @default(uuid())` columns
  -- are Postgres `text`, not the native `uuid` type, so both sides must
  -- stay text or comparison fails with "operator does not exist: text = uuid".
  using (org_id = current_setting('app.current_org_id', true));

-- users has no org_id column (a user can belong to multiple orgs via
-- memberships), so it is intentionally not RLS-scoped here.
