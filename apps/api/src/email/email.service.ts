import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import sgMail from "@sendgrid/mail";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private configured = false;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>("SENDGRID_API_KEY");
    if (apiKey) {
      sgMail.setApiKey(apiKey);
      this.configured = true;
    }
  }

  // No getOrThrow here, unlike BillingService's Stripe client: an
  // environment with no way to email anyone shouldn't block inviting
  // teammates (same reasoning as billingEnabled in auth.service.ts — a
  // missing integration shouldn't lock anyone out of the feature it
  // supports). Falls back to logging the accept link so local dev and any
  // environment without SENDGRID_API_KEY configured still works end to end.
  async sendInviteEmail(input: { to: string; orgName: string; inviterName: string; acceptUrl: string }): Promise<void> {
    if (!this.configured) {
      this.logger.warn(
        `SENDGRID_API_KEY not configured — skipping email. Invite link for ${input.to}: ${input.acceptUrl}`,
      );
      return;
    }

    await sgMail.send({
      to: input.to,
      from: this.config.getOrThrow<string>("EMAIL_FROM"),
      subject: `${input.inviterName} invited you to join ${input.orgName} on PM4MEP`,
      text: `${input.inviterName} invited you to join ${input.orgName} on PM4MEP.\n\nAccept your invite: ${input.acceptUrl}`,
      html: `<p>${input.inviterName} invited you to join <strong>${input.orgName}</strong> on PM4MEP.</p><p><a href="${input.acceptUrl}">Accept your invite</a></p>`,
    });
  }
}
