import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Crown,
  Plus,
  Trash2,
  RotateCcw,
  Coins,
  ArrowLeftRight,
  Building2,
  ShieldCheck,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useGameStore } from "@/lib/game-store";
import {
  GROUP_COLORS,
  formatK,
  getDistrictName,
} from "@/lib/rent";

export const Route = createFileRoute("/scoreboard")({
  head: () => ({
    meta: [
      { title: "Monopoly City — Live Net Worth Scoreboard & Player Portfolios" },
      {
        name: "description",
        content:
          "Live Monopoly City scoreboard: automatically tallies player cash plus the active rent value of all owned districts to crown the winner.",
      },
      {
        property: "og:title",
        content: "Monopoly City — Live Net Worth Scoreboard & Player Portfolios",
      },
      {
        property: "og:description",
        content:
          "End-game and live net worth tally: cash plus district rent values decides the winner.",
      },
    ],
  }),
  component: Scoreboard,
});

function Scoreboard() {
  const {
    state,
    allPlayerStats,
    addPlayer,
    removePlayer,
    updatePlayer,
    adjustCash,
    transferCash,
    passGo,
    assignDistrictOwner,
    claimRentDodge,
    resetGame,
  } = useGameStore();

  const [confirmReset, setConfirmReset] = useState(false);
  const [fromPlayerId, setFromPlayerId] = useState(state.players[0]?.id ?? "");
  const [toPlayerId, setToPlayerId] = useState(state.players[1]?.id ?? "");
  const [transferAmountK, setTransferAmountK] = useState("500");
  const [tradeDistrictId, setTradeDistrictId] = useState("");

  const bestWorth = Math.max(...allPlayerStats.map((s) => s.netWorth), 0);
  const leaders = allPlayerStats.filter(
    (s) => s.netWorth === bestWorth && bestWorth > 0
  );

  return (
    <AppShell scrollable>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl tracking-wide">
            Players & Net Worth Scoreboard
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Official Winning Rule: <strong>Net Worth</strong> ={" "}
            <strong>Cash on Hand</strong> +{" "}
            <strong>Current Rent Value of Every Owned District</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={state.players.length >= 6}
            onClick={() => addPlayer()}
            className="flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-40"
          >
            <Plus className="h-4 w-4" /> Add Player ({state.players.length}/6)
          </button>

          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="flex items-center gap-1 rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" /> New Game
            </button>
          ) : (
            <div className="flex items-center gap-1.5 rounded-md border border-primary bg-primary/15 px-2.5 py-1 text-xs">
              <span className="font-semibold text-primary">Reset board?</span>
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
        </div>
      </div>

      {/* Leader / Winner Banner */}
      {leaders.length > 0 && (
        <div className="lcd-bezel mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Crown className="h-8 w-8 text-primary led-text" />
            <div>
              <div className="font-display text-xs tracking-widest text-primary/70">
                {state.timeUp
                  ? leaders.length > 1
                    ? "FINAL TIE!"
                    : "FINAL WINNER!"
                  : leaders.length > 1
                    ? "CURRENT TIE FOR 1ST"
                    : "CURRENT RICHEST DEVELOPER"}
              </div>
              <div className="font-display text-xl text-primary led-text">
                {leaders.map((l) => l.player.name).join(" & ")} ·{" "}
                {formatK(bestWorth)}
              </div>
            </div>
          </div>

          <div className="text-right text-xs text-muted-foreground">
            <div>
              Banking Mode:{" "}
              <strong className="text-foreground uppercase">
                {state.bankingMode}
              </strong>
            </div>
            <div>
              {state.bankingMode === "physical"
                ? "Type each player's paper cash below to calculate final net worth!"
                : "Cash & district rents update automatically as you play."}
            </div>
          </div>
        </div>
      )}

      {/* Player Portfolio Cards */}
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {allPlayerStats.map((stats) => {
          const p = stats.player;
          const isLeader = leaders.some((l) => l.player.id === p.id);
          const hasRentDodge = state.rentDodgeHolderId === p.id;

          return (
            <div
              key={p.id}
              className={`panel flex flex-col justify-between ${
                isLeader ? "border-primary shadow-md" : ""
              }`}
            >
              <div>
                {/* Player Header */}
                <div className="flex items-center gap-2">
                  <span
                    className="h-4 w-4 shrink-0 rounded-full"
                    style={{ background: p.color }}
                  />
                  <input
                    aria-label="Player Name"
                    className="field font-display text-sm font-bold"
                    value={p.name}
                    onChange={(e) =>
                      updatePlayer(p.id, { name: e.target.value })
                    }
                  />
                  {state.players.length > 2 && (
                    <button
                      type="button"
                      aria-label="Remove player"
                      onClick={() => removePlayer(p.id)}
                      className="rounded p-2 text-muted-foreground hover:text-primary"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Cash & Quick Adjustments */}
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="block text-xs font-semibold text-muted-foreground">
                    Cash in thousands (k) — e.g. 15000 = M15M
                    <input
                      inputMode="numeric"
                      className="field mt-1 font-display text-sm font-bold text-foreground"
                      value={String(p.cash)}
                      onChange={(e) =>
                        updatePlayer(p.id, {
                          cash: Math.max(0, parseInt(e.target.value, 10) || 0),
                        })
                      }
                      placeholder="0"
                    />
                  </label>

                  <div className="flex flex-col justify-end gap-1">
                    <div className="text-[11px] font-semibold text-muted-foreground">
                      Quick Cash Actions
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => passGo(p.id)}
                        className="rounded border border-emerald-500/40 bg-emerald-500/15 px-2 py-1 text-[11px] font-bold text-emerald-300"
                      >
                        +GO ({formatK(stats.goSalary)})
                      </button>
                      <button
                        type="button"
                        onClick={() => adjustCash(p.id, 1000, "Manual +M1M")}
                        className="rounded border border-border bg-secondary px-2 py-1 text-[11px] font-semibold"
                      >
                        +M1M
                      </button>
                      <button
                        type="button"
                        onClick={() => adjustCash(p.id, -1000, "Manual -M1M")}
                        className="rounded border border-border bg-secondary px-2 py-1 text-[11px] font-semibold"
                      >
                        -M1M
                      </button>
                    </div>
                  </div>
                </div>

                {/* Status Badges (Stadiums, Rent Dodge, Jail) */}
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <div className="flex items-center gap-1 rounded-md border border-border bg-background/60 px-2 py-1">
                    <span>🏟️ Stadiums:</span>
                    <button
                      type="button"
                      disabled={p.stadiums <= 0}
                      onClick={() =>
                        updatePlayer(p.id, {
                          stadiums: Math.max(0, p.stadiums - 1),
                        })
                      }
                      className="px-1 font-bold disabled:opacity-30"
                    >
                      -
                    </button>
                    <strong className="font-display">{p.stadiums}</strong>
                    <button
                      type="button"
                      disabled={p.stadiums >= 2}
                      onClick={() =>
                        updatePlayer(p.id, {
                          stadiums: Math.min(2, p.stadiums + 1),
                        })
                      }
                      className="px-1 font-bold disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => claimRentDodge(p.id)}
                    className={`flex items-center gap-1 rounded-md border px-2 py-1 font-semibold ${
                      hasRentDodge
                        ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                        : "border-border bg-background/60 text-muted-foreground"
                    }`}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {hasRentDodge ? "Holds Rent Dodge" : "Give Rent Dodge"}
                  </button>
                </div>

                {/* Owned Districts List */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                    <span>
                      Owned Districts ({stats.ownedDistricts.length})
                    </span>
                    <span>
                      District Rent Total:{" "}
                      <strong className="text-foreground">
                        {formatK(stats.totalDistrictRentValue)}
                      </strong>
                    </span>
                  </div>

                  {stats.ownedDistricts.length === 0 ? (
                    <p className="mt-1.5 rounded border border-dashed border-border p-2 text-xs text-muted-foreground">
                      No districts assigned yet. Assign districts on the{" "}
                      <Link to="/" className="text-primary underline">
                        Trading Desk
                      </Link>{" "}
                      or{" "}
                      <Link to="/rent" className="text-primary underline">
                        City & Rent
                      </Link>{" "}
                      page.
                    </p>
                  ) : (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {stats.ownedDistricts.map((info) => (
                        <Link
                          key={info.district.id}
                          to="/rent"
                          className="flex items-center gap-1.5 rounded-md border border-border bg-background/80 px-2 py-1 text-xs hover:border-primary"
                        >
                          <span
                            className="h-2.5 w-2.5 rounded-sm"
                            style={{
                              background: GROUP_COLORS[info.district.group],
                            }}
                          />
                          <span className="font-semibold">
                            #{info.district.number}{" "}
                            {getDistrictName(info.district, state.edition)}
                          </span>
                          <span className="font-display text-primary">
                            {info.state.mortgaged
                              ? "MORT"
                              : formatK(info.rentResult.rent)}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Net Worth Footer */}
              <div className="mt-4 flex items-center justify-between border-t border-border pt-2.5 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Net Worth</span>
                  <div className="text-[11px] text-muted-foreground">
                    Cash ({formatK(p.cash)}) + Districts (
                    {formatK(stats.totalDistrictRentValue)})
                  </div>
                </div>
                <span className="font-display text-2xl text-primary led-text">
                  {formatK(stats.netWorth)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Player-to-Player Trade & Deal Desk */}
      <section className="panel mt-6">
        <h2 className="panel-title flex items-center gap-1.5 text-primary">
          <ArrowLeftRight className="h-4 w-4" /> Player-to-Player Deal & Trade
          Desk
        </h2>
        <p className="text-xs text-muted-foreground">
          Official Rule: Players may trade districts, cash, and Rent Dodge cards
          at any time. All buildings on a traded district stay with that
          district!
        </p>

        <div className="mt-3 grid gap-4 md:grid-cols-2">
          {/* Cash Transfer */}
          <div className="rounded-lg border border-border bg-background/60 p-3 text-xs">
            <div className="font-bold text-foreground">
              💸 Transfer Cash Between Players
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <select
                value={fromPlayerId}
                onChange={(e) => setFromPlayerId(e.target.value)}
                className="field text-xs"
              >
                {state.players.map((p) => (
                  <option key={p.id} value={p.id}>
                    From: {p.name}
                  </option>
                ))}
              </select>
              <select
                value={toPlayerId}
                onChange={(e) => setToPlayerId(e.target.value)}
                className="field text-xs"
              >
                {state.players.map((p) => (
                  <option key={p.id} value={p.id}>
                    To: {p.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={10}
                step={50}
                value={transferAmountK}
                onChange={(e) => setTransferAmountK(e.target.value)}
                className="field text-xs"
                placeholder="Amount (k)"
              />
            </div>
            <button
              type="button"
              disabled={fromPlayerId === toPlayerId}
              onClick={() => {
                const amt = Math.max(0, parseInt(transferAmountK, 10) || 0);
                if (amt > 0)
                  transferCash(fromPlayerId, toPlayerId, amt, "Player Trade");
              }}
              className="mt-2 w-full rounded bg-primary py-1.5 font-bold text-primary-foreground disabled:opacity-40"
            >
              Send {formatK(Math.max(0, parseInt(transferAmountK, 10) || 0))}
            </button>
          </div>

          {/* District Transfer */}
          <div className="rounded-lg border border-border bg-background/60 p-3 text-xs">
            <div className="font-bold text-foreground">
              🏘️ Transfer District Ownership
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <select
                value={tradeDistrictId}
                onChange={(e) => setTradeDistrictId(e.target.value)}
                className="field text-xs"
              >
                <option value="">Select District…</option>
                {allPlayerStats.flatMap((s) =>
                  s.ownedDistricts.map((d) => (
                    <option key={d.district.id} value={d.district.id}>
                      #{d.district.number}{" "}
                      {getDistrictName(d.district, state.edition)} ({s.player.name})
                    </option>
                  ))
                )}
              </select>
              <select
                value={toPlayerId}
                onChange={(e) => setToPlayerId(e.target.value)}
                className="field text-xs"
              >
                {state.players.map((p) => (
                  <option key={p.id} value={p.id}>
                    New Owner: {p.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              disabled={!tradeDistrictId}
              onClick={() => {
                if (tradeDistrictId) {
                  assignDistrictOwner(tradeDistrictId, toPlayerId);
                  setTradeDistrictId("");
                }
              }}
              className="mt-2 w-full rounded bg-secondary py-1.5 font-bold text-foreground hover:bg-secondary/80 disabled:opacity-40"
            >
              Transfer District & Buildings
            </button>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
