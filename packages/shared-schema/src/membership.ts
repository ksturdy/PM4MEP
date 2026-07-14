import { z } from "zod";
import { RoleSchema } from "./role.js";

export const MembershipSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  orgId: z.string().uuid(),
  role: RoleSchema,
  createdAt: z.coerce.date(),
});

export type Membership = z.infer<typeof MembershipSchema>;

export const MembershipCreateSchema = MembershipSchema.pick({
  userId: true,
  orgId: true,
  role: true,
});

export type MembershipCreate = z.infer<typeof MembershipCreateSchema>;
