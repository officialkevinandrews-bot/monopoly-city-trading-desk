export type ColorGroup =
  | "brown"
  | "lightblue"
  | "pink"
  | "orange"
  | "red"
  | "yellow"
  | "green"
  | "darkblue";

export type BoardEdition = "city" | "uk" | "us";

export interface District {
  id: string;
  /** Official district number on the Monopoly City board (1–22). */
  number: number;
  /** Default display name (Monopoly City official district name). */
  name: string;
  /** Official Monopoly City district name (Summergate .. Diamond Hills). */
  cityName: string;
  /** Classic UK Monopoly street equivalent (Old Kent Road .. Mayfair). */
  ukName: string;
  /** Classic US Monopoly street equivalent (Mediterranean Ave .. Boardwalk). */
  usName: string;
  group: ColorGroup;
  /** Board space index (0 = GO, 1..39 around the 40-space track). */
  boardSpaceIndex: number;
  /** Purchase price of the unowned district, in thousands (k). */
  price: number;
  /** Base land rent with 0 blocks built, in thousands (k). */
  landRent: number;
  /**
   * Official printed rent schedule for 0..8 blocks, in thousands (k).
   * Index 0 = Land Rent (0 blocks), Index 1..8 = 1..8 blocks.
   */
  rentSchedule: readonly [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  /** Cost per 1 Residential block, in thousands (k). */
  residentialCost: number;
  /** Cost per 1 Industrial block, in thousands (k). */
  industrialCost: number;
  /** Cost to build a Skyscraper on this district, in thousands (k). */
  skyscraperCost: number;
  /** Legacy per-block linear approximation (kept for backward compatibility). */
  blockValue: number;
}

export const GROUP_COLORS: Record<ColorGroup, string> = {
  brown: "oklch(0.45 0.08 50)",
  lightblue: "oklch(0.8 0.1 220)",
  pink: "oklch(0.65 0.2 340)",
  orange: "oklch(0.72 0.17 55)",
  red: "oklch(0.6 0.22 27)",
  yellow: "oklch(0.88 0.17 95)",
  green: "oklch(0.6 0.16 150)",
  darkblue: "oklch(0.45 0.15 265)",
};

export const GROUP_LABELS: Record<ColorGroup, string> = {
  brown: "Brown",
  lightblue: "Light Blue",
  pink: "Pink",
  orange: "Orange",
  red: "Red",
  yellow: "Yellow",
  green: "Green",
  darkblue: "Dark Blue",
};

export const COLOR_GROUPS: ColorGroup[] = [
  "brown",
  "lightblue",
  "pink",
  "orange",
  "red",
  "yellow",
  "green",
  "darkblue",
];

interface DistrictSeed {
  number: number;
  cityName: string;
  ukName: string;
  usName: string;
  group: ColorGroup;
  boardSpaceIndex: number;
  price: number;
  rentSchedule: readonly [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  residentialCost: number;
  industrialCost: number;
  skyscraperCost: number;
  blockValue: number;
}

const makeDistrict = (s: DistrictSeed): District => ({
  id: s.cityName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  number: s.number,
  name: s.cityName,
  cityName: s.cityName,
  ukName: s.ukName,
  usName: s.usName,
  group: s.group,
  boardSpaceIndex: s.boardSpaceIndex,
  price: s.price,
  landRent: s.rentSchedule[0],
  rentSchedule: s.rentSchedule,
  residentialCost: s.residentialCost,
  industrialCost: s.industrialCost,
  skyscraperCost: s.skyscraperCost,
  blockValue: s.blockValue,
});

/**
 * All 22 official Monopoly City districts with verbatim printed Title Deed stats.
 * Values are in thousands (k): e.g. 600 = M600k, 1500 = M1.5M, 20000 = M20M.
 */
export const DISTRICTS: District[] = [
  // 1. BROWN GROUP
  makeDistrict({
    number: 1,
    cityName: "Summergate",
    ukName: "Old Kent Road",
    usName: "Mediterranean Ave",
    group: "brown",
    boardSpaceIndex: 1,
    price: 600,
    rentSchedule: [20, 100, 200, 400, 800, 1600, 2200, 3000, 5500],
    residentialCost: 500,
    industrialCost: 1000,
    skyscraperCost: 2000,
    blockValue: 100,
  }),
  makeDistrict({
    number: 2,
    cityName: "Stoneside",
    ukName: "Whitechapel Road",
    usName: "Baltic Ave",
    group: "brown",
    boardSpaceIndex: 3,
    price: 600,
    rentSchedule: [40, 200, 400, 800, 1600, 2200, 3000, 4000, 7000],
    residentialCost: 500,
    industrialCost: 1000,
    skyscraperCost: 2000,
    blockValue: 200,
  }),

  // 2. LIGHT BLUE GROUP
  makeDistrict({
    number: 3,
    cityName: "Westlands",
    ukName: "The Angel Islington",
    usName: "Oriental Ave",
    group: "lightblue",
    boardSpaceIndex: 6,
    price: 1000,
    rentSchedule: [60, 300, 600, 1200, 1800, 2500, 3500, 5000, 7500],
    residentialCost: 500,
    industrialCost: 1000,
    skyscraperCost: 2000,
    blockValue: 300,
  }),
  makeDistrict({
    number: 4,
    cityName: "Bayview Dock",
    ukName: "Euston Road",
    usName: "Vermont Ave",
    group: "lightblue",
    boardSpaceIndex: 8,
    price: 1000,
    rentSchedule: [60, 300, 600, 1200, 1800, 2500, 3500, 5000, 7500],
    residentialCost: 500,
    industrialCost: 1000,
    skyscraperCost: 2000,
    blockValue: 300,
  }),
  makeDistrict({
    number: 5,
    cityName: "Brightside",
    ukName: "Pentonville Road",
    usName: "Connecticut Ave",
    group: "lightblue",
    boardSpaceIndex: 9,
    price: 1200,
    rentSchedule: [80, 400, 800, 1500, 2500, 3500, 4500, 6000, 8500],
    residentialCost: 500,
    industrialCost: 1000,
    skyscraperCost: 2000,
    blockValue: 400,
  }),

  // 3. PINK GROUP
  makeDistrict({
    number: 6,
    cityName: "Old Town",
    ukName: "Pall Mall",
    usName: "St. Charles Place",
    group: "pink",
    boardSpaceIndex: 11,
    price: 1400,
    rentSchedule: [100, 500, 1000, 2000, 3000, 4000, 5000, 6500, 9000],
    residentialCost: 1000,
    industrialCost: 2000,
    skyscraperCost: 3000,
    blockValue: 500,
  }),
  makeDistrict({
    number: 7,
    cityName: "Harbor Heights",
    ukName: "Whitehall",
    usName: "States Ave",
    group: "pink",
    boardSpaceIndex: 13,
    price: 1400,
    rentSchedule: [100, 500, 1000, 2000, 3000, 4000, 5000, 6500, 9000],
    residentialCost: 1000,
    industrialCost: 2000,
    skyscraperCost: 3000,
    blockValue: 500,
  }),
  makeDistrict({
    number: 8,
    cityName: "Central Quay",
    ukName: "Northumberland Ave",
    usName: "Virginia Ave",
    group: "pink",
    boardSpaceIndex: 14,
    price: 1600,
    rentSchedule: [120, 600, 1200, 2400, 3500, 4500, 5500, 7000, 9500],
    residentialCost: 1000,
    industrialCost: 2000,
    skyscraperCost: 3000,
    blockValue: 600,
  }),

  // 4. ORANGE GROUP
  makeDistrict({
    number: 9,
    cityName: "Shine Village",
    ukName: "Bow Street",
    usName: "St. James Place",
    group: "orange",
    boardSpaceIndex: 16,
    price: 1800,
    rentSchedule: [140, 700, 1400, 2800, 3800, 4800, 6000, 7500, 10000],
    residentialCost: 1000,
    industrialCost: 2000,
    skyscraperCost: 3000,
    blockValue: 700,
  }),
  makeDistrict({
    number: 10,
    cityName: "East Bank",
    ukName: "Marlborough Street",
    usName: "Tennessee Ave",
    group: "orange",
    boardSpaceIndex: 18,
    price: 1800,
    rentSchedule: [140, 700, 1400, 2800, 3800, 4800, 6000, 7500, 10000],
    residentialCost: 1000,
    industrialCost: 2000,
    skyscraperCost: 3000,
    blockValue: 700,
  }),
  makeDistrict({
    number: 11,
    cityName: "Treetop Park",
    ukName: "Vine Street",
    usName: "New York Ave",
    group: "orange",
    boardSpaceIndex: 19,
    price: 2000,
    rentSchedule: [160, 800, 1600, 3000, 4000, 5000, 6000, 8000, 11000],
    residentialCost: 1000,
    industrialCost: 2000,
    skyscraperCost: 3000,
    blockValue: 800,
  }),

  // 5. RED GROUP
  makeDistrict({
    number: 12,
    cityName: "Seaview",
    ukName: "Strand",
    usName: "Kentucky Ave",
    group: "red",
    boardSpaceIndex: 21,
    price: 2200,
    rentSchedule: [180, 900, 1800, 3500, 4500, 5500, 6500, 8500, 12000],
    residentialCost: 1500,
    industrialCost: 3000,
    skyscraperCost: 4000,
    blockValue: 900,
  }),
  makeDistrict({
    number: 13,
    cityName: "The Wharf",
    ukName: "Fleet Street",
    usName: "Indiana Ave",
    group: "red",
    boardSpaceIndex: 23,
    price: 2200,
    rentSchedule: [180, 900, 1800, 3500, 4500, 5500, 6500, 8500, 12000],
    residentialCost: 1500,
    industrialCost: 3000,
    skyscraperCost: 4000,
    blockValue: 900,
  }),
  makeDistrict({
    number: 14,
    cityName: "Middleton",
    ukName: "Trafalgar Square",
    usName: "Illinois Ave",
    group: "red",
    boardSpaceIndex: 24,
    price: 2400,
    rentSchedule: [200, 1000, 2000, 3800, 4800, 5800, 6800, 8800, 13500],
    residentialCost: 1500,
    industrialCost: 3000,
    skyscraperCost: 4000,
    blockValue: 1000,
  }),

  // 6. YELLOW GROUP
  makeDistrict({
    number: 15,
    cityName: "New Town",
    ukName: "Leicester Square",
    usName: "Atlantic Ave",
    group: "yellow",
    boardSpaceIndex: 26,
    price: 2600,
    rentSchedule: [220, 1100, 2200, 4000, 5000, 6000, 7000, 8000, 14000],
    residentialCost: 1500,
    industrialCost: 3000,
    skyscraperCost: 4000,
    blockValue: 1100,
  }),
  makeDistrict({
    number: 16,
    cityName: "Silver Harbor",
    ukName: "Coventry Street",
    usName: "Ventnor Ave",
    group: "yellow",
    boardSpaceIndex: 27,
    price: 2600,
    rentSchedule: [220, 1100, 2200, 4000, 5000, 6000, 7000, 10000, 14000],
    residentialCost: 1500,
    industrialCost: 3000,
    skyscraperCost: 4000,
    blockValue: 1100,
  }),
  makeDistrict({
    number: 17,
    cityName: "Central City",
    ukName: "Piccadilly",
    usName: "Marvin Gardens",
    group: "yellow",
    boardSpaceIndex: 29,
    price: 2800,
    rentSchedule: [240, 1200, 2400, 4200, 5200, 6200, 8200, 10500, 15000],
    residentialCost: 1500,
    industrialCost: 3000,
    skyscraperCost: 4000,
    blockValue: 1200,
  }),

  // 7. GREEN GROUP
  makeDistrict({
    number: 18,
    cityName: "Royal Court",
    ukName: "Regent Street",
    usName: "Pacific Ave",
    group: "green",
    boardSpaceIndex: 31,
    price: 3000,
    rentSchedule: [260, 1300, 2600, 4400, 5300, 6500, 8500, 11000, 15500],
    residentialCost: 2000,
    industrialCost: 4000,
    skyscraperCost: 5000,
    blockValue: 1300,
  }),
  makeDistrict({
    number: 19,
    cityName: "The Marina",
    ukName: "Oxford Street",
    usName: "North Carolina Ave",
    group: "green",
    boardSpaceIndex: 32,
    price: 3000,
    rentSchedule: [260, 1300, 2600, 4400, 5300, 6500, 8500, 11000, 15500],
    residentialCost: 2000,
    industrialCost: 4000,
    skyscraperCost: 5000,
    blockValue: 1300,
  }),
  makeDistrict({
    number: 20,
    cityName: "Riverside",
    ukName: "Bond Street",
    usName: "Pennsylvania Ave",
    group: "green",
    boardSpaceIndex: 34,
    price: 3200,
    rentSchedule: [280, 1500, 3000, 4500, 5500, 7000, 9000, 12000, 16000],
    residentialCost: 2000,
    industrialCost: 4000,
    skyscraperCost: 5000,
    blockValue: 1500,
  }),

  // 8. DARK BLUE GROUP
  makeDistrict({
    number: 21,
    cityName: "Fortune Valley",
    ukName: "Park Lane",
    usName: "Park Place",
    group: "darkblue",
    boardSpaceIndex: 37,
    price: 3500,
    rentSchedule: [350, 1750, 4500, 5500, 7000, 9000, 11000, 16000, 18000],
    residentialCost: 2000,
    industrialCost: 4000,
    skyscraperCost: 5000,
    blockValue: 1750,
  }),
  makeDistrict({
    number: 22,
    cityName: "Diamond Hills",
    ukName: "Mayfair",
    usName: "Boardwalk",
    group: "darkblue",
    boardSpaceIndex: 39,
    price: 4000,
    rentSchedule: [500, 3000, 5000, 8000, 10000, 12000, 15000, 18000, 20000],
    residentialCost: 2000,
    industrialCost: 4000,
    skyscraperCost: 5000,
    blockValue: 3000,
  }),
];

export function getDistrictName(d: District, edition: BoardEdition = "city"): string {
  if (edition === "uk") return d.ukName;
  if (edition === "us") return d.usName;
  return d.cityName;
}

export function getDistrictSubtitle(d: District, edition: BoardEdition = "city"): string {
  if (edition === "city") return `${d.ukName} / ${d.usName}`;
  return `#${d.number} ${d.cityName}`;
}

export const MAX_BLOCKS = 8;
export const DEMOLITION_PER_BLOCK = 500; // k
export const STADIUM_COST = 2000; // M2M
export const STADIUM_GO_BONUS = 1000; // +M1M per stadium when passing GO
export const BASE_GO_SALARY = 2000; // M2M base when passing GO
export const MONOPOLY_TOWER_COST = 7000; // M7M (or variable in auction, standard printed reference)
export const INDUSTRY_TAX_AMOUNT = 2000; // M2M if owning >= 1 industrial building
export const STARTING_CASH = 15000; // M15M official Monopoly City starting cash

export const HAZARDS = {
  none: { label: "None", blocks: 0, description: "No hazard on this district" },
  rubbish: {
    label: "Rubbish Dump",
    blocks: 2,
    description: "Occupies 2 blocks. Nullifies residential rent unless shielded by a Bonus building.",
  },
  sewage: {
    label: "Sewage Plant",
    blocks: 3,
    description: "Occupies 3 blocks. Nullifies residential rent (also triggers Toxic Waste Chance card).",
  },
  power: {
    label: "Power Station",
    blocks: 3,
    description: "Occupies 3 blocks. Nullifies residential rent unless shielded by a Bonus building.",
  },
  prison: {
    label: "Prison",
    blocks: 4,
    description: "Occupies 4 blocks. Massive hazard that nullifies residential rent.",
  },
} as const;
export type HazardKey = keyof typeof HAZARDS;

export const BONUSES = ["none", "School", "Water Tower", "Wind Farm", "Park"] as const;
export type Bonus = (typeof BONUSES)[number];

export const BONUS_BLOCKS: Record<Bonus, number> = {
  none: 0,
  School: 2,
  "Water Tower": 1,
  "Wind Farm": 3,
  Park: 2,
};

export interface RentInput {
  blockValue: number;
  /** Optional official 0..8 block rent schedule from the District card. */
  rentSchedule?: readonly number[];
  residential: number;
  industrial: number;
  hazard: HazardKey;
  bonus: Bonus;
  skyscraper: boolean;
  monopolyTower: boolean;
  mortgaged?: boolean;
}

export interface RentResult {
  /** Active rent owed when landing on this district, in thousands (k). 0 if mortgaged. */
  rent: number;
  /** Unmortgaged rent value (used for mortgage value & net-worth calculation). */
  unmortgagedRent: number;
  /** Mortgage value equals current rent value of the district. */
  mortgage: number;
  multiplier: 1 | 2;
  residentialCounted: number;
  effectiveBlocks: number;
  hazardActive: boolean;
  demolitionCost: number;
  /** Total physical blocks occupied on the 8-block district grid. */
  occupiedFootprint: number;
  remainingFootprint: number;
}

export function calculateRent(i: RentInput): RentResult {
  const res = Math.max(0, i.residential);
  const ind = Math.max(0, i.industrial);
  const hazardActive = i.hazard !== "none" && i.bonus === "none";
  const residentialCounted = hazardActive ? 0 : res;
  const effectiveBlocks = Math.min(MAX_BLOCKS, residentialCounted + ind);

  let base: number;
  if (i.rentSchedule && i.rentSchedule.length > effectiveBlocks) {
    base = i.rentSchedule[effectiveBlocks] ?? 0;
  } else {
    base = (residentialCounted + ind) * i.blockValue;
  }

  // Skyscraper and Monopoly Tower never stack: doubles at most once.
  const multiplier: 1 | 2 = i.skyscraper || i.monopolyTower ? 2 : 1;
  const unmortgagedRent = base * multiplier;
  const rent = i.mortgaged ? 0 : unmortgagedRent;

  const specialFootprint =
    i.hazard !== "none" ? HAZARDS[i.hazard].blocks : BONUS_BLOCKS[i.bonus];
  const occupiedFootprint = Math.min(MAX_BLOCKS, res + ind + specialFootprint);
  const remainingFootprint = Math.max(0, MAX_BLOCKS - (res + ind + specialFootprint));

  return {
    rent,
    unmortgagedRent,
    mortgage: unmortgagedRent,
    multiplier,
    residentialCounted,
    effectiveBlocks,
    hazardActive,
    demolitionCost: HAZARDS[i.hazard].blocks * DEMOLITION_PER_BLOCK,
    occupiedFootprint,
    remainingFootprint,
  };
}

export function formatK(k: number): string {
  const abs = Math.abs(k);
  const sign = k < 0 ? "-" : "";
  if (abs >= 1000) {
    return `${sign}M${(abs / 1000).toFixed(abs % 1000 === 0 ? 0 : 2).replace(/\.?0+$/, "")}M`;
  }
  return `${sign}M${abs}k`;
}
