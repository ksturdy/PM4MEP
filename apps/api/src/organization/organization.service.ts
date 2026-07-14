import { Injectable } from "@nestjs/common";
import type { LogoUploadUrlRequest, OrganizationUpdate } from "@pm4mep/shared-schema";
import { PrismaService } from "../prisma/prisma.service";
import { R2Service } from "../storage/r2.service";

@Injectable()
export class OrganizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly r2: R2Service,
  ) {}

  // organizations isn't RLS-scoped (see schema.prisma) — this is a
  // lookup-by-known-id, same reasoning as every other direct
  // this.prisma.organization.* call in the codebase (e.g. AuthService.me).
  get(orgId: string) {
    return this.prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
  }

  update(orgId: string, input: OrganizationUpdate) {
    return this.prisma.organization.update({ where: { id: orgId }, data: input });
  }

  createLogoUploadUrl(orgId: string, input: LogoUploadUrlRequest) {
    return this.r2.createLogoUploadUrl(orgId, input.contentType);
  }
}
