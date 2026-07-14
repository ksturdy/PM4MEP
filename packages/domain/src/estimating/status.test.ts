import { describe, expect, it } from "vitest";
import { canTransition } from "./status.js";

describe("canTransition", () => {
  it("allows Draft -> Submitted", () => {
    expect(canTransition("Draft", "Submitted")).toBe(true);
  });

  it("allows Submitted -> Won and Submitted -> Lost", () => {
    expect(canTransition("Submitted", "Won")).toBe(true);
    expect(canTransition("Submitted", "Lost")).toBe(true);
  });

  it("does not allow Draft -> Won directly", () => {
    expect(canTransition("Draft", "Won")).toBe(false);
  });

  it("allows reopening Won or Lost back to Draft", () => {
    expect(canTransition("Won", "Draft")).toBe(true);
    expect(canTransition("Lost", "Draft")).toBe(true);
  });

  it("does not allow a status to transition to itself", () => {
    expect(canTransition("Draft", "Draft")).toBe(false);
  });
});
