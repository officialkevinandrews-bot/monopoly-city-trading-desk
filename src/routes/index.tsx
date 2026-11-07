import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  TrainFront,
  Volume2,
  VolumeX,
  Sparkles,
  Gavel,
  Hammer,
  ArrowRight,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Building2,
  Factory,
  Compass,
  CheckCircle2,
  Coins,
  HelpCircle,
  Trophy,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SevenSeg } from "@/components/SevenSeg";
import { sfx, setMuted, setVolume } from "@/lib/audio";
import { useGameStore } from "@/lib/game-store";
import {
  BONUSES,
  GROUP_COLORS,
  HAZARDS,
  MAX_BLOCKS,
  MONOPOLY_TOWER_COST,
  STADIUM_COST,
  formatK,
  getDistrictName,
  getDistrictSubtitle,
  type Bonus,
  type HazardKey,
} from "@/lib/rent";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Monopoly City Trading Unit & Game Companion" },
      {
        name: "description",
        content:
          "Complete Monopoly City electronic trading unit replica and step-by-step board game companion with live rent, building, hazard, and auction tracking.",
      },
      {
        property: "og:title",
        content: "Monopoly City Trading Unit & Game Companion",
      },
      {
        property: "og:description",
        content:
          "Build spinner, mystery auction timer, 60-minute game timer, and interactive turn guide for Monopoly City.",
      },
    ],
  }),
  component: TradingUnitCompanion,
});

type UnitMode = "idle" | "spin" | "result" | "auction" | "sold";
type SpaceActionType =
  | "district"
  | "planning"
  | "auction_space"
  | "free_parking"
  | "industry_tax"
  | "chance_jail";

const CHASE = ["a", "b", "c", "d", "e", "f"];
const HOUR = 60 * 60;

