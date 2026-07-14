import type { Role } from "@pm4mep/db";

// Shape signed into the JWT at login/register. Kept intentionally small —
// a user with multiple org memberships (not yet supported by the register/
// login flow, but modeled in the schema for later) would need a re-issued
// token per active org rather than carrying every membership in one token.
export interface JwtPayload {
  sub: string; // userId
  orgId: string;
  role: Role;
  email: string;
}
