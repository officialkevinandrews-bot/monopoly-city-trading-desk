// Segments: a top, b upper-right, c lower-right, d bottom, e lower-left, f upper-left, g middle
const MAP: Record<string, string> = {
  "0": "abcdef", "1": "bc", "2": "abged", "3": "abgcd", "4": "fgbc", "5": "afgcd",
  "6": "afgedc", "7": "abc", "8": "abcdefg", "9": "abcfgd", "-": "g", r: "eg", " ": "",
  A: "abcefg", U: "bcdef", C: "adef", E: "adefg", n: "ceg", d: "bcdeg", o: "cdeg", P: "abefg", L: "def", H: "bcefg", O: "abcdef", S: "afgcd",
};

const SEG: Record<string, string> = {
  a: "M12 4 L48 4 L42 10 L18 10 Z",
  b: "M50 6 L50 46 L44 42 L44 12 Z",
  c: "M50 54 L50 94 L44 88 L44 58 Z",
  d: "M12 96 L48 96 L42 90 L18 90 Z",
  e: "M10 54 L10 94 L16 88 L16 58 Z",
  f: "M10 6 L10 46 L16 42 L16 12 Z",
  g: "M14 50 L18 46 L42 46 L46 50 L42 54 L18 54 Z",
};

export function Digit({ ch, on, size = 64 }: { ch: string; on?: string | undefined; size?: number | undefined }) {
  const lit = on ?? MAP[ch] ?? "";
  return (
    <svg viewBox="0 0 60 100" width={size * 0.6} height={size} aria-hidden>
      {Object.entries(SEG).map(([k, p]) => (
        <path key={k} d={p} className={lit.includes(k) ? "seg-on" : "seg-off"} />
      ))}
    </svg>
  );
}

export function SevenSeg({ text, size, segs }: { text: string; size?: number | undefined; segs?: (string | undefined)[] | undefined }) {
  return (
    <div className="flex items-center gap-1" role="img" aria-label={text}>
      {text.split("").map((c, i) => <Digit key={i} ch={c} on={segs?.[i]} size={size} />)}
    </div>
  );
}
