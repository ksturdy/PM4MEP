import { createHash, randomBytes } from "crypto";

// Shared by invite tokens (team/) and password reset tokens (auth/) — both
// are "prove you received this exact emailed link" credentials. tokenHash
// (not the raw token) is what's stored in the database; the raw token only
// ever appears in the emailed URL.
export function generateToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("hex");
  return { raw, hash: hashToken(raw) };
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}
