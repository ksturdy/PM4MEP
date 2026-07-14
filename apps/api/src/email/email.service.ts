import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Resend } from "resend";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private client: Resend | undefined;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>("RESEND_API_KEY");
    if (apiKey) {
      this.client = new Resend(apiKey);
    }
  }

  // No getOrThrow here, unlike BillingService's Stripe client: an
  // environment with no way to email anyone shouldn't block inviting
  // teammates (same reasoning as billingEnabled in auth.service.ts — a
  // missing integration shouldn't lock anyone out of the feature it
  // supports). Falls back to logging the accept link so local dev and any
  // environment without RESEND_API_KEY configured still works end to end.
  async sendInviteEmail(input: { to: string; orgName: string; inviterName: string; acceptUrl: string }): Promise<void> {
    if (!this.client) {
      this.logger.warn(
        `RESEND_API_KEY not configured — skipping email. Invite link for ${input.to}: ${input.acceptUrl}`,
      );
      return;
    }

    // resend's .send() resolves with { data, error } on API-level failures
    // (bad from-address, unverified domain, etc.) rather than throwing —
    // only network-level failures throw. Not checking `error` here means a
    // rejected send looks identical to a successful one to every caller.
    const { data, error } = await this.client.emails.send({
      to: input.to,
      from: this.config.getOrThrow<string>("EMAIL_FROM"),
      subject: `${input.inviterName} invited you to join ${input.orgName} on PM4MEP`,
      text: `${input.inviterName} invited you to join ${input.orgName} on PM4MEP.\n\nAccept your invite: ${input.acceptUrl}`,
      html: `<p>${input.inviterName} invited you to join <strong>${input.orgName}</strong> on PM4MEP.</p><p><a href="${input.acceptUrl}">Accept your invite</a></p>`,
    });

    if (error) {
      this.logger.error(`Resend rejected invite email to ${input.to}: ${error.name} — ${error.message}`);
      throw new Error(`Failed to send invite email: ${error.message}`);
    }
    this.logger.log(`Invite email sent to ${input.to} (Resend id: ${data?.id})`);
  }
}
