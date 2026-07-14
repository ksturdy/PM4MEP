// Pure slug base generation, split out from AuthService.uniqueSlug() so the
// string-transform logic (as opposed to the DB uniqueness loop around it)
// is unit-testable without a database.
export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 180);

  return base || "org";
}
