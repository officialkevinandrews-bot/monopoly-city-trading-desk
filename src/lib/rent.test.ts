import { describe, expect, it } from "vitest";
import { BOARD_SPACES, getSpaceShortName } from "./board-spaces";
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

  it("maps all 40 board spaces and all 22 districts accurately", () => {
    expect(BOARD_SPACES).toHaveLength(40);
    expect(BOARD_SPACES[0]?.kind).toBe("go");
    expect(BOARD_SPACES[10]?.kind).toBe("jail");
    expect(BOARD_SPACES[20]?.kind).toBe("free_parking");
    expect(BOARD_SPACES[30]?.kind).toBe("go_to_jail");
    expect(BOARD_SPACES[5]?.kind).toBe("planning");
    expect(BOARD_SPACES[15]?.kind).toBe("planning");
    expect(BOARD_SPACES[25]?.kind).toBe("planning");
    expect(BOARD_SPACES[35]?.kind).toBe("planning");
    expect(BOARD_SPACES[12]?.kind).toBe("auction");
    expect(BOARD_SPACES[28]?.kind).toBe("auction");
    expect(BOARD_SPACES[4]?.kind).toBe("industry_tax");
    expect(BOARD_SPACES[38]?.kind).toBe("industry_tax");

    const districtSpaces = BOARD_SPACES.filter((s) => s.kind === "district");
    expect(districtSpaces).toHaveLength(22);
    expect(getSpaceShortName(1, "city")).toBe("#1 Summergate");
    expect(getSpaceShortName(39, "city")).toBe("#22 Diamond Hills");
  });
});
