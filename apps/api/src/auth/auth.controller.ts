import { BadRequestException, Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ForgotPasswordInputSchema, LoginInputSchema, RegisterInputSchema, ResetPasswordInputSchema } from "@pm4mep/shared-schema";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { CurrentAuth } from "./current-auth.decorator";
import type { AuthContext } from "./auth-context";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  register(@Body() body: unknown) {
    const parsed = RegisterInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.auth.register(parsed.data);
  }

  @Post("login")
  login(@Body() body: unknown) {
    const parsed = LoginInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.auth.login(parsed.data);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentAuth() auth: AuthContext) {
    return this.auth.me(auth);
  }

  // No JwtAuthGuard on these three — the requester has no session yet
  // (that's the whole point of a password reset), the emailed token is the
  // credential instead. Same pattern as InvitationsController.
  @Post("forgot-password")
  async forgotPassword(@Body() body: unknown) {
    const parsed = ForgotPasswordInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    await this.auth.requestPasswordReset(parsed.data.email);
    return { ok: true };
  }

  @Get("reset-password/:token")
  async getResetPasswordInfo(@Param("token") token: string) {
    const email = await this.auth.getPasswordResetEmail(token);
    return { email };
  }

  @Post("reset-password/:token")
  async resetPassword(@Param("token") token: string, @Body() body: unknown) {
    const parsed = ResetPasswordInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    await this.auth.resetPassword(token, parsed.data.password);
    return { ok: true };
  }
}
