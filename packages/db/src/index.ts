import { PrismaClient } from "@prisma/client";

// One PrismaClient per process. In apps/api this is provided as a Nest
// singleton (see apps/api/src/prisma/prisma.service.ts) rather than
// imported directly, so request-scoped `SET LOCAL app.current_org_id`
// transactions (tenant.middleware.ts) go through Nest's DI-managed instance.
export const prisma = new PrismaClient();

export * from "@prisma/client";
export * from "./standard-cost-codes.js";
