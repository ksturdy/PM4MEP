// Shared return shape for Server Actions that mutate data — a clean
// success/error result the calling client component can branch on, rather
// than throwing across the server/client boundary.
export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };
