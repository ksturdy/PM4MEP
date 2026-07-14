import { z } from "zod";
import { RoleSchema } from "./role.js";

export const InvitationSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  email: z.string().email(),
  role: RoleSchema,
  createdAt: z.coerce.date(),
  expiresAt: z.coerce.date(),
});

export type Invitation = z.infer<typeof InvitationSchema>;

export const InvitationCreateSchema = z.object({
  email: z.string().email(),
  role: RoleSchema,
});

export type InvitationCreate = z.infer<typeof InvitationCreateSchema>;

export const AcceptInvitationSchema = z.object({
  name: z.string().min(1).max(200),
  password: z.string().min(8).max(200),
});

export type AcceptInvitation = z.infer<typeof AcceptInvitationSchema>;
