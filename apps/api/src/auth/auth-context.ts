import type { Role } from "@pm4mep/db";

// Decoded from our own JWT (see auth.service.ts) by JwtAuthGuard and
// attached to the request. Unlike the earlier Clerk-based design, orgId
// here is already our internal Organization id — no external-id lookup
// needed, since we issue the token ourselves at login/register time.
export interface AuthContext {
  userId: string;
  orgId: string;
  role: Role;
  email: string;
}

declare module "fastify" {
  interface FastifyRequest {
    auth?: AuthContext;
  }
}