function TradingUnitCompanion() {
  const {
    state,
    sessionRunning,
    setSessionRunning,
    resetTimer,
    setUiMode,
    setTurnStep,
    nextTurn,
    passGo,
    payIndustryTax,
    claimRentDodge,
    buyDistrict,
    recordBuildSpin,
    constructBlocks,
    placeFreeRailroad,
    applyPlanningPermission,
    demolishHazard,
    buildSkyscraper,
    buildMonopolyTower,
    buyStadium,
    payRentOnDistrict,
    updatePlayer,
    allDistrictInfos,
    getDistrictInfo,
    getPlayerStats,
    totalStadiumsBuilt,
    monopolyTowerBuilt,
  } = useGameStore();

  const activePlayer =
    state.players[state.activePlayerIndex] ?? state.players[0]!;
  const activeStats = getPlayerStats(activePlayer.id);

  // Hardware unit local animation state
  const [mode, setMode] = useState<UnitMode>("idle");
  const [result, setResult] = useState<string>(state.lastBuildRoll || "");
  const [spinFrame, setSpinFrame] = useState(0);
  const [auctionLeft, setAuctionLeft] = useState(0);
  const [muted, setMute] = useState(false);
  const [vol, setVol] = useState(0.6);
  const timers = useRef<number[]>([]);
  const [idleFrame, setIdleFrame] = useState(0);

  // Interactive companion state
  const [spaceType, setSpaceType] = useState<SpaceActionType>("district");
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>(
    allDistrictInfos[0]!.district.id
  );
  const [districtFilter, setDistrictFilter] = useState("");

  // Auction resolution state
  const [auctionDistrictId, setAuctionDistrictId] = useState<string>(
    allDistrictInfos[0]!.district.id
  );
  const [auctionWinnerId, setAuctionWinnerId] = useState<string>(
    activePlayer.id
  );
  const [auctionBidInput, setAuctionBidInput] = useState<string>("100");

  // Planning Permission state
  const [planningKind, setPlanningKind] = useState<"bonus" | "hazard">("hazard");
  const [planningBonus, setPlanningBonus] = useState<Bonus>("School");
  const [planningHazard, setPlanningHazard] = useState<HazardKey>("sewage");
  const [planningTargetId, setPlanningTargetId] = useState<string>(
    allDistrictInfos[0]!.district.id
  );

  // Build assistant target district when player owns 0 districts or wants to pick any
  const [buildTargetId, setBuildTargetId] = useState<string>(
    allDistrictInfos[0]!.district.id
  );

  useEffect(() => {
    setAuctionWinnerId(activePlayer.id);
  }, [activePlayer.id]);

  useEffect(() => {
    setMuted(muted);
  }, [muted]);
  useEffect(() => {
    setVolume(vol);
  }, [vol]);

  const clearAll = () => {
    timers.current.forEach((t) => {
      clearInterval(t);
      clearTimeout(t);
    });
    timers.current = [];
  };
  useEffect(() => clearAll, []);

  // Idle chase animation on 7-seg
  useEffect(() => {
    if (mode !== "idle") return;
    const t = window.setInterval(() => setIdleFrame((f) => f + 1), 180);
    return () => clearInterval(t);
  }, [mode]);

  // Warn beeps near 60-min mark
  useEffect(() => {
    if (!sessionRunning) return;
    const s = state.sessionSeconds;
    if (s >= HOUR - 300 && s < HOUR && s % 30 === 0) {
      sfx.warn();
    } else if (s === HOUR) {
      sfx.alarm();
    }
  }, [sessionRunning, state.sessionSeconds]);

  const build = () => {
    sfx.unlock();
    sfx.press();
    if (mode === "auction") return;
    clearAll();
    setMode("spin");
    const outcomes = ["1", "2", "3", "r"] as const;
    const total = 1400 + Math.random() * 900;
    const start = Date.now();
    const iv = window.setInterval(() => {
      setSpinFrame((f) => f + 1);
      sfx.click();
      if (Date.now() - start > total) {
        clearInterval(iv);
        const r = outcomes[Math.floor(Math.random() * 4)]!;
        setResult(r);
        setMode("result");
        recordBuildSpin(r);
        if (r === "r") {
          sfx.train();
        } else {
          sfx.result();
        }
      }
    }, 55);
    timers.current.push(iv);
  };

  const startAuction = (preselectDistrictId?: string) => {
    sfx.unlock();
    sfx.press();
    clearAll();
    if (preselectDistrictId) {
      setAuctionDistrictId(preselectDistrictId);
    } else {
      const firstUnowned = allDistrictInfos.find((d) => !d.state.ownerId);
      if (firstUnowned) setAuctionDistrictId(firstUnowned.district.id);
    }
    setAuctionWinnerId(activePlayer.id);
    setAuctionBidInput("100");
    const dur = 30 + Math.floor(Math.random() * 21);
    const end = Date.now() + dur * 1000;
    setAuctionLeft(dur);
    setMode("auction");
    let n = 0;
    const iv = window.setInterval(() => {
      const left = (end - Date.now()) / 1000;
      setAuctionLeft(left);
      if (left <= 0) {
        clearInterval(iv);
        sfx.buzzer();
        setMode("sold");
        return;
      }
      n++;
      if (left <= 5) {
        sfx.warn();
      } else if (n % 4 === 0) {
        (n % 8 === 0 ? sfx.tock : sfx.tick)();
      }
    }, 250);
    timers.current.push(iv);
  };

  const stopUnit = () => {
    sfx.press();
    clearAll();
    setMode("idle");
  };

  let text = "    ";
  let segs: (string | undefined)[] | undefined = undefined;
  let displayClass = "";
  if (mode === "idle") {
    const s = CHASE[idleFrame % 6];
    text = "----";
    segs = ["g", s, s, "g"];
  } else if (mode === "spin") {
    text = "8888";
    segs = [0, 1, 2, 3].map(
      (i) => CHASE[(spinFrame + i) % 6]! + CHASE[(spinFrame + i + 3) % 6]!
    );
  } else if (mode === "result") {
    text = result === "r" ? "  r " : ` ${result}  `;
    displayClass = "animate-pulse";
  } else if (mode === "auction") {
    text = "AUC ";
    segs = [
      undefined,
      undefined,
      undefined,
      CHASE[Math.floor(auctionLeft * 4) % 6],
    ];
    displayClass = auctionLeft <= 5 ? "led-flash-fast" : "led-pulse";
  } else if (mode === "sold") {
    text = "SOLd";
    displayClass = "led-flash";
  }

  const mm = String(Math.floor(state.sessionSeconds / 60)).padStart(2, "0");
  const ss = String(state.sessionSeconds % 60).padStart(2, "0");

  const selectedInfo = getDistrictInfo(selectedDistrictId);
  const auctionInfo = getDistrictInfo(auctionDistrictId);
  const planningTargetInfo = getDistrictInfo(planningTargetId);
  const filteredDistricts = allDistrictInfos.filter((item) => {
    const q = districtFilter.trim().toLowerCase();
    if (!q) return true;
    return (
      item.district.cityName.toLowerCase().includes(q) ||
      item.district.ukName.toLowerCase().includes(q) ||
      item.district.usName.toLowerCase().includes(q) ||
      String(item.district.number) === q
    );
  });

  const railroadDistricts = allDistrictInfos.filter(
    (d) => d.state.hasRailroad
  );

  return (
    <AppShell>
      {/* Top Active Player Turn Banner & Companion Mode Switcher */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3.5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className="h-4 w-4 rounded-full ring-2 ring-white/20"
              style={{ background: activePlayer.color }}
            />
            <div>
              <div className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                Turn {state.turnNumber} · Active Developer
              </div>
              <div className="font-display text-lg text-foreground">
                {activePlayer.name}
                {state.bankingMode === "digital" && (
                  <span className="ml-2 text-primary led-text">
                    {formatK(activePlayer.cash)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => passGo(activePlayer.id)}
              className="flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25"
            >
              <Coins className="h-3.5 w-3.5" />
              Pass GO (+{formatK(activeStats.goSalary)})
            </button>

            <button
              type="button"
              onClick={() =>
                updatePlayer(activePlayer.id, { inJail: !activePlayer.inJail })
              }
              className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold ${
                activePlayer.inJail
                  ? "border-primary bg-primary/20 text-primary"
                  : "border-border bg-secondary/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              {activePlayer.inJail ? "In Jail (Tap to Leave)" : "Send to Jail"}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-border bg-background p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setUiMode("guided")}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 font-semibold transition-colors ${
                state.uiMode === "guided"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Compass className="h-3.5 w-3.5" />
              Guided Turn
            </button>
            <button
              type="button"
              onClick={() => setUiMode("dashboard")}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 font-semibold transition-colors ${
                state.uiMode === "dashboard"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Quick Desk
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setMode("idle");
              nextTurn(true);
            }}
            className="rounded-md border border-border bg-secondary px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary/80"
            title="Rolled doubles? Take another full turn!"
          >
            Doubles (Again)
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("idle");
              nextTurn(false);
            }}
            className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90"
          >
            End Turn <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Main Two-Column Tabletop Layout */}
      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        {/* LEFT COLUMN: Electronic Trading Unit Hardware & Inline Action Modals */}
        <div className="space-y-4">
          <div className="chassis rounded-[2.5rem] p-5 sm:p-6">
            <div className="mb-3 flex items-center justify-between px-1">
              <span className="font-display text-xs tracking-[0.28em] text-chassis-ink">
                TRADING UNIT
              </span>
              <span className="h-2.5 w-2.5 rounded-full bg-primary led-dot" />
            </div>

            <div className="lcd-bezel rounded-2xl p-4">
              <div
                className={`flex min-h-24 items-center justify-center gap-3 ${displayClass}`}
              >
                <SevenSeg text={text} segs={segs} size={68} />
                {mode === "result" && result === "r" && (
                  <TrainFront className="h-11 w-11 text-primary led-text" />
                )}
              </div>
              <div className="mt-2 flex justify-between font-display text-[10px] tracking-widest text-primary/80">
                <span>
                  {mode === "result"
                    ? result === "r"
                      ? "FREE RAILROAD"
                      : `BUILD UP TO ${result} BLOCK${result === "1" ? "" : "S"}`
                    : mode === "auction"
                      ? auctionLeft <= 5
                        ? "FINAL 5 SECONDS!"
                        : "AUCTION OPEN · BID NOW!"
                      : mode === "sold"
                        ? "GOING… GONE! SOLD!"
                        : mode === "spin"
                          ? "SPINNING…"
                          : "READY"}
                </span>
                <span>{muted ? "MUTE" : ""}</span>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4">
              <HwButton
                label="BUILD"
                onClick={build}
                variant="red"
                disabled={mode === "auction"}
              />
              <HwButton
                label="AUCTION"
                onClick={() => startAuction()}
                variant="red"
              />
            </div>

            <div className="mt-3.5 grid grid-cols-3 gap-2.5">
              <HwButton small label="STOP" onClick={stopUnit} />
              <HwButton
                small
                label={muted ? "SOUND" : "MUTE"}
                onClick={() => setMute((m) => !m)}
                icon={
                  muted ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )
                }
              />
              <HwButton
                small
                label="CLEAR"
                onClick={() => {
                  clearAll();
                  setMode("idle");
                }}
              />
            </div>

            <label className="mt-4 flex items-center gap-3 px-1 text-xs font-semibold text-chassis-ink">
              VOL
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={vol}
                onChange={(e) => setVol(+e.target.value)}
                className="w-full accent-primary"
              />
            </label>

            <div className="lcd-bezel mt-5 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-display text-[10px] tracking-widest text-primary/70">
                    GAME TIMER · 60 MIN
                  </div>
                  <SevenSeg text={mm + ss} size={34} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <HwButton
                    small
                    label={sessionRunning ? "PAUSE" : "START"}
                    onClick={() => {
                      sfx.unlock();
                      sfx.press();
                      setSessionRunning((o) => !o);
                    }}
                  />
                  <HwButton
                    small
                    label="RESET"
                    onClick={() => {
                      sfx.press();
                      resetTimer(false);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Time's Up Alert */}
          {state.timeUp && (
            <div className="rounded-xl border border-primary bg-card p-4 text-center shadow-lg">
              <p className="font-display text-lg text-primary led-text">
                TIME'S UP! (60 MINUTES)
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                The 1-hour timer has expired! Every player's Net Worth (Cash +
                Current District Rent Values) determines the winner.
              </p>
              <div className="mt-3 flex justify-center gap-2">
                <button
                  type="button"
                  className="rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
                  onClick={() => resetTimer(true)}
                >
                  Play Another Hour
                </button>
                <Link
                  to="/scoreboard"
                  className="rounded-md border border-border bg-secondary px-4 py-2 text-xs font-semibold"
                >
                  View Final Winner →
                </Link>
              </div>
            </div>
          )}

          {/* LIVE AUCTION RESOLUTION PANEL (Shows during/after AUCTION) */}
          {(mode === "auction" || mode === "sold") && (
            <div className="panel border-primary/70 bg-card shadow-lg">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-sm tracking-wider text-primary flex items-center gap-1.5">
                  <Gavel className="h-4 w-4" />
                  {mode === "auction"
                    ? "LIVE OPEN-FLOOR AUCTION"
                    : "AUCTION ENDED — ASSIGN WINNER"}
                </h2>
                {mode === "auction" && (
                  <button
                    type="button"
                    onClick={() => {
                      clearAll();
                      sfx.buzzer();
                      setMode("sold");
                    }}
                    className="rounded bg-primary/20 px-2 py-0.5 text-[11px] font-semibold text-primary"
                  >
                    End Early
                  </button>
                )}
              </div>

              <p className="mt-1 text-xs text-muted-foreground">
                Official Rule: Bidding starts at <strong>M10k</strong> and
                anyone can shout out higher bids in any order before the red
                light/buzzer stops!
              </p>

              <div className="mt-3 space-y-2.5">
                <label className="block text-xs font-semibold text-muted-foreground">
                  District Being Auctioned
                  <select
                    value={auctionDistrictId}
                    onChange={(e) => setAuctionDistrictId(e.target.value)}
                    className="field mt-1 text-xs font-semibold"
                  >
                    {allDistrictInfos.map((info) => (
                      <option key={info.district.id} value={info.district.id}>
                        #{info.district.number}{" "}
                        {getDistrictName(info.district, state.edition)} (List:{" "}
                        {formatK(info.district.price)})
                        {info.owner ? ` · Owned by ${info.owner.name}` : " · Unowned"}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block text-xs font-semibold text-muted-foreground">
                    Highest Bidder
                    <select
                      value={auctionWinnerId}
                      onChange={(e) => setAuctionWinnerId(e.target.value)}
                      className="field mt-1 text-xs font-semibold"
                    >
                      {state.players.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}{" "}
                          {state.bankingMode === "digital"
                            ? `(${formatK(p.cash)})`
                            : ""}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-xs font-semibold text-muted-foreground">
                    Winning Bid (in k, e.g. 500 = M500k)
                    <input
                      type="number"
                      min={10}
                      step={10}
                      value={auctionBidInput}
                      onChange={(e) => setAuctionBidInput(e.target.value)}
                      className="field mt-1 text-xs font-semibold"
                    />
                  </label>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {[10, 100, 500, 1000, auctionInfo.district.price].map(
                    (preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setAuctionBidInput(String(preset))}
                        className="rounded border border-border bg-secondary/60 px-2 py-1 text-[11px] font-semibold hover:border-primary"
                      >
                        {preset === auctionInfo.district.price
                          ? `List (${formatK(preset)})`
                          : formatK(preset)}
                      </button>
                    )
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const bidK = Math.max(10, parseInt(auctionBidInput, 10) || 10);
                    buyDistrict(auctionDistrictId, auctionWinnerId, bidK);
                    setMode("idle");
                  }}
                  className="w-full rounded-lg bg-primary py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90"
                >
                  Award #{auctionInfo.district.number}{" "}
                  {getDistrictName(auctionInfo.district, state.edition)} for{" "}
                  {formatK(Math.max(10, parseInt(auctionBidInput, 10) || 10))}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Guided Turn Companion / Quick Desk & Build Assistant */}
        <div className="space-y-5">
          {/* Guided Step Progress Strip */}
          {state.uiMode === "guided" && (
            <div className="panel bg-card/90">
              <div className="flex items-center justify-between">
                <span className="panel-title mb-0 text-primary">
                  Guided Turn Step-by-Step ({activePlayer.name})
                </span>
                <span className="text-xs text-muted-foreground">
                  Tap any step to jump
                </span>
              </div>
              <div className="mt-2.5 grid grid-cols-3 gap-2">
                {(
                  [
                    {
                      id: "start",
                      step: "1. Roll & Move",
                      sub: "Check Jail / Railroads",
                    },
                    {
                      id: "land",
                      step: "2. Space Action",
                      sub: "Buy, Rent, or Hazard",
                    },
                    {
                      id: "build",
                      step: "3. Build Phase",
                      sub: "Press BUILD on Unit",
                    },
                  ] as const
                ).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setTurnStep(s.id)}
                    className={`rounded-lg border p-2.5 text-left transition-all ${
                      state.turnStep === s.id
                        ? "border-primary bg-primary/15 shadow-sm"
                        : "border-border bg-background/60 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <div className="font-display text-xs font-bold text-foreground">
                      {s.step}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {s.sub}
                    </div>
                  </button>
                ))}
              </div>

              {state.turnStep === "start" && (
                <div className="mt-3 rounded-lg border border-border bg-background/70 p-3 text-xs leading-relaxed">
                  {activePlayer.inJail ? (
                    <div className="space-y-1.5">
                      <p className="font-bold text-primary">
                        🔒 {activePlayer.name} is currently in JAIL:
                      </p>
                      <p className="text-muted-foreground">
                        • In Monopoly City, while in Jail you{" "}
                        <strong className="text-foreground">
                          STILL collect rent, build buildings, mortgage, and
                          trade
                        </strong>{" "}
                        on your turn!
                        <br />• To get out: pay <strong>M500k</strong> before
                        rolling, use a <em>Get Out of Jail Free</em> card, or
                        roll doubles.
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (state.bankingMode === "digital") {
                              updatePlayer(activePlayer.id, {
                                inJail: false,
                                cash: Math.max(0, activePlayer.cash - 500),
                              });
                            } else {
                              updatePlayer(activePlayer.id, { inJail: false });
                            }
                            setTurnStep("land");
                          }}
                          className="rounded bg-primary px-2.5 py-1 font-semibold text-primary-foreground"
                        >
                          Pay M500k Bail & Roll
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            updatePlayer(activePlayer.id, { inJail: false });
                            setTurnStep("land");
                          }}
                          className="rounded border border-border bg-secondary px-2.5 py-1 font-semibold"
                        >
                          Rolled Doubles / Used Card
                        </button>
                        <button
                          type="button"
                          onClick={() => setTurnStep("build")}
                          className="rounded border border-border bg-card px-2.5 py-1 font-semibold"
                        >
                          Stay in Jail → Skip to Build Phase
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-foreground">
                          🎲 Roll both dice and move {activePlayer.name}{" "}
                          clockwise around the board!
                        </p>
                        <p className="text-muted-foreground">
                          • Passed GO? Tap{" "}
                          <strong>Pass GO (+{formatK(activeStats.goSalary)})</strong>{" "}
                          above.
                          {railroadDistricts.length >= 2 && (
                            <>
                              {" "}
                              · 🚂 Active Railroads:{" "}
                              {railroadDistricts
                                .map(
                                  (d) =>
                                    `#${d.district.number} ${getDistrictName(d.district, state.edition)}`
                                )
                                .join(", ")}
                            </>
                          )}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTurnStep("land")}
                        className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 font-bold text-primary-foreground"
                      >
                        Resolve Space Landed On <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* BUILD PHASE ASSISTANT (Always visible when BUILD spin happens or in Build step) */}
          {(state.lastBuildRoll !== "" || state.turnStep === "build") && (
            <section className="panel border-primary/60 bg-card shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-sm tracking-wider text-primary flex items-center gap-1.5">
                  <Hammer className="h-4 w-4" />
                  TRADING UNIT BUILD PHASE ({activePlayer.name})
                </h2>
                {state.lastBuildRoll ? (
                  <span className="rounded-full bg-primary/20 px-2.5 py-0.5 font-display text-xs font-bold text-primary">
                    {state.lastBuildRoll === "r"
                      ? "🚂 FREE RAILROAD EARNED"
                      : `${state.blocksRemainingThisTurn} / ${state.lastBuildRoll} BLOCKS REMAINING`}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Press the red <strong>BUILD</strong> button on the Trading
                    Unit!
                  </span>
                )}
              </div>

              {state.lastBuildRoll === "" && (
                <div className="mt-2 flex items-center justify-between rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                  <span>
                    On your turn, press <strong>BUILD</strong> on the Trading
                    Unit to spin 1, 2, 3 blocks or a Free Railroad!
                  </span>
                  <button
                    type="button"
                    onClick={build}
                    className="rounded-md bg-primary px-3 py-1.5 font-display text-xs font-bold text-primary-foreground"
                  >
                    SPIN BUILD NOW
                  </button>
                </div>
              )}

              {/* Free Railroad Placement */}
              {state.railroadEarnedThisTurn && (
                <div className="mt-3 rounded-lg border border-primary/50 bg-primary/10 p-3">
                  <div className="flex items-center gap-2 font-display text-xs font-bold text-primary">
                    <TrainFront className="h-4 w-4" />
                    PLACE YOUR FREE RAILROAD
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Official Rule: When the Trading Unit lands on the Train
                    icon, place a Railroad on <strong>any district</strong> for
                    free! Landing on a Railroad district lets you jump to any
                    other Railroad district (after paying rent if owned by a
                    rival).
                  </p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <select
                      value={buildTargetId}
                      onChange={(e) => setBuildTargetId(e.target.value)}
                      className="field max-w-xs text-xs font-semibold"
                    >
                      {allDistrictInfos.map((d) => (
                        <option key={d.district.id} value={d.district.id}>
                          #{d.district.number}{" "}
                          {getDistrictName(d.district, state.edition)}
                          {d.owner ? ` (${d.owner.name})` : " (Unowned)"}
                          {d.state.hasRailroad ? " · Already has RR" : ""}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => placeFreeRailroad(buildTargetId)}
                      className="rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
                    >
                      Place Free Railroad
                    </button>
                  </div>
                </div>
              )}

              {/* Building Blocks on Owned Districts */}
              {state.lastBuildRoll !== "" && state.lastBuildRoll !== "r" && (
                <div className="mt-3 space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Construct up to <strong>{state.lastBuildRoll}</strong>{" "}
                    Residential (cheaper, vulnerable to hazards) or Industrial
                    (2× cost, immune to hazards) blocks across any districts you
                    own:
                  </p>

                  {activeStats.ownedDistricts.length === 0 ? (
                    <div className="rounded-lg border border-border bg-background/60 p-3 text-xs text-muted-foreground">
                      {activePlayer.name} doesn't own any districts yet. Buy or
                      win a district first (or assign ownership in the{" "}
                      <Link to="/rent" className="text-primary underline">
                        City & Rent
                      </Link>{" "}
                      tab).
                    </div>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {activeStats.ownedDistricts.map((info) => {
                        const used =
                          info.state.residential + info.state.industrial;
                        const canAdd =
                          used < MAX_BLOCKS &&
                          state.blocksRemainingThisTurn > 0;
                        const nextRent =
                          info.district.rentSchedule[Math.min(8, used + 1)] ??
                          info.rentResult.rent;
                        return (
                          <div
                            key={info.district.id}
                            className="rounded-lg border border-border bg-background/80 p-2.5 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 font-bold">
                                <span
                                  className="h-3 w-3 rounded-sm"
                                  style={{
                                    background:
                                      GROUP_COLORS[info.district.group],
                                  }}
                                />
                                <span>
                                  #{info.district.number}{" "}
                                  {getDistrictName(
                                    info.district,
                                    state.edition
                                  )}
                                </span>
                              </div>
                              <span className="text-[11px] text-muted-foreground">
                                {used}/{MAX_BLOCKS} blks · Rent:{" "}
                                <strong className="text-primary">
                                  {formatK(info.rentResult.rent)}
                                </strong>
                              </span>
                            </div>

                            <div className="mt-1 text-[11px] text-muted-foreground">
                              Res: {info.state.residential} · Ind:{" "}
                              {info.state.industrial} · +1 blk →{" "}
                              {formatK(nextRent * info.rentResult.multiplier)}
                            </div>

                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                disabled={!canAdd}
                                onClick={() =>
                                  constructBlocks(
                                    info.district.id,
                                    "residential",
                                    1,
                                    true
                                  )
                                }
                                className="flex-1 rounded border border-border bg-secondary px-2 py-1 font-semibold hover:border-primary disabled:opacity-40"
                              >
                                +1 Res ({formatK(info.district.residentialCost)})
                              </button>
                              <button
                                type="button"
                                disabled={!canAdd}
                                onClick={() =>
                                  constructBlocks(
                                    info.district.id,
                                    "industrial",
                                    1,
                                    true
                                  )
                                }
                                className="flex-1 rounded border border-sky-500/40 bg-sky-500/15 px-2 py-1 font-semibold text-sky-300 hover:bg-sky-500/25 disabled:opacity-40"
                              >
                                +1 Ind ({formatK(info.district.industrialCost)})
                              </button>
                            </div>

                            {/* Skyscraper button if full color group owned */}
                            {info.ownsFullColorGroup &&
                              !info.groupHasSkyscraper && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    buildSkyscraper(info.district.id)
                                  }
                                  className="mt-1.5 w-full rounded border border-amber-500/40 bg-amber-500/15 py-1 text-[11px] font-bold text-amber-300 hover:bg-amber-500/25"
                                >
                                  🏙️ Build Skyscraper (
                                  {formatK(info.district.skyscraperCost)}) — 2×
                                  Group Rent!
                                </button>
                              )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Special Landmark Unlocks (Stadium & Monopoly Tower) */}
              {(activeStats.eligibleForStadium ||
                activeStats.canBuildMonopolyTower) && (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-2.5">
                  {activeStats.eligibleForStadium && totalStadiumsBuilt < 2 && (
                    <button
                      type="button"
                      onClick={() => buyStadium(activePlayer.id)}
                      className="rounded-md border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25"
                    >
                      🏟️ Build Stadium ({formatK(STADIUM_COST)}) · +M1M at GO (
                      {2 - totalStadiumsBuilt} left)
                    </button>
                  )}
                  {activeStats.canBuildMonopolyTower &&
                    !monopolyTowerBuilt &&
                    activeStats.ownedDistricts[0] && (
                      <button
                        type="button"
                        onClick={() =>
                          buildMonopolyTower(
                            activeStats.ownedDistricts[0]!.district.id
                          )
                        }
                        className="rounded-md border border-amber-500/50 bg-amber-500/20 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/30"
                      >
                        🗼 Build Monopoly Tower ({formatK(MONOPOLY_TOWER_COST)})
                        — 2× ALL Owned Districts!
                      </button>
                    )}
                </div>
              )}
            </section>
          )}

          {/* SPACE ACTION RESOLVER (Where Did You Land?) */}
          <section className="panel">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="panel-title mb-0">
                Where Did {activePlayer.name} Land? (Space Resolver)
              </h2>
              <span className="text-xs text-muted-foreground">
                Select space type for instant rules & actions
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {(
                [
                  { id: "district", label: "🏘️ District (1–22)" },
                  { id: "planning", label: "🏗️ Planning Permission" },
                  { id: "auction_space", label: "🔨 Auction Space" },
                  { id: "free_parking", label: "🅿️ Free Parking (Rent Dodge)" },
                  { id: "industry_tax", label: "🏭 Industry Tax" },
                  { id: "chance_jail", label: "❓ Chance / Special" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSpaceType(tab.id)}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                    spaceType === tab.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background/70 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* 1. LANDED ON A DISTRICT */}
            {spaceType === "district" && (
              <div className="mt-4 space-y-4">
                <div>
                  <input
                    value={districtFilter}
                    onChange={(e) => setDistrictFilter(e.target.value)}
                    placeholder="Filter 22 districts by name or # (e.g. Summergate, Old Kent, 17)…"
                    className="field text-xs"
                  />
                  <div className="mt-2 grid max-h-48 grid-cols-2 gap-1.5 overflow-y-auto sm:grid-cols-3">
                    {filteredDistricts.map((item) => {
                      const selected = item.district.id === selectedDistrictId;
                      return (
                        <button
                          key={item.district.id}
                          type="button"
                          onClick={() => setSelectedDistrictId(item.district.id)}
                          className={`flex items-center justify-between gap-1.5 rounded-md border px-2 py-1.5 text-left text-xs transition-colors ${
                            selected
                              ? "border-primary bg-secondary font-bold"
                              : "border-border bg-background/60 hover:border-border/90"
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-1.5">
                            <span
                              className="h-3 w-3 shrink-0 rounded-sm"
                              style={{
                                background: GROUP_COLORS[item.district.group],
                              }}
                            />
                            <span className="truncate">
                              #{item.district.number}{" "}
                              {getDistrictName(item.district, state.edition)}
                            </span>
                          </div>
                          {item.owner && (
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ background: item.owner.color }}
                              title={`Owned by ${item.owner.name}`}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Selected District Action Card */}
                <div className="rounded-xl border border-border bg-background/80 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3.5 w-3.5 rounded-sm"
                          style={{
                            background:
                              GROUP_COLORS[selectedInfo.district.group],
                          }}
                        />
                        <h3 className="font-display text-base font-bold">
                          #{selectedInfo.district.number}{" "}
                          {getDistrictName(
                            selectedInfo.district,
                            state.edition
                          )}
                        </h3>
                        {selectedInfo.state.hasRailroad && (
                          <span className="flex items-center gap-1 rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                            <TrainFront className="h-3 w-3" /> RAILROAD
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {getDistrictSubtitle(
                          selectedInfo.district,
                          state.edition
                        )}{" "}
                        · Purchase Price:{" "}
                        <strong className="text-foreground">
                          {formatK(selectedInfo.district.price)}
                        </strong>{" "}
                        · Active Rent:{" "}
                        <strong className="text-primary">
                          {formatK(selectedInfo.rentResult.rent)}
                        </strong>
                      </p>
                    </div>

                    <div className="text-right text-xs">
                      <span className="text-muted-foreground">Owner: </span>
                      {selectedInfo.owner ? (
                        <span className="font-bold text-foreground">
                          {selectedInfo.owner.name}
                        </span>
                      ) : (
                        <span className="font-semibold text-emerald-400">
                          Unowned (Available)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Case A: Unowned District */}
                  {!selectedInfo.owner && (
                    <div className="mt-3 space-y-2.5 border-t border-border pt-3">
                      <p className="text-xs text-muted-foreground">
                        <strong>Official Rule:</strong> When you land on an
                        unowned district, you may buy it for the printed price (
                        <strong>{formatK(selectedInfo.district.price)}</strong>
                        ). If you decline to buy it,{" "}
                        <strong className="text-foreground">
                          it MUST immediately go to a Trading Unit Auction
                        </strong>{" "}
                        starting at M10k!
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            buyDistrict(
                              selectedInfo.district.id,
                              activePlayer.id
                            );
                            setTurnStep("build");
                          }}
                          className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90"
                        >
                          Buy for {formatK(selectedInfo.district.price)} (
                          {activePlayer.name})
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            startAuction(selectedInfo.district.id)
                          }
                          className="flex items-center gap-1.5 rounded-lg border border-primary bg-primary/15 px-4 py-2 text-xs font-bold text-primary hover:bg-primary/25"
                        >
                          <Gavel className="h-3.5 w-3.5" />
                          Decline & Start 50s Auction
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Case B: Owned by Another Player */}
                  {selectedInfo.owner &&
                    selectedInfo.owner.id !== activePlayer.id && (
                      <div className="mt-3 space-y-2.5 border-t border-border pt-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-xs">
                            <span className="text-muted-foreground">
                              Rent owed to{" "}
                              <strong>{selectedInfo.owner.name}</strong>:{" "}
                            </span>
                            <span className="font-display text-lg font-bold text-primary led-text">
                              {formatK(selectedInfo.rentResult.rent)}
                            </span>
                            <span className="ml-2 text-muted-foreground">
                              ({selectedInfo.rentResult.effectiveBlocks} counted
                              blks ×{selectedInfo.rentResult.multiplier})
                            </span>
                          </div>
                        </div>

                        {selectedInfo.rentResult.hazardActive && (
                          <div className="flex items-center gap-1.5 rounded bg-destructive/20 px-2.5 py-1.5 text-xs text-foreground">
                            <ShieldAlert className="h-4 w-4 text-primary" />
                            <span>
                              {HAZARDS[selectedInfo.state.hazard].label} is
                              active here — {selectedInfo.state.residential}{" "}
                              Residential block(s) earn M0!
                            </span>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              payRentOnDistrict(
                                selectedInfo.district.id,
                                activePlayer.id,
                                false
                              );
                              setTurnStep("build");
                            }}
                            className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90"
                          >
                            Pay {formatK(selectedInfo.rentResult.rent)} Rent to{" "}
                            {selectedInfo.owner.name}
                          </button>

                          {state.rentDodgeHolderId === activePlayer.id && (
                            <button
                              type="button"
                              onClick={() => {
                                payRentOnDistrict(
                                  selectedInfo.district.id,
                                  activePlayer.id,
                                  true
                                );
                                setTurnStep("build");
                              }}
                              className="flex items-center gap-1.5 rounded-lg border border-emerald-500 bg-emerald-500/20 px-4 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30"
                            >
                              <ShieldCheck className="h-4 w-4" />
                              Use Rent Dodge Card (Pay M0!)
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                  {/* Case C: Owned by Current Player */}
                  {selectedInfo.owner &&
                    selectedInfo.owner.id === activePlayer.id && (
                      <div className="mt-3 space-y-2 border-t border-border pt-3 text-xs">
                        <p className="text-emerald-400 font-semibold">
                          ✓ You already own this district! No rent is due.
                        </p>
                        {selectedInfo.state.hazard !== "none" && (
                          <div className="flex flex-wrap items-center justify-between gap-2 rounded bg-destructive/15 p-2">
                            <span>
                              ⚠️ Has{" "}
                              <strong>
                                {HAZARDS[selectedInfo.state.hazard].label}
                              </strong>{" "}
                              ({HAZARDS[selectedInfo.state.hazard].blocks}{" "}
                              blocks). You can demolish it for{" "}
                              <strong>
                                {formatK(
                                  selectedInfo.rentResult.demolitionCost
                                )}
                              </strong>
                              .
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                demolishHazard(selectedInfo.district.id)
                              }
                              className="rounded bg-primary px-2.5 py-1 font-bold text-primary-foreground"
                            >
                              Demolish Hazard (
                              {formatK(selectedInfo.rentResult.demolitionCost)})
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                  {/* Railroad Teleport Reminder */}
                  {selectedInfo.state.hasRailroad && (
                    <div className="mt-2.5 rounded-md border border-primary/40 bg-primary/10 p-2 text-xs text-muted-foreground">
                      🚂 <strong>Railroad Station Here:</strong> After resolving
                      rent/purchase on this district, {activePlayer.name} may
                      immediately jump to any other district with a Railroad and
                      resolve that space too!
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. LANDED ON PLANNING PERMISSION */}
            {spaceType === "planning" && (
              <div className="mt-4 space-y-3 rounded-xl border border-border bg-background/80 p-4 text-xs">
                <p className="text-muted-foreground leading-relaxed">
                  <strong>Official Planning Permission Rule:</strong> Choose ONE
                  for free:
                  <br />• <strong>Option A (Sabotage):</strong> Place a{" "}
                  <strong className="text-primary">Hazard</strong> on an
                  opponent's (or unowned) district that does NOT have a Bonus
                  building, wiping out all Residential rent there!
                  <br />• <strong>Option B (Protect):</strong> Place a{" "}
                  <strong className="text-emerald-400">Bonus Building</strong>{" "}
                  on your own (or unowned) district to permanently block
                  Hazards!
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPlanningKind("hazard")}
                    className={`flex-1 rounded-lg border py-2 font-bold ${
                      planningKind === "hazard"
                        ? "border-primary bg-primary/20 text-primary"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    ☣️ Place a Hazard (Sabotage)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlanningKind("bonus")}
                    className={`flex-1 rounded-lg border py-2 font-bold ${
                      planningKind === "bonus"
                        ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    🛡️ Place a Bonus Building (Protect)
                  </button>
                </div>

                {planningKind === "hazard" ? (
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap gap-1.5">
                      {(["rubbish", "sewage", "power", "prison"] as const).map(
                        (hk) => (
                          <button
                            key={hk}
                            type="button"
                            onClick={() => setPlanningHazard(hk)}
                            className={`rounded-md border px-2.5 py-1.5 font-semibold ${
                              planningHazard === hk
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-card text-muted-foreground"
                            }`}
                          >
                            {HAZARDS[hk].label} ({HAZARDS[hk].blocks} blks)
                          </button>
                        )
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {HAZARDS[planningHazard].description}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {BONUSES.filter((b) => b !== "none").map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setPlanningBonus(b)}
                        className={`rounded-md border px-2.5 py-1.5 font-semibold ${
                          planningBonus === b
                            ? "border-emerald-500 bg-emerald-500 text-black"
                            : "border-border bg-card text-muted-foreground"
                        }`}
                      >
                        {b} (Shields District)
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <select
                    value={planningTargetId}
                    onChange={(e) => setPlanningTargetId(e.target.value)}
                    className="field max-w-xs text-xs font-semibold"
                  >
                    {allDistrictInfos.map((d) => (
                      <option key={d.district.id} value={d.district.id}>
                        #{d.district.number}{" "}
                        {getDistrictName(d.district, state.edition)}
                        {d.owner ? ` (${d.owner.name})` : " (Unowned)"}
                        {d.state.bonus !== "none"
                          ? ` · Shielded by ${d.state.bonus}`
                          : ""}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    disabled={
                      planningKind === "hazard" &&
                      planningTargetInfo.state.bonus !== "none"
                    }
                    onClick={() => {
                      applyPlanningPermission(
                        planningTargetId,
                        planningKind,
                        planningKind === "hazard"
                          ? planningHazard
                          : planningBonus
                      );
                      setTurnStep("build");
                    }}
                    className="rounded-lg bg-primary px-4 py-2 font-bold text-primary-foreground disabled:opacity-40"
                  >
                    Apply{" "}
                    {planningKind === "hazard"
                      ? HAZARDS[planningHazard].label
                      : planningBonus}
                  </button>
                </div>
                {planningKind === "hazard" &&
                  planningTargetInfo.state.bonus !== "none" && (
                    <p className="text-emerald-400">
                      🛡️ This district is protected by a{" "}
                      <strong>{planningTargetInfo.state.bonus}</strong> —
                      Hazards cannot be placed here!
                    </p>
                  )}
              </div>
            )}

            {/* 3. LANDED ON AUCTION SPACE */}
            {spaceType === "auction_space" && (
              <div className="mt-4 space-y-3 rounded-xl border border-border bg-background/80 p-4 text-xs">
                <p className="text-muted-foreground">
                  <strong>Official Auction Space Rule:</strong> Choose{" "}
                  <strong>any unowned district</strong> on the board and put it
                  up for public auction using the Trading Unit (bidding starts
                  at M10k)!
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={auctionDistrictId}
                    onChange={(e) => setAuctionDistrictId(e.target.value)}
                    className="field max-w-xs text-xs font-semibold"
                  >
                    {allDistrictInfos
                      .filter((d) => !d.owner)
                      .map((d) => (
                        <option key={d.district.id} value={d.district.id}>
                          #{d.district.number}{" "}
                          {getDistrictName(d.district, state.edition)} (List:{" "}
                          {formatK(d.district.price)})
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => startAuction(auctionDistrictId)}
                    className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 font-bold text-primary-foreground"
                  >
                    <Gavel className="h-4 w-4" />
                    Start 50s Trading Unit Auction
                  </button>
                </div>
              </div>
            )}

            {/* 4. LANDED ON FREE PARKING (RENT DODGE) */}
            {spaceType === "free_parking" && (
              <div className="mt-4 space-y-3 rounded-xl border border-border bg-background/80 p-4 text-xs">
                <p className="text-muted-foreground">
                  <strong>Official Free Parking & Rent Dodge Rule:</strong>{" "}
                  Landing on Free Parking gives {activePlayer.name} the{" "}
                  <strong>Rent Dodge Card</strong>! If another player currently
                  has it and hasn't used it yet, they must hand it over to{" "}
                  {activePlayer.name}.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    claimRentDodge(activePlayer.id);
                    setTurnStep("build");
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-500"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Give Rent Dodge Card to {activePlayer.name}
                </button>
              </div>
            )}

            {/* 5. LANDED ON INDUSTRY TAX */}
            {spaceType === "industry_tax" && (
              <div className="mt-4 space-y-3 rounded-xl border border-border bg-background/80 p-4 text-xs">
                <p className="text-muted-foreground">
                  <strong>Official Industry Tax Rule:</strong> Pay{" "}
                  <strong>M2M</strong> to the Bank ONLY if you own at least 1
                  Industrial building anywhere on the board. If you own 0
                  Industrial buildings, you pay <strong>M0</strong>!
                </p>
                <div className="rounded-lg border border-border bg-card p-3">
                  {activeStats.industrialBlockCount === 0 ? (
                    <p className="font-bold text-emerald-400">
                      ✓ {activePlayer.name} owns 0 Industrial blocks — Industry
                      Tax is M0!
                    </p>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-primary">
                        🏭 {activePlayer.name} owns{" "}
                        {activeStats.industrialBlockCount} Industrial block(s) —
                        owes M2M Industry Tax!
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            payIndustryTax(activePlayer.id, false);
                            setTurnStep("build");
                          }}
                          className="rounded-md bg-primary px-3 py-1.5 font-bold text-primary-foreground"
                        >
                          Pay M2M Industry Tax
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            payIndustryTax(activePlayer.id, true);
                            setTurnStep("build");
                          }}
                          className="rounded-md border border-border bg-secondary px-3 py-1.5 font-semibold"
                        >
                          Use Tax Dodge Card (Pay M0)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 6. CHANCE / SPECIAL SPACES */}
            {spaceType === "chance_jail" && (
              <div className="mt-4 space-y-3 rounded-xl border border-border bg-background/80 p-4 text-xs">
                <p className="font-semibold text-foreground">
                  Common Monopoly City Chance (?) Card Actions:
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg border border-border bg-card p-2.5">
                    <div className="font-bold text-primary">
                      ☣️ Toxic Waste Card
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      Pay M1M for every Sewage Plant on your districts, or go to
                      Jail!
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-2.5">
                    <div className="font-bold text-primary">
                      💣 Demolition / Steal
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      Use the{" "}
                      <Link to="/rent" className="text-primary underline">
                        City & Rent
                      </Link>{" "}
                      tab to clear blocks on a target district or reassign its
                      owner!
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* LIVE GAME ACTIVITY LOG */}
          <section className="panel">
            <div className="flex items-center justify-between">
              <h2 className="panel-title mb-0">Live Game Feed</h2>
              <span className="text-[11px] text-muted-foreground">
                {state.logs.length} events recorded
              </span>
            </div>
            <ul className="mt-2 max-h-36 space-y-1.5 overflow-y-auto text-xs">
              {state.logs.slice(0, 12).map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-start gap-2 border-b border-border/40 pb-1 last:border-none"
                >
                  <span className="font-display text-[10px] text-muted-foreground">
                    [{entry.time}]
                  </span>
                  <span className="text-foreground/90">{entry.text}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function HwButton({
  label,
  onClick,
  variant,
  small,
  disabled,
  icon,
}: {
  label: string;
  onClick: () => void;
  variant?: "red";
  small?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`hw-btn ${
        variant === "red" ? "hw-btn-red" : ""
      } flex items-center justify-center gap-1 rounded-2xl font-display font-bold tracking-widest disabled:opacity-50 ${
        small ? "py-2.5 text-xs" : "py-5 text-lg"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
