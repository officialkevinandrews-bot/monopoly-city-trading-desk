import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Minus,
  Plus,
  ShieldAlert,
  ShieldCheck,
  TrainFront,
  Building2,
  Lock,
  Unlock,
  Coins,
  FlaskConical,
  MapPin,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useGameStore } from "@/lib/game-store";
import {
  BONUSES,
  COLOR_GROUPS,
  DISTRICTS,
  GROUP_COLORS,
  GROUP_LABELS,
  HAZARDS,
  MAX_BLOCKS,
  calculateRent,
  formatK,
  getDistrictName,
  getDistrictSubtitle,
  type Bonus,
  type ColorGroup,
  type HazardKey,
} from "@/lib/rent";

export const Route = createFileRoute("/rent")({
  head: () => ({
    meta: [
      { title: "Monopoly City — 22-District City Tracker & Rent Calculator" },
      {
        name: "description",
        content:
          "Manage all 22 Monopoly City districts or calculate exact rent with official Title Deed schedules, 3D blocks, hazards, bonus shields, skyscrapers, and the Monopoly Tower.",
      },
      {
        property: "og:title",
        content: "Monopoly City — 22-District City Tracker & Rent Calculator",
      },
      {
        property: "og:description",
        content:
          "Live 22-district board manager and official Title Deed rent calculator.",
      },
    ],
  }),
  component: RentAndCityPage,
});

