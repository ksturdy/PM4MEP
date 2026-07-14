import { BadRequestException, Body, Controller, Get, Patch, Post, UseGuards } from "@nestjs/common";
import { LogoUploadUrlRequestSchema, OrganizationUpdateSchema } from "@pm4mep/shared-schema";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentAuth } from "../auth/current-auth.decorator";
import type { AuthContext } from "../auth/auth-context";
import { OrganizationService } from "./organization.service";

// GET is open to any authenticated org member (same openness as
// GET /team/members); the two mutating routes below are Owner/Admin-only.
@Controller("organization")
@UseGuards(JwtAuthGuard)
export class OrganizationController {
  constructor(private readonly organization: OrganizationService) {}

  @Get()
  get(@CurrentAuth() auth: AuthContext) {
    return this.organization.get(auth.orgId);
  }

  @Patch()
  @UseGuards(RolesGuard)
  @Roles("Owner", "Admin")
  update(@CurrentAuth() auth: AuthContext, @Body() body: unknown) {
    const parsed = OrganizationUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.organization.update(auth.orgId, parsed.data);
  }

  @Post("logo-upload-url")
  @UseGuards(RolesGuard)
  @Roles("Owner", "Admin")
  logoUploadUrl(@CurrentAuth() auth: AuthContext, @Body() body: unknown) {
    const parsed = LogoUploadUrlRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.organization.createLogoUploadUrl(auth.orgId, parsed.data);
  }
}
