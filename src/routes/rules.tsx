import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/rules")({
  head: () => ({
    meta: [
      { title: "Monopoly City Referee – Rules Quick Reference" },
      { name: "description", content: "Searchable Monopoly City rule cards: planning permission, hazards, railroads, Rent Dodge, stadiums, jail and mortgages." },
      { property: "og:title", content: "Monopoly City Referee – Rules Quick Reference" },
      { property: "og:description", content: "Settle Monopoly City rule arguments in seconds." },
    ],
  }),
  component: Rules,
});

const RULES = [
  { t: "Planning Permission", tags: "bonus hazard build", b: "Lets you place a Bonus Building on one of your own or an unowned district, OR a Hazard on an opponent's or an unowned district. Normal building limits (8 blocks per district) still apply." },
  { t: "Hazards: sizes & removal", tags: "rubbish sewage power prison demolish", b: "Rubbish Dump = 2 blocks, Sewage Plant = 3, Power Station = 3, Prison = 4. A hazard makes Residential blocks in that district earn no rent; Industrial blocks still count. The owner can demolish it for M500k per block it occupies." },
  { t: "Bonus Buildings", tags: "school park wind water protect", b: "School, Water Tower, Wind Farm and Park protect their district — hazards can't hurt residential rent there." },
  { t: "Skyscraper & Monopoly Tower", tags: "double multiplier stack", b: "A Skyscraper doubles rent across its colour group; the Monopoly Tower doubles rent on all your districts. They do NOT stack — rent is doubled at most once." },
  { t: "Railroad jumping", tags: "train station teleport", b: "Landing on a railroad you may jump to any other railroad. If that railroad is owned by someone else, pay their rent first — then you may move on. You can't teleport away to dodge rent." },
  { t: "Free Parking & Rent Dodge", tags: "steal card", b: "Land on Free Parking to take the Rent Dodge card. Use it to skip one rent payment. If anyone else lands on Free Parking before you use it, you must hand the card over to them." },
  { t: "Stadiums", tags: "stadium wages go", b: "Only 2 stadiums exist. Each costs M2m and earns its owner an extra M1m wages when passing GO. A district with a stadium collects no district rent." },
  { t: "Jail", tags: "prison jail rent build", b: "While in Jail you still collect rent and may still build, trade and mortgage on your turn — you just can't move." },
  { t: "Deals", tags: "trade negotiate", b: "Players may trade districts, cards and cash at any time by agreement. Buildings go with the district." },
  { t: "Mortgages", tags: "mortgage bank", b: "A district's mortgage value equals its current rent value. Mortgaged districts collect no rent. Pay back the same amount (plus 10% if your house rules use interest) to unmortgage." },
  { t: "Auctions", tags: "auction timer gavel", b: "Press AUCTION: bidding stays open for a secret 30–50 seconds. Rapid beeps mean ~5 seconds left. The highest bid at the buzzer wins." },
  { t: "Timed game", tags: "hour timer end winner", b: "In the 1-hour game, when time is up, everyone totals cash plus the rent value of every district they own. Highest net worth wins." },
];

function Rules() {
  const [q, setQ] = useState("");
  const list = RULES.filter((r) => (r.t + r.tags + r.b).toLowerCase().includes(q.toLowerCase()));
  return (
    <AppShell>
      <h1 className="font-display text-2xl tracking-wide">Referee</h1>
      <div className="relative mt-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search rules… e.g. railroad, hazard" className="field pl-9" />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {list.map((r) => (
          <article key={r.t} className="panel">
            <h2 className="font-display text-sm tracking-wide text-primary">{r.t}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{r.b}</p>
          </article>
        ))}
        {list.length === 0 && <p className="text-sm text-muted-foreground">No matching rule.</p>}
      </div>
    </AppShell>
  );
}
