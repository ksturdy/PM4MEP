import { z } from "zod";
import { CostTypeSchema } from "./cost-code.js";

export const ProjectStatusSchema = z.enum(["Planning", "Active", "OnHold", "Complete", "Cancelled"]);
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;

export const ChangeOrderStatusSchema = z.enum(["Draft", "Pending", "Approved", "Rejected"]);
export type ChangeOrderStatus = z.infer<typeof ChangeOrderStatusSchema>;

export const ProjectSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  customerId: z.string().uuid(),
  estimateId: z.string().uuid().nullable(),
  number: z.string(),
  name: z.string(),
  status: ProjectStatusSchema,
  startDate: z.coerce.date().nullable(),
  targetCompletionDate: z.coerce.date().nullable(),
  actualCompletionDate: z.coerce.date().nullable(),
  projectManagerId: z.string().uuid().nullable(),
  scopeDescription: z.string().nullable(),
  totalBudget: z.coerce.number(),
  totalActualCost: z.coerce.number(),
  createdById: z.string().uuid(),
  createdAt: z.coerce.date(),
});

export type Project = z.infer<typeof ProjectSchema>;

export const ProjectCreateSchema = z.object({
  customerId: z.string().uuid(),
  name: z.string().min(1).max(300),
  startDate: z.coerce.date().optional(),
  targetCompletionDate: z.coerce.date().optional(),
  projectManagerId: z.string().uuid().optional(),
  scopeDescription: z.string().max(10000).optional(),
});

export type ProjectCreate = z.infer<typeof ProjectCreateSchema>;

// Optional overrides applied on top of what's copied from the source
// estimate (customer, scope) — the estimate itself is identified by the
// :estimateId route param, not a body field.
export const ProjectFromEstimateCreateSchema = z.object({
  name: z.string().min(1).max(300).optional(),
  startDate: z.coerce.date().optional(),
  targetCompletionDate: z.coerce.date().optional(),
  projectManagerId: z.string().uuid().optional(),
});

export type ProjectFromEstimateCreate = z.infer<typeof ProjectFromEstimateCreateSchema>;

export const ProjectUpdateSchema = z.object({
  name: z.string().min(1).max(300).optional(),
  startDate: z.coerce.date().nullable().optional(),
  targetCompletionDate: z.coerce.date().nullable().optional(),
  actualCompletionDate: z.coerce.date().nullable().optional(),
  projectManagerId: z.string().uuid().nullable().optional(),
  scopeDescription: z.string().max(10000).optional(),
});

export type ProjectUpdate = z.infer<typeof ProjectUpdateSchema>;

export const ProjectStatusTransitionSchema = z.object({
  status: ProjectStatusSchema,
});

export type ProjectStatusTransition = z.infer<typeof ProjectStatusTransitionSchema>;

export const ProjectListItemSchema = z.object({
  id: z.string().uuid(),
  number: z.string(),
  name: z.string(),
  status: ProjectStatusSchema,
  customerName: z.string(),
  projectManagerName: z.string().nullable(),
  targetCompletionDate: z.coerce.date().nullable(),
  totalBudget: z.coerce.number(),
  totalActualCost: z.coerce.number(),
  createdAt: z.coerce.date(),
});

export type ProjectListItem = z.infer<typeof ProjectListItemSchema>;

export const ProjectBudgetLineSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  projectId: z.string().uuid(),
  costCodeId: z.string().uuid().nullable(),
  sourceEstimateLineItemId: z.string().uuid().nullable(),
  description: z.string(),
  costType: CostTypeSchema,
  budgetAmount: z.coerce.number(),
  sortOrder: z.number(),
});

export type ProjectBudgetLine = z.infer<typeof ProjectBudgetLineSchema>;

// Flat dollar amount, not qty/unitCost like EstimateLineItem — a budget
// line is a target, not a build-up. Only used for manually-entered lines;
// conversion-created lines are snapshotted server-side, not posted here.
export const ProjectBudgetLineManualCreateSchema = z.object({
  costCodeId: z.string().uuid().optional(),
  description: z.string().min(1).max(500),
  costType: CostTypeSchema,
  budgetAmount: z.coerce.number(),
});

export type ProjectBudgetLineManualCreate = z.infer<typeof ProjectBudgetLineManualCreateSchema>;

export const ProjectBudgetLineUpdateSchema = z.object({
  description: z.string().min(1).max(500).optional(),
  costType: CostTypeSchema.optional(),
  budgetAmount: z.coerce.number().optional(),
});

export type ProjectBudgetLineUpdate = z.infer<typeof ProjectBudgetLineUpdateSchema>;

