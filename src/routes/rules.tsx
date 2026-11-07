import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Search,
  Sparkles,
  Building2,
  ShieldAlert,
  ShieldCheck,
  TrainFront,
  Gavel,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/rules")({
  head: () => ({
    meta: [
      { title: "Monopoly City Referee — Rules, 3D Buildings & Player Guide" },
      {
        name: "description",
        content:
          "Complete Monopoly City rules guide, Classic vs. Monopoly City comparison, 3D building encyclopedia, hazards, bonuses, and official referee rulings.",
      },
      {
        property: "og:title",
        content: "Monopoly City Referee — Rules, 3D Buildings & Player Guide",
      },
      {
        property: "og:description",
        content:
          "Understand every rule of Monopoly City in seconds and settle table arguments.",
      },
    ],
  }),
  component: Rules,
});

const DIFFERENCES = [
  {
    title: "1. You CAN Build Without Owning a Color Set!",
    desc: "Unlike classic Monopoly, you can build Residential and Industrial blocks on ANY district you own as soon as you own it — you do NOT need the whole color group first! (Owning the full color group unlocks Skyscrapers instead.)",
  },
  {
    title: "2. The Trading Unit Controls Building & Auctions",
    desc: "On your turn (after moving), press BUILD on the Trading Unit. It spins to 1, 2, or 3 (max blocks you can buy this turn across your districts) or a Train icon (place 1 Railroad anywhere for free!).",
  },
  {
    title: "3. Residential vs. Industrial Blocks (Sabotage!)",
    desc: "Residential blocks (beige/gray) are half the price of Industrial blocks (blue), BUT if a rival lands on Planning Permission and drops a black Hazard on your district, all Residential blocks there earn M0 rent! Industrial blocks are immune to Hazards.",
  },
  {
    title: "4. Every Unbought Property MUST Go to a 50s Auction",
    desc: "If you land on an unowned district and choose not to buy it at the printed price, the Banker presses AUCTION on the Trading Unit. Bidding starts at M10k and anyone can shout bids until the secret 30–50s timer buzzes.",
  },
  {
    title: "5. Dynamic Mortgage & 1-Hour Timed Victory",
    desc: "A district's mortgage value is NOT half its purchase price — it equals its CURRENT RENT VALUE! And when the 1-hour timer ends, Net Worth = Cash + Current Rent Value of every owned district.",
  },
];

const BUILDINGS = [
  {
    name: "Residential Blocks (Gray / Beige)",
    size: "1, 2, or 3 blocks",
    cost: "M500k – M2M per block (by color group)",
    effect:
      "Cheapest way to raise district rent, but vulnerable: if an unshielded Hazard is placed on the district, Residential blocks count as 0!",
  },
  {
    name: "Industrial Blocks (Light Blue)",
    size: "1, 2, or 3 blocks",
    cost: "M1M – M4M per block (2× Residential)",
    effect:
      "Protected against Hazards — always counts toward rent! Owning ≥1 Industrial block means you pay M2M when landing on Industry Tax.",
  },
  {
    name: "Bonus Buildings (Red / White)",
    size: "School, Park, Water Tower, Wind Farm",
    cost: "FREE (via Planning Permission space)",
    effect:
      "Acts as a permanent shield on that district: opponents cannot place Hazards there, and any existing Hazard is neutralized.",
  },
  {
    name: "Hazard Buildings (Black)",
    size: "Rubbish Dump (2), Sewage Plant (3), Power Station (3), Prison (4)",
    cost: "FREE (via Planning Permission space)",
    effect:
      "Placed on an opponent's unprotected district to wipe out all Residential rent. Owner can demolish for M500k per block occupied.",
  },
  {
    name: "Skyscrapers (6 in Box)",
    size: "Exempt from 8-block limit",
    cost: "M2M – M5M (requires owning full color group)",
    effect:
      "Doubles the rent (×2) of EVERY district in that color group! Only 1 Skyscraper needed per color group.",
  },
  {
    name: "The Monopoly Tower (1 in Box)",
    size: "Exempt from 8-block limit",
    cost: "M7M (requires owning 2 full color groups)",
    effect:
      "The ultimate landmark: doubles the rent (×2) of EVERY district you own across the entire board! (Does not stack past ×2 with Skyscrapers.)",
  },
  {
    name: "Stadiums (2 in Box)",
    size: "Exempt from 8-block limit",
    cost: "M2M (requires owning ≥2 districts)",
    effect:
      "Earns you an extra +M1M salary every time you pass GO (up to M4M total if you own both Stadiums!). District still collects its normal block rent.",
  },
  {
    name: "Railroads (8 in Box)",
    size: "Placed on outer track of district",
    cost: "FREE (when Trading Unit spins 'r')",
    effect:
      "Landing on any district with a Railroad lets you teleport to any other Railroad district (after paying rent if the first is owned by a rival).",
  },
];

