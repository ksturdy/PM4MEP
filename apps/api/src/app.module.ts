import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { HealthModule } from "./health/health.module";
import { AuthModule } from "./auth/auth.module";
import { PricingCatalogModule } from "./pricing-catalog/pricing-catalog.module";
import { CustomersModule } from "./customers/customers.module";
import { AssembliesModule } from "./assemblies/assemblies.module";
import { EstimatingModule } from "./estimating/estimating.module";
import { ProjectsModule } from "./projects/projects.module";
import { ProposalsModule } from "./proposals/proposals.module";
import { BillingModule } from "./billing/billing.module";
import { TeamModule } from "./team/team.module";
import { OrganizationModule } from "./organization/organization.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    AuthModule,
    PricingCatalogModule,
    CustomersModule,
    AssembliesModule,
    EstimatingModule,
    ProjectsModule,
    ProposalsModule,
    BillingModule,
    TeamModule,
    OrganizationModule,
  ],
})
export class AppModule {}
