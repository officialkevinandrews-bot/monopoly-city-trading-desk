import {
  Trophy,
  BookOpen,
  Undo2,
  Clock,
  Wallet,
  Banknote,
  ShieldCheck,
  Maximize2,
  Minimize2,
  Settings,
  ArrowRight,
  Coins,
  Plus,
  Trash2,
  Crown,
  RotateCcw,
  X,
  Sparkles,
  Building2,
  Download,
  Smartphone,
} from "lucide-react";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { getSpaceShortName } from "@/lib/board-spaces";
import { GameStoreProvider, useGameStore } from "@/lib/game-store";
import {
  APK_DOWNLOAD_PATH,
  APK_FILENAME,
  initNativeEnhancements,
  isRunningInAndroidApk,
} from "@/lib/native-bridge";
import {
  GROUP_COLORS,
  formatK,
  getDistrictName,
  type BoardEdition,
} from "@/lib/rent";

export function AppShell({
  children,
  scrollable = false,
}: {
  children: ReactNode;
  scrollable?: boolean;
}) {
  return (
    <GameStoreProvider>
      <AppShellInner scrollable={scrollable}>{children}</AppShellInner>
    </GameStoreProvider>
  );
}

function AppShellInner({
  children,
  scrollable = false,
}: {
  children: ReactNode;
  scrollable?: boolean;
}) {
  const {
    state,
    activeModal,
    setActiveModal,
    sessionRunning,
    setSessionRunning,
    resetTimer,
    canUndo,
    undo,
    setBankingMode,
    setEdition,
    setActivePlayerIndex,
    nextTurn,
    passGo,
    addPlayer,
    removePlayer,
    updatePlayer,
    adjustCash,
    claimRentDodge,
    resetGame,
    getPlayerStats,
    allPlayerStats,
  } = useGameStore();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [inApk, setInApk] = useState(false);
  const [viewport, setViewport] = useState<{ w: number; h: number }>({
    w: 1280,
    h: 800,
  });
  const [rulesTab, setRulesTab] = useState<"diff" | "buildings" | "rules">(
    "diff"
  );
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    setInApk(isRunningInAndroidApk());
    const cleanupNative = initNativeEnhancements();

    const updateSize = () => {
      setViewport({
        w: window.innerWidth || 1280,
        h: window.innerHeight || 800,
      });
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    window.addEventListener("orientationchange", updateSize);

    const onFsChange = () =>
      setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFsChange);
    return () => {
      cleanupNative();
      window.removeEventListener("resize", updateSize);
      window.removeEventListener("orientationchange", updateSize);
      document.removeEventListener("fullscreenchange", onFsChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      void document.documentElement
        .requestFullscreen()
        .then(() => {
          try {
            const scr = window.screen as Screen & {
              orientation?: { lock?: (o: string) => Promise<void> };
            };
            void scr.orientation?.lock?.("landscape")?.catch(() => {});
          } catch {
            // Ignore on unsupported browsers
          }
        })
        .catch(() => {});
    } else {
      void document.exitFullscreen().catch(() => {});
    }
  };

  // Universal Landscape Auto-Scaler for both Android Phones & Tablets
  const MIN_W = 1180;
  const MIN_H = 665;
  let cockpitStyle: CSSProperties | undefined;
  if (!scrollable) {
    const { w, h } = viewport;
    if (w < h) {
      // Device is held in portrait in a browser: auto-rotate 90deg into landscape!
      const landW = h;
      const landH = w;
      const scale = Math.min(landW / MIN_W, landH / MIN_H, 1);
      cockpitStyle = {
        position: "fixed",
        top: 0,
        left: 0,
        width: `${landW / scale}px`,
        height: `${landH / scale}px`,
        transformOrigin: "0 0",
        transform: `translate(${w}px, 0px) rotate(90deg) scale(${scale})`,
      };
    } else {
      const scale = Math.min(w / MIN_W, h / MIN_H, 1);
      if (scale < 0.999) {
        cockpitStyle = {
          position: "fixed",
          top: 0,
          left: 0,
          width: `${w / scale}px`,
          height: `${h / scale}px`,
          transformOrigin: "0 0",
          transform: `scale(${scale})`,
        };
      }
    }
  }

  const activePlayer =
    state.players[state.activePlayerIndex] ?? state.players[0]!;
  const activeStats = getPlayerStats(activePlayer.id);

  const mm = String(Math.floor(state.sessionSeconds / 60)).padStart(2, "0");
  const ss = String(state.sessionSeconds % 60).padStart(2, "0");

  const bestWorth = Math.max(...allPlayerStats.map((s) => s.netWorth), 0);
  const leaders = allPlayerStats.filter(
    (s) => s.netWorth === bestWorth && bestWorth > 0
  );

  return (
    <div
      style={cockpitStyle}
      className={`${
        scrollable
          ? "min-h-screen overflow-y-auto"
          : cockpitStyle
            ? "flex flex-col overflow-hidden select-none"
            : "flex h-dvh w-screen flex-col overflow-hidden select-none"
      } bg-background text-foreground`}
    >
      {/* COMPACT LANDSCAPE TABLET TOP HUD */}
      <header className="shrink-0 border-b border-border bg-card/95 px-3 py-1.5 backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          {/* Left: Brand & Fullscreen */}
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={toggleFullscreen}
              title="Toggle Fullscreen for Tablet"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground active:scale-95 hover:text-foreground"
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
            <div className="leading-none">
              <div className="font-display text-sm font-black tracking-wider">
                <span className="text-primary led-text">MONOPOLY</span>{" "}
                <span>CITY</span>
              </div>
              <div className="text-[10px] font-semibold text-muted-foreground">
                Turn {state.turnNumber} ·{" "}
                {state.edition === "city"
                  ? "City"
                  : state.edition.toUpperCase()}{" "}
                · {state.bankingMode === "digital" ? "Digital Bank" : "Paper Cash"}
              </div>
            </div>
          </div>

          {/* Center: Touch Player Turn Pills + Pass GO + Next Turn */}
          <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5 overflow-x-auto py-0.5">
            {state.players.map((p, idx) => {
              const isCurrent = idx === state.activePlayerIndex;
              const pStats = getPlayerStats(p.id);
              const isRentDodge = state.rentDodgeHolderId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActivePlayerIndex(idx)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-2.5 py-1 text-left transition-all active:scale-95 ${
                    isCurrent
                      ? "border-primary bg-primary/20 shadow-sm ring-1 ring-primary"
                      : "border-border bg-background/70 opacity-80 hover:opacity-100"
                  }`}
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full ring-1 ring-white/30"
                    style={{ background: p.color }}
                  />
                  <div className="leading-tight">
                    <div className="flex items-center gap-1 text-xs font-bold text-foreground">
                      <span>{p.name}</span>
                      {p.inJail && (
                        <span className="rounded bg-destructive px-1 text-[9px] font-black text-white">
                          JAIL
                        </span>
                      )}
                      {isRentDodge && (
                        <ShieldCheck
                          className="h-3.5 w-3.5 text-emerald-400"
                          title="Holds Rent Dodge Card"
                        />
                      )}
                      {p.stadiums > 0 && (
                        <span className="text-[10px] text-amber-300">
                          🏟️×{p.stadiums}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span className="font-display font-bold text-primary">
                        {state.bankingMode === "digital"
                          ? formatK(p.cash)
                          : `Worth ${formatK(pStats.totalDistrictRentValue)}`}
                      </span>
                      <span>·</span>
                      <span className="truncate max-w-[95px]">
                        @ {getSpaceShortName(p.position ?? 0, state.edition)}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => passGo(activePlayer.id)}
              className="flex h-9 shrink-0 items-center gap-1 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-2.5 text-xs font-bold text-emerald-300 active:scale-95"
              title="Collect Pass GO Salary"
            >
              <Coins className="h-3.5 w-3.5" />
              +GO ({formatK(activeStats.goSalary)})
            </button>

            <button
              type="button"
              onClick={() =>
                nextTurn(Boolean(state.lastDiceRoll?.isDoubles && !activePlayer.inJail))
              }
              className="flex h-9 shrink-0 items-center gap-1 rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground shadow active:scale-95"
            >
              {state.lastDiceRoll?.isDoubles && !activePlayer.inJail
                ? "Doubles! Roll Again"
                : "Next Turn"}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Right: Clock, Undo & Modal Triggers */}
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSessionRunning((r) => !r)}
              className={`flex h-9 items-center gap-1.5 rounded-xl border px-2.5 font-display text-xs font-bold active:scale-95 ${
                state.timeUp
                  ? "border-primary bg-primary/25 text-primary led-flash"
                  : sessionRunning
                    ? "border-primary/60 bg-secondary text-primary"
                    : "border-border bg-background text-muted-foreground"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>{state.timeUp ? "TIME UP!" : `${mm}:${ss}`}</span>
            </button>

            <button
              type="button"
              disabled={!canUndo}
              onClick={undo}
              title="Undo Last Action"
              className="flex h-9 items-center gap-1 rounded-xl border border-border bg-background px-2.5 text-xs font-bold text-muted-foreground active:scale-95 disabled:opacity-30"
            >
              <Undo2 className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveModal(
                  activeModal === "scoreboard" ? "none" : "scoreboard"
                )
              }
              className={`flex h-9 items-center gap-1 rounded-xl border px-2.5 text-xs font-bold active:scale-95 ${
                activeModal === "scoreboard"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground"
              }`}
            >
              <Trophy className="h-4 w-4 text-primary" />
              <span className="hidden sm:inline">Players</span>
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveModal(activeModal === "rules" ? "none" : "rules")
              }
              className={`flex h-9 items-center gap-1 rounded-xl border px-2.5 text-xs font-bold active:scale-95 ${
                activeModal === "rules"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground"
              }`}
            >
              <BookOpen className="h-4 w-4 text-primary" />
              <span className="hidden sm:inline">Rules</span>
            </button>

            {!inApk && (
              <a
                href={APK_DOWNLOAD_PATH}
                download={APK_FILENAME}
                title="Download Android App (.APK) for Tablets & Phones"
                className="flex h-9 items-center gap-1 rounded-xl border border-emerald-500/50 bg-emerald-500/15 px-2.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/25 active:scale-95"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download App</span>
              </a>
            )}

            <button
              type="button"
              onClick={() =>
                setActiveModal(activeModal === "setup" ? "none" : "setup")
              }
              title="Board Edition & Banking Setup"
              className={`flex h-9 w-9 items-center justify-center rounded-xl border active:scale-95 ${
                activeModal === "setup"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground"
              }`}
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN ZERO-SCROLL COCKPIT AREA */}
      <main className="min-h-0 flex-1 overflow-hidden">{children}</main>

      {/* ===================================================================== */}
      {/* TOUCH OVERLAY MODAL 1: PLAYERS, CASH & NET WORTH SCOREBOARD           */}
      {/* ===================================================================== */}
      {activeModal === "scoreboard" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="flex max-h-[90dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <div className="flex items-center gap-3">
                <Trophy className="h-5 w-5 text-primary" />
                <div>
                  <h2 className="font-display text-base font-bold">
                    PLAYERS, CASH & LIVE NET WORTH
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Net Worth = Cash + Current Active Rent Value of All Owned
                    Districts
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={state.players.length >= 6}
                  onClick={() => addPlayer()}
                  className="flex h-9 items-center gap-1 rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" /> Add Player ({state.players.length}
                  /6)
                </button>

                {!confirmReset ? (
                  <button
                    type="button"
                    onClick={() => setConfirmReset(true)}
                    className="flex h-9 items-center gap-1 rounded-xl border border-border bg-background px-3 text-xs font-bold text-muted-foreground"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> New Game
                  </button>
                ) : (
                  <div className="flex items-center gap-1 rounded-xl border border-primary bg-primary/20 px-2.5 py-1 text-xs">
                    <span className="font-bold text-primary">Reset All?</span>
                    <button
                      type="button"
                      onClick={() => {
                        resetGame({
                          playerNames: state.players.map((p) => p.name),
                        });
                        setConfirmReset(false);
                      }}
                      className="rounded bg-primary px-2 py-0.5 font-bold text-primary-foreground"
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmReset(false)}
                      className="rounded border border-border px-2 py-0.5"
                    >
                      No
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setActiveModal("none")}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {leaders.length > 0 && (
                <div className="lcd-bezel mb-4 flex items-center justify-between rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Crown className="h-7 w-7 text-primary led-text" />
                    <div>
                      <div className="font-display text-[10px] tracking-widest text-primary/70">
                        {state.timeUp ? "FINAL WINNER" : "CURRENT LEADER"}
                      </div>
                      <div className="font-display text-lg text-primary led-text">
                        {leaders.map((l) => l.player.name).join(" & ")} ·{" "}
                        {formatK(bestWorth)}
                      </div>
                    </div>
                  </div>
                  {state.timeUp && (
                    <button
                      type="button"
                      onClick={() => resetTimer(true)}
                      className="rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
                    >
                      Play Another Hour
                    </button>
                  )}
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {allPlayerStats.map((stats) => {
                  const p = stats.player;
                  const hasRentDodge = state.rentDodgeHolderId === p.id;
                  return (
                    <div
                      key={p.id}
                      className="flex flex-col justify-between rounded-xl border border-border bg-background/80 p-3"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-4 w-4 rounded-full"
                              style={{ background: p.color }}
                            />
                            <span className="font-display text-sm font-bold">
                              {p.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => claimRentDodge(p.id)}
                              className={`rounded-lg border px-2 py-1 text-[10px] font-bold ${
                                hasRentDodge
                                  ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                                  : "border-border text-muted-foreground"
                              }`}
                            >
                              {hasRentDodge ? "🛡️ Rent Dodge" : "Give Dodge"}
                            </button>
                            {state.players.length > 2 && (
                              <button
                                type="button"
                                onClick={() => removePlayer(p.id)}
                                className="rounded p-1 text-muted-foreground hover:text-primary"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Touch-First Cash Display & Quick Tap Buttons */}
                        <div className="mt-2.5 rounded-lg border border-border bg-card p-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-muted-foreground">
                              Cash on Hand
                            </span>
                            <span className="font-display text-base font-bold text-foreground">
                              {formatK(p.cash)}
                            </span>
                          </div>
                          <div className="mt-2 grid grid-cols-4 gap-1 text-[11px] font-bold">
                            {[
                              { label: "-1M", val: -1000 },
                              { label: "-500k", val: -500 },
                              { label: "+500k", val: 500 },
                              { label: "+1M", val: 1000 },
                            ].map((btn) => (
                              <button
                                key={btn.label}
                                type="button"
                                onClick={() =>
                                  adjustCash(
                                    p.id,
                                    btn.val,
                                    `Manual ${btn.label}`
                                  )
                                }
                                className={`rounded-lg border py-1.5 active:scale-95 ${
                                  btn.val > 0
                                    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                                    : "border-border bg-secondary text-muted-foreground"
                                }`}
                              >
                                {btn.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Stadiums & Jail */}
                        <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1">
                            <span>🏟️ Stadiums:</span>
                            <button
                              type="button"
                              disabled={p.stadiums <= 0}
                              onClick={() =>
                                updatePlayer(p.id, {
                                  stadiums: Math.max(0, p.stadiums - 1),
                                })
                              }
                              className="px-1.5 font-bold disabled:opacity-30"
                            >
                              -
                            </button>
                            <strong className="font-display">
                              {p.stadiums}
                            </strong>
                            <button
                              type="button"
                              disabled={p.stadiums >= 2}
                              onClick={() =>
                                updatePlayer(p.id, {
                                  stadiums: Math.min(2, p.stadiums + 1),
                                })
                              }
                              className="px-1.5 font-bold disabled:opacity-30"
                            >
                              +
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              updatePlayer(p.id, { inJail: !p.inJail })
                            }
                            className={`rounded-lg border px-2.5 py-1 font-bold ${
                              p.inJail
                                ? "border-primary bg-primary/20 text-primary"
                                : "border-border bg-card text-muted-foreground"
                            }`}
                          >
                            {p.inJail ? "🔒 In Jail" : "Not in Jail"}
                          </button>
                        </div>

                        {/* Owned Districts */}
                        <div className="mt-2.5">
                          <div className="flex justify-between text-[11px] font-semibold text-muted-foreground">
                            <span>
                              Districts ({stats.ownedDistricts.length})
                            </span>
                            <span>
                              Rent Sum:{" "}
                              <strong className="text-foreground">
                                {formatK(stats.totalDistrictRentValue)}
                              </strong>
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {stats.ownedDistricts.map((d) => (
                              <span
                                key={d.district.id}
                                className="flex items-center gap-1 rounded border border-border bg-card px-1.5 py-0.5 text-[10px] font-semibold"
                              >
                                <span
                                  className="h-2 w-2 rounded-xs"
                                  style={{
                                    background: GROUP_COLORS[d.district.group],
                                  }}
                                />
                                #{d.district.number}{" "}
                                {getDistrictName(d.district, state.edition)} (
                                {formatK(d.rentResult.rent)})
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-border pt-2">
                        <span className="text-xs font-bold text-muted-foreground">
                          TOTAL NET WORTH
                        </span>
                        <span className="font-display text-xl text-primary led-text">
                          {formatK(stats.netWorth)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TOUCH OVERLAY MODAL 2: RULES & 3D BUILDING GUIDE                      */}
      {/* ===================================================================== */}
      {activeModal === "rules" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="flex max-h-[90dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <h2 className="font-display text-base font-bold">
                  MONOPOLY CITY — QUICK GUIDE & REFEREE
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex rounded-xl border border-border bg-background p-0.5 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setRulesTab("diff")}
                    className={`rounded-lg px-3 py-1.5 ${
                      rulesTab === "diff"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    5 Key Differences
                  </button>
                  <button
                    type="button"
                    onClick={() => setRulesTab("buildings")}
                    className={`rounded-lg px-3 py-1.5 ${
                      rulesTab === "buildings"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    3D Buildings
                  </button>
                  <button
                    type="button"
                    onClick={() => setRulesTab("rules")}
                    className={`rounded-lg px-3 py-1.5 ${
                      rulesTab === "rules"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    All Rules
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveModal("none")}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 text-xs leading-relaxed">
              {rulesTab === "diff" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    {
                      t: "1. Build Immediately (No Color Set Needed!)",
                      b: "You can build Residential and Industrial blocks on ANY district you own right away — you do NOT need the whole color group first! Owning a full color group unlocks Skyscrapers (2× rent).",
                    },
                    {
                      t: "2. Press BUILD on the Trading Unit Each Turn",
                      b: "After moving and resolving your space, press BUILD. It spins to 1, 2, or 3 (max blocks you can buy this turn) or 'r' (place 1 Railroad on any district for free!).",
                    },
                    {
                      t: "3. Residential vs. Industrial & Hazards",
                      b: "Residential blocks are half price, but if a rival places a black Hazard on your district via Planning Permission, all Residential blocks there earn M0! Industrial blocks cost 2× as much but are 100% immune to Hazards.",
                    },
                    {
                      t: "4. Unbought Districts MUST Be Auctioned",
                      b: "When you land on an unowned district, buy it at the printed price OR press AUCTION on the Trading Unit. Bidding starts at M10k until the 30–50s buzzer sounds.",
                    },
                    {
                      t: "5. Mortgage = Current Rent & 1-Hour Winner",
                      b: "Mortgaging a district gives you its CURRENT RENT VALUE (including buildings!). When the 1-hour timer ends, Net Worth = Cash + Current Rent Value of every unmortgaged district you own.",
                    },
                    {
                      t: "6. Free Parking = Stealable Rent Dodge Card",
                      b: "Landing on Free Parking gives you the Rent Dodge card — even taking it from another player who holds it! Play it once to skip paying rent, then return it to Free Parking.",
                    },
                  ].map((item) => (
                    <div
                      key={item.t}
                      className="rounded-xl border border-border bg-background/80 p-3.5"
                    >
                      <div className="font-display text-sm font-bold text-primary">
                        {item.t}
                      </div>
                      <p className="mt-1.5 text-muted-foreground">{item.b}</p>
                    </div>
                  ))}
                </div>
              )}

              {rulesTab === "buildings" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    {
                      n: "🏘️ Residential Blocks (Beige/Gray)",
                      c: "M500k–M2M / block",
                      d: "Cheaper way to raise rent, but wiped out to M0 if an unshielded Hazard is placed on the district.",
                    },
                    {
                      n: "🏭 Industrial Blocks (Light Blue)",
                      c: "M1M–M4M / block",
                      d: "Immune to Hazards! Always counts toward rent. Owning ≥1 Industrial block triggers M2M Industry Tax when landing on Industry Tax.",
                    },
                    {
                      n: "🛡️ Bonus Buildings (School, Park, Water, Wind)",
                      c: "FREE (Planning Permission)",
                      d: "Shields the district permanently: Hazards cannot be built there and any existing Hazard has no effect.",
                    },
                    {
                      n: "☣️ Hazards (Rubbish 2, Sewage 3, Power 3, Prison 4)",
                      c: "FREE (Planning Permission)",
                      d: "Placed on rival districts to zero out Residential rent. Owner can demolish for M500k per block occupied.",
                    },
                    {
                      n: "🏙️ Skyscraper (Requires Full Color Group)",
                      c: "M2M–M5M",
                      d: "Doubles (×2) the rent of ALL districts in that color group!",
                    },
                    {
                      n: "🗼 Monopoly Tower (Requires 2 Full Color Groups)",
                      c: "M7M (Only 1 in game)",
                      d: "Doubles (×2) the rent of ALL districts you own! Does not stack past ×2 with Skyscrapers.",
                    },
                    {
                      n: "🏟️ Stadium (Requires ≥2 Owned Districts)",
                      c: "M2M (Max 2 in game)",
                      d: "Adds +M1M extra salary every time you pass GO! District still collects its normal rent.",
                    },
                    {
                      n: "🚂 Railroad (Spun on Trading Unit)",
                      c: "FREE (Max 8 in game)",
                      d: "Landing on a district with a Railroad lets you jump to any other Railroad district (pay rent first if owned by a rival).",
                    },
                  ].map((b) => (
                    <div
                      key={b.n}
                      className="rounded-xl border border-border bg-background/80 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-display font-bold text-foreground">
                          {b.n}
                        </span>
                        <span className="rounded bg-secondary px-2 py-0.5 text-[10px] font-bold text-primary">
                          {b.c}
                        </span>
                      </div>
                      <p className="mt-1.5 text-muted-foreground">{b.d}</p>
                    </div>
                  ))}
                </div>
              )}

              {rulesTab === "rules" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    {
                      t: "In Jail Rules",
                      b: "While in Jail you STILL collect rent, press BUILD, construct buildings, mortgage, and trade! Pay M500k before rolling, use a Get Out of Jail Free card, or roll doubles to leave.",
                    },
                    {
                      t: "Industry Tax",
                      b: "Pay M2M to the Bank ONLY if you own ≥1 Industrial block anywhere on the board. If you own 0 Industrial blocks, pay M0!",
                    },
                    {
                      t: "8-Block District Limit",
                      b: "Each district holds at most 8 blocks total (Residential + Industrial + Hazard/Bonus footprint). Skyscrapers, Stadiums, and the Monopoly Tower are exempt from the 8-block limit.",
                    },
                    {
                      t: "3× Doubles Rule",
                      b: "Rolling doubles gives you another full turn (Roll + Build again!). Rolling doubles 3 times in a row sends you straight to Jail.",
                    },
                  ].map((r) => (
                    <div
                      key={r.t}
                      className="rounded-xl border border-border bg-background/80 p-3.5"
                    >
                      <div className="font-display font-bold text-primary">
                        {r.t}
                      </div>
                      <p className="mt-1.5 text-muted-foreground">{r.b}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TOUCH OVERLAY MODAL 3: BOARD EDITION & BANKING SETUP                  */}
      {/* ===================================================================== */}
      {activeModal === "setup" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="font-display text-base font-bold">
                TABLET & GAME SETTINGS
              </h2>
              <button
                type="button"
                onClick={() => setActiveModal("none")}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <div className="text-xs font-bold text-muted-foreground uppercase">
                  1. Physical Board District Names
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {(
                    [
                      {
                        id: "city",
                        title: "Monopoly City",
                        sub: "Summergate → Diamond Hills",
                      },
                      {
                        id: "uk",
                        title: "UK Classic",
                        sub: "Old Kent Rd → Mayfair",
                      },
                      {
                        id: "us",
                        title: "US Classic",
                        sub: "Mediterranean → Boardwalk",
                      },
                    ] as const
                  ).map((ed) => (
                    <button
                      key={ed.id}
                      type="button"
                      onClick={() => setEdition(ed.id as BoardEdition)}
                      className={`rounded-xl border p-3 text-left ${
                        state.edition === ed.id
                          ? "border-primary bg-primary/20"
                          : "border-border bg-background"
                      }`}
                    >
                      <div className="font-display text-xs font-bold">
                        {ed.title}
                      </div>
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        {ed.sub}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-muted-foreground uppercase">
                  2. Money & Banking Mode
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBankingMode("digital")}
                    className={`rounded-xl border p-3 text-left ${
                      state.bankingMode === "digital"
                        ? "border-primary bg-primary/20"
                        : "border-border bg-background"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-display text-xs font-bold">
                      <Wallet className="h-4 w-4 text-primary" /> Digital
                      Banking
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      App tracks M15M starting cash, GO salary, purchases, and
                      rent transfers automatically.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBankingMode("physical")}
                    className={`rounded-xl border p-3 text-left ${
                      state.bankingMode === "physical"
                        ? "border-primary bg-primary/20"
                        : "border-border bg-background"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-display text-xs font-bold">
                      <Banknote className="h-4 w-4 text-amber-400" /> Paper Cash
                      Mode
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Use physical Monopoly bills at the table while the app
                      tracks districts, buildings, and live rent.
                    </p>
                  </button>
                </div>
              </div>

              {/* 3. Android App (.APK) Download Section */}
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5 font-display text-xs font-bold text-emerald-300">
                      <Smartphone className="h-4 w-4" />
                      {inApk
                        ? "Android Native APK Active"
                        : "Install on Android Tablet or Phone (.APK)"}
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {inApk
                        ? "Running in offline landscape fullscreen mode with Wake Lock and Haptic Vibration."
                        : "100% offline standalone Android app with auto-landscape scaling, Wake Lock, and Haptic Vibration."}
                    </p>
                  </div>
                  {!inApk && (
                    <a
                      href={APK_DOWNLOAD_PATH}
                      download={APK_FILENAME}
                      className="flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-bold text-slate-950 shadow hover:brightness-105 active:scale-95"
                    >
                      <Download className="h-4 w-4" />
                      Download APK
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
