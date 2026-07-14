import { z } from "zod";

export const OrganizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200),
  createdAt: z.coerce.date(),
});

export type Organization = z.infer<typeof OrganizationSchema>;
