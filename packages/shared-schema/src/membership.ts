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

// GET /team/members' shape: a Membership with the related User's public
// fields inlined, matching that endpoint's `include: { user: { select } }`.
export const TeamMemberSchema = MembershipSchema.extend({
  user: z.object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string().email(),
    lastLoginAt: z.coerce.date().nullable(),
  }),
});

export type TeamMember = z.infer<typeof TeamMemberSchema>;
