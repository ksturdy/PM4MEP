import { randomBytes } from "crypto";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { LogoUploadUrlRequest } from "@pm4mep/shared-schema";

const EXTENSIONS: Record<LogoUploadUrlRequest["contentType"], string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
};

// Presigned-URL uploads only — real credentials are expected to exist
// before this ships (the user is setting up the R2 bucket themselves), so
// this uses getOrThrow like BillingService's Stripe client, not
// EmailService's optional-SendGrid pattern.
@Injectable()
export class R2Service {
  private client: S3Client | undefined;

  constructor(private readonly config: ConfigService) {}

  private get s3(): S3Client {
    if (!this.client) {
      const accountId = this.config.getOrThrow<string>("R2_ACCOUNT_ID");
      this.client = new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: this.config.getOrThrow<string>("R2_ACCESS_KEY_ID"),
          secretAccessKey: this.config.getOrThrow<string>("R2_SECRET_ACCESS_KEY"),
        },
      });
    }
    return this.client;
  }

  async createLogoUploadUrl(
    orgId: string,
    contentType: LogoUploadUrlRequest["contentType"],
  ): Promise<{ uploadUrl: string; publicUrl: string }> {
    const bucket = this.config.getOrThrow<string>("R2_BUCKET_NAME");
    const publicBaseUrl = this.config.getOrThrow<string>("R2_PUBLIC_BASE_URL");

    const key = `org-logos/${orgId}/${Date.now()}-${randomBytes(8).toString("hex")}.${EXTENSIONS[contentType]}`;

    const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
    // Binding ContentType into the signed request means R2 rejects a PUT
    // whose actual Content-Type header doesn't match what was requested —
    // the client can't silently swap in an unapproved file type.
    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 300 });

    return { uploadUrl, publicUrl: `${publicBaseUrl.replace(/\/$/, "")}/${key}` };
  }
}
