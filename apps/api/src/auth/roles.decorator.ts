import { SetMetadata } from "@nestjs/common";
import type { Role } from "@pm4mep/db";

export const ROLES_KEY = "roles";

// Marks a route as restricted to the given roles — read by RolesGuard.
// Apply alongside JwtAuthGuard (RolesGuard trusts req.auth.role, which only
// JwtAuthGuard sets), e.g. @UseGuards(JwtAuthGuard, RolesGuard) @Roles("Owner", "Admin").
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
