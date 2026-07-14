import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { AuthContext } from "./auth-context";
import type { JwtPayload } from "./jwt-payload";

// Verifies the Authorization: Bearer <token> header against our own JWT
// (issued by AuthService at login/register) and attaches req.auth. Apply
// per-controller/route — there's no public-vs-protected split handled by
// middleware here, since (unlike the old Clerk setup) every route needing
// identity needs this guard explicitly.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string | string[] | undefined>; auth?: AuthContext }>();

    const header = Array.isArray(req.headers.authorization)
      ? req.headers.authorization[0]
      : req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;

    if (!token) {
      throw new UnauthorizedException("Missing session token");
    }

    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
      req.auth = { userId: payload.sub, orgId: payload.orgId, role: payload.role, email: payload.email };
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired session token");
    }
  }
}
