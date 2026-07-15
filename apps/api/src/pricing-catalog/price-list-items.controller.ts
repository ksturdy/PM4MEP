import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import {
  CatalogWebSearchRequestSchema,
  PriceListItemCreateSchema,
  PriceListItemFromWebResultCreateSchema,
  PriceListItemPhotoUploadUrlRequestSchema,
  PriceListItemSpecSheetUploadUrlRequestSchema,
  PriceListItemUpdateSchema,
} from "@pm4mep/shared-schema";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentAuth } from "../auth/current-auth.decorator";
import type { AuthContext } from "../auth/auth-context";
import { PriceListItemsService } from "./price-list-items.service";
import { CatalogWebSearchService } from "./catalog-web-search.service";

@Controller("price-list-items")
@UseGuards(JwtAuthGuard)
export class PriceListItemsController {
  constructor(
    private readonly priceListItems: PriceListItemsService,
    private readonly catalogWebSearch: CatalogWebSearchService,
  ) {}

  @Get()
  list(@CurrentAuth() auth: AuthContext, @Query("search") search?: string) {
    return this.priceListItems.list(auth.orgId, search);
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

  @Post("photo-upload-url")
  photoUploadUrl(@CurrentAuth() auth: AuthContext, @Body() body: unknown) {
    const parsed = PriceListItemPhotoUploadUrlRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.priceListItems.createPhotoUploadUrl(auth.orgId, parsed.data);
  }

  @Post("spec-sheet-upload-url")
  specSheetUploadUrl(@CurrentAuth() auth: AuthContext, @Body() body: unknown) {
    const parsed = PriceListItemSpecSheetUploadUrlRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.priceListItems.createSpecSheetUploadUrl(auth.orgId, parsed.data);
  }

  @Post("web-search")
  webSearch(@Body() body: unknown) {
    const parsed = CatalogWebSearchRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.catalogWebSearch.search(parsed.data.query);
  }

  @Post("from-web-result")
  createFromWebResult(@CurrentAuth() auth: AuthContext, @Body() body: unknown) {
    const parsed = PriceListItemFromWebResultCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.priceListItems.createFromWebResult(auth.orgId, parsed.data);
  }
}
