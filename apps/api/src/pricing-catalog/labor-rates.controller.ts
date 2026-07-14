import { BadRequestException, Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { LaborRateCreateSchema, LaborRateUpdateSchema } from "@pm4mep/shared-schema";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentAuth } from "../auth/current-auth.decorator";
import type { AuthContext } from "../auth/auth-context";
import { LaborRatesService } from "./labor-rates.service";

@Controller("labor-rates")
@UseGuards(JwtAuthGuard)
export class LaborRatesController {
  constructor(private readonly laborRates: LaborRatesService) {}

  @Get()
  list(@CurrentAuth() auth: AuthContext) {
    return this.laborRates.list(auth.orgId);
  }

  @Post()
  create(@CurrentAuth() auth: AuthContext, @Body() body: unknown) {
    const parsed = LaborRateCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.laborRates.create(auth.orgId, parsed.data);
  }

  @Patch(":id")
  update(@CurrentAuth() auth: AuthContext, @Param("id") id: string, @Body() body: unknown) {
    const parsed = LaborRateUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.laborRates.update(auth.orgId, id, parsed.data);
  }
}
