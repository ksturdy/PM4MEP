import { BadRequestException, Body, Controller, Get, Param, Post } from "@nestjs/common";
import { AcceptInvitationSchema } from "@pm4mep/shared-schema";
import { TeamService } from "./team.service";

// Deliberately no JwtAuthGuard — token-authenticated, not session-
// authenticated. The invitee has no account (or session) yet; the random
// token in the URL, emailed only to them, is the credential.
@Controller("invitations")
export class InvitationsController {
  constructor(private readonly team: TeamService) {}

  @Get(":token")
  get(@Param("token") token: string) {
    return this.team.getInvitationByToken(token);
  }

  @Post(":token/accept")
  accept(@Param("token") token: string, @Body() body: unknown) {
    const parsed = AcceptInvitationSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.team.acceptInvitation(token, parsed.data);
  }
}
