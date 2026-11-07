import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Crown, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { formatK } from "@/lib/rent";

export const Route = createFileRoute("/scoreboard")({
  head: () => ({
    meta: [
      { title: "Monopoly City Net Worth Scoreboard" },
      { name: "description", content: "Tally cash and district rent values for 2–6 players to declare the Monopoly City winner." },
      { property: "og:title", content: "Monopoly City Net Worth Scoreboard" },
      { property: "og:description", content: "End-game tally: cash plus district rent values decides the winner." },
    ],
  }),
  component: Scoreboard,
});

interface Player { name: string; cash: string; districts: string[] }
const toNum = (s: string) => Math.max(0, parseFloat(s) || 0);
const worth = (p: Player) => toNum(p.cash) + p.districts.reduce((a, d) => a + toNum(d), 0);

function Scoreboard() {
  const [players, setPlayers] = useState<Player[]>([
    { name: "Player 1", cash: "", districts: [""] },
    { name: "Player 2", cash: "", districts: [""] },
  ]);
  const upd = (i: number, p: Partial<Player>) => setPlayers((ps) => ps.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const best = Math.max(...players.map(worth));
  const leaders = players.filter((p) => worth(p) === best && best > 0);

  return (
    <AppShell>
      <div className="flex items-end justify-between">
        <h1 className="font-display text-2xl tracking-wide">Scoreboard</h1>
        <button disabled={players.length >= 6} onClick={() => setPlayers([...players, { name: `Player ${players.length + 1}`, cash: "", districts: [""] }])}
          className="flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40">
          <Plus className="h-4 w-4" /> Player
        </button>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Enter amounts in thousands (k). Net worth = cash + rent value of each owned district.</p>

      {leaders.length > 0 && (
        <div className="lcd-bezel mt-4 flex items-center gap-3 rounded-xl p-4">
          <Crown className="h-8 w-8 text-primary led-text" />
          <div>
            <div className="font-display text-xs tracking-widest text-primary/70">{leaders.length > 1 ? "TIE" : "WINNER"}</div>
            <div className="font-display text-xl text-primary led-text">{leaders.map((l) => l.name).join(" & ")} · {formatK(best)}</div>
          </div>
        </div>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {players.map((p, i) => (
          <div key={i} className={`panel ${leaders.includes(p) ? "border-primary" : ""}`}>
            <div className="flex items-center gap-2">
              <input className="field font-semibold" value={p.name} onChange={(e) => upd(i, { name: e.target.value })} />
              {players.length > 2 && <button aria-label="Remove player" onClick={() => setPlayers(players.filter((_, j) => j !== i))} className="p-2 text-muted-foreground"><Trash2 className="h-4 w-4" /></button>}
            </div>
            <label className="mt-3 block text-xs font-semibold text-muted-foreground">Cash (k)
              <input inputMode="numeric" className="field mt-1" value={p.cash} onChange={(e) => upd(i, { cash: e.target.value })} placeholder="0" />
            </label>
            <div className="mt-3 text-xs font-semibold text-muted-foreground">District rent values (k)</div>
            <div className="mt-1 grid grid-cols-3 gap-2">
              {p.districts.map((d, k) => (
                <input key={k} inputMode="numeric" className="field" value={d} placeholder="0"
                  onChange={(e) => upd(i, { districts: p.districts.map((x, m) => (m === k ? e.target.value : x)) })} />
              ))}
              <button onClick={() => upd(i, { districts: [...p.districts, ""] })} className="rounded-md border border-dashed border-border text-xs text-muted-foreground">+ district</button>
            </div>
            <div className="mt-3 flex justify-between border-t border-border pt-2 text-sm">
              <span className="text-muted-foreground">Net worth</span>
              <span className="font-display text-lg">{formatK(worth(p))}</span>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
