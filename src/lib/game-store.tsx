import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  BOARD_SPACES,
  getSpaceDisplayName,
  type SpecialSpaceKind,
} from "./board-spaces";
import {
  BASE_GO_SALARY,
  COLOR_GROUPS,
  DEMOLITION_PER_BLOCK,
  DISTRICTS,
  HAZARDS,
  INDUSTRY_TAX_AMOUNT,
  MAX_BLOCKS,
  MONOPOLY_TOWER_COST,
  STADIUM_COST,
  STADIUM_GO_BONUS,
  STARTING_CASH,
  calculateRent,
  formatK,
  getDistrictName,
  type BoardEdition,
  type Bonus,
  type ColorGroup,
  type District,
  type HazardKey,
  type RentResult,
} from "./rent";

export interface PlayerState {
  id: string;
  name: string;
  color: string;
  /** Cash in thousands (k). Default 15000 = M15M. */
  cash: number;
  inJail: boolean;
  /** Current board space index (0 = GO .. 39 = Diamond Hills). */
  position: number;
  /** Consecutive doubles rolled this turn (3 -> Jail). */
  doublesStreak: number;
  /** Number of Stadiums owned (0..2 across all players). */
  stadiums: number;
  hasTaxDodge: boolean;
  hasGetOutOfJail: boolean;
}

export interface DistrictState {
  ownerId: string | null;
  residential: number;
  industrial: number;
  hazard: HazardKey;
  bonus: Bonus;
  skyscraper: boolean;
  monopolyTower: boolean;
  hasRailroad: boolean;
  mortgaged: boolean;
}

export type TurnStep = "start" | "land" | "build" | "done";
export type BankingMode = "digital" | "physical";
export type CompanionUiMode = "guided" | "dashboard";
export type OverlayModal = "none" | "scoreboard" | "rules" | "setup";

export interface DiceRollOutcome {
  playerId: string;
  d1: number;
  d2: number;
  total: number;
  isDoubles: boolean;
  threeDoublesJail: boolean;
  stayedInJail: boolean;
  leftJailWithDoubles: boolean;
  fromIndex: number;
  toIndex: number;
  passedGo: boolean;
  goToJailSpace: boolean;
}

export type InspectorTarget =
  | { type: "district"; districtId: string }
  | { type: "special"; spaceKind: SpecialSpaceKind; spaceIndex: number };

export interface GameLogEntry {
  id: string;
  time: string;
  text: string;
  type: "info" | "money" | "build" | "hazard" | "auction" | "turn";
}

export interface GameSnapshot {
  players: PlayerState[];
  districts: Record<string, DistrictState>;
  activePlayerIndex: number;
  turnNumber: number;
  turnStep: TurnStep;
  lastBuildRoll: "" | "1" | "2" | "3" | "r";
  blocksRemainingThisTurn: number;
  railroadEarnedThisTurn: boolean;
  lastDiceRoll: DiceRollOutcome | null;
  rentDodgeHolderId: string | null;
  bankingMode: BankingMode;
  edition: BoardEdition;
  uiMode: CompanionUiMode;
  sessionSeconds: number;
  timeUp: boolean;
  logs: GameLogEntry[];
}

export const PLAYER_COLORS = [
  "oklch(0.68 0.22 27)", // Red
  "oklch(0.72 0.17 235)", // Electric Blue
  "oklch(0.76 0.18 145)", // Emerald Green
  "oklch(0.84 0.17 85)", // Gold / Amber
  "oklch(0.7 0.2 315)", // Magenta / Purple
  "oklch(0.78 0.15 190)", // Cyan
];

function createInitialDistricts(): Record<string, DistrictState> {
  const map: Record<string, DistrictState> = {};
  for (const d of DISTRICTS) {
    map[d.id] = {
      ownerId: null,
      residential: 0,
      industrial: 0,
      hazard: "none",
      bonus: "none",
      skyscraper: false,
      monopolyTower: false,
      hasRailroad: false,
      mortgaged: false,
    };
  }
  return map;
}

function createInitialPlayers(count = 3): PlayerState[] {
  return Array.from({ length: count }, (_, idx) => ({
    id: `p${idx + 1}`,
    name: `Player ${idx + 1}`,
    color: PLAYER_COLORS[idx % PLAYER_COLORS.length]!,
    cash: STARTING_CASH,
    inJail: false,
    position: 0,
    doublesStreak: 0,
    stadiums: 0,
    hasTaxDodge: false,
    hasGetOutOfJail: false,
  }));
}

function createInitialSnapshot(): GameSnapshot {
  return {
    players: createInitialPlayers(3),
    districts: createInitialDistricts(),
    activePlayerIndex: 0,
    turnNumber: 1,
    turnStep: "start",
    lastBuildRoll: "",
    blocksRemainingThisTurn: 0,
    railroadEarnedThisTurn: false,
    lastDiceRoll: null,
    rentDodgeHolderId: null,
    bankingMode: "digital",
    edition: "city",
    uiMode: "guided",
    sessionSeconds: 0,
    timeUp: false,
    logs: [
      {
        id: "init",
        time: "00:00",
        text: "Welcome to Monopoly City! Tap ROLL DICE to begin Turn 1.",
        type: "info",
      },
    ],
  };
}

const STORAGE_KEY = "monopoly_city_companion_v3";

export interface ComputedDistrictInfo {
  district: District;
  state: DistrictState;
  owner: PlayerState | null;
  ownsFullColorGroup: boolean;
  groupHasSkyscraper: boolean;
  ownerHasMonopolyTower: boolean;
  rentResult: RentResult;
  playersHere: PlayerState[];
}

export interface ComputedPlayerStats {
  player: PlayerState;
  ownedDistricts: ComputedDistrictInfo[];
  totalDistrictRentValue: number;
  netWorth: number;
  industrialBlockCount: number;
  residentialBlockCount: number;
  completedColorGroups: ColorGroup[];
  canBuildMonopolyTower: boolean;
  ownsMonopolyTower: boolean;
  eligibleForStadium: boolean;
  goSalary: number;
}

