import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcryptjs";
import type { Role } from "@pm4mep/db";
import type { AcceptInvitation, InvitationCreate } from "@pm4mep/shared-schema";
import { AuthService } from "../auth/auth.service";
import type { AuthContext } from "../auth/auth-context";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../email/email.service";
import { generateToken, hashToken } from "../auth/token.util";

const BCRYPT_ROUNDS = 10;
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class TeamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  listMembers(orgId: string) {
    return this.prisma.withTenant(orgId, (tx) =>
      tx.membership.findMany({
        where: { orgId },
        include: { user: { select: { id: true, name: true, email: true, lastLoginAt: true } } },
        orderBy: { createdAt: "asc" },
      }),
    );
  }

  async resetMemberPassword(orgId: string, membershipId: string) {
    const membership = await this.prisma.withTenant(orgId, (tx) => tx.membership.findUnique({ where: { id: membershipId } }));
    if (!membership || membership.orgId !== orgId) {
      throw new NotFoundException("Member not found");
    }
    await this.auth.triggerPasswordReset(membership.userId);
  }

  // Not withTenant — invitations aren't RLS-scoped (see schema.prisma), so
  // this filters by orgId directly, same double-safety pattern used for
  // RLS-scoped tables' service methods. tokenHash is never selected — no
  // reason for it to leave the API, even hashed.
  listPendingInvitations(orgId: string) {
    return this.prisma.invitation.findMany({
      where: { orgId, acceptedAt: null },
      select: { id: true, orgId: true, email: true, role: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async invite(auth: AuthContext, input: InvitationCreate) {
    const [org, inviter] = await Promise.all([
      this.prisma.organization.findUniqueOrThrow({ where: { id: auth.orgId } }),
      this.prisma.user.findUniqueOrThrow({ where: { id: auth.userId } }),
    ]);

    const existingUser = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existingUser) {
      const alreadyMember = await this.prisma.withTenant(auth.orgId, (tx) =>
        tx.membership.findFirst({ where: { userId: existingUser.id, orgId: auth.orgId } }),
      );
      if (alreadyMember) {
        throw new ConflictException("This person is already a member of your team");
      }
    }

    const { raw, hash } = generateToken();
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

    const invitation = await this.prisma.invitation.upsert({
      where: { orgId_email: { orgId: auth.orgId, email: input.email } },
      update: { role: input.role, tokenHash: hash, expiresAt, acceptedAt: null, invitedBy: auth.userId },
      create: {
        orgId: auth.orgId,
        email: input.email,
        role: input.role,
        tokenHash: hash,
        expiresAt,
        invitedBy: auth.userId,
      },
      select: { id: true, orgId: true, email: true, role: true, createdAt: true, expiresAt: true },
    });

    const acceptUrl = `${this.webAppOrigin}/accept-invite?token=${raw}`;
    await this.email.sendInviteEmail({ to: input.email, orgName: org.name, inviterName: inviter.name, acceptUrl });

    return invitation;
  }

  async revokeInvitation(orgId: string, id: string) {
    const result = await this.prisma.invitation.deleteMany({ where: { id, orgId } });
    if (result.count === 0) {
      throw new NotFoundException("Invitation not found");
    }
  }

  updateMemberRole(orgId: string, membershipId: string, role: Role) {
    return this.prisma.withTenant(orgId, async (tx) => {
      const membership = await tx.membership.findUnique({ where: { id: membershipId } });
      if (!membership || membership.orgId !== orgId) {
        throw new NotFoundException("Member not found");
      }
      if (membership.role === "Owner" && role !== "Owner") {
        const ownerCount = await tx.membership.count({ where: { orgId, role: "Owner" } });
        if (ownerCount <= 1) {
          throw new ConflictException("Cannot change the role of the organization's last Owner");
        }
      }
      return tx.membership.update({ where: { id: membershipId }, data: { role } });
    });
  }

  removeMember(orgId: string, membershipId: string) {
    return this.prisma.withTenant(orgId, async (tx) => {
      const membership = await tx.membership.findUnique({ where: { id: membershipId } });
      if (!membership || membership.orgId !== orgId) {
        throw new NotFoundException("Member not found");
      }
      if (membership.role === "Owner") {
        const ownerCount = await tx.membership.count({ where: { orgId, role: "Owner" } });
        if (ownerCount <= 1) {
          throw new ConflictException("Cannot remove the organization's last Owner");
        }
      }
      return tx.membership.delete({ where: { id: membershipId } });
    });
  }

  async getInvitationByToken(rawToken: string) {
    const invitation = await this.findValidInvitation(rawToken);
    const org = await this.prisma.organization.findUniqueOrThrow({ where: { id: invitation.orgId } });
    return { orgName: org.name, email: invitation.email, role: invitation.role };
  }

  async acceptInvitation(rawToken: string, input: AcceptInvitation) {
    const invitation = await this.findValidInvitation(rawToken);

    // Multi-org-per-user isn't supported end to end yet — login() always
    // resolves a user's *first* membership (see auth.service.ts), so
    // silently adding a second Membership here would leave the user unable
    // to reliably log into this org. Reject clearly instead of creating
    // that broken state.
    const existingUser = await this.prisma.user.findUnique({ where: { email: invitation.email } });
    if (existingUser) {
      throw new ConflictException(
        "An account with this email already exists — joining a second organization isn't supported yet",
      );
    }

    const org = await this.prisma.organization.findUniqueOrThrow({ where: { id: invitation.orgId } });
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

    const user = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { email: invitation.email, passwordHash, name: input.name } });
      await tx.$executeRaw`SELECT set_config('app.current_org_id', ${invitation.orgId}, true)`;
      await tx.membership.create({ data: { userId: user.id, orgId: invitation.orgId, role: invitation.role } });
      await tx.invitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date() } });
      return user;
    });

    return this.auth.issueSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      org: { id: org.id, name: org.name, slug: org.slug },
      role: invitation.role,
    });
  }

  private async findValidInvitation(rawToken: string) {
    const invitation = await this.prisma.invitation.findUnique({ where: { tokenHash: hashToken(rawToken) } });
    if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) {
      throw new NotFoundException("This invite link is invalid or has expired");
    }
    return invitation;
  }

  private get webAppOrigin(): string {
    // Same env var main.ts/billing.service.ts already read for CORS/Stripe
    // redirects — one fewer var to keep in sync between call sites.
    return (this.config.get<string>("WEB_APP_ORIGIN") ?? "http://localhost:3000").split(",")[0] ?? "http://localhost:3000";
  }
}
