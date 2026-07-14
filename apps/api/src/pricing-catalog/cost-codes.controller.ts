import { BadRequestException, Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { CostCodeCreateSchema, CostCodeUpdateSchema } from "@pm4mep/shared-schema";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentAuth } from "../auth/current-auth.decorator";
import type { AuthContext } from "../auth/auth-context";
import { CostCodesService } from "./cost-codes.service";

@Controller("cost-codes")
@UseGuards(JwtAuthGuard)
export class CostCodesController {
  constructor(private readonly costCodes: CostCodesService) {}

  @Get()
  list(@CurrentAuth() auth: AuthContext) {
    return this.costCodes.list(auth.orgId);
  }

  @Post()
  create(@CurrentAuth() auth: AuthContext, @Body() body: unknown) {
    const parsed = CostCodeCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.costCodes.create(auth.orgId, parsed.data);
  }

  @Patch(":id")
  update(@CurrentAuth() auth: AuthContext, @Param("id") id: string, @Body() body: unknown) {
    const parsed = CostCodeUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.costCodes.update(auth.orgId, id, parsed.data);
  }
}
