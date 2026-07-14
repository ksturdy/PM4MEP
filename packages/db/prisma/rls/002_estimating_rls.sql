-- Row-Level Security for Phase 1 (Estimating MVP) tables.
--
-- Same pattern as 001_enable_rls.sql: applied manually via psql after
-- `prisma migrate deploy`, not through Prisma itself. All comparisons stay
-- text (no ::uuid cast) since Prisma's default id columns are Postgres
-- `text`, not the native `uuid` type.

alter table customers enable row level security;
alter table price_list_items enable row level security;
alter table labor_rates enable row level security;
alter table assemblies enable row level security;
alter table assembly_components enable row level security;
alter table org_sequences enable row level security;
alter table estimates enable row level security;
alter table estimate_sections enable row level security;
alter table estimate_line_items enable row level security;

drop policy if exists tenant_isolation on customers;
create policy tenant_isolation on customers
  using (org_id = current_setting('app.current_org_id', true));

drop policy if exists tenant_isolation on price_list_items;
create policy tenant_isolation on price_list_items
  using (org_id = current_setting('app.current_org_id', true));

drop policy if exists tenant_isolation on labor_rates;
create policy tenant_isolation on labor_rates
  using (org_id = current_setting('app.current_org_id', true));

drop policy if exists tenant_isolation on assemblies;
create policy tenant_isolation on assemblies
  using (org_id = current_setting('app.current_org_id', true));

drop policy if exists tenant_isolation on assembly_components;
create policy tenant_isolation on assembly_components
  using (org_id = current_setting('app.current_org_id', true));

drop policy if exists tenant_isolation on org_sequences;
create policy tenant_isolation on org_sequences
  using (org_id = current_setting('app.current_org_id', true));

drop policy if exists tenant_isolation on estimates;
create policy tenant_isolation on estimates
  using (org_id = current_setting('app.current_org_id', true));

drop policy if exists tenant_isolation on estimate_sections;
create policy tenant_isolation on estimate_sections
  using (org_id = current_setting('app.current_org_id', true));

drop policy if exists tenant_isolation on estimate_line_items;
create policy tenant_isolation on estimate_line_items
  using (org_id = current_setting('app.current_org_id', true));

-- Exactly one of price_list_item_id / labor_rate_id must be set on each
-- assembly component — Prisma has no declarative way to express this, so
-- it's a hand-written constraint alongside the hand-written RLS above.
alter table assembly_components drop constraint if exists assembly_component_exactly_one_source;
alter table assembly_components add constraint assembly_component_exactly_one_source
  check ((price_list_item_id is not null) != (labor_rate_id is not null));