function RentAndCityPage() {
  const {
    state,
    allDistrictInfos,
    getDistrictInfo,
    assignDistrictOwner,
    buyDistrict,
    updateDistrict,
    constructBlocks,
    demolishHazard,
    toggleMortgage,
    payRentOnDistrict,
  } = useGameStore();

  const [q, setQ] = useState("");
  const [groupFilter, setGroupFilter] = useState<ColorGroup | "all">("all");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [id, setId] = useState(DISTRICTS[0]!.id);

  // Mode toggle: "live" syncs with persistent game state; "sandbox" is a temporary what-if calculator
  const [calcMode, setCalcMode] = useState<"live" | "sandbox">("live");
  const [sbRes, setSbRes] = useState(0);
  const [sbInd, setSbInd] = useState(0);
  const [sbHazard, setSbHazard] = useState<HazardKey>("none");
  const [sbBonus, setSbBonus] = useState<Bonus>("none");
  const [sbSky, setSbSky] = useState(false);
  const [sbTower, setSbTower] = useState(false);

  const liveInfo = getDistrictInfo(id);
  const district = liveInfo.district;

  const activeRes = calcMode === "live" ? liveInfo.state.residential : sbRes;
  const activeInd = calcMode === "live" ? liveInfo.state.industrial : sbInd;
  const activeHazard = calcMode === "live" ? liveInfo.state.hazard : sbHazard;
  const activeBonus = calcMode === "live" ? liveInfo.state.bonus : sbBonus;
  const activeSky =
    calcMode === "live"
      ? liveInfo.state.skyscraper || liveInfo.groupHasSkyscraper
      : sbSky;
  const activeTower =
    calcMode === "live"
      ? liveInfo.state.monopolyTower || liveInfo.ownerHasMonopolyTower
      : sbTower;

  const r = useMemo(
    () =>
      calculateRent({
        blockValue: district.blockValue,
        rentSchedule: district.rentSchedule,
        residential: activeRes,
        industrial: activeInd,
        hazard: activeHazard,
        bonus: activeBonus,
        skyscraper: activeSky,
        monopolyTower: activeTower,
        mortgaged: calcMode === "live" ? liveInfo.state.mortgaged : false,
      }),
    [
      district,
      activeRes,
      activeInd,
      activeHazard,
      activeBonus,
      activeSky,
      activeTower,
      calcMode,
      liveInfo.state.mortgaged,
    ]
  );

  const freeBlocks = Math.max(0, MAX_BLOCKS - activeRes - activeInd);
  const activePlayer =
    state.players[state.activePlayerIndex] ?? state.players[0]!;

  const filtered = allDistrictInfos.filter((item) => {
    if (groupFilter !== "all" && item.district.group !== groupFilter)
      return false;
    if (ownerFilter === "unowned" && item.state.ownerId !== null) return false;
    if (
      ownerFilter !== "all" &&
      ownerFilter !== "unowned" &&
      item.state.ownerId !== ownerFilter
    )
      return false;
    const query = q.trim().toLowerCase();
    if (!query) return true;
    return (
      item.district.cityName.toLowerCase().includes(query) ||
      item.district.ukName.toLowerCase().includes(query) ||
      item.district.usName.toLowerCase().includes(query) ||
      String(item.district.number) === query
    );
  });

  const handleResChange = (nextVal: number) => {
    const clamped = Math.max(0, Math.min(MAX_BLOCKS - activeInd, nextVal));
    if (calcMode === "sandbox") {
      setSbRes(clamped);
    } else {
      updateDistrict(
        id,
        { residential: clamped },
        `Set ${getDistrictName(district, state.edition)} Residential blocks to ${clamped}`
      );
    }
  };

  const handleIndChange = (nextVal: number) => {
    const clamped = Math.max(0, Math.min(MAX_BLOCKS - activeRes, nextVal));
    if (calcMode === "sandbox") {
      setSbInd(clamped);
    } else {
      updateDistrict(
        id,
        { industrial: clamped },
        `Set ${getDistrictName(district, state.edition)} Industrial blocks to ${clamped}`
      );
    }
  };

  const handleHazardChange = (hk: HazardKey) => {
    if (calcMode === "sandbox") {
      setSbHazard(hk);
    } else {
      updateDistrict(
        id,
        { hazard: hk },
        hk === "none"
          ? `Removed hazard from ${getDistrictName(district, state.edition)}`
          : `Placed ${HAZARDS[hk].label} on ${getDistrictName(district, state.edition)}`
      );
    }
  };

  const handleBonusChange = (b: Bonus) => {
    if (calcMode === "sandbox") {
      setSbBonus(b);
    } else {
      updateDistrict(
        id,
        { bonus: b },
        b === "none"
          ? `Removed bonus building from ${getDistrictName(district, state.edition)}`
          : `Placed ${b} on ${getDistrictName(district, state.edition)}`
      );
    }
  };

  return (
    <AppShell scrollable>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl tracking-wide">
            City Board & Rent Calculator
          </h1>
          <p className="text-xs text-muted-foreground">
            Track ownership, 3D blocks, hazards, and official Title Deed rents
            across all 22 districts.
          </p>
        </div>

        <div className="flex rounded-lg border border-border bg-card p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setCalcMode("live")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-semibold transition-colors ${
              calcMode === "live"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MapPin className="h-3.5 w-3.5" />
            Live City Board
          </button>
          <button
            type="button"
            onClick={() => {
              setSbRes(liveInfo.state.residential);
              setSbInd(liveInfo.state.industrial);
              setSbHazard(liveInfo.state.hazard);
              setSbBonus(liveInfo.state.bonus);
              setSbSky(liveInfo.state.skyscraper);
              setSbTower(liveInfo.state.monopolyTower);
              setCalcMode("sandbox");
            }}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-semibold transition-colors ${
              calcMode === "sandbox"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FlaskConical className="h-3.5 w-3.5" />
            What-If Sandbox
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          {/* 22-District Selector & Filter Panel */}
          <section className="panel">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="panel-title mb-0">22 City Districts</h2>
              <select
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
                className="rounded border border-border bg-background px-2 py-1 text-xs font-semibold"
              >
                <option value="all">All Owners</option>
                <option value="unowned">Unowned Only</option>
                {state.players.map((p) => (
                  <option key={p.id} value={p.id}>
                    Owned by {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-2.5 flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setGroupFilter("all")}
                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                  groupFilter === "all"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground"
                }`}
              >
                All (22)
              </button>
              {COLOR_GROUPS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGroupFilter(g)}
                  className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                    groupFilter === g
                      ? "border-primary bg-secondary text-foreground"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: GROUP_COLORS[g] }}
                  />
                  {GROUP_LABELS[g]}
                </button>
              ))}
            </div>

            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search 22 districts by City, UK, or US name…"
              className="field mt-2.5 text-xs"
            />

            <div className="mt-3 grid max-h-72 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
              {filtered.map((item) => {
                const d = item.district;
                const st = item.state;
                const totalBlks = st.residential + st.industrial;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setId(d.id)}
                    className={`flex flex-col justify-between rounded-lg border p-2 text-left text-xs transition-all ${
                      d.id === id
                        ? "border-primary bg-secondary shadow-sm"
                        : "border-border bg-background/60 hover:border-border/90"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex min-w-0 items-center gap-1.5 font-bold">
                        <span
                          className="h-3 w-3 shrink-0 rounded-sm"
                          style={{ background: GROUP_COLORS[d.group] }}
                        />
                        <span className="truncate">
                          #{d.number} {getDistrictName(d, state.edition)}
                        </span>
                      </div>
                      {st.hasRailroad && (
                        <TrainFront className="h-3 w-3 shrink-0 text-primary" />
                      )}
                    </div>

                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                      {item.owner ? (
                        <span className="flex items-center gap-1 font-semibold text-foreground">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ background: item.owner.color }}
                          />
                          <span className="truncate max-w-[75px]">
                            {item.owner.name}
                          </span>
                        </span>
                      ) : (
                        <span>Price: {formatK(d.price)}</span>
                      )}

                      <span className="font-display font-bold text-primary">
                        {st.mortgaged
                          ? "MORT"
                          : formatK(item.rentResult.rent)}
                      </span>
                    </div>

                    {(totalBlks > 0 ||
                      st.hazard !== "none" ||
                      st.bonus !== "none" ||
                      st.skyscraper ||
                      st.monopolyTower) && (
                      <div className="mt-1 flex flex-wrap gap-1 text-[10px]">
                        {st.residential > 0 && (
                          <span className="rounded bg-stone-500/30 px-1 text-stone-200">
                            {st.residential}R
                          </span>
                        )}
                        {st.industrial > 0 && (
                          <span className="rounded bg-sky-500/30 px-1 text-sky-200">
                            {st.industrial}I
                          </span>
                        )}
                        {st.hazard !== "none" && (
                          <span className="rounded bg-destructive/40 px-1 text-primary">
                            ☣️ {HAZARDS[st.hazard].blocks}
                          </span>
                        )}
                        {st.bonus !== "none" && (
                          <span className="rounded bg-emerald-500/30 px-1 text-emerald-300">
                            🛡️ {st.bonus}
                          </span>
                        )}
                        {st.skyscraper && (
                          <span className="rounded bg-amber-500/30 px-1 text-amber-200">
                            🏙️2×
                          </span>
                        )}
                        {st.monopolyTower && (
                          <span className="rounded bg-amber-500/40 px-1 text-amber-100">
                            🗼2×
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Ownership & Quick Actions (Live Mode) */}
          {calcMode === "live" && (
            <section className="panel">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="panel-title mb-0">
                  District Ownership & Actions (#{district.number}{" "}
                  {getDistrictName(district, state.edition)})
                </h2>
                <span className="text-xs text-muted-foreground">
                  List Price: <strong>{formatK(district.price)}</strong>
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <select
                  aria-label="District Owner"
                  value={liveInfo.state.ownerId ?? ""}
                  onChange={(e) =>
                    assignDistrictOwner(
                      id,
                      e.target.value === "" ? null : e.target.value
                    )
                  }
                  className="field max-w-[200px] text-xs font-semibold"
                >
                  <option value="">Unowned (Bank)</option>
                  {state.players.map((p) => (
                    <option key={p.id} value={p.id}>
                      Owned by {p.name}
                    </option>
                  ))}
                </select>

                {!liveInfo.owner && (
                  <button
                    type="button"
                    onClick={() => buyDistrict(id, activePlayer.id)}
                    className="flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
                  >
                    <Coins className="h-3.5 w-3.5" />
                    {activePlayer.name} Buys ({formatK(district.price)})
                  </button>
                )}

                {liveInfo.owner && (
                  <>
                    <button
                      type="button"
                      onClick={() => toggleMortgage(id)}
                      className={`flex items-center gap-1 rounded-md border px-3 py-2 text-xs font-semibold ${
                        liveInfo.state.mortgaged
                          ? "border-amber-500 bg-amber-500/20 text-amber-300"
                          : "border-border bg-secondary text-foreground"
                      }`}
                    >
                      {liveInfo.state.mortgaged ? (
                        <>
                          <Unlock className="h-3.5 w-3.5" />
                          Unmortgage ({formatK(r.mortgage)})
                        </>
                      ) : (
                        <>
                          <Lock className="h-3.5 w-3.5" />
                          Mortgage (+{formatK(r.mortgage)})
                        </>
                      )}
                    </button>

                    {liveInfo.owner.id !== activePlayer.id &&
                      !liveInfo.state.mortgaged && (
                        <button
                          type="button"
                          onClick={() =>
                            payRentOnDistrict(id, activePlayer.id, false)
                          }
                          className="rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
                        >
                          {activePlayer.name} Pays {formatK(r.rent)} Rent
                        </button>
                      )}
                  </>
                )}

                <button
                  type="button"
                  onClick={() =>
                    updateDistrict(
                      id,
                      { hasRailroad: !liveInfo.state.hasRailroad },
                      `${
                        !liveInfo.state.hasRailroad ? "Added" : "Removed"
                      } Railroad on ${getDistrictName(district, state.edition)}`
                    )
                  }
                  className={`flex items-center gap-1 rounded-md border px-3 py-2 text-xs font-semibold ${
                    liveInfo.state.hasRailroad
                      ? "border-primary bg-primary/20 text-primary"
                      : "border-border bg-background text-muted-foreground"
                  }`}
                >
                  <TrainFront className="h-3.5 w-3.5" />
                  {liveInfo.state.hasRailroad ? "Has Railroad" : "+ Railroad"}
                </button>
              </div>
            </section>
          )}

          {/* 3D Building Blocks Counter & 8-Slot Visual Grid */}
          <section className="panel">
            <div className="flex items-center justify-between">
              <h2 className="panel-title mb-0">
                Blocks{" "}
                <span className="text-muted-foreground">
                  ({activeRes + activeInd}/{MAX_BLOCKS})
                </span>
              </h2>
              <span className="text-xs text-muted-foreground">
                Res: {formatK(district.residentialCost)}/blk · Ind:{" "}
                {formatK(district.industrialCost)}/blk
              </span>
            </div>

            {/* Visual 8-Slot District Footprint Bar */}
            <div className="mt-2.5 grid grid-cols-8 gap-1.5">
              {Array.from({ length: MAX_BLOCKS }, (_, slotIdx) => {
                const isRes = slotIdx < activeRes;
                const isInd =
                  slotIdx >= activeRes && slotIdx < activeRes + activeInd;
                return (
                  <div
                    key={slotIdx}
                    className={`flex h-7 items-center justify-center rounded border text-[10px] font-bold ${
                      isRes
                        ? r.hazardActive
                          ? "border-destructive/60 bg-destructive/20 text-muted-foreground line-through"
                          : "border-stone-400/60 bg-stone-500/30 text-stone-100"
                        : isInd
                          ? "border-sky-400/60 bg-sky-500/30 text-sky-100"
                          : "border-border/50 bg-background/40 text-muted-foreground/40"
                    }`}
                  >
                    {isRes ? "RES" : isInd ? "IND" : slotIdx + 1}
                  </div>
                );
              })}
            </div>

            <div className="mt-3 divide-y divide-border/50">
              <Counter
                label="Residential"
                sub={`Cost: ${formatK(district.residentialCost)}/blk · Vulnerable to Hazards`}
                value={activeRes}
                onChange={handleResChange}
                canAdd={freeBlocks > 0}
                onBuyWithCash={
                  calcMode === "live" && freeBlocks > 0
                    ? () => constructBlocks(id, "residential", 1, true)
                    : undefined
                }
                buyCostLabel={formatK(district.residentialCost)}
              />
              <Counter
                label="Industrial"
                sub={`Cost: ${formatK(district.industrialCost)}/blk · Immune to Hazards`}
                value={activeInd}
                onChange={handleIndChange}
                canAdd={freeBlocks > 0}
                onBuyWithCash={
                  calcMode === "live" && freeBlocks > 0
                    ? () => constructBlocks(id, "industrial", 1, true)
                    : undefined
                }
                buyCostLabel={formatK(district.industrialCost)}
              />
            </div>
          </section>

          {/* Hazards & Bonus Buildings */}
          <section className="panel">
            <div className="flex items-center justify-between">
              <h2 className="panel-title mb-0">Hazard (Planning Permission)</h2>
              {calcMode === "live" && activeHazard !== "none" && (
                <button
                  type="button"
                  onClick={() => demolishHazard(id)}
                  className="rounded bg-primary/20 px-2.5 py-1 text-xs font-bold text-primary hover:bg-primary/30"
                >
                  Demolish Hazard ({formatK(r.demolitionCost)})
                </button>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {(Object.keys(HAZARDS) as HazardKey[]).map((k) => (
                <Chip
                  key={k}
                  on={activeHazard === k}
                  onClick={() => handleHazardChange(k)}
                >
                  {HAZARDS[k].label}
                  {HAZARDS[k].blocks ? ` · ${HAZARDS[k].blocks}` : ""}
                </Chip>
              ))}
            </div>

            <h2 className="panel-title mt-4">
              Bonus building (Shields against Hazards)
            </h2>
            <div className="flex flex-wrap gap-2">
              {BONUSES.map((b) => (
                <Chip
                  key={b}
                  on={activeBonus === b}
                  onClick={() => handleBonusChange(b)}
                >
                  {b === "none" ? "None" : b}
                </Chip>
              ))}
            </div>
          </section>

          {/* Multipliers (Skyscraper & Monopoly Tower) */}
          <section className="panel">
            <div className="flex items-center justify-between">
              <h2 className="panel-title mb-0">Multipliers</h2>
              <span className="text-xs text-muted-foreground">
                Skyscraper Cost: {formatK(district.skyscraperCost)}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Chip
                on={
                  calcMode === "live" ? liveInfo.state.skyscraper : sbSky
                }
                onClick={() => {
                  if (calcMode === "sandbox") {
                    setSbSky(!sbSky);
                  } else {
                    updateDistrict(
                      id,
                      { skyscraper: !liveInfo.state.skyscraper },
                      `${
                        !liveInfo.state.skyscraper ? "Built" : "Removed"
                      } Skyscraper on ${getDistrictName(district, state.edition)}`
                    );
                  }
                }}
              >
                Skyscraper (color group ×2)
              </Chip>
              <Chip
                on={
                  calcMode === "live"
                    ? liveInfo.state.monopolyTower
                    : sbTower
                }
                onClick={() => {
                  if (calcMode === "sandbox") {
                    setSbTower(!sbTower);
                  } else {
                    updateDistrict(
                      id,
                      { monopolyTower: !liveInfo.state.monopolyTower },
                      `${
                        !liveInfo.state.monopolyTower ? "Built" : "Removed"
                      } Monopoly Tower on ${getDistrictName(district, state.edition)}`
                    );
                  }
                }}
              >
                Monopoly Tower (all ×2)
              </Chip>
            </div>
            {activeSky && activeTower && (
              <p className="mt-2 text-xs text-primary">
                Rule: Skyscraper + Tower don't stack — rent doubles only once.
              </p>
            )}
          </section>
        </div>

        {/* RIGHT SIDEBAR: Title Deed Display & Official 0-8 Block Rent Table */}
        <aside className="lcd-bezel h-fit rounded-2xl p-5 lg:sticky lg:top-24">
          <div className="flex items-center justify-between">
            <span className="rounded px-2 py-0.5 text-[10px] font-bold uppercase text-white" style={{ background: GROUP_COLORS[district.group] }}>
              District #{district.number} · {GROUP_LABELS[district.group]}
            </span>
            <span className="text-xs font-semibold text-muted-foreground">
              Buy: {formatK(district.price)}
            </span>
          </div>

          <div className="mt-2 font-display text-lg font-bold text-foreground">
            {getDistrictName(district, state.edition)}
          </div>
          <div className="text-xs text-muted-foreground">
            {getDistrictSubtitle(district, state.edition)}
          </div>

          <div className="mt-3 font-display text-xs tracking-widest text-primary/70">
            {calcMode === "live" && liveInfo.state.mortgaged
              ? "MORTGAGED (COLLECTS NO RENT)"
              : "CURRENT RENT"}
          </div>
          <div className="font-display text-5xl text-primary led-text">
            {formatK(r.rent)}
          </div>

          <dl className="mt-4 space-y-1.5 text-sm">
            <Row k="Mortgage value" v={formatK(r.mortgage)} />
            <Row
              k="Residential counted"
              v={`${r.residentialCounted} / ${activeRes}`}
            />
            <Row k="Industrial counted" v={`${activeInd}`} />
            <Row k="Effective blocks" v={`${r.effectiveBlocks} / ${MAX_BLOCKS}`} />
            <Row k="Multiplier" v={`×${r.multiplier}`} />
            {activeHazard !== "none" && (
              <Row k="Demolition cost" v={formatK(r.demolitionCost)} />
            )}
          </dl>

          {activeHazard !== "none" && (
            <div
              className={`mt-3 flex items-start gap-2 rounded-md p-2 text-xs ${
                r.hazardActive
                  ? "bg-destructive/20 text-foreground"
                  : "bg-secondary"
              }`}
            >
              {r.hazardActive ? (
                <ShieldAlert className="h-4 w-4 shrink-0 text-primary" />
              ) : (
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
              )}
              {r.hazardActive
                ? "Hazard active: residential blocks earn nothing."
                : `Protected by ${activeBonus}: hazard has no effect.`}
            </div>
          )}

          {/* Printed Title Deed Schedule (0 to 8 Blocks) */}
          <div className="mt-4 border-t border-border/60 pt-3">
            <div className="font-display text-[10px] tracking-widest text-muted-foreground uppercase">
              Official Title Deed Rent Schedule
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1 text-xs">
              {district.rentSchedule.map((baseVal, blkCount) => {
                const isCurrent = r.effectiveBlocks === blkCount;
                const valWithMult = baseVal * r.multiplier;
                return (
                  <div
                    key={blkCount}
                    className={`rounded border px-2 py-1 ${
                      isCurrent
                        ? "border-primary bg-primary/20 font-bold text-primary"
                        : "border-border/50 bg-background/40 text-muted-foreground"
                    }`}
                  >
                    <div className="text-[10px]">
                      {blkCount === 0 ? "0 (Land)" : `${blkCount} Blk${blkCount > 1 ? "s" : ""}`}
                    </div>
                    <div className="font-display text-xs text-foreground">
                      {formatK(valWithMult)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

function Counter({
  label,
  sub,
  value,
  onChange,
  canAdd,
  onBuyWithCash,
  buyCostLabel,
}: {
  label: string;
  sub?: string;
  value: number;
  onChange: (n: number) => void;
  canAdd: boolean;
  onBuyWithCash?: () => void;
  buyCostLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-2.5">
      <div>
        <div className="font-semibold">{label}</div>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </div>
      <div className="flex items-center gap-2.5">
        {onBuyWithCash && (
          <button
            type="button"
            disabled={!canAdd}
            onClick={onBuyWithCash}
            className="rounded-md border border-primary/50 bg-primary/15 px-2.5 py-1 text-xs font-bold text-primary hover:bg-primary/25 disabled:opacity-40"
          >
            Buy +1 ({buyCostLabel})
          </button>
        )}
        <button
          type="button"
          aria-label={`Remove ${label}`}
          className="hw-btn rounded-lg p-2"
          disabled={value === 0}
          onClick={() => onChange(value - 1)}
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-6 text-center font-display text-xl">{value}</span>
        <button
          type="button"
          aria-label={`Add ${label}`}
          className="hw-btn rounded-lg p-2"
          disabled={!canAdd}
          onClick={() => onChange(value + 1)}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
        on
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border text-muted-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between border-b border-border/50 pb-1">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-semibold">{v}</dd>
    </div>
  );
}
