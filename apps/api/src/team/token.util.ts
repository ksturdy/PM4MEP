import { createHash, randomBytes } from "crypto";

// tokenHash (not the raw token) is what's stored — see the Invitation model
// comment in schema.prisma. The raw token only ever appears in the emailed
// accept-invite URL.
export function generateInviteToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("hex");
  return { raw, hash: hashInviteToken(raw) };
}

export function hashInviteToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}