const RULES = [
  {
    t: "Starting Cash & Setup",
    tags: "start money cash setup",
    b: "Each player starts with M15M (broken down into M5M, M2M, M1M, M500k, M100k, M50k, M20k, and M10k bills). Place the Rent Dodge card on Free Parking and turn on the Trading Unit.",
  },
  {
    t: "Planning Permission",
    tags: "bonus hazard build sabotage protect",
    b: "Lets you place a Bonus Building on one of your own or an unowned district, OR a Hazard on an opponent's or an unowned district. Normal building limits (8 blocks per district) still apply.",
  },
  {
    t: "Hazards: sizes & removal",
    tags: "rubbish sewage power prison demolish",
    b: "Rubbish Dump = 2 blocks, Sewage Plant = 3, Power Station = 3, Prison = 4. A hazard makes Residential blocks in that district earn no rent; Industrial blocks still count. The owner can demolish it for M500k per block it occupies.",
  },
  {
    t: "Bonus Buildings",
    tags: "school park wind water protect",
    b: "School, Water Tower, Wind Farm and Park protect their district — hazards can't hurt residential rent there, and rivals cannot place new hazards on a district with a Bonus Building.",
  },
  {
    t: "Skyscraper & Monopoly Tower",
    tags: "double multiplier stack",
    b: "A Skyscraper doubles rent across its colour group (requires owning all districts in that group); the Monopoly Tower doubles rent on all your districts (requires owning 2 full colour groups). They do NOT stack — rent is doubled at most once.",
  },
  {
    t: "Railroad jumping",
    tags: "train station teleport",
    b: "Landing on a railroad you may jump to any other railroad. If that railroad is owned by someone else, pay their rent first — then you may move on. You can't teleport away to dodge rent.",
  },
  {
    t: "Free Parking & Rent Dodge",
    tags: "steal card free parking",
    b: "Land on Free Parking to take the Rent Dodge card. Use it to skip one rent payment (then return it to Free Parking). If anyone else lands on Free Parking before you use it, you must hand the card over to them!",
  },
  {
    t: "Stadiums (+M1M at GO)",
    tags: "stadium wages go salary",
    b: "Only 2 stadiums exist. You must own at least 2 districts to buy one for M2M. Each stadium earns its owner an extra M1M salary when passing GO (M3M with 1 stadium, M4M with 2 stadiums). The district still collects its normal rent.",
  },
  {
    t: "Industry Tax",
    tags: "tax industrial factory",
    b: "Landing on Industry Tax costs M2M ONLY if you own at least 1 Industrial building anywhere on the board. If you only own Residential buildings (or no buildings), you pay M0!",
  },
  {
    t: "Jail",
    tags: "prison jail rent build",
    b: "While in Jail you still collect rent and may still press BUILD, construct buildings, trade and mortgage on your turn — you just can't move. Pay M500k before rolling, use a Get Out of Jail Free card, or roll doubles to leave.",
  },
  {
    t: "Deals & Trading",
    tags: "trade negotiate",
    b: "Players may trade districts, cards and cash at any time by agreement. All 3D buildings currently on a traded district stay on that district and transfer to the new owner.",
  },
  {
    t: "Mortgages",
    tags: "mortgage bank",
    b: "A district's mortgage value equals its CURRENT rent value (including its buildings!). Mortgaged districts collect no rent. Pay back the mortgage amount to unmortgage.",
  },
  {
    t: "Auctions",
    tags: "auction timer gavel",
    b: "Triggered when a player declines to buy an unowned district OR lands on an Auction space (pick any unowned district). Press AUCTION: bidding starts at M10k and stays open for a secret 30–50 seconds. Rapid beeps mean ~5 seconds left. Highest bid at the buzzer wins.",
  },
  {
    t: "Timed game & Winning",
    tags: "hour timer end winner net worth",
    b: "When the 1-hour timer alarms, the game ends immediately. Every player totals their Cash + the Current Rent Value of every unmortgaged district they own. Highest Net Worth wins!",
  },
];

function Rules() {
  const [q, setQ] = useState("");
  const list = RULES.filter((r) =>
    (r.t + r.tags + r.b).toLowerCase().includes(q.toLowerCase())
  );

  return (
    <AppShell scrollable>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl tracking-wide">
            Monopoly City Guide & Referee
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            New to Monopoly City? Read the 5 key differences below, inspect the
            3D Building Encyclopedia, or search official referee rulings.
          </p>
        </div>

        {/* 5 Key Differences from Classic Monopoly */}
        <section className="panel border-primary/50">
          <h2 className="panel-title flex items-center gap-1.5 text-primary">
            <Sparkles className="h-4 w-4" /> How Monopoly City Differs from
            Classic Monopoly
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {DIFFERENCES.map((d) => (
              <div
                key={d.title}
                className="rounded-lg border border-border bg-background/70 p-3 text-xs leading-relaxed"
              >
                <div className="font-display font-bold text-foreground">
                  {d.title}
                </div>
                <p className="mt-1.5 text-muted-foreground">{d.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 3D Building Encyclopedia */}
        <section className="panel">
          <h2 className="panel-title flex items-center gap-1.5">
            <Building2 className="h-4 w-4 text-primary" /> 3D Buildings,
            Landmarks & Hazards Encyclopedia
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {BUILDINGS.map((b) => (
              <div
                key={b.name}
                className="rounded-lg border border-border bg-background/60 p-3 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className="font-display font-bold text-primary">
                    {b.name}
                  </span>
                  <span className="rounded bg-secondary px-2 py-0.5 text-[10px] font-semibold text-foreground">
                    {b.cost}
                  </span>
                </div>
                <div className="mt-1 text-[11px] font-semibold text-muted-foreground">
                  Footprint / Piece: {b.size}
                </div>
                <p className="mt-1.5 leading-relaxed text-muted-foreground">
                  {b.effect}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Searchable Official Referee Cards */}
        <section>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search official rules… e.g. railroad, hazard, stadium, industry tax, jail"
              className="field pl-9"
            />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {list.map((r) => (
              <article key={r.t} className="panel">
                <h2 className="font-display text-sm tracking-wide text-primary">
                  {r.t}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {r.b}
                </p>
              </article>
            ))}
            {list.length === 0 && (
              <p className="text-sm text-muted-foreground">No matching rule.</p>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
