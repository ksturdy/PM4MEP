import { BadRequestException, Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { LoginInputSchema, RegisterInputSchema } from "@pm4mep/shared-schema";
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
}
