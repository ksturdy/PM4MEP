import { randomBytes } from "crypto";
import { lookup } from "dns/promises";
import { isIP } from "net";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  CATALOG_PHOTO_CONTENT_TYPES,
  CATALOG_SPEC_SHEET_CONTENT_TYPES,
  type LogoUploadUrlRequest,
  type PriceListItemPhotoUploadUrlRequest,
  type PriceListItemSpecSheetUploadUrlRequest,
} from "@pm4mep/shared-schema";

const EXTENSIONS: Record<LogoUploadUrlRequest["contentType"], string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
};

const CATALOG_PHOTO_EXTENSIONS: Record<PriceListItemPhotoUploadUrlRequest["contentType"], string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
};

const CATALOG_SPEC_SHEET_EXTENSIONS: Record<PriceListItemSpecSheetUploadUrlRequest["contentType"], string> = {
  "application/pdf": "pdf",
};

const REHOST_FETCH_TIMEOUT_MS = 10_000;
const REHOST_MAX_BYTES = 10 * 1024 * 1024; // 10MB, covers both photos (~5MB) and spec sheets (~10MB)

// Presigned-URL uploads only — real credentials are expected to exist
// before this ships (the user is setting up the R2 bucket themselves), so
// this uses getOrThrow like BillingService's Stripe client, not
// EmailService's optional-SendGrid pattern.
@Injectable()
export class R2Service {
  private readonly logger = new Logger(R2Service.name);
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

  async createPriceListItemPhotoUploadUrl(
    orgId: string,
    contentType: PriceListItemPhotoUploadUrlRequest["contentType"],
  ): Promise<{ uploadUrl: string; publicUrl: string }> {
    const key = `price-list-items/${orgId}/photos/${Date.now()}-${randomBytes(8).toString("hex")}.${CATALOG_PHOTO_EXTENSIONS[contentType]}`;
    return this.presignPut(key, contentType);
  }

  async createPriceListItemSpecSheetUploadUrl(
    orgId: string,
    contentType: PriceListItemSpecSheetUploadUrlRequest["contentType"],
  ): Promise<{ uploadUrl: string; publicUrl: string }> {
    const key = `price-list-items/${orgId}/spec-sheets/${Date.now()}-${randomBytes(8).toString("hex")}.${CATALOG_SPEC_SHEET_EXTENSIONS[contentType]}`;
    return this.presignPut(key, contentType);
  }

