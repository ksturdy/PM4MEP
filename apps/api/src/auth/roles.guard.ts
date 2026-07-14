import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { AuthContext } from "./auth-context";
import { ROLES_KEY } from "./roles.decorator";

// Must run after JwtAuthGuard, which is what actually sets req.auth — this
// guard only reads the role already decoded from the JWT, it doesn't verify
// identity itself. Routes with no @Roles() metadata are allowed through
// (this guard is opt-in per route, not a default-deny).
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowedRoles = this.reflector.get<string[] | undefined>(ROLES_KEY, context.getHandler());
    if (!allowedRoles || allowedRoles.length === 0) {
      return true;
    }

    const req = context.switchToHttp().getRequest<{ auth: AuthContext }>();
    if (!allowedRoles.includes(req.auth.role)) {
      throw new ForbiddenException("You don't have permission to perform this action");
    }
    return true;
  }
}
