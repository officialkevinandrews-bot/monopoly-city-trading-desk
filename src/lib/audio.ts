let ctx: AudioContext | null = null;
let volume = 0.5;
let muted = false;

export function setVolume(v: number) { volume = v; }
export function setMuted(m: boolean) { muted = m; }

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType = "square", gain = 0.3, delay = 0, slideTo?: number) {
  const c = ac();
  if (!c || muted || volume === 0) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain * volume, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const sfx = {
  unlock: () => ac(),
  press: () => tone(900, 0.04, "square", 0.15),
  click: () => tone(2200, 0.015, "square", 0.12),
  tick: () => { tone(1500, 0.02, "triangle", 0.25); },
  tock: () => { tone(1000, 0.02, "triangle", 0.25); },
  warn: () => { tone(1800, 0.07, "square", 0.3); tone(1800, 0.07, "square", 0.3, 0.12); },
  result: () => { tone(880, 0.08, "square", 0.25); tone(1320, 0.15, "square", 0.25, 0.09); },
  train: () => {
    [0, 0.5].forEach((dl) => {
      tone(311, 0.4, "sawtooth", 0.18, dl);
      tone(370, 0.4, "sawtooth", 0.18, dl);
      tone(466, 0.4, "sawtooth", 0.14, dl);
    });
    for (let i = 0; i < 8; i++) tone(120, 0.05, "square", 0.12, 1 + i * 0.12);
  },
  buzzer: () => {
    tone(140, 0.9, "sawtooth", 0.4);
    tone(147, 0.9, "square", 0.25);
    tone(1200, 0.6, "sine", 0.35, 1.0, 600);
  },
  alarm: () => { for (let i = 0; i < 4; i++) tone(1046, 0.12, "square", 0.3, i * 0.2); },
};
