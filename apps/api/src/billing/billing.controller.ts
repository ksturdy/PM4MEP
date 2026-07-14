import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { CheckoutSessionInputSchema } from "@pm4mep/shared-schema";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentAuth } from "../auth/current-auth.decorator";
import type { AuthContext } from "../auth/auth-context";
import { BillingService } from "./billing.service";

@Controller("billing")
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Post("checkout-session")
  @UseGuards(JwtAuthGuard)
  checkoutSession(@CurrentAuth() auth: AuthContext, @Body() body: unknown) {
    const parsed = CheckoutSessionInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.billing.createCheckoutSession(auth.orgId, parsed.data.plan, parsed.data.billingCycle);
  }

  @Post("portal-session")
  @UseGuards(JwtAuthGuard)
  portalSession(@CurrentAuth() auth: AuthContext) {
    return this.billing.createPortalSession(auth.orgId);
  }

  // No JwtAuthGuard — authenticated by Stripe signature instead. rawBody is
  // populated by the content-type parser override in main.ts.
  @Post("webhook")
  async webhook(@Req() req: FastifyRequest, @Headers("stripe-signature") signature?: string) {
    if (!signature || !req.rawBody) {
      throw new BadRequestException("Missing Stripe signature or raw body");
    }
    try {
      await this.billing.handleWebhookEvent(req.rawBody, signature);
    } catch (err) {
      throw new BadRequestException(`Webhook signature verification failed: ${(err as Error).message}`);
    }
    return { received: true };
  }
}
