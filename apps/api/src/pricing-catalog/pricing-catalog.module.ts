import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { CostCodesController } from "./cost-codes.controller";
import { CostCodesService } from "./cost-codes.service";
import { PriceListItemsController } from "./price-list-items.controller";
import { PriceListItemsService } from "./price-list-items.service";
import { LaborRatesController } from "./labor-rates.controller";
import { LaborRatesService } from "./labor-rates.service";

// Imports AuthModule (not just the JwtAuthGuard class) so JwtAuthGuard's own
// JwtService dependency is resolvable in this module's DI scope — a guard
// referenced by class in @UseGuards() is instantiated within the importing
// module's provider graph, not reused from wherever it was originally
// registered. Every future module using JwtAuthGuard needs this same import.
@Module({
  imports: [AuthModule],
  controllers: [CostCodesController, PriceListItemsController, LaborRatesController],
  providers: [CostCodesService, PriceListItemsService, LaborRatesService],
})
export class PricingCatalogModule {}
