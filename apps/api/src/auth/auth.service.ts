import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { STANDARD_COST_CODES } from "@pm4mep/db";
import type { LoginInput, RegisterInput } from "@pm4mep/shared-schema";
import { PrismaService } from "../prisma/prisma.service";
import type { JwtPayload } from "./jwt-payload";
import { slugify } from "./slugify";

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
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

    return this.issueSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      org: membership.org,
      role: membership.role,
    });
  }

  async me(auth: { userId: string; orgId: string }) {
    const [user, org] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: auth.userId } }),
      this.prisma.organization.findUniqueOrThrow({ where: { id: auth.orgId } }),
    ]);
    return {
      user: { id: user.id, email: user.email, name: user.name },
      organization: { id: org.id, name: org.name, slug: org.slug },
    };
  }

  private issueSession(input: {
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
