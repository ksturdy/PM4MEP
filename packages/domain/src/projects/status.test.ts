import { describe, expect, it } from "vitest";
import { canTransitionProject } from "./status.js";

describe("canTransitionProject", () => {
  it("allows Planning -> Active", () => {
    expect(canTransitionProject("Planning", "Active")).toBe(true);
  });

  it("allows Active -> OnHold, Complete, and Cancelled", () => {
    expect(canTransitionProject("Active", "OnHold")).toBe(true);
    expect(canTransitionProject("Active", "Complete")).toBe(true);
    expect(canTransitionProject("Active", "Cancelled")).toBe(true);
  });

  it("does not allow Planning -> Complete directly", () => {
    expect(canTransitionProject("Planning", "Complete")).toBe(false);
  });

  it("allows reopening Complete back to Active and Cancelled back to Planning", () => {
    expect(canTransitionProject("Complete", "Active")).toBe(true);
    expect(canTransitionProject("Cancelled", "Planning")).toBe(true);
  });

  it("does not allow Complete -> Planning directly", () => {
    expect(canTransitionProject("Complete", "Planning")).toBe(false);
  });

  it("does not allow a status to transition to itself", () => {
    expect(canTransitionProject("Active", "Active")).toBe(false);
  });
});
