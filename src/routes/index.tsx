import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { TrainFront, Volume2, VolumeX } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SevenSeg } from "@/components/SevenSeg";
import { sfx, setMuted, setVolume } from "@/lib/audio";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Monopoly City Trading Unit – Digital Replica" },
      { name: "description", content: "Replacement Monopoly City electronic unit: Build spinner, mystery auction timer and 1-hour game timer with retro sounds." },
      { property: "og:title", content: "Monopoly City Trading Unit – Digital Replica" },
      { property: "og:description", content: "Build spinner, mystery auction timer and game timer for Monopoly City." },
    ],
  }),
  component: TradingUnit,
});

type Mode = "idle" | "spin" | "result" | "auction" | "sold";
const CHASE = ["a", "b", "c", "d", "e", "f"];
const HOUR = 60 * 60;

function TradingUnit() {
  const [mode, setMode] = useState<Mode>("idle");
  const [result, setResult] = useState<string>("");
  const [spinFrame, setSpinFrame] = useState(0);
  const [auctionLeft, setAuctionLeft] = useState(0);
  const [muted, setMute] = useState(false);
  const [vol, setVol] = useState(0.6);
  const [session, setSession] = useState(0);
  const [sessionOn, setSessionOn] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const timers = useRef<number[]>([]);
  const [idleFrame, setIdleFrame] = useState(0);

  useEffect(() => { setMuted(muted); }, [muted]);
  useEffect(() => { setVolume(vol); }, [vol]);

  const clearAll = () => { timers.current.forEach((t) => { clearInterval(t); clearTimeout(t); }); timers.current = []; };
  useEffect(() => clearAll, []);

  // idle chase
  useEffect(() => {
    if (mode !== "idle") return;
    const t = window.setInterval(() => setIdleFrame((f) => f + 1), 180);
    return () => clearInterval(t);
  }, [mode]);

  // session timer
  useEffect(() => {
    if (!sessionOn) return;
    const t = window.setInterval(() => {
      setSession((s) => {
        const n = s + 1;
        if (n >= HOUR - 300 && n < HOUR && n % 30 === 0) sfx.warn();
        if (n >= HOUR) { sfx.alarm(); setSessionOn(false); setTimeUp(true); return HOUR; }
        return n;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [sessionOn]);

  const build = () => {
    sfx.unlock(); sfx.press();
    if (mode === "auction") return;
    clearAll(); setMode("spin");
    const outcomes = ["1", "2", "3", "r"];
    const total = 1400 + Math.random() * 900;
    const start = Date.now();
    const iv = window.setInterval(() => {
      setSpinFrame((f) => f + 1); sfx.click();
      if (Date.now() - start > total) {
        clearInterval(iv);
        const r = outcomes[Math.floor(Math.random() * 4)];
        setResult(r); setMode("result");
        r === "r" ? sfx.train() : sfx.result();
      }
    }, 55);
    timers.current.push(iv);
  };

  const auction = () => {
    sfx.unlock(); sfx.press();
    clearAll();
    const dur = 30 + Math.floor(Math.random() * 21);
    const end = Date.now() + dur * 1000;
    setAuctionLeft(dur); setMode("auction");
    let n = 0;
    const iv = window.setInterval(() => {
      const left = (end - Date.now()) / 1000;
      setAuctionLeft(left);
      if (left <= 0) {
        clearInterval(iv); sfx.buzzer(); setMode("sold");
        return;
      }
      n++;
      if (left <= 5) { if (n % 1 === 0) sfx.warn(); }
      else if (n % 4 === 0) (n % 8 === 0 ? sfx.tock : sfx.tick)();
    }, 250);
    timers.current.push(iv);
  };

  const stop = () => { sfx.press(); clearAll(); setMode("idle"); };

  let text = "    ";
  let segs: (string | undefined)[] | undefined = undefined;
  let displayClass = "";
  if (mode === "idle") {
    const s = CHASE[idleFrame % 6];
    text = "----"; segs = ["g", s, s, "g"];
  } else if (mode === "spin") {
    text = "8888"; segs = [0, 1, 2, 3].map((i) => CHASE[(spinFrame + i) % 6] + CHASE[(spinFrame + i + 3) % 6]);
  } else if (mode === "result") {
    text = result === "r" ? " r  " : ` ${result}  `;
    if (result === "r") text = "  r ";
    displayClass = "animate-pulse";
  } else if (mode === "auction") {
    text = "AUC "; segs = [undefined, undefined, undefined, CHASE[Math.floor(auctionLeft * 4) % 6]];
    displayClass = auctionLeft <= 5 ? "led-flash-fast" : "led-pulse";
  } else if (mode === "sold") {
    text = "SOLd"; displayClass = "led-flash";
  }

  const mm = String(Math.floor(session / 60)).padStart(2, "0");
  const ss = String(session % 60).padStart(2, "0");

  return (
    <AppShell>
      <div className="mx-auto max-w-md">
        <div className="chassis rounded-[2.5rem] p-5 sm:p-7">
          <div className="mb-4 flex items-center justify-between px-1">
            <span className="font-display text-xs tracking-[0.3em] text-chassis-ink">TRADING UNIT</span>
            <span className="h-2 w-2 rounded-full bg-primary led-dot" />
          </div>

          <div className="lcd-bezel rounded-2xl p-4">
            <div className={`flex min-h-28 items-center justify-center gap-3 ${displayClass}`}>
              <SevenSeg text={text} segs={segs} size={72} />
              {mode === "result" && result === "r" && <TrainFront className="h-12 w-12 text-primary led-text" />}
            </div>
            <div className="mt-2 flex justify-between font-display text-[10px] tracking-widest text-primary/70">
              <span>{mode === "result" ? (result === "r" ? "FREE RAILROAD" : `BUILD ${result} BLOCK${result === "1" ? "" : "S"}`) : mode === "auction" ? "AUCTION OPEN" : mode === "sold" ? "GOING… GONE!" : mode === "spin" ? "BUILDING…" : "READY"}</span>
              <span>{muted ? "MUTE" : ""}</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <HwButton label="BUILD" onClick={build} variant="red" disabled={mode === "auction"} />
            <HwButton label="AUCTION" onClick={auction} variant="red" />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <HwButton small label="STOP" onClick={stop} />
            <HwButton small label={muted ? "SOUND" : "MUTE"} onClick={() => { setMute((m) => !m); }} icon={muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />} />
            <HwButton small label="CLEAR" onClick={() => { clearAll(); setMode("idle"); }} />
          </div>

          <label className="mt-5 flex items-center gap-3 px-1 text-xs font-semibold text-chassis-ink">
            VOL
            <input type="range" min={0} max={1} step={0.05} value={vol} onChange={(e) => setVol(+e.target.value)} className="w-full accent-primary" />
          </label>

          <div className="lcd-bezel mt-6 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-display text-[10px] tracking-widest text-primary/70">GAME TIMER · 60 MIN</div>
                <SevenSeg text={mm + ss} size={36} />
              </div>
              <div className="flex flex-col gap-2">
                <HwButton small label={sessionOn ? "PAUSE" : "START"} onClick={() => { sfx.unlock(); sfx.press(); setSessionOn((o) => !o); }} />
                <HwButton small label="RESET" onClick={() => { sfx.press(); setSession(0); setTimeUp(false); }} />
              </div>
            </div>
          </div>
        </div>

        {timeUp && (
          <div className="mt-6 rounded-xl border border-primary bg-card p-4 text-center">
            <p className="font-display text-lg text-primary led-text">TIME'S UP!</p>
            <p className="mt-1 text-sm text-muted-foreground">The hour is over. Tally net worth to find the winner — or play another hour.</p>
            <div className="mt-3 flex justify-center gap-2">
              <button className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" onClick={() => { setSession(0); setTimeUp(false); setSessionOn(true); }}>Another hour</button>
              <a href="/scoreboard" className="rounded-md border border-border px-4 py-2 text-sm font-semibold">End match → Scoreboard</a>
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          BUILD spins to 1, 2, 3 or a train (free railroad). AUCTION runs a hidden 30–50 s timer — urgent beeps mean 5 seconds left.
        </p>
      </div>
    </AppShell>
  );
}

function HwButton({ label, onClick, variant, small, disabled, icon }: { label: string; onClick: () => void; variant?: "red"; small?: boolean; disabled?: boolean; icon?: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`hw-btn ${variant === "red" ? "hw-btn-red" : ""} flex items-center justify-center gap-1 rounded-2xl font-display font-bold tracking-widest disabled:opacity-50 ${small ? "py-2.5 text-xs" : "py-6 text-lg"}`}>
      {icon}{label}
    </button>
  );
}
