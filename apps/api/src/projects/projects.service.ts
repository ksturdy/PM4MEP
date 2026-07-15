import { BadRequestException, Injectable } from "@nestjs/common";
import type { Prisma } from "@pm4mep/db";
import {
  Decimal,
  calculateLineItemExtendedCost,
  canTransitionProject,
  rollupProjectBudget,
  type ApprovedChangeOrderForRollup,
  type BudgetLineForRollup,
  type CostEntryForRollup,
} from "@pm4mep/domain";
import type {
  ChangeOrderCreate,
  ChangeOrderStatus,
  ProjectBudgetLineManualCreate,
  ProjectBudgetLineUpdate,
  ProjectCostEntryCreate,
  ProjectCostEntryUpdate,
  ProjectCreate,
  ProjectFromEstimateCreate,
  ProjectMilestoneCreate,
  ProjectMilestoneUpdate,
  ProjectStatus,
  ProjectUpdate,
} from "@pm4mep/shared-schema";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  list(orgId: string) {
    return this.prisma
      .withTenant(orgId, (tx) =>
        tx.project.findMany({
          where: { orgId },
          orderBy: { createdAt: "desc" },
          include: { customer: true, projectManager: true },
        }),
      )
      .then((projects) =>
        projects.map((p) => ({
          id: p.id,
          number: p.number,
          name: p.name,
          status: p.status,
          customerName: p.customer.name,
          projectManagerName: p.projectManager?.name ?? null,
          targetCompletionDate: p.targetCompletionDate,
          totalBudget: p.totalBudget,
          totalActualCost: p.totalActualCost,
          createdAt: p.createdAt,
        })),
      );
  }

  async getById(orgId: string, id: string) {
    return this.prisma.withTenant(orgId, async (tx) => {
      const project = await tx.project.findUniqueOrThrow({
        where: { id },
        include: {
          customer: true,
          projectManager: true,
          createdBy: true,
          budgetLines: { orderBy: { sortOrder: "asc" } },
          costEntries: { orderBy: { incurredOn: "desc" }, include: { enteredBy: true } },
          milestones: { orderBy: { sortOrder: "asc" } },
          changeOrders: { orderBy: { createdAt: "asc" } },
        },
      });

      const rollup = rollupProjectBudget(
        project.budgetLines.map(toBudgetLineForRollup),
        project.changeOrders.filter((co) => co.status === "Approved").map(toChangeOrderForRollup),
        project.costEntries.map(toCostEntryForRollup),
      );

      // ProjectSchema requires totalBudget/totalActualCost at the top
      // level (list rows read them from there), so they can't simply be
      // omitted — but the persisted columns are overwritten here with the
      // exact numbers just computed by rollupProjectBudget(), rather than
      // echoing back whatever findUniqueOrThrow happened to read off the
      // row, so the top-level scalars and rollup.totalBudget/
      // totalActualCost can never disagree even if a mutation path ever
      // forgot to call recalculate().
      const totalBudget = rollup.totalBudget.toNumber();
      const totalActualCost = rollup.totalActualCost.toNumber();

      return {
        ...project,
        totalBudget,
        totalActualCost,
        customerName: project.customer.name,
        projectManagerName: project.projectManager?.name ?? null,
        createdByName: project.createdBy.name,
        costEntries: project.costEntries.map((entry) => ({ ...entry, enteredByName: entry.enteredBy.name })),
        rollup: {
          budgetByType: toPlainByType(rollup.budgetByType),
          actualByType: toPlainByType(rollup.actualByType),
          varianceByType: toPlainByType(rollup.varianceByType),
          totalBudget,
          totalActualCost,
          totalVariance: rollup.totalVariance.toNumber(),
          percentSpent: rollup.percentSpent.toNumber(),
        },
      };
    });
  }

  async create(orgId: string, userId: string, input: ProjectCreate) {
    return this.prisma.withTenant(orgId, async (tx) => {
      const number = await nextProjectNumber(tx, orgId);
      return tx.project.create({
        data: {
          orgId,
          customerId: input.customerId,
          name: input.name,
          status: "Planning",
          startDate: input.startDate,
          targetCompletionDate: input.targetCompletionDate,
          projectManagerId: input.projectManagerId,
          scopeDescription: input.scopeDescription,
          totalBudget: 0,
          totalActualCost: 0,
          createdById: userId,
          number,
        },
      });
    });
  }

  // Snapshots every line item of a Won estimate into a ProjectBudgetLine —
  // 1:1, never pre-aggregated, same rule explodeAssembly() follows for
  // assembly components (see EstimateLineItem's doc comment). This is what
  // protects the project's budget from drifting if the source estimate's
  // line items are edited afterward, since nothing blocks editing a Won
  // estimate today.
  async createFromEstimate(orgId: string, userId: string, estimateId: string, input: ProjectFromEstimateCreate) {
    return this.prisma.withTenant(orgId, async (tx) => {
      const estimate = await tx.estimate.findUniqueOrThrow({
        where: { id: estimateId },
        include: {
          project: true,
          sections: { orderBy: { sortOrder: "asc" }, include: { lineItems: { orderBy: { sortOrder: "asc" } } } },
        },
      });

      if (estimate.status !== "Won") {
        throw new BadRequestException("Only a Won estimate can be converted into a project");
      }
      if (estimate.project) {
        throw new BadRequestException("This estimate has already been converted into a project");
      }

      const number = await nextProjectNumber(tx, orgId);
      const project = await tx.project.create({
        data: {
          orgId,
          customerId: estimate.customerId,
          estimateId: estimate.id,
          name: input.name ?? estimate.name,
          status: "Planning",
          startDate: input.startDate,
          targetCompletionDate: input.targetCompletionDate,
          projectManagerId: input.projectManagerId,
          scopeDescription: estimate.scopeDescription,
          totalBudget: 0,
          totalActualCost: 0,
          createdById: userId,
          number,
        },
      });

      let sortOrder = 0;
      for (const section of estimate.sections) {
        for (const lineItem of section.lineItems) {
          await tx.projectBudgetLine.create({
            data: {
              orgId,
              projectId: project.id,
              costCodeId: lineItem.costCodeId,
              sourceEstimateLineItemId: lineItem.id,
              description: lineItem.description,
              costType: lineItem.costType,
              budgetAmount: lineItem.extendedCost,
              sortOrder: sortOrder++,
            },
          });
        }
      }

      await recalculate(tx, project.id);
      // recalculate() writes totalBudget/totalActualCost on the row, but
      // the `project` object above is the pre-recalculation snapshot from
      // create() — re-fetch so the response doesn't show a stale $0 budget
      // right after a conversion that clearly populated one.
      return tx.project.findUniqueOrThrow({ where: { id: project.id } });
    });
  }

  async update(orgId: string, id: string, input: ProjectUpdate) {
    return this.prisma.withTenant(orgId, (tx) => tx.project.update({ where: { id }, data: input }));
  }

  async transitionStatus(orgId: string, id: string, newStatus: ProjectStatus) {
    return this.prisma.withTenant(orgId, async (tx) => {
      const project = await tx.project.findUniqueOrThrow({ where: { id } });
      if (!canTransitionProject(project.status as ProjectStatus, newStatus)) {
        throw new BadRequestException(`Cannot transition a project from ${project.status} to ${newStatus}`);
      }
      return tx.project.update({ where: { id }, data: { status: newStatus } });
    });
  }

  async addBudgetLine(orgId: string, projectId: string, input: ProjectBudgetLineManualCreate) {
    return this.prisma.withTenant(orgId, async (tx) => {
      const sortOrder = await tx.projectBudgetLine.count({ where: { projectId } });
      await tx.projectBudgetLine.create({
        data: {
          orgId,
          projectId,
          costCodeId: input.costCodeId ?? null,
          description: input.description,
          costType: input.costType,
          budgetAmount: input.budgetAmount,
          sortOrder,
        },
      });
      await recalculate(tx, projectId);
    });
  }

  async updateBudgetLine(orgId: string, projectId: string, lineId: string, input: ProjectBudgetLineUpdate) {
    return this.prisma.withTenant(orgId, async (tx) => {
      await tx.projectBudgetLine.update({ where: { id: lineId }, data: input });
      await recalculate(tx, projectId);
    });
  }

  async removeBudgetLine(orgId: string, projectId: string, lineId: string) {
    return this.prisma.withTenant(orgId, async (tx) => {
      await tx.projectBudgetLine.delete({ where: { id: lineId } });
      await recalculate(tx, projectId);
    });
  }

  async addCostEntry(orgId: string, projectId: string, userId: string, input: ProjectCostEntryCreate) {
    return this.prisma.withTenant(orgId, async (tx) => {
      const extendedCost = calculateLineItemExtendedCost(new Decimal(input.unitCost), new Decimal(input.quantity));
      await tx.projectCostEntry.create({
        data: {
          orgId,
          projectId,
          costCodeId: input.costCodeId ?? null,
          description: input.description,
          costType: input.costType,
          quantity: input.quantity,
          unitCost: input.unitCost,
          extendedCost: extendedCost.toNumber(),
          incurredOn: input.incurredOn,
          enteredById: userId,
        },
      });
      await recalculate(tx, projectId);
    });
  }

  async updateCostEntry(orgId: string, projectId: string, entryId: string, input: ProjectCostEntryUpdate) {
    return this.prisma.withTenant(orgId, async (tx) => {
      const existing = await tx.projectCostEntry.findUniqueOrThrow({ where: { id: entryId } });
      const unitCost = input.unitCost ?? existing.unitCost.toNumber();
      const quantity = input.quantity ?? existing.quantity.toNumber();
      const extendedCost = calculateLineItemExtendedCost(new Decimal(unitCost), new Decimal(quantity));

      await tx.projectCostEntry.update({
        where: { id: entryId },
        data: { ...input, extendedCost: extendedCost.toNumber() },
      });
      await recalculate(tx, projectId);
    });
  }

  async removeCostEntry(orgId: string, projectId: string, entryId: string) {
    return this.prisma.withTenant(orgId, async (tx) => {
      await tx.projectCostEntry.delete({ where: { id: entryId } });
      await recalculate(tx, projectId);
    });
  }

  async addMilestone(orgId: string, projectId: string, input: ProjectMilestoneCreate) {
    return this.prisma.withTenant(orgId, async (tx) => {
      const sortOrder = await tx.projectMilestone.count({ where: { projectId } });
      return tx.projectMilestone.create({
        data: { orgId, projectId, name: input.name, dueDate: input.dueDate, sortOrder },
      });
    });
  }

  async updateMilestone(orgId: string, milestoneId: string, input: ProjectMilestoneUpdate) {
    return this.prisma.withTenant(orgId, (tx) =>
      tx.projectMilestone.update({ where: { id: milestoneId }, data: input }),
    );
  }

  async removeMilestone(orgId: string, milestoneId: string) {
    return this.prisma.withTenant(orgId, (tx) => tx.projectMilestone.delete({ where: { id: milestoneId } }));
  }

  async addChangeOrder(orgId: string, projectId: string, userId: string, input: ChangeOrderCreate) {
    return this.prisma.withTenant(orgId, (tx) =>
      tx.changeOrder.create({
        data: {
          orgId,
          projectId,
          title: input.title,
          description: input.description ?? null,
          amount: input.amount,
          scheduleImpactDays: input.scheduleImpactDays ?? null,
          status: "Draft",
          createdById: userId,
        },
      }),
    );
  }

  // Only Approved change orders affect the budget (see recalculate()), so
  // every transition — into or out of Approved — needs a recalculation, and
  // approvedAt is set/cleared alongside the status itself rather than left
  // stale from a prior approval.
  async transitionChangeOrderStatus(
    orgId: string,
    projectId: string,
    changeOrderId: string,
    newStatus: ChangeOrderStatus,
  ) {
    return this.prisma.withTenant(orgId, async (tx) => {
      await tx.changeOrder.update({
        where: { id: changeOrderId },
        data: { status: newStatus, approvedAt: newStatus === "Approved" ? new Date() : null },
      });
      await recalculate(tx, projectId);
    });
  }

  async healthSummary(orgId: string) {
    return this.prisma.withTenant(orgId, async (tx) => {
      const [statusCounts, upcomingMilestones, overBudgetProjects] = await Promise.all([
        tx.project.groupBy({ by: ["status"], where: { orgId }, _count: true }),
        tx.projectMilestone.findMany({
          where: { orgId, completedAt: null, dueDate: { not: null } },
          orderBy: { dueDate: "asc" },
          take: 5,
          include: { project: { select: { id: true, name: true, number: true } } },
        }),
        tx.project.findMany({
          where: { orgId, status: { in: ["Active", "OnHold"] } },
          select: { id: true, totalBudget: true, totalActualCost: true },
        }),
      ]);

      const activeCount =
        (statusCounts.find((s) => s.status === "Active")?._count ?? 0) +
        (statusCounts.find((s) => s.status === "OnHold")?._count ?? 0);
      const totalBudget = overBudgetProjects.reduce((sum, p) => sum.plus(p.totalBudget), new Decimal(0));
      const totalActualCost = overBudgetProjects.reduce((sum, p) => sum.plus(p.totalActualCost), new Decimal(0));
      const overBudgetCount = overBudgetProjects.filter((p) =>
        new Decimal(p.totalActualCost).greaterThan(p.totalBudget),
      ).length;

      return {
        activeCount,
        totalBudget: totalBudget.toNumber(),
        totalActualCost: totalActualCost.toNumber(),
        overBudgetCount,
        upcomingMilestones: upcomingMilestones.map((m) => ({
          id: m.id,
          name: m.name,
          dueDate: m.dueDate,
          projectId: m.project.id,
          projectName: m.project.name,
          projectNumber: m.project.number,
        })),
      };
    });
  }
}