interface GameStoreContextValue {
  state: GameSnapshot;
  selectedInspector: InspectorTarget;
  setSelectedInspector: (target: InspectorTarget) => void;
  activeModal: OverlayModal;
  setActiveModal: (modal: OverlayModal) => void;
  sessionRunning: boolean;
  setSessionRunning: (running: boolean | ((prev: boolean) => boolean)) => void;
  resetTimer: (startImmediately?: boolean) => void;
  canUndo: boolean;
  undo: () => void;
  resetGame: (options?: {
    playerNames?: string[];
    bankingMode?: BankingMode;
    edition?: BoardEdition;
  }) => void;
  setBankingMode: (mode: BankingMode) => void;
  setEdition: (edition: BoardEdition) => void;
  setUiMode: (mode: CompanionUiMode) => void;
  setTurnStep: (step: TurnStep) => void;
  nextTurn: (rolledDoubles?: boolean) => void;
  setActivePlayerIndex: (index: number) => void;
  commitDiceRoll: (d1: number, d2: number) => DiceRollOutcome;
  movePlayerToSpace: (
    playerId: string,
    targetSpaceIndex: number,
    collectGoIfPassed?: boolean
  ) => void;
  addPlayer: (name?: string) => void;
  removePlayer: (playerId: string) => void;
  updatePlayer: (playerId: string, patch: Partial<PlayerState>) => void;
  adjustCash: (playerId: string, deltaK: number, reason?: string) => void;
  transferCash: (fromId: string, toId: string, amountK: number, reason?: string) => void;
  passGo: (playerId: string) => void;
  payIndustryTax: (playerId: string, useTaxDodge?: boolean) => void;
  claimRentDodge: (playerId: string) => void;
  buyDistrict: (districtId: string, playerId: string, customPriceK?: number) => void;
  assignDistrictOwner: (districtId: string, ownerId: string | null) => void;
  updateDistrict: (districtId: string, patch: Partial<DistrictState>, logMsg?: string) => void;
  recordBuildSpin: (outcome: "1" | "2" | "3" | "r") => void;
  constructBlocks: (
    districtId: string,
    type: "residential" | "industrial",
    count: number,
    chargePlayer?: boolean
  ) => void;
  placeFreeRailroad: (districtId: string) => void;
  applyPlanningPermission: (
    districtId: string,
    kind: "bonus" | "hazard",
    value: Bonus | HazardKey
  ) => void;
  demolishHazard: (districtId: string) => void;
  buildSkyscraper: (districtId: string) => void;
  buildMonopolyTower: (districtId: string) => void;
  buyStadium: (playerId: string) => void;
  toggleMortgage: (districtId: string) => void;
  payRentOnDistrict: (
    districtId: string,
    payerId: string,
    useRentDodge?: boolean
  ) => void;
  getDistrictInfo: (districtId: string) => ComputedDistrictInfo;
  allDistrictInfos: ComputedDistrictInfo[];
  getPlayerStats: (playerId: string) => ComputedPlayerStats;
  allPlayerStats: ComputedPlayerStats[];
  totalStadiumsBuilt: number;
  monopolyTowerBuilt: boolean;
  totalRailroadsBuilt: number;
}

const GLOBAL_CTX_KEY = "__MONOPOLY_CITY_GAME_STORE_CTX__";
const globalStoreObj = globalThis as unknown as Record<
  string,
   ReturnType<typeof createContext<GameStoreContextValue | null>> | undefined
>;

const GameStoreContext =
  globalStoreObj[GLOBAL_CTX_KEY] ??
  (globalStoreObj[GLOBAL_CTX_KEY] =
    createContext<GameStoreContextValue | null>(null));

export function GameStoreProvider({ children }: { children: ReactNode }) {
  const existing = useContext(GameStoreContext);
  if (existing && typeof existing.commitDiceRoll === "function") {
    return <>{children}</>;
  }
  return <GameStoreProviderInner>{children}</GameStoreProviderInner>;
}

