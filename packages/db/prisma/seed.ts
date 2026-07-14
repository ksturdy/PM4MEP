import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { STANDARD_COST_CODES } from "../src/standard-cost-codes.js";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "demo-password-123";

// Local dev convenience only: creates one demo org + owner user + the
// standard cost code list, so `pnpm --filter @pm4mep/db prisma:seed` gives
// you something to log into immediately. Not used in staging/production —
// real orgs are created via POST /auth/register.
async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: "demo-mechanical" },
    update: {},
    create: {
      name: "Demo Mechanical Contracting",
      slug: "demo-mechanical",
    },
  });

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const user = await prisma.user.upsert({
    where: { email: "owner@demo-mechanical.test" },
    update: {},
    create: {
      email: "owner@demo-mechanical.test",
      passwordHash,
      name: "Demo Owner",
    },
  });

  await prisma.membership.upsert({
    where: { userId_orgId: { userId: user.id, orgId: org.id } },
    update: {},
    create: { userId: user.id, orgId: org.id, role: "Owner" },
  });

  await prisma.costCode.createMany({
    data: STANDARD_COST_CODES.map((c) => ({ ...c, orgId: org.id })),
    skipDuplicates: true,
  });

  console.log(`Seeded org "${org.name}" (${org.id}) with ${STANDARD_COST_CODES.length} cost codes.`);
  console.log(`Demo login: ${user.email} / ${DEMO_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
