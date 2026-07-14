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
  EstimateCreateSchema,
  EstimateLineItemFromAssemblyCreateSchema,
  EstimateLineItemManualCreateSchema,
  EstimateLineItemUpdateSchema,
  EstimateSectionCreateSchema,
  EstimateStatusTransitionSchema,
  EstimateUpdateSchema,
} from "@pm4mep/shared-schema";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentAuth } from "../auth/current-auth.decorator";
import type { AuthContext } from "../auth/auth-context";
import { EstimatingService } from "./estimating.service";

@Controller("estimates")
@UseGuards(JwtAuthGuard)
export class EstimatingController {
  constructor(private readonly estimating: EstimatingService) {}

  @Get()
  list(@CurrentAuth() auth: AuthContext) {
    return this.estimating.list(auth.orgId);
  }

  @Get(":id")
  getById(@CurrentAuth() auth: AuthContext, @Param("id") id: string) {
    return this.estimating.getById(auth.orgId, id);
  }

  @Post()
  create(@CurrentAuth() auth: AuthContext, @Body() body: unknown) {
    const parsed = EstimateCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.estimating.create(auth.orgId, auth.userId, parsed.data);
  }

  @Patch(":id")
  update(@CurrentAuth() auth: AuthContext, @Param("id") id: string, @Body() body: unknown) {
    const parsed = EstimateUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.estimating.update(auth.orgId, id, parsed.data);
  }

  @Post(":id/status")
  transitionStatus(@CurrentAuth() auth: AuthContext, @Param("id") id: string, @Body() body: unknown) {
    const parsed = EstimateStatusTransitionSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.estimating.transitionStatus(auth.orgId, id, parsed.data.status);
  }

  @Post(":id/sections")
  addSection(@CurrentAuth() auth: AuthContext, @Param("id") id: string, @Body() body: unknown) {
    const parsed = EstimateSectionCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.estimating.addSection(auth.orgId, id, parsed.data);
  }

  @Patch(":id/sections/:sectionId")
  renameSection(
    @CurrentAuth() auth: AuthContext,
    @Param("sectionId") sectionId: string,
    @Body() body: unknown,
  ) {
    const parsed = EstimateSectionCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.estimating.renameSection(auth.orgId, sectionId, parsed.data.name);
  }

  @Delete(":id/sections/:sectionId")
  removeSection(
    @CurrentAuth() auth: AuthContext,
    @Param("id") id: string,
    @Param("sectionId") sectionId: string,
  ) {
    return this.estimating.removeSection(auth.orgId, id, sectionId);
  }

  @Post(":id/sections/:sectionId/line-items/manual")
  addManualLineItem(
    @CurrentAuth() auth: AuthContext,
    @Param("id") id: string,
    @Param("sectionId") sectionId: string,
    @Body() body: unknown,
  ) {
    const parsed = EstimateLineItemManualCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.estimating.addManualLineItem(auth.orgId, id, sectionId, parsed.data);
  }

  @Post(":id/sections/:sectionId/line-items/from-assembly")
  addFromAssembly(
    @CurrentAuth() auth: AuthContext,
    @Param("id") id: string,
    @Param("sectionId") sectionId: string,
    @Body() body: unknown,
  ) {
    const parsed = EstimateLineItemFromAssemblyCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.estimating.addFromAssembly(auth.orgId, id, sectionId, parsed.data);
  }

  @Patch(":id/line-items/:lineItemId")
  updateLineItem(
    @CurrentAuth() auth: AuthContext,
    @Param("id") id: string,
    @Param("lineItemId") lineItemId: string,
    @Body() body: unknown,
  ) {
    const parsed = EstimateLineItemUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.estimating.updateLineItem(auth.orgId, id, lineItemId, parsed.data);
  }

  @Delete(":id/line-items/:lineItemId")
  removeLineItem(
    @CurrentAuth() auth: AuthContext,
    @Param("id") id: string,
    @Param("lineItemId") lineItemId: string,
  ) {
    return this.estimating.removeLineItem(auth.orgId, id, lineItemId);
  }
}
