import { z } from "zod";

export const RegisterInputSchema = z.object({
  orgName: z.string().min(1).max(200),
  name: z.string().min(1).max(200),
  email: z.string().email(),
  password: z.string().min(8).max(200),
});

export type RegisterInput = z.infer<typeof RegisterInputSchema>;

export const LoginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
});

export type LoginInput = z.infer<typeof LoginInputSchema>;

export const ForgotPasswordInputSchema = z.object({
  email: z.string().email(),
});

export type ForgotPasswordInput = z.infer<typeof ForgotPasswordInputSchema>;

export const ResetPasswordInputSchema = z.object({
  password: z.string().min(8).max(200),
});

export type ResetPasswordInput = z.infer<typeof ResetPasswordInputSchema>;
