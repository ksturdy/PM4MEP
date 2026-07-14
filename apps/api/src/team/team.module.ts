import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { EmailModule } from "../email/email.module";
import { TeamController } from "./team.controller";
import { InvitationsController } from "./invitations.controller";
import { TeamService } from "./team.service";

@Module({
  imports: [AuthModule, EmailModule],
  controllers: [TeamController, InvitationsController],
  providers: [TeamService],
})
export class TeamModule {}
