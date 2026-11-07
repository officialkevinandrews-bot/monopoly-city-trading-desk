import { DISTRICTS, getDistrictName, type BoardEdition, type District } from "./rent";

export type SpecialSpaceKind =
  | "go"
  | "chance"
  | "industry_tax"
  | "planning"
  | "jail"
  | "auction"
  | "free_parking"
  | "go_to_jail";

export type BoardSpaceKind = "district" | SpecialSpaceKind;

export interface BoardSpace {
  index: number;
  kind: BoardSpaceKind;
  label: string;
  shortLabel: string;
  districtId?: string;
}

const districtBySpaceIndex = new Map<number, District>(
  DISTRICTS.map((d) => [d.boardSpaceIndex, d])
);

const SPECIAL_SPACES: Record<
  number,
  { kind: SpecialSpaceKind; label: string; shortLabel: string }
> = {
  0: { kind: "go", label: "GO (Collect M2M + Stadiums)", shortLabel: "GO" },
  2: { kind: "chance", label: "Chance (?)", shortLabel: "Chance" },
  4: { kind: "industry_tax", label: "Industry Tax (M2M)", shortLabel: "Ind. Tax" },
  5: {
    kind: "planning",
    label: "Planning Permission",
    shortLabel: "Planning",
  },
  7: { kind: "chance", label: "Chance (?)", shortLabel: "Chance" },
  10: {
    kind: "jail",
    label: "Just Visiting / In Jail",
    shortLabel: "Jail",
  },
  12: { kind: "auction", label: "Auction Space", shortLabel: "Auction" },
  15: {
    kind: "planning",
    label: "Planning Permission",
    shortLabel: "Planning",
  },
  17: { kind: "chance", label: "Chance (?)", shortLabel: "Chance" },
  20: {
    kind: "free_parking",
    label: "Free Parking (Rent Dodge)",
    shortLabel: "Free Parking",
  },
  22: { kind: "chance", label: "Chance (?)", shortLabel: "Chance" },
  25: {
    kind: "planning",
    label: "Planning Permission",
    shortLabel: "Planning",
  },
  28: { kind: "auction", label: "Auction Space", shortLabel: "Auction" },
  30: { kind: "go_to_jail", label: "Go To Jail!", shortLabel: "Go To Jail" },
  33: { kind: "chance", label: "Chance (?)", shortLabel: "Chance" },
  35: {
    kind: "planning",
    label: "Planning Permission",
    shortLabel: "Planning",
  },
  36: { kind: "chance", label: "Chance (?)", shortLabel: "Chance" },
  38: { kind: "industry_tax", label: "Industry Tax (M2M)", shortLabel: "Ind. Tax" },
};

/**
 * Complete 40-space clockwise track of Monopoly City (0 = GO .. 39 = Diamond Hills).
 */
export const BOARD_SPACES: BoardSpace[] = Array.from({ length: 40 }, (_, idx) => {
  const d = districtBySpaceIndex.get(idx);
  if (d) {
    return {
      index: idx,
      kind: "district",
      label: `#${d.number} ${d.cityName}`,
      shortLabel: `#${d.number} ${d.cityName}`,
      districtId: d.id,
    };
  }
  const sp = SPECIAL_SPACES[idx] ?? {
    kind: "chance" as const,
    label: "Chance (?)",
    shortLabel: "Chance",
  };
  return {
    index: idx,
    kind: sp.kind,
    label: sp.label,
    shortLabel: sp.shortLabel,
  };
});

export function getSpaceDisplayName(
  spaceIndex: number,
  edition: BoardEdition = "city"
): string {
  const space = BOARD_SPACES[((spaceIndex % 40) + 40) % 40]!;
  if (space.kind === "district" && space.districtId) {
    const d = DISTRICTS.find((x) => x.id === space.districtId);
    if (d) return `#${d.number} ${getDistrictName(d, edition)}`;
  }
  return space.label;
}

export function getSpaceShortName(
  spaceIndex: number,
  edition: BoardEdition = "city"
): string {
  const space = BOARD_SPACES[((spaceIndex % 40) + 40) % 40]!;
  if (space.kind === "district" && space.districtId) {
    const d = DISTRICTS.find((x) => x.id === space.districtId);
    if (d) return `#${d.number} ${getDistrictName(d, edition)}`;
  }
  return space.shortLabel;
}

