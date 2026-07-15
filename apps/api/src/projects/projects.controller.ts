import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ChangeOrderCreateSchema,
  ChangeOrderStatusTransitionSchema,
  ProjectBudgetLineManualCreateSchema,
  ProjectBudgetLineUpdateSchema,
  ProjectCostEntryCreateSchema,
  ProjectCostEntryUpdateSchema,
  ProjectCreateSchema,
  ProjectFromEstimateCreateSchema,
  ProjectMilestoneCreateSchema,
  ProjectMilestoneUpdateSchema,
  ProjectStatusTransitionSchema,
  ProjectUpdateSchema,
} from "@pm4mep/shared-schema";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentAuth } from "../auth/current-auth.decorator";
import type { AuthContext } from "../auth/auth-context";
import { ProjectsService } from "./projects.service";

// Read access (list/detail/health-summary) is open to any authenticated org
// member — Field/Accounting/Estimator all need visibility into project
// status and budget-vs-actual. Every budget-affecting or schedule-affecting
// mutation is gated to Owner/Admin/ProjectManager via RolesGuard, except
// cost-entry logging (POST/PATCH/DELETE .../cost-entries), which is left
// open to any member since that's where Field crews log actual costs.
@Controller("projects")
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get("health-summary")
  healthSummary(@CurrentAuth() auth: AuthContext) {
    return this.projects.healthSummary(auth.orgId);
  }

  @Get()
  list(@CurrentAuth() auth: AuthContext) {
    return this.projects.list(auth.orgId);
  }

  @Get(":id")
  getById(@CurrentAuth() auth: AuthContext, @Param("id") id: string) {
    return this.projects.getById(auth.orgId, id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles("Owner", "Admin", "ProjectManager")
  create(@CurrentAuth() auth: AuthContext, @Body() body: unknown) {
    const parsed = ProjectCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.projects.create(auth.orgId, auth.userId, parsed.data);
  }

  @Post("from-estimate/:estimateId")
  @UseGuards(RolesGuard)
  @Roles("Owner", "Admin", "ProjectManager")
  createFromEstimate(
    @CurrentAuth() auth: AuthContext,
    @Param("estimateId") estimateId: string,
    @Body() body: unknown,
  ) {
    const parsed = ProjectFromEstimateCreateSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.projects.createFromEstimate(auth.orgId, auth.userId, estimateId, parsed.data);
  }

  @Patch(":id")
  @UseGuards(RolesGuard)
  @Roles("Owner", "Admin", "ProjectManager")
  update(@CurrentAuth() auth: AuthContext, @Param("id") id: string, @Body() body: unknown) {
    const parsed = ProjectUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.projects.update(auth.orgId, id, parsed.data);
  }

  @Post(":id/status")
  @UseGuards(RolesGuard)
  @Roles("Owner", "Admin", "ProjectManager")
  transitionStatus(@CurrentAuth() auth: AuthContext, @Param("id") id: string, @Body() body: unknown) {
    const parsed = ProjectStatusTransitionSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.projects.transitionStatus(auth.orgId, id, parsed.data.status);
  }

  @Post(":id/budget-lines")
  @UseGuards(RolesGuard)
  @Roles("Owner", "Admin", "ProjectManager")
  addBudgetLine(@CurrentAuth() auth: AuthContext, @Param("id") id: string, @Body() body: unknown) {
    const parsed = ProjectBudgetLineManualCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.projects.addBudgetLine(auth.orgId, id, parsed.data);
  }

  @Patch(":id/budget-lines/:lineId")
  @UseGuards(RolesGuard)
  @Roles("Owner", "Admin", "ProjectManager")
  updateBudgetLine(
    @CurrentAuth() auth: AuthContext,
    @Param("id") id: string,
    @Param("lineId") lineId: string,
    @Body() body: unknown,
  ) {
    const parsed = ProjectBudgetLineUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.projects.updateBudgetLine(auth.orgId, id, lineId, parsed.data);
  }

  @Delete(":id/budget-lines/:lineId")
  @UseGuards(RolesGuard)
  @Roles("Owner", "Admin", "ProjectManager")
  removeBudgetLine(@CurrentAuth() auth: AuthContext, @Param("id") id: string, @Param("lineId") lineId: string) {
    return this.projects.removeBudgetLine(auth.orgId, id, lineId);
  }

  @Post(":id/cost-entries")
  addCostEntry(@CurrentAuth() auth: AuthContext, @Param("id") id: string, @Body() body: unknown) {
    const parsed = ProjectCostEntryCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.projects.addCostEntry(auth.orgId, id, auth.userId, parsed.data);
  }

  @Patch(":id/cost-entries/:entryId")
  updateCostEntry(
    @CurrentAuth() auth: AuthContext,
    @Param("id") id: string,
    @Param("entryId") entryId: string,
    @Body() body: unknown,
  ) {
    const parsed = ProjectCostEntryUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.projects.updateCostEntry(auth.orgId, id, entryId, parsed.data);
  }

  @Delete(":id/cost-entries/:entryId")
  removeCostEntry(@CurrentAuth() auth: AuthContext, @Param("id") id: string, @Param("entryId") entryId: string) {
    return this.projects.removeCostEntry(auth.orgId, id, entryId);
  }

  @Post(":id/milestones")
  @UseGuards(RolesGuard)
  @Roles("Owner", "Admin", "ProjectManager")
  addMilestone(@CurrentAuth() auth: AuthContext, @Param("id") id: string, @Body() body: unknown) {
    const parsed = ProjectMilestoneCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.projects.addMilestone(auth.orgId, id, parsed.data);
  }

  @Patch(":id/milestones/:milestoneId")
  @UseGuards(RolesGuard)
  @Roles("Owner", "Admin", "ProjectManager")
  updateMilestone(
    @CurrentAuth() auth: AuthContext,
    @Param("milestoneId") milestoneId: string,
    @Body() body: unknown,
  ) {
    const parsed = ProjectMilestoneUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.projects.updateMilestone(auth.orgId, milestoneId, parsed.data);
  }

  @Delete(":id/milestones/:milestoneId")
  @UseGuards(RolesGuard)
  @Roles("Owner", "Admin", "ProjectManager")
  removeMilestone(@CurrentAuth() auth: AuthContext, @Param("milestoneId") milestoneId: string) {
    return this.projects.removeMilestone(auth.orgId, milestoneId);
  }

  @Post(":id/change-orders")
  @UseGuards(RolesGuard)
  @Roles("Owner", "Admin", "ProjectManager")
  addChangeOrder(@CurrentAuth() auth: AuthContext, @Param("id") id: string, @Body() body: unknown) {
    const parsed = ChangeOrderCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.projects.addChangeOrder(auth.orgId, id, auth.userId, parsed.data);
  }

  @Post(":id/change-orders/:changeOrderId/status")
  @UseGuards(RolesGuard)
  @Roles("Owner", "Admin", "ProjectManager")
  transitionChangeOrderStatus(
    @CurrentAuth() auth: AuthContext,
    @Param("id") id: string,
    @Param("changeOrderId") changeOrderId: string,
    @Body() body: unknown,
  ) {
    const parsed = ChangeOrderStatusTransitionSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.projects.transitionChangeOrderStatus(auth.orgId, id, changeOrderId, parsed.data.status);
  }
}
