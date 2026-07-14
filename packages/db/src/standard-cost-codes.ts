import type { Prisma } from "@prisma/client";

// Starter MCAA/NECA-style cost code list applied to every new org at
// registration time (see apps/api/src/auth/auth.service.ts's register()).
// Orgs can edit/add codes afterward; this is just the default starting set,
// not a fixed taxonomy.
export const STANDARD_COST_CODES: Array<
  Pick<Prisma.CostCodeCreateManyInput, "code" | "description" | "costType" | "defaultUnit">
> = [
  { code: "01-LAB-SHT", description: "Sheet Metal Labor", costType: "labor", defaultUnit: "hr" },
  { code: "02-LAB-PLM", description: "Plumbing Labor", costType: "labor", defaultUnit: "hr" },
  { code: "03-LAB-PIP", description: "Pipefitting Labor", costType: "labor", defaultUnit: "hr" },
  { code: "04-MAT-DCT", description: "Ductwork Material", costType: "material", defaultUnit: "lb" },
  { code: "05-MAT-PIP", description: "Piping Material", costType: "material", defaultUnit: "LF" },
  { code: "06-MAT-EQP", description: "Mechanical Equipment", costType: "material", defaultUnit: "ea" },
  { code: "07-EQP-RNT", description: "Equipment Rental", costType: "equipment", defaultUnit: "day" },
  { code: "08-SUB-INS", description: "Insulation Subcontract", costType: "subcontract", defaultUnit: "LS" },
  { code: "09-SUB-ELE", description: "Electrical Subcontract", costType: "subcontract", defaultUnit: "LS" },
  { code: "10-OTH-PER", description: "Permits & Fees", costType: "other", defaultUnit: "LS" },
];
