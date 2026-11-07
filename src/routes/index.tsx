import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  TrainFront,
  Volume2,
  VolumeX,
  Gavel,
  Hammer,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Building2,
  Factory,
  Coins,
  Dices,
  MapPin,
  Lock,
  Sparkles,
  Table2,
  SlidersHorizontal,
  ArrowRight,
  Trash2,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SevenSeg } from "@/components/SevenSeg";
import { sfx, setMuted } from "@/lib/audio";
import {
  BOARD_SPACES,
  getSpaceShortName,
  type SpecialSpaceKind,
} from "@/lib/board-spaces";
import { GameStoreProvider, useGameStore } from "@/lib/game-store";
import {
  BONUS_BLOCKS,
  COLOR_GROUPS,
  DISTRICTS,
  GROUP_COLORS,
  GROUP_LABELS,
  HAZARDS,
  MAX_BLOCKS,
  MONOPOLY_TOWER_COST,
  STADIUM_COST,
  formatK,
  getDistrictName,
  type Bonus,
  type HazardKey,
} from "@/lib/rent";

export const Route = createFileRoute("/")({
  component: TradingDeskRoute,
});

function TradingDeskRoute() {
  return (
    <GameStoreProvider>
      <TradingDeskCockpit />
    </GameStoreProvider>
  );
}

type UnitMode = "idle" | "build" | "auction" | "auction-end";

const BUILD_OUTCOMES: Array<"1" | "2" | "3" | "r"> = [
  "1",
  "1",
  "1",
  "2",
  "2",
  "2",
  "3",
  "3",
  "r",
  "r",
];

function formatClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * 3D-styled SVG Pip Die for the Touch 2-Dice Roller.
 */
function DieFace({
  value,
  rolling,
  isDoubles,
}: {
  value: number;
  rolling: boolean;
  isDoubles: boolean;
}) {
  const pipsByVal: Record<number, Array<[number, number]>> = {
    1: [[50, 50]],
    2: [
      [28, 28],
      [72, 72],
    ],
    3: [
      [26, 26],
      [50, 50],
      [74, 74],
    ],
    4: [
      [28, 28],
      [72, 28],
      [28, 72],
      [72, 72],
    ],
    5: [
      [26, 26],
      [74, 26],
      [50, 50],
      [26, 74],
      [74, 74],
    ],
    6: [
      [28, 24],
      [72, 24],
      [28, 50],
      [72, 50],
      [28, 76],
      [72, 76],
    ],
  };
  const coords = pipsByVal[value] ?? pipsByVal[1]!;

  return (
    <div
      className={`relative w-12 h-12 rounded-xl border-2 flex items-center justify-center transition-transform duration-150 shadow-inner ${
        rolling
          ? "animate-bounce border-primary bg-amber-100 text-slate-900 scale-105"
          : isDoubles
            ? "border-amber-400 bg-gradient-to-br from-amber-50 to-amber-200 shadow-[0_0_15px_rgba(251,191,36,0.45)]"
            : "border-white/30 bg-gradient-to-br from-white to-slate-200"
      }`}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {coords.map(([cx, cy], idx) => (
          <circle
            key={idx}
            cx={cx}
            cy={cy}
            r={10.5}
            fill={value === 6 || isDoubles ? "#b91c1c" : "#0f172a"}
          />
        ))}
      </svg>
    </div>
  );
}

