import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Minus, Plus, ShieldAlert, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { BONUSES, DISTRICTS, GROUP_COLORS, HAZARDS, MAX_BLOCKS, calculateRent, formatK, type Bonus, type HazardKey } from "@/lib/rent";

export const Route = createFileRoute("/rent")({
  head: () => ({
    meta: [
      { title: "Monopoly City Rent & Hazard Calculator" },
      { name: "description", content: "Calculate exact Monopoly City rent with blocks, hazards, bonus buildings, skyscrapers and the Monopoly Tower." },
      { property: "og:title", content: "Monopoly City Rent & Hazard Calculator" },
      { property: "og:description", content: "Settle rent disputes instantly: hazards, bonuses and no-stack doubling rules built in." },
    ],
  }),
  component: RentPage,
});

function RentPage() {
  const [q, setQ] = useState("");
  const [id, setId] = useState(DISTRICTS[0]!.id);
  const [res, setRes] = useState(0);
  const [ind, setInd] = useState(0);
  const [hazard, setHazard] = useState<HazardKey>("none");
  const [bonus, setBonus] = useState<Bonus>("none");
  const [sky, setSky] = useState(false);
  const [tower, setTower] = useState(false);

  const district = DISTRICTS.find((d) => d.id === id)!;
  const filtered = DISTRICTS.filter((d) => d.name.toLowerCase().includes(q.toLowerCase()));
  const r = useMemo(() => calculateRent({ blockValue: district.blockValue, residential: res, industrial: ind, hazard, bonus, skyscraper: sky, monopolyTower: tower }), [district, res, ind, hazard, bonus, sky, tower]);
  const free = MAX_BLOCKS - res - ind;

  return (
    <AppShell>
      <h1 className="font-display text-2xl tracking-wide">Rent Calculator</h1>
      <div className="mt-4 grid gap-6 md:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <section className="panel">
            <h2 className="panel-title">District</h2>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search 22 districts…" className="field" />
            <div className="mt-3 grid max-h-56 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
              {filtered.map((d) => (
                <button key={d.id} onClick={() => setId(d.id)}
                  className={`flex items-center gap-2 rounded-md border px-2 py-2 text-left text-xs font-semibold ${d.id === id ? "border-primary bg-secondary" : "border-border"}`}>
                  <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: GROUP_COLORS[d.group] }} />
                  <span className="truncate">{d.name}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="panel">
            <h2 className="panel-title">Blocks <span className="text-muted-foreground">({res + ind}/{MAX_BLOCKS})</span></h2>
            <Counter label="Residential" value={res} onChange={setRes} canAdd={free > 0} />
            <Counter label="Industrial" value={ind} onChange={setInd} canAdd={free > 0} />
          </section>

          <section className="panel">
            <h2 className="panel-title">Hazard</h2>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(HAZARDS) as HazardKey[]).map((k) => (
                <Chip key={k} on={hazard === k} onClick={() => setHazard(k)}>{HAZARDS[k].label}{HAZARDS[k].blocks ? ` · ${HAZARDS[k].blocks}` : ""}</Chip>
              ))}
            </div>
            <h2 className="panel-title mt-4">Bonus building</h2>
            <div className="flex flex-wrap gap-2">
              {BONUSES.map((b) => <Chip key={b} on={bonus === b} onClick={() => setBonus(b)}>{b === "none" ? "None" : b}</Chip>)}
            </div>
          </section>

          <section className="panel">
            <h2 className="panel-title">Multipliers</h2>
            <div className="flex flex-wrap gap-2">
              <Chip on={sky} onClick={() => setSky(!sky)}>Skyscraper (color group ×2)</Chip>
              <Chip on={tower} onClick={() => setTower(!tower)}>Monopoly Tower (all ×2)</Chip>
            </div>
            {sky && tower && <p className="mt-2 text-xs text-primary">Rule: Skyscraper + Tower don't stack — rent doubles only once.</p>}
          </section>
        </div>

        <aside className="lcd-bezel h-fit rounded-2xl p-5 md:sticky md:top-20">
          <div className="text-xs font-semibold text-muted-foreground">{district.name} · {formatK(district.blockValue)} per block</div>
          <div className="mt-3 font-display text-xs tracking-widest text-primary/70">RENT</div>
          <div className="font-display text-5xl text-primary led-text">{formatK(r.rent)}</div>
          <dl className="mt-4 space-y-2 text-sm">
            <Row k="Mortgage value" v={formatK(r.mortgage)} />
            <Row k="Residential counted" v={`${r.residentialCounted} / ${res}`} />
            <Row k="Industrial counted" v={`${ind}`} />
            <Row k="Multiplier" v={`×${r.multiplier}`} />
            {hazard !== "none" && <Row k="Demolition cost" v={formatK(r.demolitionCost)} />}
          </dl>
          {hazard !== "none" && (
            <div className={`mt-4 flex items-start gap-2 rounded-md p-2 text-xs ${r.hazardActive ? "bg-destructive/20 text-foreground" : "bg-secondary"}`}>
              {r.hazardActive ? <ShieldAlert className="h-4 w-4 shrink-0 text-primary" /> : <ShieldCheck className="h-4 w-4 shrink-0" />}
              {r.hazardActive ? "Hazard active: residential blocks earn nothing." : `Protected by ${bonus}: hazard has no effect.`}
            </div>
          )}
        </aside>
      </div>
    </AppShell>
  );
}

function Counter({ label, value, onChange, canAdd }: { label: string; value: number; onChange: (n: number) => void; canAdd: boolean }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="font-semibold">{label}</span>
      <div className="flex items-center gap-3">
        <button aria-label={`Remove ${label}`} className="hw-btn rounded-lg p-2" disabled={value === 0} onClick={() => onChange(value - 1)}><Minus className="h-4 w-4" /></button>
        <span className="w-6 text-center font-display text-xl">{value}</span>
        <button aria-label={`Add ${label}`} className="hw-btn rounded-lg p-2" disabled={!canAdd} onClick={() => onChange(value + 1)}><Plus className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${on ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>{children}</button>;
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between border-b border-border/50 pb-1"><dt className="text-muted-foreground">{k}</dt><dd className="font-semibold">{v}</dd></div>;
}
