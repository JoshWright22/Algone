export interface Puzzle {
  kind: "arithmetic" | "scramble" | "sequence";
  prompt: string;
  answer: string;
}

const WORDS = [
  "garden", "window", "morning", "library", "harbor", "journey", "lantern", "meadow",
  "orchard", "pattern", "quarter", "ribbon", "shelter", "thimble", "voyage", "whisper",
];

/** A small seeded generator, so a day's puzzle can be stable and tests are exact. */
export function seeded(seed: number): () => number {
  let s = (Math.imul(seed >>> 0, 2654435761) ^ 0x9e3779b9) >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

const int = (r: () => number, min: number, max: number) => min + Math.floor(r() * (max - min + 1));

export function makePuzzle(seed: number): Puzzle {
  const r = seeded(seed);
  const pick = int(r, 0, 2);
  if (pick === 0) {
    const a = int(r, 12, 99);
    const b = int(r, 3, 12);
    return { kind: "arithmetic", prompt: `What is ${a} × ${b}?`, answer: String(a * b) };
  }
  if (pick === 1) {
    const word = WORDS[int(r, 0, WORDS.length - 1)]!;
    const letters = word.split("");
    for (let i = letters.length - 1; i > 0; i--) {
      const j = int(r, 0, i);
      [letters[i], letters[j]] = [letters[j]!, letters[i]!];
    }
    let prompt = letters.join("");
    if (prompt === word) prompt = word.slice(1) + word[0];
    return { kind: "scramble", prompt: `Unscramble: ${prompt}`, answer: word };
  }
  const start = int(r, 1, 9);
  const step = int(r, 2, 9);
  const seq = [0, 1, 2, 3].map((i) => start + i * step);
  return {
    kind: "sequence",
    prompt: `What comes next? ${seq.join(", ")}, ...`,
    answer: String(start + 4 * step),
  };
}
