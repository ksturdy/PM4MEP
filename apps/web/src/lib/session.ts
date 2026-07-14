export const SESSION_COOKIE = "pm4mep_token";

// Shared cookie options between the login/register route handlers (which
// set this cookie) and logout (which clears it) — kept in one place so
// they can't drift out of sync.
export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};
