import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ProjectsController } from "./projects.controller";
import { ProjectsService } from "./projects.service";

// Imports AuthModule so JwtAuthGuard's own JwtService dependency is
// resolvable here — see pricing-catalog.module.ts for the DI bug this
// avoids.
@Module({
  imports: [AuthModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
})
export class ProjectsModule {}
