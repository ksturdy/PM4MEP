import { ConflictException, Injectable, Logger, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { STANDARD_COST_CODES } from "@pm4mep/db";
import type { LoginInput, RegisterInput } from "@pm4mep/shared-schema";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../email/email.service";
import type { AuthContext } from "./auth-context";
import type { JwtPayload } from "./jwt-payload";
import { slugify } from "./slugify";
import { generateToken, hashToken } from "./token.util";

const BCRYPT_ROUNDS = 10;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly email: EmailService,
  ) {}

  async register(input: RegisterInput) {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new ConflictException("An account with this email already exists");
    }

    const slug = await this.uniqueSlug(input.orgName);
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

    // Organization + User + Membership + cost code seeding must all succeed
    // or all fail together — a partial failure previously left an orphaned
    // Organization/User with no Membership linking them (caught in local
    // testing: a mid-flow error left rows behind since org.create/user.create
    // ran outside any transaction). Membership/costCode are RLS-scoped, so
    // set_config still has to run inside this same transaction once org.id
    // is known — this can't just call withTenant(), which assumes the org
    // already exists before the transaction starts.
    const { org, user } = await this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({ data: { name: input.orgName, slug } });
      const user = await tx.user.create({ data: { email: input.email, passwordHash, name: input.name } });

      await tx.$executeRaw`SELECT set_config('app.current_org_id', ${org.id}, true)`;
      await tx.membership.create({ data: { userId: user.id, orgId: org.id, role: "Owner" } });
      await tx.costCode.createMany({
        data: STANDARD_COST_CODES.map((c) => ({ ...c, orgId: org.id })),
      });

      return { org, user };
    });

    return this.issueSession({ userId: user.id, email: user.email, name: user.name, org });
  }

  async login(input: LoginInput) {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    // Same generic error whether the email is unknown or the password is
    // wrong — distinguishing the two lets an attacker enumerate accounts.
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw new UnauthorizedException("Invalid email or password");
    }

    // MVP: a user has exactly one membership. Multi-org-per-user (the
    // schema already supports it) would need an org-selection step here.
    const membership = await this.prisma.membership.findFirst({
      where: { userId: user.id },
      include: { org: true },
    });
    if (!membership) {
      throw new UnauthorizedException("This account has no organization");
    }

    // Best-effort, not awaited into the response — a failed timestamp write
    // shouldn't block login. Fire-and-forget with its own error log instead.
    this.prisma.user
      .update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
      .catch((err: unknown) => this.logger.error("Failed to update lastLoginAt", err));

    return this.issueSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      org: membership.org,
      role: membership.role,
    });
  }

  async me(auth: AuthContext) {
    const [user, org] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: auth.userId } }),
      this.prisma.organization.findUniqueOrThrow({ where: { id: auth.orgId } }),
    ]);
    return {
      // (app)/layout.tsx's subscription gate only enforces when billing is
      // actually operational — without a Stripe key, every org (including
      // the seeded demo account) sits at subscriptionStatus "Incomplete"
      // forever with no way to complete checkout, which would otherwise
      // lock everyone out of an environment that was never configured to
      // charge anyone in the first place.
      billingEnabled: Boolean(this.config.get<string>("STRIPE_SECRET_KEY")),
      role: auth.role,
      user: { id: user.id, email: user.email, name: user.name },
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        plan: org.plan,
        subscriptionStatus: org.subscriptionStatus,
        logoUrl: org.logoUrl,
      },
    };
  }

  // Self-service "Forgot password?" entry point. Always resolves the same
  // way regardless of whether the email matched a user — distinguishing
  // the two would let an attacker enumerate accounts (same reasoning as
  // login()'s generic "Invalid email or password").
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return;
    await this.sendPasswordReset(user);
  }

  // Admin-triggered entry point (TeamService, Owner/Admin resetting a
  // teammate's password) — the caller already resolved and authorized the
  // userId, so no enumeration concern here.
  async triggerPasswordReset(userId: string): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    await this.sendPasswordReset(user);
  }

  async getPasswordResetEmail(rawToken: string): Promise<string> {
    const reset = await this.findValidPasswordReset(rawToken);
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: reset.userId } });
    return user.email;
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const reset = await this.findValidPasswordReset(rawToken);
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: reset.userId }, data: { passwordHash } }),
      this.prisma.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
    ]);
  }

  private async sendPasswordReset(user: { id: string; email: string }): Promise<void> {
    const { raw, hash } = generateToken();
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

    await this.prisma.passwordReset.create({ data: { userId: user.id, tokenHash: hash, expiresAt } });

    const resetUrl = `${this.webAppOrigin}/reset-password?token=${raw}`;
    await this.email.sendPasswordResetEmail({ to: user.email, resetUrl });
  }

  private async findValidPasswordReset(rawToken: string) {
    const reset = await this.prisma.passwordReset.findUnique({ where: { tokenHash: hashToken(rawToken) } });
    if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
      throw new NotFoundException("This password reset link is invalid or has expired");
    }
    return reset;
  }

  private get webAppOrigin(): string {
    // Same env var main.ts/billing.service.ts/team.service.ts already
    // read — one fewer var to keep in sync between call sites.
    return (this.config.get<string>("WEB_APP_ORIGIN") ?? "http://localhost:3000").split(",")[0] ?? "http://localhost:3000";
  }

  // Public: also called by TeamService when an invite is accepted, so
  // accepting an invite logs the new member in the same way register()/
  // login() do, without duplicating JWT-issuing logic.
  issueSession(input: {
    userId: string;
    email: string;
    name: string;
    org: { id: string; name: string; slug: string };
    role?: "Owner" | "Admin" | "Estimator" | "ProjectManager" | "Field" | "Accounting";
  }) {
    const payload: JwtPayload = {
      sub: input.userId,
      orgId: input.org.id,
      role: input.role ?? "Owner",
      email: input.email,
    };
    return {
      token: this.jwt.sign(payload),
      user: { id: input.userId, email: input.email, name: input.name },
      organization: { id: input.org.id, name: input.org.name, slug: input.org.slug },
    };
  }

  private async uniqueSlug(orgName: string): Promise<string> {
    const base = slugify(orgName);

    let candidate = base;
    let suffix = 1;
    while (await this.prisma.organization.findUnique({ where: { slug: candidate } })) {
      suffix += 1;
      candidate = `${base}-${suffix}`;
    }
    return candidate;
  }
}
