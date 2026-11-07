export type ColorGroup = "brown" | "lightblue" | "pink" | "orange" | "red" | "yellow" | "green" | "darkblue";

export interface District {
  id: string;
  name: string;
  group: ColorGroup;
  /** Rent value per block, in thousands (k). */
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

const d = (name: string, group: ColorGroup, blockValue: number): District => ({
  id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  name,
  group,
  blockValue,
});

// 22 districts. Per-block values approximate the printed board.
export const DISTRICTS: District[] = [
  d("Old Kent Road", "brown", 50),
  d("Whitechapel Road", "brown", 50),
  d("The Angel Islington", "lightblue", 100),
  d("Euston Road", "lightblue", 100),
  d("Pentonville Road", "lightblue", 120),
  d("Pall Mall", "pink", 150),
  d("Whitehall", "pink", 150),
  d("Northumberland Ave", "pink", 160),
  d("Bow Street", "orange", 200),
  d("Marlborough Street", "orange", 200),
  d("Vine Street", "orange", 220),
  d("Strand", "red", 250),
  d("Fleet Street", "red", 250),
  d("Trafalgar Square", "red", 270),
  d("Leicester Square", "yellow", 300),
  d("Coventry Street", "yellow", 300),
  d("Piccadilly", "yellow", 320),
  d("Regent Street", "green", 350),
  d("Oxford Street", "green", 350),
  d("Bond Street", "green", 370),
  d("Park Lane", "darkblue", 400),
  d("Mayfair", "darkblue", 450),
];

export const MAX_BLOCKS = 8;
export const DEMOLITION_PER_BLOCK = 500; // k

export const HAZARDS = {
  none: { label: "None", blocks: 0 },
  rubbish: { label: "Rubbish Dump", blocks: 2 },
  sewage: { label: "Sewage Plant", blocks: 3 },
  power: { label: "Power Station", blocks: 3 },
  prison: { label: "Prison", blocks: 4 },
} as const;
export type HazardKey = keyof typeof HAZARDS;

export const BONUSES = ["none", "School", "Water Tower", "Wind Farm", "Park"] as const;
export type Bonus = (typeof BONUSES)[number];

export interface RentInput {
  blockValue: number;
  residential: number;
  industrial: number;
  hazard: HazardKey;
  bonus: Bonus;
  skyscraper: boolean;
  monopolyTower: boolean;
}

export interface RentResult {
  rent: number;
  mortgage: number;
  multiplier: 1 | 2;
  residentialCounted: number;
  hazardActive: boolean;
  demolitionCost: number;
}

export function calculateRent(i: RentInput): RentResult {
  const res = Math.max(0, i.residential);
  const ind = Math.max(0, i.industrial);
  const hazardActive = i.hazard !== "none" && i.bonus === "none";
  const residentialCounted = hazardActive ? 0 : res;
  const base = (residentialCounted + ind) * i.blockValue;
  // Skyscraper and Monopoly Tower never stack: doubles at most once.
  const multiplier: 1 | 2 = i.skyscraper || i.monopolyTower ? 2 : 1;
  const rent = base * multiplier;
  return {
    rent,
    mortgage: rent,
    multiplier,
    residentialCounted,
    hazardActive,
    demolitionCost: HAZARDS[i.hazard].blocks * DEMOLITION_PER_BLOCK,
  };
}

export function formatK(k: number): string {
  if (k >= 1000) return `M${(k / 1000).toFixed(k % 1000 === 0 ? 0 : 2).replace(/\.?0+$/, "")}`;
  return `M${k}k`;
}
