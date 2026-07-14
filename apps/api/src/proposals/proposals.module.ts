import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ProposalsController } from "./proposals.controller";
import { ProposalsService } from "./proposals.service";

// Imports AuthModule so JwtAuthGuard's own JwtService dependency is
// resolvable here — see pricing-catalog.module.ts for the DI bug this
// avoids.
@Module({
  imports: [AuthModule],
  controllers: [ProposalsController],
  providers: [ProposalsService],
})
export class ProposalsModule {}