export const ProjectCostEntrySchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  projectId: z.string().uuid(),
  costCodeId: z.string().uuid().nullable(),
  description: z.string(),
  costType: CostTypeSchema,
  quantity: z.coerce.number(),
  unitCost: z.coerce.number(),
  extendedCost: z.coerce.number(),
  incurredOn: z.coerce.date(),
  enteredById: z.string().uuid(),
  enteredByName: z.string(),
  createdAt: z.coerce.date(),
});

export type ProjectCostEntry = z.infer<typeof ProjectCostEntrySchema>;

export const ProjectCostEntryCreateSchema = z.object({
  costCodeId: z.string().uuid().optional(),
  description: z.string().min(1).max(500),
  costType: CostTypeSchema,
  quantity: z.coerce.number(),
  unitCost: z.coerce.number(),
  incurredOn: z.coerce.date(),
});

export type ProjectCostEntryCreate = z.infer<typeof ProjectCostEntryCreateSchema>;

export const ProjectCostEntryUpdateSchema = z.object({
  description: z.string().min(1).max(500).optional(),
  costType: CostTypeSchema.optional(),
  quantity: z.coerce.number().optional(),
  unitCost: z.coerce.number().optional(),
  incurredOn: z.coerce.date().optional(),
});

export type ProjectCostEntryUpdate = z.infer<typeof ProjectCostEntryUpdateSchema>;

export const ProjectMilestoneSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  projectId: z.string().uuid(),
  name: z.string(),
  dueDate: z.coerce.date().nullable(),
  completedAt: z.coerce.date().nullable(),
  sortOrder: z.number(),
});

export type ProjectMilestone = z.infer<typeof ProjectMilestoneSchema>;

export const ProjectMilestoneCreateSchema = z.object({
  name: z.string().min(1).max(300),
  dueDate: z.coerce.date().optional(),
});

export type ProjectMilestoneCreate = z.infer<typeof ProjectMilestoneCreateSchema>;

export const ProjectMilestoneUpdateSchema = z.object({
  name: z.string().min(1).max(300).optional(),
  dueDate: z.coerce.date().nullable().optional(),
  completedAt: z.coerce.date().nullable().optional(),
});

export type ProjectMilestoneUpdate = z.infer<typeof ProjectMilestoneUpdateSchema>;

export const ChangeOrderSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  projectId: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  status: ChangeOrderStatusSchema,
  amount: z.coerce.number(),
  scheduleImpactDays: z.number().nullable(),
  approvedAt: z.coerce.date().nullable(),
  createdById: z.string().uuid(),
  createdAt: z.coerce.date(),
});

export type ChangeOrder = z.infer<typeof ChangeOrderSchema>;

export const ChangeOrderCreateSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(10000).optional(),
  amount: z.coerce.number(),
  scheduleImpactDays: z.coerce.number().int().optional(),
});

export type ChangeOrderCreate = z.infer<typeof ChangeOrderCreateSchema>;

export const ChangeOrderStatusTransitionSchema = z.object({
  status: ChangeOrderStatusSchema,
});

export type ChangeOrderStatusTransition = z.infer<typeof ChangeOrderStatusTransitionSchema>;

const projectBudgetRollupSchema = z.object({
  budgetByType: z.record(CostTypeSchema, z.coerce.number()),
  actualByType: z.record(CostTypeSchema, z.coerce.number()),
  varianceByType: z.record(CostTypeSchema, z.coerce.number()),
  totalBudget: z.coerce.number(),
  totalActualCost: z.coerce.number(),
  totalVariance: z.coerce.number(),
  percentSpent: z.coerce.number(),
});

export type ProjectBudgetRollup = z.infer<typeof projectBudgetRollupSchema>;

export const ProjectWithDetailsSchema = ProjectSchema.extend({
  customerName: z.string(),
  projectManagerName: z.string().nullable(),
  createdByName: z.string(),
  budgetLines: ProjectBudgetLineSchema.array(),
  costEntries: ProjectCostEntrySchema.array(),
  milestones: ProjectMilestoneSchema.array(),
  changeOrders: ChangeOrderSchema.array(),
  rollup: projectBudgetRollupSchema,
});

export type ProjectWithDetails = z.infer<typeof ProjectWithDetailsSchema>;

export const ProjectHealthSummarySchema = z.object({
  activeCount: z.number(),
  totalBudget: z.coerce.number(),
  totalActualCost: z.coerce.number(),
  overBudgetCount: z.number(),
  upcomingMilestones: z
    .object({
      id: z.string().uuid(),
      name: z.string(),
      dueDate: z.coerce.date().nullable(),
      projectId: z.string().uuid(),
      projectName: z.string(),
      projectNumber: z.string(),
    })
    .array(),
});

export type ProjectHealthSummary = z.infer<typeof ProjectHealthSummarySchema>;
