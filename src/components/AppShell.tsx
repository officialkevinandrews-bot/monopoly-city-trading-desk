import { Link } from "@tanstack/react-router";
import {
  Cpu,
  Building2,
  Trophy,
  BookOpen,
  Undo2,
  Clock,
  Wallet,
  Banknote,
  Globe,
  ShieldCheck,
} from "lucide-react";
import type { ReactNode } from "react";
import { useGameStore } from "@/lib/game-store";
import { formatK, type BoardEdition } from "@/lib/rent";

const tabs = [
  { to: "/", label: "Trading Desk", short: "Desk", icon: Cpu },
  { to: "/rent", label: "City & Rent", short: "City", icon: Building2 },
  { to: "/scoreboard", label: "Players & Worth", short: "Players", icon: Trophy },
  { to: "/rules", label: "Rules & Guide", short: "Rules", icon: BookOpen },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const {
    state,
    sessionRunning,
    setSessionRunning,
    canUndo,
    undo,
    setBankingMode,
    setEdition,
    setActivePlayerIndex,
    getPlayerStats,
  } = useGameStore();

  const activePlayer =
    state.players[state.activePlayerIndex] ?? state.players[0]!;
  const activeStats = getPlayerStats(activePlayer.id);
  const rentDodgeHolder = state.players.find(
    (p) => p.id === state.rentDodgeHolderId
  );

  const mm = String(Math.floor(state.sessionSeconds / 60)).padStart(2, "0");
  const ss = String(state.sessionSeconds % 60).padStart(2, "0");
  const timeRemaining = Math.max(0, 3600 - state.sessionSeconds);
  const remMm = String(Math.floor(timeRemaining / 60)).padStart(2, "0");
  const remSs = String(timeRemaining % 60).padStart(2, "0");

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-10">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2.5">
          <div className="flex items-center gap-3">
            <Link to="/" className="font-display text-base tracking-widest sm:text-lg">
              <span className="text-primary led-text">MONOPOLY</span>{" "}
              <span className="text-foreground">CITY</span>
            </Link>
            <span className="hidden rounded-full border border-border bg-secondary/60 px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground sm:inline-block">
              Turn {state.turnNumber}
            </span>
          </div>

          <nav className="hidden gap-1 md:flex">
            {tabs.map((t) => (
              <Link
                key={t.to}
                to={t.to}
                activeOptions={{ exact: true }}
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{ className: "bg-secondary text-primary" }}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            {/* 60-Min Game Clock Pill */}
            <button
              type="button"
              onClick={() => setSessionRunning((r) => !r)}
              title={
                sessionRunning
                  ? "Click to pause 60-minute game timer"
                  : "Click to start/resume 60-minute game timer"
              }
              className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-display text-xs transition-colors ${
                state.timeUp
                  ? "border-primary bg-primary/20 text-primary led-flash"
                  : sessionRunning
                    ? "border-primary/60 bg-secondary text-primary"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>{state.timeUp ? "TIME UP" : `${mm}:${ss}`}</span>
              <span className="hidden text-[10px] text-muted-foreground sm:inline">
                ({remMm}:{remSs} left)
              </span>
            </button>

            {/* Board Edition Selector */}
            <div className="flex items-center rounded-md border border-border bg-card px-1.5 py-1 text-xs">
              <Globe className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
              <select
                aria-label="Board Edition Names"
                value={state.edition}
                onChange={(e) => setEdition(e.target.value as BoardEdition)}
                className="bg-transparent font-semibold text-foreground outline-none"
              >
                <option value="city" className="bg-card text-foreground">
                  City Names
                </option>
                <option value="uk" className="bg-card text-foreground">
                  UK Board
                </option>
                <option value="us" className="bg-card text-foreground">
                  US Board
                </option>
              </select>
            </div>

            {/* Banking Mode Toggle */}
            <button
              type="button"
              onClick={() =>
                setBankingMode(
                  state.bankingMode === "digital" ? "physical" : "digital"
                )
              }
              title="Switch between Digital Banking (app tracks cash) and Paper Cash mode"
              className="flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              {state.bankingMode === "digital" ? (
                <>
                  <Wallet className="h-3.5 w-3.5 text-primary" />
                  <span className="hidden sm:inline">Digital Bank</span>
                </>
              ) : (
                <>
                  <Banknote className="h-3.5 w-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Paper Cash</span>
                </>
              )}
            </button>

            {/* Undo Button */}
            <button
              type="button"
              disabled={!canUndo}
              onClick={undo}
              title="Undo last game action"
              className="flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-35"
            >
              <Undo2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Undo</span>
            </button>
          </div>
        </div>

        {/* Active Player & Status Strip */}
        <div className="border-t border-border/60 bg-card/70">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-1.5 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-display text-[10px] tracking-wider text-muted-foreground uppercase">
                Turn:
              </span>
              {state.players.map((p, idx) => {
                const isCurrent = idx === state.activePlayerIndex;
                const pStats = getPlayerStats(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setActivePlayerIndex(idx)}
                    className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-semibold transition-all ${
                      isCurrent
                        ? "border-primary bg-primary/15 text-foreground shadow-sm"
                        : "border-border/70 bg-background/60 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: p.color }}
                    />
                    <span>{p.name}</span>
                    {state.bankingMode === "digital" && (
                      <span className="font-display text-[11px] text-primary">
                        {formatK(p.cash)}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      ({pStats.ownedDistricts.length}d)
                    </span>
                    {p.inJail && (
                      <span className="rounded bg-destructive/30 px-1 text-[9px] text-primary">
                        JAIL
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span>
                Active Rent Income:{" "}
                <strong className="text-foreground">
                  {formatK(activeStats.totalDistrictRentValue)}
                </strong>
              </span>
              {rentDodgeHolder && (
                <span className="flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-emerald-300">
                  <ShieldCheck className="h-3 w-3" />
                  Rent Dodge: {rentDodgeHolder.name}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-border bg-card/95 backdrop-blur md:hidden">
        {tabs.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            activeOptions={{ exact: true }}
            className="flex flex-col items-center gap-1 py-2 text-[11px] font-semibold text-muted-foreground"
            activeProps={{ className: "text-primary" }}
          >
            <t.icon className="h-5 w-5" />
            {t.short}
          </Link>
        ))}
      </nav>
    </div>
  );
}
