import { describe, expect, it } from "vitest";
import { calculateRent } from "./rent";

const base = { blockValue: 100, residential: 3, industrial: 2, hazard: "none" as const, bonus: "none" as const, skyscraper: false, monopolyTower: false };

describe("calculateRent", () => {
  it("sums blocks times value", () => expect(calculateRent(base).rent).toBe(500));
  it("hazard zeroes residential but keeps industrial", () =>
    expect(calculateRent({ ...base, hazard: "prison" }).rent).toBe(200));
  it("bonus building protects against hazard", () =>
    expect(calculateRent({ ...base, hazard: "prison", bonus: "Park" }).rent).toBe(500));
  it("skyscraper + tower doubles only once", () =>
    expect(calculateRent({ ...base, skyscraper: true, monopolyTower: true }).rent).toBe(1000));
  it("mortgage equals rent", () => expect(calculateRent({ ...base, skyscraper: true }).mortgage).toBe(1000));
  it("demolition is 500k per hazard block", () =>
    expect(calculateRent({ ...base, hazard: "sewage" }).demolitionCost).toBe(1500));
});
