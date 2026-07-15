-- Row-Level Security for the Projects module tables.
--
-- Same pattern as 001_enable_rls.sql / 002_estimating_rls.sql. Unlike those
-- two, this file is not applied via psql (see prisma/rls/apply.ts) — but the
-- SQL itself follows the exact same template: text comparison (no ::uuid
-- cast, Prisma's default id columns are Postgres `text`), idempotent
-- `drop policy if exists` before each `create policy`.

alter table projects enable row level security;
alter table project_budget_lines enable row level security;
alter table project_cost_entries enable row level security;
alter table project_milestones enable row level security;
alter table change_orders enable row level security;

drop policy if exists tenant_isolation on projects;
create policy tenant_isolation on projects
  using (org_id = current_setting('app.current_org_id', true));

drop policy if exists tenant_isolation on project_budget_lines;
create policy tenant_isolation on project_budget_lines
  using (org_id = current_setting('app.current_org_id', true));

drop policy if exists tenant_isolation on project_cost_entries;
create policy tenant_isolation on project_cost_entries
  using (org_id = current_setting('app.current_org_id', true));

drop policy if exists tenant_isolation on project_milestones;
create policy tenant_isolation on project_milestones
  using (org_id = current_setting('app.current_org_id', true));

drop policy if exists tenant_isolation on change_orders;
create policy tenant_isolation on change_orders
  using (org_id = current_setting('app.current_org_id', true));
