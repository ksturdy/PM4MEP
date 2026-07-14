import { BadRequestException, Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { PriceListItemCreateSchema, PriceListItemUpdateSchema } from "@pm4mep/shared-schema";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentAuth } from "../auth/current-auth.decorator";
import type { AuthContext } from "../auth/auth-context";
import { PriceListItemsService } from "./price-list-items.service";

@Controller("price-list-items")
@UseGuards(JwtAuthGuard)
export class PriceListItemsController {
  constructor(private readonly priceListItems: PriceListItemsService) {}

  @Get()
  list(@CurrentAuth() auth: AuthContext) {
    return this.priceListItems.list(auth.orgId);
  }

  @Post()
  create(@CurrentAuth() auth: AuthContext, @Body() body: unknown) {
    const parsed = PriceListItemCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.priceListItems.create(auth.orgId, parsed.data);
  }

  @Patch(":id")
  update(@CurrentAuth() auth: AuthContext, @Param("id") id: string, @Body() body: unknown) {
    const parsed = PriceListItemUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.priceListItems.update(auth.orgId, id, parsed.data);
  }
}
