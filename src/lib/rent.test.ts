import { describe, expect, it } from "vitest";
import { DISTRICTS, calculateRent, formatK } from "./rent";

const base = {
  blockValue: 100,
  residential: 3,
  industrial: 2,
  hazard: "none" as const,
  bonus: "none" as const,
  skyscraper: false,
  monopolyTower: false,
};

describe("calculateRent", () => {
  it("sums blocks times value when no rentSchedule is passed", () =>
    expect(calculateRent(base).rent).toBe(500));

  it("hazard zeroes residential but keeps industrial", () =>
    expect(calculateRent({ ...base, hazard: "prison" }).rent).toBe(200));

  it("bonus building protects against hazard", () =>
    expect(calculateRent({ ...base, hazard: "prison", bonus: "Park" }).rent).toBe(500));

  it("skyscraper + tower doubles only once", () =>
    expect(calculateRent({ ...base, skyscraper: true, monopolyTower: true }).rent).toBe(1000));

  it("mortgage equals rent", () =>
    expect(calculateRent({ ...base, skyscraper: true }).mortgage).toBe(1000));

  it("demolition is 500k per hazard block", () =>
    expect(calculateRent({ ...base, hazard: "sewage" }).demolitionCost).toBe(1500));

  it("uses official printed District rentSchedule including 0-block Land Rent", () => {
    const centralCity = DISTRICTS.find((d) => d.cityName === "Central City")!;
    // 0 blocks -> Land Rent M240k
    expect(
      calculateRent({
        ...base,
        residential: 0,
        industrial: 0,
        rentSchedule: centralCity.rentSchedule,
      }).rent
    ).toBe(240);

    // 8 blocks -> M15M (15000k)
    expect(
      calculateRent({
        ...base,
        residential: 5,
        industrial: 3,
        rentSchedule: centralCity.rentSchedule,
      }).rent
    ).toBe(15000);
  });

  it("returns 0 active rent when mortgaged while preserving mortgage value", () => {
    const diamondHills = DISTRICTS.find((d) => d.cityName === "Diamond Hills")!;
    const res = calculateRent({
      ...base,
      residential: 2,
      industrial: 0,
      rentSchedule: diamondHills.rentSchedule,
      mortgaged: true,
    });
    expect(res.rent).toBe(0);
    expect(res.mortgage).toBe(5000);
  });

  it("formats thousands and millions cleanly", () => {
    expect(formatK(240)).toBe("M240k");
    expect(formatK(1500)).toBe("M1.5M");
    expect(formatK(15000)).toBe("M15M");
  });
});
