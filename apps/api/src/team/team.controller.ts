import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { InvitationCreateSchema, RoleSchema } from "@pm4mep/shared-schema";
import { z } from "zod";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentAuth } from "../auth/current-auth.decorator";
import type { AuthContext } from "../auth/auth-context";
import { TeamService } from "./team.service";

const UpdateRoleSchema = z.object({ role: RoleSchema });

// Membership listing is open to any authenticated org member (seeing who's
// on the team isn't sensitive); every mutating route below is additionally
// gated to Owner/Admin via RolesGuard.
@Controller("team")
@UseGuards(JwtAuthGuard)
export class TeamController {
  constructor(private readonly team: TeamService) {}

  @Get("members")
  listMembers(@CurrentAuth() auth: AuthContext) {
    return this.team.listMembers(auth.orgId);
  }

  @Get("invitations")
  @UseGuards(RolesGuard)
  @Roles("Owner", "Admin")
  listInvitations(@CurrentAuth() auth: AuthContext) {
    return this.team.listPendingInvitations(auth.orgId);
  }

  @Post("invitations")
  @UseGuards(RolesGuard)
  @Roles("Owner", "Admin")
  invite(@CurrentAuth() auth: AuthContext, @Body() body: unknown) {
    const parsed = InvitationCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.team.invite(auth, parsed.data);
  }

  @Delete("invitations/:id")
  @UseGuards(RolesGuard)
  @Roles("Owner", "Admin")
  revokeInvitation(@CurrentAuth() auth: AuthContext, @Param("id") id: string) {
    return this.team.revokeInvitation(auth.orgId, id);
  }

  @Patch("members/:id")
  @UseGuards(RolesGuard)
  @Roles("Owner", "Admin")
  updateRole(@CurrentAuth() auth: AuthContext, @Param("id") id: string, @Body() body: unknown) {
    const parsed = UpdateRoleSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.team.updateMemberRole(auth.orgId, id, parsed.data.role);
  }

  @Delete("members/:id")
  @UseGuards(RolesGuard)
  @Roles("Owner", "Admin")
  removeMember(@CurrentAuth() auth: AuthContext, @Param("id") id: string) {
    return this.team.removeMember(auth.orgId, id);
  }
}
