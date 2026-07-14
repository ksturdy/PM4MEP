import { z } from "zod";

// Public shape only — passwordHash never leaves the API.
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1).max(200),
  createdAt: z.coerce.date(),
});

export type User = z.infer<typeof UserSchema>;