function TradingDeskCockpit() {
  const {
    state,
    selectedInspector,
    setSelectedInspector,
    sessionRunning,
    setSessionRunning,
    resetTimer,
    commitDiceRoll,
    movePlayerToSpace,
    adjustCash,
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
    totalStadiumsBuilt,
    monopolyTowerBuilt,
    updatePlayer,
  } = useGameStore();

  const activePlayer =
    state.players[state.activePlayerIndex] ?? state.players[0]!;
  const activeStats = getPlayerStats(activePlayer.id);
  const isDigital = state.bankingMode === "digital";

  // Trading Unit electronic hardware state
  const [unitMode, setUnitMode] = useState<UnitMode>("idle");
  const [display, setDisplay] = useState<string>("----");
  const [statusText, setStatusText] = useState<string>(
    "TAP BUILD OR AUCTION"
  );
  const [muted, setMutedState] = useState(false);

  // Touch 2-Dice Roller animation state
  const [diceRolling, setDiceRolling] = useState(false);
  const [animDice, setAnimDice] = useState<[number, number]>([
    state.lastDiceRoll?.d1 ?? 3,
    state.lastDiceRoll?.d2 ?? 4,
  ]);

  // Right Inspector toggle for 0-8 printed rent schedule vs controls
  const [showRentTable, setShowRentTable] = useState(false);

  // Planning Permission quick-placement mode (tap a bonus/hazard, then tap any district tile)
  const [pendingPlanningPick, setPendingPlanningPick] = useState<
    | { kind: "bonus"; value: Bonus }
    | { kind: "hazard"; value: HazardKey }
    | null
  >(null);

  const timersRef = useRef<number[]>([]);
  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  useEffect(() => () => clearAllTimers(), [clearAllTimers]);

  // Sync display dice when turn changes or lastDiceRoll updates
  useEffect(() => {
    if (state.lastDiceRoll && !diceRolling) {
      setAnimDice([state.lastDiceRoll.d1, state.lastDiceRoll.d2]);
    }
  }, [state.lastDiceRoll, diceRolling]);

  const toggleMute = () => {
    const next = !muted;
    setMutedState(next);
    setMuted(next);
    if (!next) sfx.click();
  };

  /**
   * 1. ELECTRONIC BUILD BUTTON (Spins 1, 2, 3, or r)
   */
  const triggerBuildUnit = useCallback(() => {
    clearAllTimers();
    sfx.press();
    setUnitMode("build");
    setStatusText("SPINNING PERMIT...");

    const totalSteps = 14 + Math.floor(Math.random() * 5);
    const finalChoice =
      BUILD_OUTCOMES[Math.floor(Math.random() * BUILD_OUTCOMES.length)]!;

    let elapsed = 0;
    for (let i = 0; i < totalSteps; i++) {
      const delay = 45 + i * i * 3.8;
      elapsed += delay;
      const isLast = i === totalSteps - 1;
      const id = window.setTimeout(() => {
        if (isLast) {
          setDisplay(`   ${finalChoice}`);
          recordBuildSpin(finalChoice);
          if (finalChoice === "r") {
            sfx.railroad();
            setStatusText("RAILROAD! PLACE ON ANY DISTRICT");
          } else {
            sfx.reveal(parseInt(finalChoice, 10));
            setStatusText(
              `PERMIT: BUILD UP TO ${finalChoice} BLOCK${finalChoice === "1" ? "" : "S"}`
            );
          }
        } else {
          const cycle: Array<"1" | "2" | "3" | "r"> = ["1", "2", "3", "r"];
          const sym = cycle[i % cycle.length]!;
          setDisplay(`   ${sym}`);
          sfx.spinTick(i, totalSteps);
        }
      }, elapsed);
      timersRef.current.push(id);
    }
  }, [clearAllTimers, recordBuildSpin]);

  /**
   * 2. ELECTRONIC AUCTION TIMER (Pure real-life verbal auction timer — 30..50s secret countdown)
   */
  const triggerAuctionUnit = useCallback(() => {
    clearAllTimers();
    sfx.press();
    setUnitMode("auction");
    setDisplay(" AUC");
    setStatusText("BID OUT LOUD! SECRET TIMER RUNNING...");

    const totalMs = (28 + Math.random() * 18) * 1000;
    const phase1End = totalMs * 0.55;
    const phase2End = totalMs * 0.85;

    let t = 400;
    let flip = false;
    while (t < totalMs) {
      const currentT = t;
      const inPhase3 = currentT >= phase2End;
      const inPhase2 = currentT >= phase1End && !inPhase3;
      const step = inPhase3 ? 210 : inPhase2 ? 430 : 820;
      const isFlip = flip;
      const id = window.setTimeout(() => {
        if (inPhase3) {
          sfx.auctionWarn();
          setDisplay(isFlip ? "bId!" : "HURR");
          setStatusText("GOING, GOING... FINAL BIDS!");
        } else if (inPhase2) {
          if (isFlip) sfx.auctionTick(1.25);
          else sfx.auctionTock(1.25);
          setDisplay(isFlip ? "bId " : " bId");
        } else {
          if (isFlip) sfx.auctionTick(1);
          else sfx.auctionTock(1);
          setDisplay(isFlip ? "AUC " : " AUC");
        }
      }, currentT);
      timersRef.current.push(id);
      t += step;
      flip = !flip;
    }

    const endId = window.setTimeout(() => {
      sfx.auctionEnd();
      setUnitMode("auction-end");
      setDisplay("SOLd");
      setStatusText("SOLD! TAP WINNER PILL ON RIGHT ->");
    }, totalMs);
    timersRef.current.push(endId);
  }, [clearAllTimers]);

  const stopUnit = () => {
    clearAllTimers();
    sfx.click();
    setUnitMode("idle");
    setDisplay("----");
    setStatusText("TAP BUILD OR AUCTION");
  };

  /**
   * 3. TOUCH 2-DICE ROLLER (Animates dice & auto-moves active player along 40-space board)
   */
  const handleRollDice = () => {
    if (diceRolling) return;
    setDiceRolling(true);
    sfx.diceClatter();

    const finalD1 = 1 + Math.floor(Math.random() * 6);
    const finalD2 = 1 + Math.floor(Math.random() * 6);

    let ticks = 0;
    const iv = window.setInterval(() => {
      ticks++;
      setAnimDice([
        1 + Math.floor(Math.random() * 6),
        1 + Math.floor(Math.random() * 6),
      ]);
      if (ticks >= 7) {
        window.clearInterval(iv);
        setAnimDice([finalD1, finalD2]);
        setDiceRolling(false);
        sfx.diceLand(finalD1 === finalD2);
        commitDiceRoll(finalD1, finalD2);
      }
    }, 65);
  };

  // Currently inspected district (fallback to #1 Summergate if needed)
  const inspectedDistrictId =
    selectedInspector.type === "district"
      ? selectedInspector.districtId
      : DISTRICTS[0]!.id;
  const info = getDistrictInfo(inspectedDistrictId);
  const d = info.district;
  const ds = info.state;
  const res = info.rentResult;
  const blocksRemaining = res.remainingFootprint;
  const districtColor = GROUP_COLORS[d.group];
  const districtGroupLabel = GROUP_LABELS[d.group];

  // Group districts by their 8 color groups for the Center All-in-One Grid
  const districtsByGroup = COLOR_GROUPS.map((group) => ({
    group,
    color: GROUP_COLORS[group],
    label: GROUP_LABELS[group],
    items: allDistrictInfos.filter((item) => item.district.group === group),
  }));

  const currentPlayerSpace =
    BOARD_SPACES[activePlayer.position] ?? BOARD_SPACES[0]!;
  const latestLog = state.logs[0];

  const handleTileTap = (districtId: string) => {
    sfx.click();
    if (pendingPlanningPick) {
      applyPlanningPermission(
        districtId,
        pendingPlanningPick.kind,
        pendingPlanningPick.value
      );
      setPendingPlanningPick(null);
      setSelectedInspector({ type: "district", districtId });
      return;
    }
    setSelectedInspector({ type: "district", districtId });
  };

  const openSpecialSpace = (spaceKind: SpecialSpaceKind, spaceIndex: number) => {
    sfx.click();
    setSelectedInspector({ type: "special", spaceKind, spaceIndex });
  };

  return (
    <AppShell>
      {/* 3-ZONE ZERO-SCROLL LANDSCAPE TABLET COCKPIT */}
      <div className="h-full w-full grid grid-cols-1 md:grid-cols-[268px_1fr_325px] xl:grid-cols-[292px_1fr_355px] gap-2 p-2 overflow-y-auto md:overflow-hidden">
        {/* ================================================================
            LEFT COLUMN: TRADING UNIT HARDWARE + TOUCH 2-DICE ROLLER
           ================================================================ */}
        <div className="h-full min-h-0 flex flex-col justify-between gap-2">
          {/* 1A. COMPACT ELECTRONIC TRADING UNIT */}
          <div className="unit-plastic rounded-2xl p-2.5 border border-white/15 flex flex-col justify-between gap-2 shrink-0">
            {/* Unit Top Bezel: Speaker + Brand + Status Light + Mute */}
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    unitMode === "auction"
                      ? "bg-amber-400 shadow-[0_0_8px_#fbbf24] animate-ping"
                      : unitMode === "auction-end"
                        ? "bg-red-500 shadow-[0_0_10px_#ef4444]"
                        : unitMode === "build"
                          ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                          : "bg-red-500/70"
                  }`}
                />
                <span className="font-display text-[11px] tracking-[0.2em] text-white/85">
                  TRADING UNIT
                </span>
              </div>

              <div className="flex items-center gap-1">
                {unitMode !== "idle" && (
                  <button
                    onClick={stopUnit}
                    className="px-1.5 py-0.5 rounded bg-black/50 border border-white/15 text-[9px] font-mono text-white/80 hover:text-white active:scale-95"
                  >
                    CLEAR
                  </button>
                )}
                <button
                  onClick={toggleMute}
                  className="p-1 rounded-lg bg-black/40 border border-white/15 text-white/80 hover:text-white active:scale-95"
                  title={muted ? "Unmute Audio" : "Mute Audio"}
                >
                  {muted ? (
                    <VolumeX className="w-3.5 h-3.5 text-destructive" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </button>
              </div>
            </div>

            {/* 7-Segment LED Readout Screen */}
            <div className="led-screen rounded-xl px-2.5 py-1.5 relative overflow-hidden">
              <div className="flex items-center justify-between text-[8px] font-mono uppercase tracking-widest text-red-400/70 mb-0.5">
                <span
                  className={
                    unitMode === "build" ? "text-emerald-300 font-bold" : ""
                  }
                >
                  ● BUILD
                </span>
                <span
                  className={
                    unitMode === "auction" || unitMode === "auction-end"
                      ? "text-amber-300 font-bold"
                      : ""
                  }
                >
                  ● AUCTION
                </span>
                <span>
                  {state.lastBuildRoll
                    ? `LAST: ${state.lastBuildRoll.toUpperCase()}`
                    : "READY"}
                </span>
              </div>

              <div className="flex items-center justify-center py-0.5">
                <SevenSeg
                  value={display}
                  digits={4}
                  size="sm"
                  color={
                    unitMode === "auction-end"
                      ? "amber"
                      : unitMode === "build" && display.trim() === "r"
                        ? "green"
                        : "red"
                  }
                  blink={unitMode === "auction-end"}
                />
              </div>

              <div className="text-center font-mono text-[9px] tracking-wider text-amber-300/90 truncate">
                {statusText}
              </div>
            </div>

            {/* TWO BIG TACTILE HARDWARE BUTTONS: BUILD & AUCTION */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={triggerBuildUnit}
                className="btn-red-tactile rounded-xl py-2.5 px-2 flex flex-col items-center justify-center gap-0.5 text-white select-none active:scale-95"
              >
                <div className="flex items-center gap-1">
                  <Hammer className="w-4 h-4 drop-shadow" />
                  <span className="font-display text-base tracking-wider leading-none">
                    BUILD
                  </span>
                </div>
                <span className="text-[9px] font-mono uppercase tracking-wider text-white/85">
                  Spin 1 • 2 • 3 • 🚂
                </span>
              </button>

              <button
                onClick={triggerAuctionUnit}
                className="btn-red-tactile rounded-xl py-2.5 px-2 flex flex-col items-center justify-center gap-0.5 text-white select-none active:scale-95"
              >
                <div className="flex items-center gap-1">
                  <Gavel className="w-4 h-4 drop-shadow" />
                  <span className="font-display text-base tracking-wider leading-none">
                    AUCTION
                  </span>
                </div>
                <span className="text-[9px] font-mono uppercase tracking-wider text-white/85">
                  Secret 50s Timer
                </span>
              </button>
            </div>

            {/* 60-Min Game Clock Strip */}
            <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-white/10 text-[10px] font-mono">
              <span className="text-white/60 uppercase">
                60m Clock:{" "}
                <strong className="text-white">
                  {formatClock(Math.max(0, 3600 - state.sessionSeconds))}
                </strong>
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    sfx.click();
                    setSessionRunning((r) => !r);
                  }}
                  className={`px-2 py-0.5 rounded font-semibold uppercase ${
                    sessionRunning
                      ? "bg-amber-400/20 text-amber-300 border border-amber-400/40"
                      : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  }`}
                >
                  {sessionRunning ? "Pause" : "Start"}
                </button>
                <button
                  onClick={() => {
                    sfx.click();
                    resetTimer(false);
                  }}
                  className="p-1 rounded bg-white/5 text-white/60 hover:text-white"
                  title="Reset 60m Clock"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* 1B. TOUCH 2-DICE ROLLER & LIVE BOARD POSITION TRACKER */}
          <div className="flex-1 min-h-0 rounded-2xl border border-border bg-card/95 p-2.5 flex flex-col justify-between gap-1.5 overflow-hidden">
            {/* Active Player & Current Board Location Header */}
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: activePlayer.color }}
                />
                <span className="font-display text-xs tracking-wider truncate">
                  {activePlayer.name.toUpperCase()} DICE
                </span>
              </div>
              {activePlayer.inJail ? (
                <span className="px-1.5 py-0.5 rounded bg-destructive/20 border border-destructive/40 text-destructive font-mono text-[9px] font-bold">
                  🔒 IN JAIL
                </span>
              ) : activePlayer.doublesStreak > 0 ? (
                <span className="px-1.5 py-0.5 rounded bg-amber-400/20 border border-amber-400/40 text-amber-300 font-mono text-[9px] font-bold">
                  DOUBLES ×{activePlayer.doublesStreak}
                </span>
              ) : (
                <span className="text-[10px] font-mono text-muted-foreground">
                  Space #{activePlayer.position}
                </span>
              )}
            </div>

            {/* Dice Visuals + Big Touch ROLL DICE Button */}
            <div className="flex items-center gap-2.5 my-auto">
              <div
                onClick={handleRollDice}
                className="flex items-center gap-1.5 cursor-pointer select-none"
              >
                <DieFace
                  value={animDice[0]}
                  rolling={diceRolling}
                  isDoubles={!diceRolling && animDice[0] === animDice[1]}
                />
                <DieFace
                  value={animDice[1]}
                  rolling={diceRolling}
                  isDoubles={!diceRolling && animDice[0] === animDice[1]}
                />
              </div>

              <button
                onClick={handleRollDice}
                disabled={diceRolling}
                className="flex-1 h-12 rounded-xl bg-gradient-to-b from-amber-400 to-amber-500 text-slate-950 font-display text-lg tracking-wider shadow-lg hover:brightness-105 active:scale-95 transition flex flex-col items-center justify-center leading-none select-none"
              >
                <span className="flex items-center gap-1">
                  <Dices className="w-4 h-4" />
                  {diceRolling ? "ROLLING..." : "ROLL DICE"}
                </span>
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-900/80 mt-0.5">
                  Auto-Moves Token
                </span>
              </button>
            </div>

            {/* Last Roll & Landed Space Banner */}
            <div className="rounded-xl bg-secondary/70 border border-border px-2.5 py-1.5 flex flex-col gap-1">
              {state.lastDiceRoll &&
              state.lastDiceRoll.playerId === activePlayer.id ? (
                <>
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-foreground font-bold">
                      Rolled {state.lastDiceRoll.d1} + {state.lastDiceRoll.d2} ={" "}
                      <span className="text-primary text-xs">
                        {state.lastDiceRoll.total}
                      </span>
                    </span>
                    {state.lastDiceRoll.threeDoublesJail ? (
                      <span className="px-1.5 py-0.2 rounded bg-destructive/20 text-destructive font-bold">
                        3× DOUBLES → JAIL!
                      </span>
                    ) : state.lastDiceRoll.isDoubles ? (
                      <span className="px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-bold">
                        DOUBLES! ROLL AGAIN
                      </span>
                    ) : state.lastDiceRoll.passedGo ? (
                      <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                        PASSED GO!
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between gap-1 text-[11px]">
                    <span className="text-muted-foreground truncate">
                      {getSpaceShortName(
                        state.lastDiceRoll.fromIndex,
                        state.edition
                      )}
                    </span>
                    <ArrowRight className="w-3 h-3 text-primary shrink-0" />
                    <button
                      onClick={() => {
                        const sp = BOARD_SPACES[state.lastDiceRoll!.toIndex]!;
                        if (sp.kind === "district" && sp.districtId) {
                          setSelectedInspector({
                            type: "district",
                            districtId: sp.districtId,
                          });
                        } else if (sp.kind !== "district") {
                          setSelectedInspector({
                            type: "special",
                            spaceKind: sp.kind,
                            spaceIndex: sp.index,
                          });
                        }
                      }}
                      className="font-semibold text-primary hover:underline truncate"
                    >
                      {getSpaceShortName(
                        state.lastDiceRoll.toIndex,
                        state.edition
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-primary" /> At:
                  </span>
                  <span className="font-semibold text-foreground truncate">
                    {getSpaceShortName(activePlayer.position, state.edition)}
                  </span>
                </div>
              )}
            </div>

            {/* Quick Jail / Teleport Strip */}
            {activePlayer.inJail ? (
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => {
                    sfx.cash();
                    if (isDigital)
                      adjustCash(activePlayer.id, -500, "Paid M500k Jail Bail");
                    updatePlayer(activePlayer.id, { inJail: false });
                  }}
                  className="py-1.5 px-2 rounded-lg bg-amber-400/20 border border-amber-400/40 text-amber-300 font-mono text-[10px] font-bold hover:bg-amber-400/30 active:scale-95"
                >
                  Pay M500k Bail
                </button>
                <button
                  onClick={() => {
                    sfx.click();
                    updatePlayer(activePlayer.id, {
                      inJail: false,
                      hasGetOutOfJail: false,
                    });
                  }}
                  className="py-1.5 px-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] font-bold hover:bg-emerald-500/30 active:scale-95"
                >
                  Leave Jail Free
                </button>
              </div>
            ) : (
              <div className="text-[10px] font-mono text-muted-foreground truncate flex items-center justify-between gap-1">
                <span className="truncate">
                  {latestLog ? latestLog.text : "Ready"}
                </span>
                {currentPlayerSpace.kind === "district" &&
                  currentPlayerSpace.districtId && (
                    <button
                      onClick={() =>
                        setSelectedInspector({
                          type: "district",
                          districtId: currentPlayerSpace.districtId!,
                        })
                      }
                      className="text-primary font-bold shrink-0 hover:underline"
                    >
                      Inspect Here
                    </button>
                  )}
              </div>
            )}
          </div>
        </div>

        {/* ================================================================
            CENTER COLUMN: ALL-IN-ONE 22-DISTRICT COLOR GRID + SPECIAL SPACES
           ================================================================ */}
        <div className="h-full min-h-0 flex flex-col gap-1.5 overflow-hidden">
          {/* Optional Planning Permission Target Banner */}
          {pendingPlanningPick && (
            <div className="shrink-0 rounded-xl bg-amber-400/20 border border-amber-400 px-3 py-1 flex items-center justify-between text-xs">
              <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                TAP ANY DISTRICT BELOW TO PLACE:{" "}
                <strong className="uppercase">
                  {pendingPlanningPick.kind === "bonus"
                    ? pendingPlanningPick.value
                    : HAZARDS[pendingPlanningPick.value].label}
                </strong>
              </span>
              <button
                onClick={() => setPendingPlanningPick(null)}
                className="px-2 py-0.5 rounded bg-black/40 text-white text-[10px] font-mono"
              >
                Cancel
              </button>
            </div>
          )}

          {/* 2A. 8 COLOR GROUPS (4x2 GRID) SHOWING ALL 22 DISTRICTS AT ONCE */}
          <div className="flex-1 min-h-0 grid grid-cols-1 sm:grid-cols-2 sm:grid-rows-4 gap-1.5">
            {districtsByGroup.map(({ group, color, label, items }) => {
              const firstInfo = items[0]!;
              return (
                <div
                  key={group}
                  className="rounded-xl border border-border bg-card/85 p-1.5 flex flex-col gap-1 min-h-0 overflow-hidden"
                >
                  {/* Compact Color Group Header */}
                  <div className="flex items-center justify-between gap-1 px-1 shrink-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ background: color }}
                      />
                      <span className="font-display text-xs tracking-wider text-foreground truncate">
                        {label.toUpperCase()}
                      </span>
                      <span className="text-[9px] font-mono text-muted-foreground">
                        • Block {formatK(firstInfo.district.residentialCost)}
                      </span>
                    </div>
                    {firstInfo.groupHasSkyscraper && (
                      <span className="text-[9px] font-mono px-1 rounded bg-amber-400/20 text-amber-300 font-bold">
                        🏙️ 2× SKY
                      </span>
                    )}
                  </div>

                  {/* 2 or 3 District Touch Tiles inside this Color Group */}
                  <div
                    className={`flex-1 min-h-0 grid gap-1 ${
                      items.length === 2 ? "grid-cols-2" : "grid-cols-3"
                    }`}
                  >
                    {items.map((item) => {
                      const isSelected =
                        selectedInspector.type === "district" &&
                        selectedInspector.districtId === item.district.id;
                      const st = item.state;
                      const r = item.rentResult;

                      return (
                        <button
                          key={item.district.id}
                          onClick={() => handleTileTap(item.district.id)}
                          className={`relative rounded-lg p-1.5 text-left flex flex-col justify-between transition select-none min-h-0 overflow-hidden border ${
                            isSelected
                              ? "border-primary bg-primary/15 shadow-[0_0_0_1px_oklch(0.84_0.17_85)]"
                              : pendingPlanningPick
                                ? "border-amber-400/60 bg-secondary/70 hover:bg-amber-400/15"
                                : "border-border/80 bg-secondary/45 hover:bg-secondary/80 active:scale-[0.98]"
                          }`}
                        >
                          {/* Top Color Accent Bar */}
                          <div
                            className="absolute top-0 left-0 right-0 h-1"
                            style={{ background: color }}
                          />

                          {/* Row 1: # + Name + Owner Dot */}
                          <div className="flex items-start justify-between gap-1 pt-0.5 min-w-0">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1">
                                <span className="font-mono text-[9px] text-muted-foreground">
                                  #{item.district.number}
                                </span>
                                {st.mortgaged && (
                                  <span className="text-[8px] font-mono px-1 rounded bg-destructive/25 text-destructive font-bold">
                                    MORT
                                  </span>
                                )}
                              </div>
                              <div className="font-semibold text-[11px] leading-tight text-foreground truncate">
                                {getDistrictName(item.district, state.edition)}
                              </div>
                            </div>

                            {/* Owner Badge */}
                            {item.owner ? (
                              <span
                                className="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold text-slate-950 shrink-0 shadow-sm"
                                style={{ background: item.owner.color }}
                                title={`Owned by ${item.owner.name}`}
                              >
                                {item.owner.name.slice(0, 3).toUpperCase()}
                              </span>
                            ) : (
                              <span className="text-[9px] font-mono text-muted-foreground shrink-0">
                                {formatK(item.district.price)}
                              </span>
                            )}
                          </div>

                          {/* Row 2: Live Rent + Blocks & Hazard/Bonus/Landmark Icons + Player Tokens Here */}
                          <div className="flex items-end justify-between gap-1 mt-auto pt-0.5">
                            <div>
                              <div className="text-[8px] font-mono uppercase text-muted-foreground leading-none">
                                {item.owner ? "Rent" : "Base"}
                              </div>
                              <div
                                className={`font-mono text-xs font-bold leading-tight ${
                                  st.mortgaged
                                    ? "text-muted-foreground line-through"
                                    : r.hazardActive && st.residential > 0
                                      ? "text-destructive"
                                      : item.owner
                                        ? "text-primary"
                                        : "text-foreground/80"
                                }`}
                              >
                                {formatK(r.rent)}
                              </div>
                            </div>

                            {/* Compact Badges for Blocks, Landmarks & Players Standing Here */}
                            <div className="flex flex-wrap items-center justify-end gap-0.5">
                              {st.residential > 0 && (
                                <span className="px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[9px] font-bold">
                                  {st.residential}R
                                </span>
                              )}
                              {st.industrial > 0 && (
                                <span className="px-1 py-0.2 rounded bg-sky-500/20 text-sky-300 font-mono text-[9px] font-bold">
                                  {st.industrial}I
                                </span>
                              )}
                              {st.bonus !== "none" && (
                                <span
                                  className="text-[10px]"
                                  title={`Bonus: ${st.bonus}`}
                                >
                                  🛡️
                                </span>
                              )}
                              {st.hazard !== "none" && (
                                <span
                                  className="text-[10px]"
                                  title={HAZARDS[st.hazard].label}
                                >
                                  ☣️
                                </span>
                              )}
                              {st.hasRailroad && (
                                <span className="text-[10px]" title="Railroad">
                                  🚂
                                </span>
                              )}
                              {st.skyscraper && (
                                <span
                                  className="text-[10px]"
                                  title="Skyscraper"
                                >
                                  🏙️
                                </span>
                              )}
                              {st.monopolyTower && (
                                <span
                                  className="text-[10px]"
                                  title="Monopoly Tower"
                                >
                                  🗼
                                </span>
                              )}
                              {/* Live Player Tokens standing on this space */}
                              {item.playersHere.map((p) => (
                                <span
                                  key={p.id}
                                  className="w-3.5 h-3.5 rounded-full border border-white flex items-center justify-center text-[8px] font-mono font-bold text-slate-950 shadow"
                                  style={{ background: p.color }}
                                  title={`${p.name} is on this space`}
                                >
                                  {p.name.slice(0, 1).toUpperCase()}
                                </span>
                              ))}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 2B. BOTTOM SPECIAL BOARD SPACES BAR (5 TOUCH BUTTONS) */}
          <div className="shrink-0 grid grid-cols-5 gap-1.5">
            <button
              onClick={() => openSpecialSpace("planning", 5)}
              className={`rounded-xl border px-2 py-1.5 flex items-center justify-between gap-1 text-left transition active:scale-95 ${
                selectedInspector.type === "special" &&
                selectedInspector.spaceKind === "planning"
                  ? "border-primary bg-primary/20 text-primary"
                  : "border-border bg-card/90 hover:bg-secondary/70"
              }`}
            >
              <div className="min-w-0">
                <div className="font-display text-xs tracking-wider truncate">
                  🏗️ PLANNING
                </div>
                <div className="text-[9px] font-mono text-muted-foreground truncate">
                  Bonus / Hazard
                </div>
              </div>
            </button>

            <button
              onClick={() => openSpecialSpace("free_parking", 20)}
              className={`rounded-xl border px-2 py-1.5 flex items-center justify-between gap-1 text-left transition active:scale-95 ${
                selectedInspector.type === "special" &&
                selectedInspector.spaceKind === "free_parking"
                  ? "border-primary bg-primary/20 text-primary"
                  : "border-border bg-card/90 hover:bg-secondary/70"
              }`}
            >
              <div className="min-w-0">
                <div className="font-display text-xs tracking-wider truncate">
                  🅿️ FREE PARKING
                </div>
                <div className="text-[9px] font-mono text-amber-300 truncate">
                  {state.rentDodgeHolderId
                    ? `Dodge: ${state.players.find((p) => p.id === state.rentDodgeHolderId)?.name ?? "Held"}`
                    : "Claim Rent Dodge"}
                </div>
              </div>
            </button>

            <button
              onClick={() => openSpecialSpace("industry_tax", 4)}
              className={`rounded-xl border px-2 py-1.5 flex items-center justify-between gap-1 text-left transition active:scale-95 ${
                selectedInspector.type === "special" &&
                selectedInspector.spaceKind === "industry_tax"
                  ? "border-primary bg-primary/20 text-primary"
                  : "border-border bg-card/90 hover:bg-secondary/70"
              }`}
            >
              <div className="min-w-0">
                <div className="font-display text-xs tracking-wider truncate">
                  🏭 IND. TAX
                </div>
                <div className="text-[9px] font-mono text-muted-foreground truncate">
                  {activeStats.industrialBlockCount > 0
                    ? `Pay M2M (${activeStats.industrialBlockCount} Ind)`
                    : "M0 (0 Ind Blocks)"}
                </div>
              </div>
            </button>

            <button
              onClick={() => openSpecialSpace("auction", 12)}
              className={`rounded-xl border px-2 py-1.5 flex items-center justify-between gap-1 text-left transition active:scale-95 ${
                selectedInspector.type === "special" &&
                selectedInspector.spaceKind === "auction"
                  ? "border-primary bg-primary/20 text-primary"
                  : "border-border bg-card/90 hover:bg-secondary/70"
              }`}
            >
              <div className="min-w-0">
                <div className="font-display text-xs tracking-wider truncate">
                  🔨 AUCTION SPACE
                </div>
                <div className="text-[9px] font-mono text-muted-foreground truncate">
                  Unowned Bid
                </div>
              </div>
            </button>

            <button
              onClick={() => openSpecialSpace("chance", 2)}
              className={`rounded-xl border px-2 py-1.5 flex items-center justify-between gap-1 text-left transition active:scale-95 ${
                selectedInspector.type === "special" &&
                (selectedInspector.spaceKind === "chance" ||
                  selectedInspector.spaceKind === "jail" ||
                  selectedInspector.spaceKind === "go_to_jail" ||
                  selectedInspector.spaceKind === "go")
                  ? "border-primary bg-primary/20 text-primary"
                  : "border-border bg-card/90 hover:bg-secondary/70"
              }`}
            >
              <div className="min-w-0">
                <div className="font-display text-xs tracking-wider truncate">
                  ❓ CHANCE / JAIL
                </div>
                <div className="text-[9px] font-mono text-muted-foreground truncate">
                  Cards & Cash
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* ================================================================
            RIGHT COLUMN: TOUCH-FIRST INSPECTOR & ACTION DECK
           ================================================================ */}
        <div className="h-full min-h-0 rounded-2xl border border-border bg-card/95 p-2.5 flex flex-col justify-between gap-2 overflow-hidden">
          {selectedInspector.type === "district" ? (
            <>
              {/* 3A. DISTRICT TITLE DEED HEADER */}
              <div
                className="rounded-xl p-2 border border-border/80 shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${districtColor}35, transparent 80%)`,
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase text-white shadow-sm"
                        style={{
                          background: districtColor,
                        }}
                      >
                        #{d.number} {districtGroupLabel}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        Buy {formatK(d.price)}
                      </span>
                    </div>
                    <h2 className="font-display text-xl tracking-wide text-foreground leading-tight truncate mt-0.5">
                      {getDistrictName(d, state.edition)}
                    </h2>
                  </div>

                  {/* Live Rent Readout Box */}
                  <div className="text-right shrink-0">
                    <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
                      Live Rent
                    </div>
                    <div
                      className={`font-display text-2xl leading-none ${
                        ds.mortgaged
                          ? "text-muted-foreground line-through"
                          : res.hazardActive && ds.residential > 0
                            ? "text-destructive"
                            : "text-primary"
                      }`}
                    >
                      {formatK(res.rent)}
                    </div>
                  </div>
                </div>

                {/* Sub-bar: Move Token Here + Toggle 0-8 Rent Schedule */}
                <div className="flex items-center justify-between gap-1.5 mt-1.5 pt-1.5 border-t border-border/60 text-[10px] font-mono">
                  <button
                    onClick={() => {
                      sfx.click();
                      movePlayerToSpace(
                        activePlayer.id,
                        d.boardSpaceIndex,
                        false
                      );
                    }}
                    className="px-2 py-0.5 rounded bg-secondary/80 hover:bg-secondary text-foreground flex items-center gap-1 active:scale-95"
                    title="Move active player's token to this district"
                  >
                    <MapPin className="w-3 h-3 text-primary" />
                    {activePlayer.position === d.boardSpaceIndex
                      ? `${activePlayer.name} is Here`
                      : `Move ${activePlayer.name.slice(0, 6)} Here`}
                  </button>

                  <button
                    onClick={() => {
                      sfx.click();
                      setShowRentTable((v) => !v);
                    }}
                    className={`px-2 py-0.5 rounded flex items-center gap-1 font-semibold border transition ${
                      showRentTable
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary/80 text-muted-foreground border-border hover:text-foreground"
                    }`}
                  >
                    {showRentTable ? (
                      <>
                        <SlidersHorizontal className="w-3 h-3" /> Controls
                      </>
                    ) : (
                      <>
                        <Table2 className="w-3 h-3" /> 0–8 Rent Table
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 3B. ONE-TAP OWNER PILLS & BUY / RENT / MORTGAGE BAR */}
              <div className="rounded-xl border border-border bg-secondary/35 p-2 flex flex-col gap-1.5 shrink-0">
                <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
                  <span>1-Tap Owner Assignment</span>
                  <button
                    onClick={() => {
                      sfx.click();
                      toggleMortgage(d.id);
                    }}
                    className={`px-1.5 py-0.5 rounded font-bold ${
                      ds.mortgaged
                        ? "bg-destructive/20 text-destructive border border-destructive/40"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {ds.mortgaged
                      ? `Unmortgage (${formatK(res.mortgage)})`
                      : `Mortgage (+${formatK(res.mortgage)})`}
                  </button>
                </div>

                {/* Touch Player Pills */}
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => {
                      sfx.click();
                      assignDistrictOwner(d.id, null);
                    }}
                    className={`px-2 py-1 rounded-lg text-[10px] font-mono font-semibold border transition active:scale-95 ${
                      ds.ownerId === null
                        ? "border-primary bg-primary/20 text-primary"
                        : "border-border bg-background/60 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Unowned
                  </button>
                  {state.players.map((p) => {
                    const isOwner = ds.ownerId === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          sfx.cash();
                          assignDistrictOwner(d.id, p.id);
                        }}
                        className={`flex-1 min-w-[60px] px-2 py-1 rounded-lg text-[10px] font-mono font-bold border flex items-center justify-center gap-1 transition active:scale-95 ${
                          isOwner
                            ? "border-white bg-white/15 text-white shadow-sm"
                            : "border-border bg-background/60 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ background: p.color }}
                        />
                        <span className="truncate">{p.name}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Contextual Buy / Auction / Pay Rent Action Buttons */}
                {!ds.ownerId ? (
                  <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                    <button
                      onClick={() => {
                        sfx.cash();
                        buyDistrict(d.id, activePlayer.id);
                      }}
                      className="py-1.5 px-2 rounded-lg bg-emerald-500 text-slate-950 font-semibold text-xs flex items-center justify-center gap-1 shadow hover:brightness-105 active:scale-95"
                    >
                      <Coins className="w-3.5 h-3.5" />
                      Buy ({formatK(d.price)})
                    </button>
                    <button
                      onClick={triggerAuctionUnit}
                      className="py-1.5 px-2 rounded-lg bg-amber-400/20 border border-amber-400/40 text-amber-300 font-semibold text-xs flex items-center justify-center gap-1 hover:bg-amber-400/30 active:scale-95"
                    >
                      <Gavel className="w-3.5 h-3.5" />
                      Run Auction
                    </button>
                  </div>
                ) : ds.ownerId !== activePlayer.id && !ds.mortgaged ? (
                  <div className="flex gap-1.5 pt-0.5">
                    <button
                      onClick={() => {
                        sfx.cash();
                        payRentOnDistrict(d.id, activePlayer.id, false);
                      }}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1 shadow hover:brightness-105 active:scale-95"
                    >
                      <Coins className="w-3.5 h-3.5" />
                      {activePlayer.name.slice(0, 6)} Pays {formatK(res.rent)}
                    </button>
                    {state.rentDodgeHolderId === activePlayer.id && (
                      <button
                        onClick={() => {
                          sfx.click();
                          payRentOnDistrict(d.id, activePlayer.id, true);
                        }}
                        className="py-1.5 px-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] font-bold active:scale-95"
                      >
                        🛡️ Dodge (M0)
                      </button>
                    )}
                  </div>
                ) : null}
              </div>

              {/* 3C. MIDDLE SECTION: EITHER 0-8 RENT SCHEDULE OR TOUCH BLOCK BUILDER + LANDMARKS */}
              {showRentTable ? (
                <div className="flex-1 min-h-0 rounded-xl border border-border bg-secondary/25 p-2 flex flex-col justify-between">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    Official Title Deed Rent Schedule (0–8 Blocks)
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 my-auto">
                    {d.rentSchedule.map((val, count) => {
                      const isCurrent = count === res.effectiveBlocks;
                      return (
                        <div
                          key={count}
                          className={`rounded-lg p-1.5 border text-center ${
                            isCurrent
                              ? "border-primary bg-primary/20 text-primary font-bold"
                              : "border-border bg-background/60 text-muted-foreground"
                          }`}
                        >
                          <div className="text-[9px] font-mono uppercase">
                            {count} {count === 1 ? "Block" : "Blocks"}
                          </div>
                          <div className="font-mono text-xs text-foreground mt-0.5">
                            {formatK(val)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground flex items-center justify-between border-t border-border/60 pt-1">
                    <span>
                      Res Block: {formatK(d.residentialCost)} • Ind Block:{" "}
                      {formatK(d.industrialCost)}
                    </span>
                    <span>Skyscraper: {formatK(d.skyscraperCost)}</span>
                  </div>
                </div>
              ) : (
                <>
                  {/* TOUCH BLOCK BUILDER (RESIDENTIAL & INDUSTRIAL) */}
                  <div className="rounded-xl border border-border bg-secondary/30 p-2 flex flex-col gap-1.5 shrink-0">
                    {/* Active Build Spin Banner if available */}
                    {state.lastBuildRoll === "r" &&
                    state.railroadEarnedThisTurn ? (
                      <button
                        onClick={() => {
                          sfx.railroad();
                          placeFreeRailroad(d.id);
                        }}
                        className="w-full py-1.5 px-2 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow animate-pulse"
                      >
                        <TrainFront className="w-4 h-4" />
                        PLACE FREE RAILROAD HERE (SPIN: r)
                      </button>
                    ) : state.blocksRemainingThisTurn > 0 ? (
                      <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-primary/15 border border-primary/40 text-[10px] font-mono text-primary">
                        <span>
                          🔨 PERMIT: {state.blocksRemainingThisTurn} BLOCK(S) LEFT
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              sfx.click();
                              constructBlocks(d.id, "residential", 1, true);
                            }}
                            disabled={blocksRemaining < 1}
                            className="px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 font-bold disabled:opacity-40"
                          >
                            +1 Res
                          </button>
                          <button
                            onClick={() => {
                              sfx.click();
                              constructBlocks(d.id, "industrial", 1, true);
                            }}
                            disabled={blocksRemaining < 1}
                            className="px-1.5 py-0.5 rounded bg-sky-400 text-slate-950 font-bold disabled:opacity-40"
                          >
                            +1 Ind
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {/* 8-Slot Visual Footprint Bar */}
                    <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground">
                      <span>
                        8-Block Footprint ({res.occupiedFootprint}/{MAX_BLOCKS}{" "}
                        Used)
                      </span>
                      <span>
                        Eff. Rent Tier:{" "}
                        <strong className="text-foreground">
                          {res.effectiveBlocks} blk
                        </strong>
                      </span>
                    </div>
                    <div className="grid grid-cols-8 gap-1">
                      {Array.from({ length: MAX_BLOCKS }).map((_, i) => {
                        const rEnd = ds.residential;
                        const iEnd = rEnd + ds.industrial;
                        const bBlocks =
                          ds.hazard === "none" ? BONUS_BLOCKS[ds.bonus] : 0;
                        const hBlocks =
                          ds.hazard !== "none" ? HAZARDS[ds.hazard].blocks : 0;
                        const bEnd = iEnd + bBlocks;
                        const hEnd = bEnd + hBlocks;
                        let cls =
                          "bg-background/60 border-border text-muted-foreground/30";
                        let sym = "";
                        if (i < rEnd) {
                          cls = res.hazardActive
                            ? "bg-destructive/30 border-destructive text-destructive"
                            : "bg-emerald-500/30 border-emerald-400 text-emerald-300";
                          sym = "🏠";
                        } else if (i < iEnd) {
                          cls = "bg-sky-500/30 border-sky-400 text-sky-300";
                          sym = "🏭";
                        } else if (i < bEnd) {
                          cls = "bg-cyan-500/30 border-cyan-400 text-cyan-300";
                          sym = "🛡️";
                        } else if (i < hEnd) {
                          cls =
                            "bg-orange-500/30 border-orange-400 text-orange-300";
                          sym = "☣️";
                        }
                        return (
                          <div
                            key={i}
                            className={`h-5 rounded border flex items-center justify-center text-[10px] ${cls}`}
                          >
                            {sym || i + 1}
                          </div>
                        );
                      })}
                    </div>

                    {/* Touch Steppers for Residential & Industrial Blocks */}
                    <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                      {/* Residential Stepper */}
                      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-1.5 flex items-center justify-between">
                        <div className="min-w-0">
                          <div className="text-[10px] font-semibold text-emerald-300 flex items-center gap-1">
                            <Building2 className="w-3 h-3" /> Res (
                            {ds.residential})
                          </div>
                          <div className="text-[9px] font-mono text-muted-foreground">
                            {formatK(d.residentialCost)}/blk
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              sfx.click();
                              updateDistrict(d.id, {
                                residential: Math.max(0, ds.residential - 1),
                              });
                            }}
                            disabled={ds.residential <= 0}
                            className="w-7 h-7 rounded-lg bg-background/80 border border-border font-mono text-sm font-bold disabled:opacity-30 active:scale-95"
                          >
                            -
                          </button>
                          <button
                            onClick={() => {
                              sfx.click();
                              if (state.blocksRemainingThisTurn > 0) {
                                constructBlocks(d.id, "residential", 1, true);
                              } else {
                                updateDistrict(d.id, {
                                  residential: ds.residential + 1,
                                });
                              }
                            }}
                            disabled={blocksRemaining <= 0}
                            className="w-7 h-7 rounded-lg bg-emerald-500 text-slate-950 font-mono text-sm font-bold disabled:opacity-30 active:scale-95"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Industrial Stepper */}
                      <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 p-1.5 flex items-center justify-between">
                        <div className="min-w-0">
                          <div className="text-[10px] font-semibold text-sky-300 flex items-center gap-1">
                            <Factory className="w-3 h-3" /> Ind ({ds.industrial}
                            )
                          </div>
                          <div className="text-[9px] font-mono text-muted-foreground">
                            {formatK(d.industrialCost)}/blk
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              sfx.click();
                              updateDistrict(d.id, {
                                industrial: Math.max(0, ds.industrial - 1),
                              });
                            }}
                            disabled={ds.industrial <= 0}
                            className="w-7 h-7 rounded-lg bg-background/80 border border-border font-mono text-sm font-bold disabled:opacity-30 active:scale-95"
                          >
                            -
                          </button>
                          <button
                            onClick={() => {
                              sfx.click();
                              if (state.blocksRemainingThisTurn > 0) {
                                constructBlocks(d.id, "industrial", 1, true);
                              } else {
                                updateDistrict(d.id, {
                                  industrial: ds.industrial + 1,
                                });
                              }
                            }}
                            disabled={blocksRemaining <= 0}
                            className="w-7 h-7 rounded-lg bg-sky-400 text-slate-950 font-mono text-sm font-bold disabled:opacity-30 active:scale-95"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3D. ONE-TAP LANDMARKS, BONUS SHIELDS & HAZARD SABOTAGE */}
                  <div className="flex-1 min-h-0 rounded-xl border border-border bg-secondary/25 p-2 flex flex-col justify-between gap-1">
                    {/* Landmarks Row (Railroad, Skyscraper, Tower, Stadium) */}
                    <div className="grid grid-cols-4 gap-1">
                      <button
                        onClick={() => {
                          sfx.click();
                          updateDistrict(d.id, {
                            hasRailroad: !ds.hasRailroad,
                          });
                        }}
                        className={`py-1 px-1 rounded-lg border text-[10px] font-mono font-semibold flex flex-col items-center justify-center transition active:scale-95 ${
                          ds.hasRailroad
                            ? "border-emerald-400 bg-emerald-500/20 text-emerald-300"
                            : "border-border bg-background/50 text-muted-foreground"
                        }`}
                      >
                        <span>🚂 Rail</span>
                      </button>

                      <button
                        onClick={() => {
                          sfx.click();
                          if (ds.skyscraper) {
                            updateDistrict(d.id, { skyscraper: false });
                          } else {
                            buildSkyscraper(d.id);
                          }
                        }}
                        className={`py-1 px-1 rounded-lg border text-[10px] font-mono font-semibold flex flex-col items-center justify-center transition active:scale-95 ${
                          ds.skyscraper
                            ? "border-amber-400 bg-amber-400/20 text-amber-300"
                            : "border-border bg-background/50 text-muted-foreground"
                        }`}
                        title={`Skyscraper (${formatK(d.skyscraperCost)} - doubles Color Group rent)`}
                      >
                        <span>🏙️ Sky 2×</span>
                      </button>

                      <button
                        onClick={() => {
                          sfx.click();
                          if (ds.monopolyTower) {
                            updateDistrict(d.id, { monopolyTower: false });
                          } else {
                            buildMonopolyTower(d.id);
                          }
                        }}
                        disabled={!ds.monopolyTower && monopolyTowerBuilt}
                        className={`py-1 px-1 rounded-lg border text-[10px] font-mono font-semibold flex flex-col items-center justify-center transition active:scale-95 disabled:opacity-40 ${
                          ds.monopolyTower
                            ? "border-yellow-300 bg-yellow-400/25 text-yellow-200"
                            : "border-border bg-background/50 text-muted-foreground"
                        }`}
                        title={`Monopoly Tower (${formatK(MONOPOLY_TOWER_COST)} - doubles ALL owned districts)`}
                      >
                        <span>🗼 Tower</span>
                      </button>

                      <button
                        onClick={() => {
                          sfx.cash();
                          buyStadium(activePlayer.id);
                        }}
                        disabled={totalStadiumsBuilt >= 2}
                        className="py-1 px-1 rounded-lg border border-border bg-background/50 text-muted-foreground hover:text-foreground text-[10px] font-mono font-semibold flex flex-col items-center justify-center active:scale-95 disabled:opacity-40"
                        title={`Buy Stadium (${formatK(STADIUM_COST)} -> +M1M on GO)`}
                      >
                        <span>🏟️ +Stad</span>
                      </button>
                    </div>

                    {/* Bonus Shield Touch Pills */}
                    <div>
                      <div className="text-[9px] font-mono uppercase text-cyan-300 flex items-center gap-1 mb-0.5">
                        <ShieldCheck className="w-3 h-3" /> Bonus Shield (Blocks
                        Hazards)
                      </div>
                      <div className="grid grid-cols-5 gap-1">
                        {(
                          [
                            ["none", "None"],
                            ["School", "🏫 Sch"],
                            ["Park", "🌳 Park"],
                            ["Water Tower", "💧 Wat"],
                            ["Wind Farm", "🌬️ Wind"],
                          ] as Array<[Bonus, string]>
                        ).map(([key, label]) => (
                          <button
                            key={key}
                            onClick={() => {
                              sfx.click();
                              if (key === "none") {
                                updateDistrict(d.id, { bonus: "none" });
                              } else {
                                applyPlanningPermission(d.id, "bonus", key);
                              }
                            }}
                            className={`py-1 rounded text-[9px] font-mono font-semibold border transition active:scale-95 ${
                              ds.bonus === key
                                ? "border-cyan-400 bg-cyan-500/25 text-cyan-200"
                                : "border-border bg-background/50 text-muted-foreground"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Hazard Sabotage Touch Pills */}
                    <div>
                      <div className="flex items-center justify-between text-[9px] font-mono uppercase text-orange-300 mb-0.5">
                        <span className="flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3" /> Hazard (Ruins Res
                          Rent)
                        </span>
                        {ds.hazard !== "none" && (
                          <button
                            onClick={() => {
                              sfx.cash();
                              demolishHazard(d.id);
                            }}
                            className="text-destructive hover:underline flex items-center gap-0.5"
                          >
                            <Trash2 className="w-2.5 h-2.5" /> Demolish (
                            {formatK(res.demolitionCost)})
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-5 gap-1">
                        {(
                          [
                            ["none", "Clear"],
                            ["rubbish", "🗑️ Rub(2)"],
                            ["sewage", "🧪 Sew(3)"],
                            ["power", "⚡ Pow(3)"],
                            ["prison", "⛓️ Pris(4)"],
                          ] as Array<[HazardKey, string]>
                        ).map(([key, label]) => (
                          <button
                            key={key}
                            onClick={() => {
                              sfx.click();
                              if (key === "none") {
                                updateDistrict(d.id, { hazard: "none" });
                              } else {
                                applyPlanningPermission(d.id, "hazard", key);
                              }
                            }}
                            className={`py-1 rounded text-[9px] font-mono font-semibold border transition active:scale-95 ${
                              ds.hazard === key
                                ? "border-orange-400 bg-orange-500/25 text-orange-200"
                                : "border-border bg-background/50 text-muted-foreground"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          ) : (
            /* ==============================================================
               3E. SPECIAL BOARD SPACE INSPECTOR (PLANNING / TAX / FREE PARKING / AUCTION / CHANCE)
               ============================================================== */
            <div className="h-full flex flex-col justify-between gap-2">
              <div className="rounded-xl p-2.5 border border-primary/40 bg-primary/10 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-primary">
                    Special Board Space
                  </div>
                  <h2 className="font-display text-xl tracking-wide text-foreground">
                    {selectedInspector.spaceKind === "planning"
                      ? "🏗️ PLANNING PERMISSION"
                      : selectedInspector.spaceKind === "free_parking"
                        ? "🅿️ FREE PARKING (RENT DODGE)"
                        : selectedInspector.spaceKind === "industry_tax"
                          ? "🏭 INDUSTRY TAX"
                          : selectedInspector.spaceKind === "auction"
                            ? "🔨 AUCTION SPACE"
                            : "❓ CHANCE / JAIL / GO"}
                  </h2>
                </div>
                <button
                  onClick={() =>
                    setSelectedInspector({
                      type: "district",
                      districtId: DISTRICTS[0]!.id,
                    })
                  }
                  className="px-2.5 py-1 rounded-lg bg-secondary text-xs font-mono text-foreground"
                >
                  Back to Deed
                </button>
              </div>

              {selectedInspector.spaceKind === "planning" && (
                <div className="flex-1 rounded-xl border border-border bg-secondary/30 p-3 flex flex-col justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    Tap a <strong>Bonus</strong> (protects your district from
                    hazards) or a <strong>Hazard</strong> (sabotages a rival's
                    residential rent), then{" "}
                    <strong className="text-amber-300">
                      tap any District Tile in the center grid
                    </strong>{" "}
                    to place it!
                  </p>

                  <div className="space-y-1.5">
                    <div className="text-[10px] font-mono uppercase text-cyan-300">
                      1. Free Bonus Building (Hazard Shield)
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(
                        [
                          "School",
                          "Park",
                          "Water Tower",
                          "Wind Farm",
                        ] as Bonus[]
                      ).map((b) => (
                        <button
                          key={b}
                          onClick={() => {
                            sfx.click();
                            setPendingPlanningPick({ kind: "bonus", value: b });
                          }}
                          className={`p-2 rounded-xl border text-left text-xs font-semibold transition ${
                            pendingPlanningPick?.value === b
                              ? "border-cyan-400 bg-cyan-500/25 text-cyan-200"
                              : "border-border bg-background/60 hover:bg-secondary"
                          }`}
                        >
                          🛡️ {b} ({BONUS_BLOCKS[b]} blk)
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="text-[10px] font-mono uppercase text-orange-300">
                      2. Free Hazard Sabotage (Wipes Residential Rent)
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(
                        [
                          "rubbish",
                          "sewage",
                          "power",
                          "prison",
                        ] as HazardKey[]
                      ).map((h) => (
                        <button
                          key={h}
                          onClick={() => {
                            sfx.click();
                            setPendingPlanningPick({
                              kind: "hazard",
                              value: h,
                            });
                          }}
                          className={`p-2 rounded-xl border text-left text-xs font-semibold transition ${
                            pendingPlanningPick?.value === h
                              ? "border-orange-400 bg-orange-500/25 text-orange-200"
                              : "border-border bg-background/60 hover:bg-secondary"
                          }`}
                        >
                          ☣️ {HAZARDS[h].label} ({HAZARDS[h].blocks} blk)
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {selectedInspector.spaceKind === "free_parking" && (
                <div className="flex-1 rounded-xl border border-border bg-secondary/30 p-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-amber-300">
                      Official Free Parking Rule: Rent Dodge Card
                    </div>
                    <p className="text-xs text-muted-foreground">
                      In Monopoly City, landing on Free Parking awards the{" "}
                      <strong>Rent Dodge Card</strong> (even if another player
                      currently holds it). Play it any time you land on an
                      opponent's district to pay <strong>M0 rent</strong>!
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      sfx.reveal(3);
                      claimRentDodge(activePlayer.id);
                    }}
                    className="w-full py-3 rounded-xl bg-amber-400 text-slate-950 font-display text-lg tracking-wider shadow-lg active:scale-95"
                  >
                    🛡️ CLAIM RENT DODGE FOR {activePlayer.name.toUpperCase()}
                  </button>
                </div>
              )}

              {selectedInspector.spaceKind === "industry_tax" && (
                <div className="flex-1 rounded-xl border border-border bg-secondary/30 p-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-foreground">
                      {activePlayer.name} owns{" "}
                      <span className="text-sky-300 font-mono">
                        {activeStats.industrialBlockCount} Industrial Block(s)
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      If you own 1 or more Industrial blocks anywhere on the
                      board, pay <strong>M2M</strong>. If you own 0 Industrial
                      blocks, you pay <strong>M0</strong>!
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      onClick={() => {
                        sfx.cash();
                        payIndustryTax(activePlayer.id, false);
                      }}
                      className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-display text-lg tracking-wider shadow active:scale-95"
                    >
                      {activeStats.industrialBlockCount > 0
                        ? `💸 PAY M2M INDUSTRY TAX`
                        : `✅ RECORD M0 TAX (0 INDUSTRIAL)`}
                    </button>
                  </div>
                </div>
              )}

              {selectedInspector.spaceKind === "auction" && (
                <div className="flex-1 rounded-xl border border-border bg-secondary/30 p-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-amber-300">
                      Auction Space Rule
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Pick any <strong>unowned district</strong> in the center
                      grid, press the red <strong>AUCTION</strong> button to
                      start the secret 50-second timer, and bid out loud in real
                      life! When the unit buzzes <strong>SOLD</strong>, tap the
                      winning player's pill on that district.
                    </p>
                  </div>
                  <button
                    onClick={triggerAuctionUnit}
                    className="w-full py-3 rounded-xl bg-destructive text-white font-display text-lg tracking-wider shadow active:scale-95"
                  >
                    🔨 START 50s AUCTION TIMER NOW
                  </button>
                </div>
              )}

              {(selectedInspector.spaceKind === "chance" ||
                selectedInspector.spaceKind === "jail" ||
                selectedInspector.spaceKind === "go_to_jail" ||
                selectedInspector.spaceKind === "go") && (
                <div className="flex-1 rounded-xl border border-border bg-secondary/30 p-3 flex flex-col justify-between gap-2">
                  <div className="text-xs font-semibold text-foreground">
                    Quick Card & Cash Actions for {activePlayer.name}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => {
                        sfx.cash();
                        passGo(activePlayer.id);
                      }}
                      className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold"
                    >
                      +GO ({formatK(activeStats.goSalary)})
                    </button>
                    <button
                      onClick={() => {
                        sfx.click();
                        updatePlayer(activePlayer.id, {
                          inJail: !activePlayer.inJail,
                          position: 10,
                        });
                      }}
                      className="p-2 rounded-xl bg-destructive/20 border border-destructive/40 text-destructive font-mono text-xs font-bold flex items-center justify-center gap-1"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      {activePlayer.inJail ? "Release Jail" : "Send to Jail"}
                    </button>
                    <button
                      onClick={() => {
                        sfx.cash();
                        adjustCash(activePlayer.id, 1000, "Chance +M1M");
                      }}
                      className="p-2 rounded-xl bg-secondary border border-border font-mono text-xs text-emerald-300"
                    >
                      +M1M Cash
                    </button>
                    <button
                      onClick={() => {
                        sfx.cash();
                        adjustCash(activePlayer.id, -1000, "Chance -M1M");
                      }}
                      className="p-2 rounded-xl bg-secondary border border-border font-mono text-xs text-destructive"
                    >
                      -M1M Cash
                    </button>
                    <button
                      onClick={() => {
                        sfx.cash();
                        adjustCash(activePlayer.id, 500, "Chance +M500k");
                      }}
                      className="p-2 rounded-xl bg-secondary border border-border font-mono text-xs text-emerald-300"
                    >
                      +M500k Cash
                    </button>
                    <button
                      onClick={() => {
                        sfx.cash();
                        adjustCash(activePlayer.id, -500, "Chance -M500k");
                      }}
                      className="p-2 rounded-xl bg-secondary border border-border font-mono text-xs text-destructive"
                    >
                      -M500k Cash
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
