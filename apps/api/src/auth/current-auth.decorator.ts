import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { AuthContext } from "./auth-context";

// Use only behind JwtAuthGuard, which guarantees req.auth is set.
export const CurrentAuth = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthContext => {
  const req = ctx.switchToHttp().getRequest<{ auth: AuthContext }>();
  return req.auth;
});
