import { triggerHaptic } from "./native-bridge";

let ctx: AudioContext | null = null;
let volume = 0.5;
let muted = false;

export function setVolume(v: number) {
  volume = v;
}
export function setMuted(m: boolean) {
  muted = m;
}

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (AudioCtx) {
      ctx = new AudioCtx();
    }
  }
  if (ctx && ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType = "square",
  gain = 0.3,
  delay = 0,
  slideTo?: number
) {
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
  press: () => {
    triggerHaptic(28);
    tone(900, 0.04, "square", 0.15);
  },
  click: () => {
    triggerHaptic(12);
    tone(2200, 0.015, "square", 0.12);
  },
  cash: () => {
    triggerHaptic([18, 25, 25]);
    tone(1046, 0.05, "triangle", 0.22);
    tone(1318, 0.09, "triangle", 0.24, 0.045);
  },
  diceClatter: () => {
    triggerHaptic([20, 35, 20, 35, 25]);
    for (let i = 0; i < 6; i++) {
      tone(1300 + Math.random() * 700, 0.018, "triangle", 0.16, i * 0.055);
    }
  },
  diceLand: (isDoubles = false) => {
    triggerHaptic(isDoubles ? [45, 45, 80] : 35);
    tone(520, 0.07, "triangle", 0.25);
    tone(780, 0.11, "triangle", 0.25, 0.06);
    if (isDoubles) {
      tone(1046, 0.12, "square", 0.28, 0.14);
      tone(1318, 0.18, "square", 0.28, 0.24);
    }
  },
  spinTick: (step = 0, total = 15) => {
    triggerHaptic(10);
    const freq = 1100 + (step / Math.max(1, total)) * 600;
    tone(freq, 0.02, "triangle", 0.22);
  },
  tick: () => {
    tone(1500, 0.02, "triangle", 0.25);
  },
  tock: () => {
    tone(1000, 0.02, "triangle", 0.25);
  },
  auctionTick: (pitchMult = 1) => {
    tone(1500 * pitchMult, 0.022, "triangle", 0.25);
  },
  auctionTock: (pitchMult = 1) => {
    tone(1000 * pitchMult, 0.022, "triangle", 0.25);
  },
  warn: () => {
    triggerHaptic(20);
    tone(1800, 0.07, "square", 0.3);
    tone(1800, 0.07, "square", 0.3, 0.12);
  },
  auctionWarn: () => {
    triggerHaptic(22);
    tone(1850, 0.06, "square", 0.3);
    tone(1850, 0.06, "square", 0.3, 0.09);
  },
  result: () => {
    triggerHaptic(40);
    tone(880, 0.08, "square", 0.25);
    tone(1320, 0.15, "square", 0.25, 0.09);
  },
  reveal: (count = 1) => {
    triggerHaptic(count >= 3 ? [35, 35, 55] : 35);
    for (let i = 0; i < Math.max(1, count); i++) {
      tone(880 + i * 220, 0.08, "square", 0.26, i * 0.09);
    }
  },
  train: () => {
    triggerHaptic([40, 50, 75]);
    [0, 0.5].forEach((dl) => {
      tone(311, 0.4, "sawtooth", 0.18, dl);
      tone(370, 0.4, "sawtooth", 0.18, dl);
      tone(466, 0.4, "sawtooth", 0.14, dl);
    });
    for (let i = 0; i < 8; i++)
      tone(120, 0.05, "square", 0.12, 1 + i * 0.12);
  },
  railroad: () => {
    sfx.train();
  },
  buzzer: () => {
    triggerHaptic([120, 60, 180, 60, 260]);
    tone(140, 0.9, "sawtooth", 0.4);
    tone(147, 0.9, "square", 0.25);
    tone(1200, 0.6, "sine", 0.35, 1.0, 600);
  },
  auctionEnd: () => {
    sfx.buzzer();
  },
  alarm: () => {
    triggerHaptic([100, 80, 100, 80, 200]);
    for (let i = 0; i < 4; i++) tone(1046, 0.12, "square", 0.3, i * 0.2);
  },
};
