// Applies every prisma/rls/NNN_*.sql file, in filename order, via raw
// queries against DATABASE_URL. The .sql files' own header comments
// describe the old process (applied manually via psql) — this script makes
// the same idempotent SQL runnable wherever psql isn't installed. Safe to
// re-run: every statement is `drop policy if exists` / `alter table ...
// enable row level security`, both no-ops if already applied.
//
// Bypasses the Prisma CLI, so .env isn't auto-loaded — needs its own import.
import "dotenv/config";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const rlsDir = path.dirname(fileURLToPath(import.meta.url));

function splitStatements(sql: string): string[] {
  const withoutComments = sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  return withoutComments
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

async function main() {
  const prisma = new PrismaClient();
  const files = readdirSync(rlsDir)
    .filter((f) => /^\d+_.*\.sql$/.test(f))
    .sort();

  if (files.length === 0) {
    throw new Error(`No RLS SQL files found in ${rlsDir}`);
  }

  for (const file of files) {
    const sql = readFileSync(path.join(rlsDir, file), "utf8");
    const statements = splitStatements(sql);
    console.log(`Applying ${file} (${statements.length} statements)...`);
    for (const statement of statements) {
      await prisma.$executeRawUnsafe(statement);
    }
  }

  console.log(`Applied ${files.length} RLS file(s).`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
