import { z } from "zod";

export const RoleSchema = z.enum([
  "Owner",
  "Admin",
  "Estimator",
  "ProjectManager",
  "Field",
  "Accounting",
]);

export type Role = z.infer<typeof RoleSchema>;
