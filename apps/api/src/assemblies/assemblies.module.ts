import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AssembliesController } from "./assemblies.controller";
import { AssembliesService } from "./assemblies.service";

// Imports AuthModule so JwtAuthGuard's own JwtService dependency is
// resolvable here — see pricing-catalog.module.ts for the DI bug this
// avoids.
@Module({
  imports: [AuthModule],
  controllers: [AssembliesController],
  providers: [AssembliesService],
})
export class AssembliesModule {}
