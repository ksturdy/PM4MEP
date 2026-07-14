import { mapStripeStatus } from "./subscription-status.util";

describe("mapStripeStatus", () => {
  it("maps every known Stripe status to its Prisma enum value", () => {
    expect(mapStripeStatus("incomplete")).toBe("Incomplete");
    expect(mapStripeStatus("incomplete_expired")).toBe("IncompleteExpired");
    expect(mapStripeStatus("trialing")).toBe("Trialing");
    expect(mapStripeStatus("active")).toBe("Active");
    expect(mapStripeStatus("past_due")).toBe("PastDue");
    expect(mapStripeStatus("canceled")).toBe("Canceled");
    expect(mapStripeStatus("unpaid")).toBe("Unpaid");
    expect(mapStripeStatus("paused")).toBe("Paused");
  });

  it("throws on an unmapped status instead of defaulting silently", () => {
    // @ts-expect-error - deliberately passing a value outside the known union
    expect(() => mapStripeStatus("some_future_status")).toThrow(/Unmapped Stripe subscription status/);
  });
});
