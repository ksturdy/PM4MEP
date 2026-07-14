import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";

// Imports AuthModule so JwtAuthGuard's own JwtService dependency is
// resolvable here — see pricing-catalog.module.ts for the DI bug this
// avoids.
@Module({
  imports: [AuthModule],
  controllers: [BillingController],
  providers: [BillingService],
})
export class BillingModule {}