function GameStoreProviderInner({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameSnapshot>(() => {
    if (typeof window === "undefined") return createInitialSnapshot();
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return createInitialSnapshot();
      const parsed = JSON.parse(raw) as Partial<GameSnapshot>;
      const base = createInitialSnapshot();
      return {
        ...base,
        ...parsed,
        districts: { ...base.districts, ...(parsed.districts ?? {}) },
        players:
          Array.isArray(parsed.players) && parsed.players.length >= 2
            ? parsed.players.map((p, i) => ({
                ...base.players[0]!,
                ...p,
                color: p.color ?? PLAYER_COLORS[i % PLAYER_COLORS.length]!,
                position: typeof p.position === "number" ? p.position : 0,
                doublesStreak:
                  typeof p.doublesStreak === "number" ? p.doublesStreak : 0,
              }))
            : base.players,
      };
    } catch {
      return createInitialSnapshot();
    }
  });

  const [selectedInspector, setSelectedInspector] = useState<InspectorTarget>({
    type: "district",
    districtId: DISTRICTS[0]!.id,
  });
  const [activeModal, setActiveModal] = useState<OverlayModal>("none");
  const [history, setHistory] = useState<GameSnapshot[]>([]);
  const [sessionRunning, setSessionRunning] = useState(false);

  // Save to localStorage on change
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota issues
    }
  }, [state]);

  // 1-hour game timer tick
  useEffect(() => {
    if (!sessionRunning) return;
    const iv = window.setInterval(() => {
      setState((prev) => {
        const nextSec = prev.sessionSeconds + 1;
        if (nextSec >= 3600) {
          setSessionRunning(false);
          return {
            ...prev,
            sessionSeconds: 3600,
            timeUp: true,
          };
        }
        return { ...prev, sessionSeconds: nextSec };
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [sessionRunning]);

  const formatSessionTime = (sec: number) => {
    const mm = String(Math.floor(sec / 60)).padStart(2, "0");
    const ss = String(sec % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  };

  const commit = useCallback(
    (
      updater: (prev: GameSnapshot) => GameSnapshot,
      logEntry?: Omit<GameLogEntry, "id" | "time">
    ) => {
      setState((prev) => {
        setHistory((h) => [...h.slice(-19), prev]);
        const next = updater(prev);
        if (logEntry) {
          const entry: GameLogEntry = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            time: formatSessionTime(prev.sessionSeconds),
            ...logEntry,
          };
          return {
            ...next,
            logs: [entry, ...next.logs.slice(0, 49)],
          };
        }
        return next;
      });
    },
    []
  );

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const previous = h[h.length - 1]!;
      setState(previous);
      return h.slice(0, -1);
    });
  }, []);

  const resetTimer = useCallback((startImmediately = false) => {
    setState((prev) => ({
      ...prev,
      sessionSeconds: 0,
      timeUp: false,
    }));
    setSessionRunning(startImmediately);
  }, []);

  const resetGame = useCallback(
    (options?: {
      playerNames?: string[];
      bankingMode?: BankingMode;
      edition?: BoardEdition;
    }) => {
      setHistory([]);
      setSessionRunning(false);
      const base = createInitialSnapshot();
      const names =
        options?.playerNames && options.playerNames.length >= 2
          ? options.playerNames
          : ["Player 1", "Player 2", "Player 3"];
      const players: PlayerState[] = names.map((n, idx) => ({
        id: `p${idx + 1}`,
        name: n.trim() || `Player ${idx + 1}`,
        color: PLAYER_COLORS[idx % PLAYER_COLORS.length]!,
        cash: STARTING_CASH,
        inJail: false,
        position: 0,
        doublesStreak: 0,
        stadiums: 0,
        hasTaxDodge: false,
        hasGetOutOfJail: false,
      }));
      setState({
        ...base,
        players,
        bankingMode: options?.bankingMode ?? state.bankingMode,
        edition: options?.edition ?? state.edition,
        uiMode: state.uiMode,
      });
    },
    [state.bankingMode, state.edition, state.uiMode]
  );

  const setBankingMode = useCallback(
    (bankingMode: BankingMode) => {
      commit((prev) => ({ ...prev, bankingMode }));
    },
    [commit]
  );

  const setEdition = useCallback(
    (edition: BoardEdition) => {
      commit((prev) => ({ ...prev, edition }));
    },
    [commit]
  );

  const setUiMode = useCallback(
    (uiMode: CompanionUiMode) => {
      commit((prev) => ({ ...prev, uiMode }));
    },
    [commit]
  );

  const setTurnStep = useCallback((turnStep: TurnStep) => {
    setState((prev) => ({ ...prev, turnStep }));
  }, []);

  const setActivePlayerIndex = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      activePlayerIndex: Math.max(0, Math.min(prev.players.length - 1, index)),
      turnStep: "start",
      lastBuildRoll: "",
      blocksRemainingThisTurn: 0,
      railroadEarnedThisTurn: false,
      lastDiceRoll: null,
    }));
  }, []);

  const nextTurn = useCallback(
    (rolledDoubles = false) => {
      commit(
        (prev) => {
          const nextIdx = rolledDoubles
            ? prev.activePlayerIndex
            : (prev.activePlayerIndex + 1) % prev.players.length;
          return {
            ...prev,
            activePlayerIndex: nextIdx,
            turnNumber: rolledDoubles ? prev.turnNumber : prev.turnNumber + 1,
            turnStep: "start",
            lastBuildRoll: "",
            blocksRemainingThisTurn: 0,
            railroadEarnedThisTurn: false,
            lastDiceRoll: null,
            players: prev.players.map((p, idx) =>
              !rolledDoubles && idx === prev.activePlayerIndex
                ? { ...p, doublesStreak: 0 }
                : p
            ),
          };
        },
        {
          type: "turn",
          text: rolledDoubles
            ? `${state.players[state.activePlayerIndex]?.name ?? "Player"} rolled doubles — takes another turn!`
            : `Now up: ${
                state.players[(state.activePlayerIndex + 1) % state.players.length]
                  ?.name ?? "Next player"
              }`,
        }
      );
    },
    [commit, state.activePlayerIndex, state.players]
  );

  const selectSpaceInInspector = useCallback((spaceIndex: number) => {
    const sp = BOARD_SPACES[((spaceIndex % 40) + 40) % 40]!;
    if (sp.kind === "district" && sp.districtId) {
      setSelectedInspector({ type: "district", districtId: sp.districtId });
    } else if (sp.kind !== "district") {
      setSelectedInspector({
        type: "special",
        spaceKind: sp.kind,
        spaceIndex: sp.index,
      });
    }
  }, []);

  const getNextStepForSpace = useCallback(
    (spaceIndex: number, playerId: string, districtsMap: Record<string, DistrictState>): TurnStep => {
      const sp = BOARD_SPACES[((spaceIndex % 40) + 40) % 40]!;
      if (sp.kind === "go" || sp.kind === "jail") {
        return "build";
      }
      if (sp.kind === "go_to_jail") {
        return "done";
      }
      if (sp.kind === "district" && sp.districtId) {
        const dst = districtsMap[sp.districtId];
        if (!dst) return "land";
        if (dst.ownerId === playerId || (dst.ownerId && dst.mortgaged)) {
          return "build";
        }
        return "land";
      }
      return "land";
    },
    []
  );

  const commitDiceRoll = useCallback(
    (d1: number, d2: number): DiceRollOutcome => {
      if (state.turnStep !== "start" && state.lastDiceRoll) {
        return state.lastDiceRoll;
      }
      const activePlayer =
        state.players[state.activePlayerIndex] ?? state.players[0]!;
      const total = d1 + d2;
      const isDoubles = d1 === d2;
      const fromIndex = activePlayer.position ?? 0;

      // Case 1: Player is currently in Jail
      if (activePlayer.inJail) {
        if (isDoubles) {
          const toIndex = (10 + total) % 40;
          const nextStep = getNextStepForSpace(toIndex, activePlayer.id, state.districts);
          const outcome: DiceRollOutcome = {
            playerId: activePlayer.id,
            d1,
            d2,
            total,
            isDoubles: true,
            threeDoublesJail: false,
            stayedInJail: false,
            leftJailWithDoubles: true,
            fromIndex: 10,
            toIndex,
            passedGo: false,
            goToJailSpace: false,
          };
          commit(
            (prev) => ({
              ...prev,
              turnStep: nextStep,
              lastDiceRoll: outcome,
              players: prev.players.map((p) =>
                p.id === activePlayer.id
                  ? { ...p, inJail: false, position: toIndex, doublesStreak: 0 }
                  : p
              ),
            }),
            {
              type: "turn",
              text: `${activePlayer.name} rolled doubles (${d1}+${d2}=${total}) to escape Jail → landed on ${getSpaceDisplayName(toIndex, state.edition)}!`,
            }
          );
          selectSpaceInInspector(toIndex);
          return outcome;
        } else {
          const outcome: DiceRollOutcome = {
            playerId: activePlayer.id,
            d1,
            d2,
            total,
            isDoubles: false,
            threeDoublesJail: false,
            stayedInJail: true,
            leftJailWithDoubles: false,
            fromIndex: 10,
            toIndex: 10,
            passedGo: false,
            goToJailSpace: false,
          };
          commit(
            (prev) => ({
              ...prev,
              turnStep: "build",
              lastDiceRoll: outcome,
            }),
            {
              type: "turn",
              text: `${activePlayer.name} rolled ${d1}+${d2}=${total} in Jail (no doubles) — stays in Jail, may still press BUILD!`,
            }
          );
          selectSpaceInInspector(10);
          return outcome;
        }
      }

      // Case 2: 3rd consecutive doubles -> Go Directly to Jail!
      const nextStreak = isDoubles ? (activePlayer.doublesStreak ?? 0) + 1 : 0;
      if (nextStreak >= 3) {
        const outcome: DiceRollOutcome = {
          playerId: activePlayer.id,
          d1,
          d2,
          total,
          isDoubles: true,
          threeDoublesJail: true,
          stayedInJail: false,
          leftJailWithDoubles: false,
          fromIndex,
          toIndex: 10,
          passedGo: false,
          goToJailSpace: false,
        };
        commit(
          (prev) => ({
            ...prev,
            turnStep: "done",
            lastDiceRoll: outcome,
            players: prev.players.map((p) =>
              p.id === activePlayer.id
                ? { ...p, inJail: true, position: 10, doublesStreak: 0 }
                : p
            ),
          }),
          {
            type: "turn",
            text: `${activePlayer.name} rolled 3× DOUBLES in a row (${d1}+${d2}) — sent directly to JAIL!`,
          }
        );
        selectSpaceInInspector(10);
        return outcome;
      }

      // Case 3: Normal movement around the 40 spaces
      const rawTarget = fromIndex + total;
      const landedIndex = rawTarget % 40;
      const isGoToJail = landedIndex === 30;
      const finalIndex = isGoToJail ? 10 : landedIndex;
      const passedGo = !isGoToJail && rawTarget >= 40;
      const goSalary = BASE_GO_SALARY + activePlayer.stadiums * STADIUM_GO_BONUS;
      const nextStep = isGoToJail
        ? "done"
        : getNextStepForSpace(finalIndex, activePlayer.id, state.districts);

      const outcome: DiceRollOutcome = {
        playerId: activePlayer.id,
        d1,
        d2,
        total,
        isDoubles,
        threeDoublesJail: false,
        stayedInJail: false,
        leftJailWithDoubles: false,
        fromIndex,
        toIndex: finalIndex,
        passedGo,
        goToJailSpace: isGoToJail,
      };

      commit(
        (prev) => ({
          ...prev,
          turnStep: nextStep,
          lastDiceRoll: outcome,
          players: prev.players.map((p) => {
            if (p.id !== activePlayer.id) return p;
            return {
              ...p,
              position: finalIndex,
              inJail: isGoToJail ? true : p.inJail,
              doublesStreak: isGoToJail ? 0 : nextStreak,
              cash:
                passedGo && prev.bankingMode === "digital"
                  ? p.cash + goSalary
                  : p.cash,
            };
          }),
        }),
        {
          type: "turn",
          text: isGoToJail
            ? `${activePlayer.name} rolled ${d1}+${d2}=${total} → landed on GO TO JAIL!`
            : `${activePlayer.name} rolled ${d1}+${d2}=${total}${
                isDoubles ? " (DOUBLES!)" : ""
              } → ${getSpaceDisplayName(finalIndex, state.edition)}${
                passedGo ? ` (+${formatK(goSalary)} GO Salary!)` : ""
              }`,
        }
      );

      selectSpaceInInspector(finalIndex);
      return outcome;
    },
    [
      commit,
      getNextStepForSpace,
      selectSpaceInInspector,
      state.activePlayerIndex,
      state.districts,
      state.edition,
      state.lastDiceRoll,
      state.players,
      state.turnStep,
    ]
  );

  const movePlayerToSpace = useCallback(
    (
      playerId: string,
      targetSpaceIndex: number,
      collectGoIfPassed = false
    ) => {
      const normalized = ((targetSpaceIndex % 40) + 40) % 40;
      const player = state.players.find((p) => p.id === playerId);
      if (!player) return;
      const passedGo = collectGoIfPassed && normalized < player.position;
      const goSalary = BASE_GO_SALARY + player.stadiums * STADIUM_GO_BONUS;

      commit(
        (prev) => ({
          ...prev,
          players: prev.players.map((p) => {
            if (p.id !== playerId) return p;
            return {
              ...p,
              position: normalized,
              inJail: normalized === 30 ? true : p.inJail,
              cash:
                passedGo && prev.bankingMode === "digital"
                  ? p.cash + goSalary
                  : p.cash,
            };
          }),
        }),
        {
          type: "turn",
          text: `${player.name} moved to ${getSpaceDisplayName(
            normalized,
            state.edition
          )}${passedGo ? ` (+${formatK(goSalary)} GO)` : ""}`,
        }
      );
      selectSpaceInInspector(normalized);
    },
    [commit, selectSpaceInInspector, state.edition, state.players]
  );

  const addPlayer = useCallback(
    (name?: string) => {
      commit((prev) => {
        if (prev.players.length >= 6) return prev;
        const idx = prev.players.length;
        const newPlayer: PlayerState = {
          id: `p${Date.now().toString(36)}`,
          name: name?.trim() || `Player ${idx + 1}`,
          color: PLAYER_COLORS[idx % PLAYER_COLORS.length]!,
          cash: STARTING_CASH,
          inJail: false,
          position: 0,
          doublesStreak: 0,
          stadiums: 0,
          hasTaxDodge: false,
          hasGetOutOfJail: false,
        };
        return { ...prev, players: [...prev.players, newPlayer] };
      });
    },
    [commit]
  );

  const removePlayer = useCallback(
    (playerId: string) => {
      commit((prev) => {
        if (prev.players.length <= 2) return prev;
        const players = prev.players.filter((p) => p.id !== playerId);
        const districts: Record<string, DistrictState> = {};
        for (const [k, v] of Object.entries(prev.districts)) {
          districts[k] = v.ownerId === playerId ? { ...v, ownerId: null } : v;
        }
        return {
          ...prev,
          players,
          districts,
          activePlayerIndex: Math.min(prev.activePlayerIndex, players.length - 1),
          rentDodgeHolderId:
            prev.rentDodgeHolderId === playerId ? null : prev.rentDodgeHolderId,
        };
      });
    },
    [commit]
  );

  const updatePlayer = useCallback(
    (playerId: string, patch: Partial<PlayerState>) => {
      commit((prev) => ({
        ...prev,
        players: prev.players.map((p) => (p.id === playerId ? { ...p, ...patch } : p)),
      }));
    },
    [commit]
  );

  const adjustCash = useCallback(
    (playerId: string, deltaK: number, reason?: string) => {
      const pName = state.players.find((p) => p.id === playerId)?.name ?? "Player";
      commit(
        (prev) => ({
          ...prev,
          players: prev.players.map((p) =>
            p.id === playerId ? { ...p, cash: Math.max(0, p.cash + deltaK) } : p
          ),
        }),
        reason
          ? {
              type: "money",
              text: `${pName}: ${deltaK >= 0 ? "+" : ""}${formatK(deltaK)} (${reason})`,
            }
          : undefined
      );
    },
    [commit, state.players]
  );

  const transferCash = useCallback(
    (fromId: string, toId: string, amountK: number, reason?: string) => {
      const fromPlayer = state.players.find((p) => p.id === fromId);
      const toPlayer = state.players.find((p) => p.id === toId);
      commit(
        (prev) => ({
          ...prev,
          players: prev.players.map((p) => {
            if (p.id === fromId) return { ...p, cash: Math.max(0, p.cash - amountK) };
            if (p.id === toId) return { ...p, cash: p.cash + amountK };
            return p;
          }),
        }),
        {
          type: "money",
          text: `${fromPlayer?.name ?? "Player"} paid ${formatK(amountK)} to ${
            toPlayer?.name ?? "Player"
          }${reason ? ` (${reason})` : ""}`,
        }
      );
    },
    [commit, state.players]
  );

  // Compute all district information with group ownership, multipliers, and player tokens standing there
  const allDistrictInfos = useMemo<ComputedDistrictInfo[]>(() => {
    let monopolyTowerOwnerId: string | null = null;
    for (const d of DISTRICTS) {
      const st = state.districts[d.id];
      if (st?.monopolyTower && st.ownerId) {
        monopolyTowerOwnerId = st.ownerId;
      }
    }

    return DISTRICTS.map((district) => {
      const st = state.districts[district.id] ?? {
        ownerId: null,
        residential: 0,
        industrial: 0,
        hazard: "none" as const,
        bonus: "none" as const,
        skyscraper: false,
        monopolyTower: false,
        hasRailroad: false,
        mortgaged: false,
      };
      const owner = state.players.find((p) => p.id === st.ownerId) ?? null;

      const groupDistricts = DISTRICTS.filter((x) => x.group === district.group);
      const ownsFullColorGroup =
        Boolean(st.ownerId) &&
        groupDistricts.every((gd) => state.districts[gd.id]?.ownerId === st.ownerId);

      const groupHasSkyscraper =
        Boolean(st.ownerId) &&
        groupDistricts.some(
          (gd) =>
            state.districts[gd.id]?.ownerId === st.ownerId &&
            Boolean(state.districts[gd.id]?.skyscraper)
        );

      const ownerHasMonopolyTower =
        Boolean(st.ownerId) && monopolyTowerOwnerId === st.ownerId;

      const rentResult = calculateRent({
        blockValue: district.blockValue,
        rentSchedule: district.rentSchedule,
        residential: st.residential,
        industrial: st.industrial,
        hazard: st.hazard,
        bonus: st.bonus,
        skyscraper: st.skyscraper || groupHasSkyscraper,
        monopolyTower: st.monopolyTower || ownerHasMonopolyTower,
        mortgaged: st.mortgaged,
      });

      const playersHere = state.players.filter(
        (p) => p.position === district.boardSpaceIndex
      );

      return {
        district,
        state: st,
        owner,
        ownsFullColorGroup,
        groupHasSkyscraper,
        ownerHasMonopolyTower,
        rentResult,
        playersHere,
      };
    });
  }, [state.districts, state.players]);

  const getDistrictInfo = useCallback(
    (districtId: string): ComputedDistrictInfo => {
      return (
        allDistrictInfos.find((x) => x.district.id === districtId) ??
        allDistrictInfos[0]!
      );
    },
    [allDistrictInfos]
  );

  const allPlayerStats = useMemo<ComputedPlayerStats[]>(() => {
    return state.players.map((player) => {
      const ownedDistricts = allDistrictInfos.filter(
        (info) => info.state.ownerId === player.id
      );
      const totalDistrictRentValue = ownedDistricts.reduce(
        (sum, info) => sum + info.rentResult.rent,
        0
      );
      const netWorth = player.cash + totalDistrictRentValue;

      const industrialBlockCount = ownedDistricts.reduce(
        (sum, info) => sum + info.state.industrial,
        0
      );
      const residentialBlockCount = ownedDistricts.reduce(
        (sum, info) => sum + info.state.residential,
        0
      );

      const completedColorGroups = COLOR_GROUPS.filter((grp) => {
        const grpDistricts = DISTRICTS.filter((d) => d.group === grp);
        return grpDistricts.every(
          (d) => state.districts[d.id]?.ownerId === player.id
        );
      });

      const ownsMonopolyTower = ownedDistricts.some(
        (info) => info.state.monopolyTower
      );
      const canBuildMonopolyTower = completedColorGroups.length >= 2;
      const eligibleForStadium = ownedDistricts.length >= 2;
      const goSalary = BASE_GO_SALARY + player.stadiums * STADIUM_GO_BONUS;

      return {
        player,
        ownedDistricts,
        totalDistrictRentValue,
        netWorth,
        industrialBlockCount,
        residentialBlockCount,
        completedColorGroups,
        canBuildMonopolyTower,
        ownsMonopolyTower,
        eligibleForStadium,
        goSalary,
      };
    });
  }, [allDistrictInfos, state.districts, state.players]);

  const getPlayerStats = useCallback(
    (playerId: string): ComputedPlayerStats => {
      return (
        allPlayerStats.find((s) => s.player.id === playerId) ?? allPlayerStats[0]!
      );
    },
    [allPlayerStats]
  );

  const passGo = useCallback(
    (playerId: string) => {
      const stats = getPlayerStats(playerId);
      const salary = stats.goSalary;
      commit(
        (prev) => ({
          ...prev,
          players: prev.players.map((p) =>
            p.id === playerId && prev.bankingMode === "digital"
              ? { ...p, cash: p.cash + salary }
              : p
          ),
        }),
        {
          type: "money",
          text: `${stats.player.name} passed GO and collected ${formatK(salary)}${
            stats.player.stadiums > 0
              ? ` (M2M + ${stats.player.stadiums} Stadium bonus)`
              : ""
          }`,
        }
      );
    },
    [commit, getPlayerStats]
  );

  const payIndustryTax = useCallback(
    (playerId: string, useTaxDodge = false) => {
      const stats = getPlayerStats(playerId);
      if (stats.industrialBlockCount === 0) {
        commit(
          (prev) => ({
            ...prev,
            turnStep: prev.turnStep === "land" ? "build" : prev.turnStep,
          }),
          {
            type: "info",
            text: `${stats.player.name} landed on Industry Tax — owns 0 Industrial blocks, so pays M0!`,
          }
        );
        return;
      }
      if (useTaxDodge) {
        commit(
          (prev) => ({
            ...prev,
            turnStep: prev.turnStep === "land" ? "build" : prev.turnStep,
            players: prev.players.map((p) =>
              p.id === playerId ? { ...p, hasTaxDodge: false } : p
            ),
          }),
          {
            type: "info",
            text: `${stats.player.name} used Tax Dodge card to skip M2M Industry Tax!`,
          }
        );
        return;
      }
      commit(
        (prev) => ({
          ...prev,
          turnStep: prev.turnStep === "land" ? "build" : prev.turnStep,
          players: prev.players.map((p) =>
            p.id === playerId && prev.bankingMode === "digital"
              ? { ...p, cash: Math.max(0, p.cash - INDUSTRY_TAX_AMOUNT) }
              : p
          ),
        }),
        {
          type: "money",
          text: `${stats.player.name} paid ${formatK(INDUSTRY_TAX_AMOUNT)} Industry Tax (owns ${stats.industrialBlockCount} Industrial block${stats.industrialBlockCount === 1 ? "" : "s"})`,
        }
      );
    },
    [commit, getPlayerStats]
  );

  const claimRentDodge = useCallback(
    (playerId: string) => {
      const player = state.players.find((p) => p.id === playerId);
      const prevHolder = state.players.find(
        (p) => p.id === state.rentDodgeHolderId
      );
      commit(
        (prev) => ({
          ...prev,
          turnStep: prev.turnStep === "land" ? "build" : prev.turnStep,
          rentDodgeHolderId: playerId,
        }),
        {
          type: "info",
          text:
            prevHolder && prevHolder.id !== playerId
              ? `${player?.name ?? "Player"} landed on Free Parking and took the Rent Dodge card from ${prevHolder.name}!`
              : `${player?.name ?? "Player"} landed on Free Parking and claimed the Rent Dodge card!`,
        }
      );
    },
    [commit, state.players, state.rentDodgeHolderId]
  );

  const buyDistrict = useCallback(
    (districtId: string, playerId: string, customPriceK?: number) => {
      const info = getDistrictInfo(districtId);
      const buyer = state.players.find((p) => p.id === playerId);
      const cost = customPriceK ?? info.district.price;
      const isAuction = customPriceK !== undefined;

      commit(
        (prev) => ({
          ...prev,
          turnStep: prev.turnStep === "land" ? "build" : prev.turnStep,
          players: prev.players.map((p) =>
            p.id === playerId && prev.bankingMode === "digital"
              ? { ...p, cash: Math.max(0, p.cash - cost) }
              : p
          ),
          districts: {
            ...prev.districts,
            [districtId]: {
              ...prev.districts[districtId]!,
              ownerId: playerId,
            },
          },
        }),
        {
          type: isAuction ? "auction" : "money",
          text: `${buyer?.name ?? "Player"} ${
            isAuction ? "won auction for" : "bought"
          } #${info.district.number} ${getDistrictName(info.district, state.edition)} for ${formatK(cost)}`,
        }
      );
    },
    [commit, getDistrictInfo, state.edition, state.players]
  );

  const assignDistrictOwner = useCallback(
    (districtId: string, ownerId: string | null) => {
      const info = getDistrictInfo(districtId);
      const newOwner = state.players.find((p) => p.id === ownerId);
      commit(
        (prev) => ({
          ...prev,
          turnStep:
            prev.turnStep === "land" && ownerId !== null
              ? "build"
              : prev.turnStep,
          districts: {
            ...prev.districts,
            [districtId]: {
              ...prev.districts[districtId]!,
              ownerId,
            },
          },
        }),
        {
          type: "info",
          text: `${getDistrictName(info.district, state.edition)} assigned to ${
            newOwner?.name ?? "Unowned (Bank)"
          }`,
        }
      );
    },
    [commit, getDistrictInfo, state.edition, state.players]
  );

  const updateDistrict = useCallback(
    (districtId: string, patch: Partial<DistrictState>, logMsg?: string) => {
      commit(
        (prev) => ({
          ...prev,
          districts: {
            ...prev.districts,
            [districtId]: {
              ...prev.districts[districtId]!,
              ...patch,
            },
          },
        }),
        logMsg ? { type: "build", text: logMsg } : undefined
      );
    },
    [commit]
  );

  const recordBuildSpin = useCallback(
    (outcome: "1" | "2" | "3" | "r") => {
      const activePlayer = state.players[state.activePlayerIndex];
      commit(
        (prev) => ({
          ...prev,
          lastBuildRoll: outcome,
          blocksRemainingThisTurn:
            outcome === "r" ? 0 : parseInt(outcome, 10),
          railroadEarnedThisTurn: outcome === "r",
          turnStep: "build",
        }),
        {
          type: "build",
          text:
            outcome === "r"
              ? `${activePlayer?.name ?? "Player"} spun TRAIN on the Trading Unit — build 1 Free Railroad!`
              : `${activePlayer?.name ?? "Player"} spun ${outcome} on the Trading Unit — may build up to ${outcome} block${outcome === "1" ? "" : "s"}!`,
        }
      );
    },
    [commit, state.activePlayerIndex, state.players]
  );

  const constructBlocks = useCallback(
    (
      districtId: string,
      type: "residential" | "industrial",
      count: number,
      chargePlayer = true
    ) => {
      if (count <= 0) return;
      const info = getDistrictInfo(districtId);
      const currentTotal = info.state.residential + info.state.industrial;
      const allowedCount = Math.min(count, MAX_BLOCKS - currentTotal);
      if (allowedCount <= 0) return;

      const unitCost =
        type === "residential"
          ? info.district.residentialCost
          : info.district.industrialCost;
      const totalCost = unitCost * allowedCount;
      const ownerId = info.state.ownerId ?? state.players[state.activePlayerIndex]?.id;
      const ownerName =
        state.players.find((p) => p.id === ownerId)?.name ?? "Player";

      commit(
        (prev) => {
          const nextRemaining = Math.max(
            0,
            prev.blocksRemainingThisTurn - allowedCount
          );
          return {
            ...prev,
            blocksRemainingThisTurn: nextRemaining,
            turnStep:
              prev.turnStep === "build" &&
              prev.lastBuildRoll !== "" &&
              nextRemaining === 0
                ? "done"
                : prev.turnStep,
            players: prev.players.map((p) =>
              chargePlayer && prev.bankingMode === "digital" && p.id === ownerId
                ? { ...p, cash: Math.max(0, p.cash - totalCost) }
                : p
            ),
            districts: {
              ...prev.districts,
              [districtId]: {
                ...prev.districts[districtId]!,
                ownerId: info.state.ownerId ?? ownerId ?? null,
                residential:
                  type === "residential"
                    ? info.state.residential + allowedCount
                    : info.state.residential,
                industrial:
                  type === "industrial"
                    ? info.state.industrial + allowedCount
                    : info.state.industrial,
              },
            },
          };
        },
        {
          type: "build",
          text: `${ownerName} built ${allowedCount} ${
            type === "residential" ? "Residential" : "Industrial"
          } block${allowedCount === 1 ? "" : "s"} on ${getDistrictName(
            info.district,
            state.edition
          )} (${formatK(totalCost)})`,
        }
      );
    },
    [commit, getDistrictInfo, state.activePlayerIndex, state.edition, state.players]
  );

  const placeFreeRailroad = useCallback(
    (districtId: string) => {
      const info = getDistrictInfo(districtId);
      commit(
        (prev) => ({
          ...prev,
          railroadEarnedThisTurn: false,
          turnStep: prev.turnStep === "build" ? "done" : prev.turnStep,
          districts: {
            ...prev.districts,
            [districtId]: {
              ...prev.districts[districtId]!,
              hasRailroad: true,
            },
          },
        }),
        {
          type: "build",
          text: `Placed a Free Railroad on #${info.district.number} ${getDistrictName(
            info.district,
            state.edition
          )}!`,
        }
      );
    },
    [commit, getDistrictInfo, state.edition]
  );

  const applyPlanningPermission = useCallback(
    (
      districtId: string,
      kind: "bonus" | "hazard",
      value: Bonus | HazardKey
    ) => {
      const info = getDistrictInfo(districtId);
      if (kind === "bonus") {
        const bonusVal = value as Bonus;
        commit(
          (prev) => ({
            ...prev,
            turnStep: prev.turnStep === "land" ? "build" : prev.turnStep,
            districts: {
              ...prev.districts,
              [districtId]: {
                ...prev.districts[districtId]!,
                bonus: bonusVal,
              },
            },
          }),
          {
            type: "build",
            text: `Planning Permission: Built ${bonusVal} (Bonus Shield) on ${getDistrictName(
              info.district,
              state.edition
            )}!`,
          }
        );
      } else {
        const hazardVal = value as HazardKey;
        if (info.state.bonus !== "none" && hazardVal !== "none") {
          return;
        }
        commit(
          (prev) => ({
            ...prev,
            turnStep: prev.turnStep === "land" ? "build" : prev.turnStep,
            districts: {
              ...prev.districts,
              [districtId]: {
                ...prev.districts[districtId]!,
                hazard: hazardVal,
              },
            },
          }),
          {
            type: "hazard",
            text:
              hazardVal === "none"
                ? `Cleared hazard on ${getDistrictName(info.district, state.edition)}`
                : `Planning Permission Sabotage! Placed ${HAZARDS[hazardVal].label} (${HAZARDS[hazardVal].blocks} blocks) on ${getDistrictName(
                    info.district,
                    state.edition
                  )}!`,
          }
        );
      }
    },
    [commit, getDistrictInfo, state.edition]
  );

  const demolishHazard = useCallback(
    (districtId: string) => {
      const info = getDistrictInfo(districtId);
      if (info.state.hazard === "none") return;
      const cost = HAZARDS[info.state.hazard].blocks * DEMOLITION_PER_BLOCK;
      const ownerId = info.state.ownerId;
      const ownerName =
        state.players.find((p) => p.id === ownerId)?.name ?? "Owner";

      commit(
        (prev) => ({
          ...prev,
          players: prev.players.map((p) =>
            prev.bankingMode === "digital" && p.id === ownerId
              ? { ...p, cash: Math.max(0, p.cash - cost) }
              : p
          ),
          districts: {
            ...prev.districts,
            [districtId]: {
              ...prev.districts[districtId]!,
              hazard: "none",
            },
          },
        }),
        {
          type: "build",
          text: `${ownerName} demolished ${
            HAZARDS[info.state.hazard].label
          } on ${getDistrictName(info.district, state.edition)} for ${formatK(cost)}`,
        }
      );
    },
    [commit, getDistrictInfo, state.edition, state.players]
  );

  const buildSkyscraper = useCallback(
    (districtId: string) => {
      const info = getDistrictInfo(districtId);
      const cost = info.district.skyscraperCost;
      const ownerId =
        info.state.ownerId ?? state.players[state.activePlayerIndex]?.id;
      const ownerName =
        state.players.find((p) => p.id === ownerId)?.name ?? "Player";

      commit(
        (prev) => ({
          ...prev,
          players: prev.players.map((p) =>
            prev.bankingMode === "digital" && p.id === ownerId
              ? { ...p, cash: Math.max(0, p.cash - cost) }
              : p
          ),
          districts: {
            ...prev.districts,
            [districtId]: {
              ...prev.districts[districtId]!,
              skyscraper: true,
            },
          },
        }),
        {
          type: "build",
          text: `${ownerName} built a Skyscraper on ${getDistrictName(
            info.district,
            state.edition
          )} (${formatK(cost)}) — entire ${info.district.group.toUpperCase()} group rent DOUBLED!`,
        }
      );
    },
    [commit, getDistrictInfo, state.activePlayerIndex, state.edition, state.players]
  );

  const buildMonopolyTower = useCallback(
    (districtId: string) => {
      const info = getDistrictInfo(districtId);
      const ownerId =
        info.state.ownerId ?? state.players[state.activePlayerIndex]?.id;
      const ownerName =
        state.players.find((p) => p.id === ownerId)?.name ?? "Player";

      commit(
        (prev) => {
          const cleared: Record<string, DistrictState> = {};
          for (const [k, v] of Object.entries(prev.districts)) {
            cleared[k] = { ...v, monopolyTower: k === districtId };
          }
          return {
            ...prev,
            players: prev.players.map((p) =>
              prev.bankingMode === "digital" && p.id === ownerId
                ? { ...p, cash: Math.max(0, p.cash - MONOPOLY_TOWER_COST) }
                : p
            ),
            districts: cleared,
          };
        },
        {
          type: "build",
          text: `${ownerName} constructed the MONOPOLY TOWER on ${getDistrictName(
            info.district,
            state.edition
          )} (${formatK(MONOPOLY_TOWER_COST)}) — ALL owned districts doubled!`,
        }
      );
    },
    [commit, getDistrictInfo, state.activePlayerIndex, state.edition, state.players]
  );

  const buyStadium = useCallback(
    (playerId: string) => {
      const totalBuilt = state.players.reduce((s, p) => s + p.stadiums, 0);
      if (totalBuilt >= 2) return;
      const player = state.players.find((p) => p.id === playerId);
      commit(
        (prev) => ({
          ...prev,
          players: prev.players.map((p) => {
            if (p.id !== playerId) return p;
            return {
              ...p,
              stadiums: p.stadiums + 1,
              cash:
                prev.bankingMode === "digital"
                  ? Math.max(0, p.cash - STADIUM_COST)
                  : p.cash,
            };
          }),
        }),
        {
          type: "build",
          text: `${player?.name ?? "Player"} built a Stadium (${formatK(
            STADIUM_COST
          )}) — now earns +M1M extra salary every time they pass GO!`,
        }
      );
    },
    [commit, state.players]
  );

  const toggleMortgage = useCallback(
    (districtId: string) => {
      const info = getDistrictInfo(districtId);
      const nextMortgaged = !info.state.mortgaged;
      const mortgageVal = info.rentResult.unmortgagedRent;
      const ownerId = info.state.ownerId;
      const ownerName =
        state.players.find((p) => p.id === ownerId)?.name ?? "Owner";

      commit(
        (prev) => ({
          ...prev,
          players: prev.players.map((p) => {
            if (prev.bankingMode !== "digital" || p.id !== ownerId) return p;
            return {
              ...p,
              cash: nextMortgaged
                ? p.cash + mortgageVal
                : Math.max(0, p.cash - mortgageVal),
            };
          }),
          districts: {
            ...prev.districts,
            [districtId]: {
              ...prev.districts[districtId]!,
              mortgaged: nextMortgaged,
            },
          },
        }),
        {
          type: "money",
          text: nextMortgaged
            ? `${ownerName} mortgaged ${getDistrictName(
                info.district,
                state.edition
              )} for ${formatK(mortgageVal)}`
            : `${ownerName} unmortgaged ${getDistrictName(
                info.district,
                state.edition
              )} for ${formatK(mortgageVal)}`,
        }
      );
    },
    [commit, getDistrictInfo, state.edition, state.players]
  );

  const payRentOnDistrict = useCallback(
    (districtId: string, payerId: string, useRentDodge = false) => {
      const info = getDistrictInfo(districtId);
      if (!info.owner || info.owner.id === payerId) return;
      const payer = state.players.find((p) => p.id === payerId);
      const rentAmount = info.rentResult.rent;

      if (useRentDodge) {
        commit(
          (prev) => ({
            ...prev,
            turnStep: prev.turnStep === "land" ? "build" : prev.turnStep,
            rentDodgeHolderId: null,
          }),
          {
            type: "info",
            text: `${payer?.name ?? "Player"} played the RENT DODGE card to skip ${formatK(
              rentAmount
            )} rent on ${getDistrictName(
              info.district,
              state.edition
            )}! (Card returned to Free Parking)`,
          }
        );
        return;
      }

      commit(
        (prev) => ({
          ...prev,
          turnStep: prev.turnStep === "land" ? "build" : prev.turnStep,
          players: prev.players.map((p) => {
            if (prev.bankingMode !== "digital") return p;
            if (p.id === payerId)
              return { ...p, cash: Math.max(0, p.cash - rentAmount) };
            if (p.id === info.owner!.id)
              return { ...p, cash: p.cash + rentAmount };
            return p;
          }),
        }),
        {
          type: "money",
          text: `${payer?.name ?? "Player"} paid ${formatK(rentAmount)} rent to ${
            info.owner.name
          } for ${getDistrictName(info.district, state.edition)}`,
        }
      );
    },
    [commit, getDistrictInfo, state.edition, state.players]
  );

  const totalStadiumsBuilt = useMemo(
    () => state.players.reduce((s, p) => s + p.stadiums, 0),
    [state.players]
  );

  const monopolyTowerBuilt = useMemo(
    () => Object.values(state.districts).some((d) => d.monopolyTower),
    [state.districts]
  );

  const totalRailroadsBuilt = useMemo(
    () => Object.values(state.districts).filter((d) => d.hasRailroad).length,
    [state.districts]
  );

  const value = useMemo<GameStoreContextValue>(
    () => ({
      state,
      selectedInspector,
      setSelectedInspector,
      activeModal,
      setActiveModal,
      sessionRunning,
      setSessionRunning,
      resetTimer,
      canUndo: history.length > 0,
      undo,
      resetGame,
      setBankingMode,
      setEdition,
      setUiMode,
      setTurnStep,
      nextTurn,
      setActivePlayerIndex,
      commitDiceRoll,
      movePlayerToSpace,
      addPlayer,
      removePlayer,
      updatePlayer,
      adjustCash,
      transferCash,
      passGo,
      payIndustryTax,
      claimRentDodge,
      buyDistrict,
      assignDistrictOwner,
      updateDistrict,
      recordBuildSpin,
      constructBlocks,
      placeFreeRailroad,
      applyPlanningPermission,
      demolishHazard,
      buildSkyscraper,
      buildMonopolyTower,
      buyStadium,
      toggleMortgage,
      payRentOnDistrict,
      getDistrictInfo,
      allDistrictInfos,
      getPlayerStats,
      allPlayerStats,
      totalStadiumsBuilt,
      monopolyTowerBuilt,
      totalRailroadsBuilt,
    }),
    [
      state,
      selectedInspector,
      activeModal,
      sessionRunning,
      resetTimer,
      history.length,
      undo,
      resetGame,
      setBankingMode,
      setEdition,
      setUiMode,
      setTurnStep,
      nextTurn,
      setActivePlayerIndex,
      commitDiceRoll,
      movePlayerToSpace,
      addPlayer,
      removePlayer,
      updatePlayer,
      adjustCash,
      transferCash,
      passGo,
      payIndustryTax,
      claimRentDodge,
      buyDistrict,
      assignDistrictOwner,
      updateDistrict,
      recordBuildSpin,
      constructBlocks,
      placeFreeRailroad,
      applyPlanningPermission,
      demolishHazard,
      buildSkyscraper,
      buildMonopolyTower,
      buyStadium,
      toggleMortgage,
      payRentOnDistrict,
      getDistrictInfo,
      allDistrictInfos,
      getPlayerStats,
      allPlayerStats,
      totalStadiumsBuilt,
      monopolyTowerBuilt,
      totalRailroadsBuilt,
    ]
  );

  return (
    <GameStoreContext.Provider value={value}>
      {children}
    </GameStoreContext.Provider>
  );
}

export function useGameStore(): GameStoreContextValue {
  const ctx = useContext(GameStoreContext);
  if (!ctx) {
    throw new Error("useGameStore must be used within a GameStoreProvider");
  }
  return ctx;
}
