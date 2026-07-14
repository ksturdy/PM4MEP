import { slugify } from "./slugify";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Demo Mechanical Contracting")).toBe("demo-mechanical-contracting");
  });

  it("strips leading/trailing punctuation", () => {
    expect(slugify("  ACME & Sons, Inc.  ")).toBe("acme-sons-inc");
  });

  it("falls back to a default when nothing alphanumeric remains", () => {
    expect(slugify("!!!")).toBe("org");
  });
});