  private async presignPut(key: string, contentType: string): Promise<{ uploadUrl: string; publicUrl: string }> {
    const bucket = this.config.getOrThrow<string>("R2_BUCKET_NAME");
    const publicBaseUrl = this.config.getOrThrow<string>("R2_PUBLIC_BASE_URL");

    const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 300 });

    return { uploadUrl, publicUrl: `${publicBaseUrl.replace(/\/$/, "")}/${key}` };
  }

  // Re-hosts a web-search-sourced photo/spec-sheet into our own R2 bucket
  // rather than linking the external URL directly — manufacturer/retailer
  // pages can restructure, remove the asset, or block hotlinking at any
  // time, which would silently break an already-sent customer proposal.
  // Returns null on any failure (bad host, wrong content-type, too large,
  // timeout) rather than throwing: a broken web-sourced image shouldn't
  // block creating the catalog item, since the estimator can still upload
  // one manually afterward.
  async uploadFromUrl(
    orgId: string,
    sourceUrl: string,
    kind: "photo" | "specSheet",
  ): Promise<string | null> {
    const allowedContentTypes: readonly string[] =
      kind === "photo" ? CATALOG_PHOTO_CONTENT_TYPES : CATALOG_SPEC_SHEET_CONTENT_TYPES;
    const extensions = kind === "photo" ? CATALOG_PHOTO_EXTENSIONS : CATALOG_SPEC_SHEET_EXTENSIONS;
    const keyPrefix = kind === "photo" ? "photos" : "spec-sheets";

    let parsed: URL;
    try {
      parsed = new URL(sourceUrl);
    } catch {
      this.logger.warn(`uploadFromUrl: not a valid URL`);
      return null;
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      this.logger.warn(`uploadFromUrl: rejected non-http(s) scheme ${parsed.protocol}`);
      return null;
    }

    const ssrfSafe = await this.isSsrfSafeHost(parsed.hostname);
    if (!ssrfSafe) {
      this.logger.warn(`uploadFromUrl: rejected host ${parsed.hostname} (private/loopback/link-local)`);
      return null;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REHOST_FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(parsed, { signal: controller.signal, redirect: "follow" });
      if (!response.ok || !response.body) {
        return null;
      }

      const contentType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
      if (!contentType || !allowedContentTypes.includes(contentType)) {
        return null;
      }

      const body = await this.readWithSizeCap(response.body, REHOST_MAX_BYTES);
      if (!body) {
        return null;
      }

      const ext = (extensions as Record<string, string>)[contentType];
      const key = `price-list-items/${orgId}/${keyPrefix}/${Date.now()}-${randomBytes(8).toString("hex")}.${ext}`;
      const bucket = this.config.getOrThrow<string>("R2_BUCKET_NAME");
      const publicBaseUrl = this.config.getOrThrow<string>("R2_PUBLIC_BASE_URL");

      await this.s3.send(
        new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }),
      );

      return `${publicBaseUrl.replace(/\/$/, "")}/${key}`;
    } catch (err) {
      this.logger.warn(`uploadFromUrl: fetch/upload failed: ${(err as Error).message}`);
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async readWithSizeCap(stream: ReadableStream<Uint8Array>, maxBytes: number): Promise<Buffer | null> {
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          total += value.byteLength;
          if (total > maxBytes) {
            await reader.cancel();
            return null;
          }
          chunks.push(value);
        }
      }
    } finally {
      reader.releaseLock();
    }
    return Buffer.concat(chunks);
  }

  // Resolves the hostname and rejects private/loopback/link-local/unspecified
  // addresses — a best-effort SSRF guard against a server-side fetch of a
  // URL sourced from an LLM's web search results (external, semi-trusted
  // input). Does not pin the resolved address for the subsequent fetch, so
  // it does not fully close a DNS-rebinding race; acceptable here since this
  // flow is triggered by authenticated estimators, not public/anonymous
  // input.
  private async isSsrfSafeHost(hostname: string): Promise<boolean> {
    if (hostname.toLowerCase() === "localhost") return false;

    let address: string;
    let family: number;
    if (isIP(hostname)) {
      address = hostname;
      family = isIP(hostname);
    } else {
      try {
        const result = await lookup(hostname);
        address = result.address;
        family = result.family;
      } catch {
        return false;
      }
    }

    return family === 4 ? !this.isPrivateIpv4(address) : !this.isPrivateIpv6(address);
  }

  private isPrivateIpv4(address: string): boolean {
    const octets = address.split(".").map(Number);
    if (octets.length !== 4 || octets.some((o) => Number.isNaN(o))) return true;
    const [a, b] = octets as [number, number, number, number];
    if (a === 0) return true; // 0.0.0.0/8
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 127) return true; // 127.0.0.0/8 loopback
    if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a >= 224) return true; // multicast/reserved
    return false;
  }

  private isPrivateIpv6(address: string): boolean {
    const normalized = address.toLowerCase();
    if (normalized === "::1") return true; // loopback
    if (normalized === "::") return true; // unspecified
    if (normalized.startsWith("fe80:")) return true; // link-local
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // unique local (fc00::/7)
    if (normalized.startsWith("::ffff:")) {
      // IPv4-mapped IPv6 — validate the embedded IPv4 address too
      return this.isPrivateIpv4(normalized.replace("::ffff:", ""));
    }
    return false;
  }
}
