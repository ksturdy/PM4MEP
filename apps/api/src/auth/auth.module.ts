import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import type { SignOptions } from "jsonwebtoken";
import { EmailModule } from "../email/email.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { RolesGuard } from "./roles.guard";

@Module({
  imports: [
    EmailModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>("JWT_SECRET"),
        signOptions: {
          // jsonwebtoken's expiresIn type is a template-literal union (e.g.
          // "7d"), not plain `string` — env vars are always plain strings,
          // so the cast is just bridging that, not weakening real type safety.
          expiresIn: config.get<string>("JWT_EXPIRES_IN", "7d") as SignOptions["expiresIn"],
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, RolesGuard],
  // AuthService exported so TeamModule can reuse issueSession() when an
  // invite is accepted — same JWT-issuing logic as register()/login(),
  // no need to duplicate it.
  exports: [JwtModule, JwtAuthGuard, RolesGuard, AuthService],
})
export class AuthModule {}
