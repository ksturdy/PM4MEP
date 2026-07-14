import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AssemblyComponentCreateSchema, AssemblyCreateSchema, AssemblyUpdateSchema } from "@pm4mep/shared-schema";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentAuth } from "../auth/current-auth.decorator";
import type { AuthContext } from "../auth/auth-context";
import { AssembliesService } from "./assemblies.service";

@Controller("assemblies")
@UseGuards(JwtAuthGuard)
export class AssembliesController {
  constructor(private readonly assemblies: AssembliesService) {}

  @Get()
  list(@CurrentAuth() auth: AuthContext) {
    return this.assemblies.list(auth.orgId);
  }

  @Get(":id")
  getById(@CurrentAuth() auth: AuthContext, @Param("id") id: string) {
    return this.assemblies.getById(auth.orgId, id);
  }

  @Post()
  create(@CurrentAuth() auth: AuthContext, @Body() body: unknown) {
    const parsed = AssemblyCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.assemblies.create(auth.orgId, parsed.data);
  }

  @Patch(":id")
  update(@CurrentAuth() auth: AuthContext, @Param("id") id: string, @Body() body: unknown) {
    const parsed = AssemblyUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.assemblies.update(auth.orgId, id, parsed.data);
  }

  @Post(":id/components")
  addComponent(@CurrentAuth() auth: AuthContext, @Param("id") id: string, @Body() body: unknown) {
    const parsed = AssemblyComponentCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.assemblies.addComponent(auth.orgId, id, parsed.data);
  }

  @Delete(":id/components/:componentId")
  removeComponent(@CurrentAuth() auth: AuthContext, @Param("componentId") componentId: string) {
    return this.assemblies.removeComponent(auth.orgId, componentId);
  }
}