function toBudgetLineForRollup(line: { costType: string; budgetAmount: Prisma.Decimal }): BudgetLineForRollup {
  return { costType: line.costType as BudgetLineForRollup["costType"], budgetAmount: new Decimal(line.budgetAmount) };
}

function toChangeOrderForRollup(changeOrder: { amount: Prisma.Decimal }): ApprovedChangeOrderForRollup {
  return { amount: new Decimal(changeOrder.amount) };
}

function toCostEntryForRollup(entry: { costType: string; extendedCost: Prisma.Decimal }): CostEntryForRollup {
  return { costType: entry.costType as CostEntryForRollup["costType"], extendedCost: new Decimal(entry.extendedCost) };
}

function toPlainByType(record: Record<string, Decimal>): Record<string, number> {
  return Object.fromEntries(Object.entries(record).map(([type, value]) => [type, value.toNumber()]));
}

async function nextProjectNumber(tx: Prisma.TransactionClient, orgId: string): Promise<string> {
  const seq = await tx.orgSequence.upsert({
    where: { orgId_key: { orgId, key: "project" } },
    create: { orgId, key: "project", currentValue: 1 },
    update: { currentValue: { increment: 1 } },
  });
  return `PRJ-${String(seq.currentValue).padStart(4, "0")}`;
}

// Recomputes and persists totalBudget/totalActualCost — called after every
// mutation that could change them (budget line / cost entry / change order
// add/update/remove). Never client-trusted, same rule as
// Estimate.calculatedSellPrice — see recalculate() in estimating.service.ts.
async function recalculate(tx: Prisma.TransactionClient, projectId: string) {
  const [budgetLines, approvedChangeOrders, costEntries] = await Promise.all([
    tx.projectBudgetLine.findMany({ where: { projectId } }),
    tx.changeOrder.findMany({ where: { projectId, status: "Approved" } }),
    tx.projectCostEntry.findMany({ where: { projectId } }),
  ]);

  const rollup = rollupProjectBudget(
    budgetLines.map(toBudgetLineForRollup),
    approvedChangeOrders.map(toChangeOrderForRollup),
    costEntries.map(toCostEntryForRollup),
  );

  await tx.project.update({
    where: { id: projectId },
    data: {
      totalBudget: rollup.totalBudget.toNumber(),
      totalActualCost: rollup.totalActualCost.toNumber(),
    },
  });
}
