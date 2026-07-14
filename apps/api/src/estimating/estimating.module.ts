import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { EstimatingController } from "./estimating.controller";
import { EstimatingService } from "./estimating.service";

// Imports AuthModule so JwtAuthGuard's own JwtService dependency is
// resolvable here — see pricing-catalog.module.ts for the DI bug this
// avoids.
@Module({
  imports: [AuthModule],
  controllers: [EstimatingController],
  providers: [EstimatingService],
})
export class EstimatingModule {}
