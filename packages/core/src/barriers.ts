import type { BarrierConfig, Runtime } from "./types";

export const PAUSE_MIN = 10;
export const PAUSE_MAX = 120;
export const TYPING_MIN = 20;
export const TYPING_MAX = 200;
export const LOCK_MAX_MS = 7 * 86_400_000;
export const ESCAPE_WAIT_SECONDS = 120;
export const SCHEDULE_PAUSE_SECONDS = 10;
export const RECOVERY_MS = 24 * 3_600_000;

export type BarrierStep =
  | { kind: "wait"; seconds: number }
  | { kind: "typing"; text: string }
  | { kind: "password" }
  | { kind: "blocked"; reason: string; until: number; canEscape: boolean; canRecover: boolean };

export function localDay(now: number): string {
  const d = new Date(now);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function nextMidnight(now: number): number {
  const d = new Date(now);
  d.setHours(24, 0, 0, 0);
  return d.getTime();
}

function minutes(hhmm: string): number {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** A window may cross midnight, in which case its second half belongs to the next day. */
export function inWindow(
  windows: Extract<BarrierConfig, { type: "schedule" }>["windows"],
  now: number,
): boolean {
  const d = new Date(now);
  const day = d.getDay();
  const t = d.getHours() * 60 + d.getMinutes();
  return windows.some((w) => {
    const s = minutes(w.start);
    const e = minutes(w.end);
    if (s <= e) return w.days.includes(day) && t >= s && t < e;
    return (w.days.includes(day) && t >= s) || (w.days.includes((day + 6) % 7) && t < e);
  });
}

/** The next moment a schedule opens, by scanning forward minute by minute. */
function nextOpen(
  windows: Extract<BarrierConfig, { type: "schedule" }>["windows"],
  now: number,
): number {
  const start = now - (now % 60_000);
  for (let i = 1; i < 8 * 24 * 60; i++) {
    const t = start + i * 60_000;
    if (inWindow(windows, t)) return t;
  }
  return 0;
}

const TYPING_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

export function typingText(length: number, random: () => number = Math.random): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    if (i && i % 6 === 0) out += " ";
    else out += TYPING_ALPHABET[Math.floor(random() * TYPING_ALPHABET.length)];
  }
  return out;
}

/** Each pass after the first on the same day adds this much: a little more friction, never a lockout. */
export const FRICTION_SECONDS = 15;
export const FRICTION_CHARACTERS = 15;

function passesToday(runtime: Runtime, now: number): number {
  const p = runtime.passes;
  return p && p.day === localDay(now) ? p.count : 0;
}

/** The barrier as it stands today: a pause or typing barrier grows with each pass. */
export function withFriction(barrier: BarrierConfig, runtime: Runtime, now: number): BarrierConfig {
  const extra = passesToday(runtime, now);
  if (!extra) return barrier;
  if (barrier.type === "pause") return { ...barrier, seconds: Math.min(PAUSE_MAX, barrier.seconds + extra * FRICTION_SECONDS) };
  if (barrier.type === "typing") return { ...barrier, length: Math.min(TYPING_MAX, barrier.length + extra * FRICTION_CHARACTERS) };
  return barrier;
}

/** What the unlock page must show now. */
export function barrierStep(
  barrier: BarrierConfig,
  runtime: Runtime,
  now: number,
  random: () => number = Math.random,
): BarrierStep {
  return plainStep(withFriction(barrier, runtime, now), runtime, now, random);
}

function plainStep(
  barrier: BarrierConfig,
  runtime: Runtime,
  now: number,
  random: () => number,
): BarrierStep {
  switch (barrier.type) {
    case "pause":
      return { kind: "wait", seconds: barrier.seconds };
    case "typing":
      return { kind: "typing", text: typingText(barrier.length, random) };
    case "daily": {
      const used = runtime.daily.day === localDay(now) ? runtime.daily.used : 0;
      if (used >= barrier.limit) {
        return {
          kind: "blocked",
          reason: `You have used all ${barrier.limit} unlocks for today.`,
          until: nextMidnight(now),
          canEscape: false,
          canRecover: false,
        };
      }
      if (barrier.step === "typing") {
        return { kind: "typing", text: typingText(60, random) };
      }
      return { kind: "wait", seconds: 30 };
    }
    case "schedule":
      if (inWindow(barrier.windows, now)) return { kind: "wait", seconds: SCHEDULE_PAUSE_SECONDS };
      return {
        kind: "blocked",
        reason: "Unlocks are only available in your scheduled windows.",
        until: nextOpen(barrier.windows, now),
        canEscape: false,
        canRecover: false,
      };
    case "locked":
      if (now >= barrier.until) return barrierStep(barrier.after, runtime, now, random);
      return {
        kind: "blocked",
        reason: "Locked until the time you chose.",
        until: barrier.until,
        canEscape: !barrier.escapeUsed,
        canRecover: false,
      };
    case "partner":
      if (barrier.recoveryAt !== null) {
        if (now >= barrier.recoveryAt) return { kind: "wait", seconds: 30 };
        return {
          kind: "blocked",
          reason: "Password recovery is running.",
          until: barrier.recoveryAt,
          canEscape: false,
          canRecover: false,
        };
      }
      return { kind: "password" };
  }
}

/** Records a completed pass. */
export function recordPass(
  barrier: BarrierConfig,
  runtime: Runtime,
  now: number,
): { barrier: BarrierConfig; runtime: Runtime } {
  const stats = { ...runtime.stats, completed: runtime.stats.completed + 1 };
  let next: BarrierConfig = barrier;
  let daily = runtime.daily;
  if (barrier.type === "daily") {
    const day = localDay(now);
    daily = { day, used: (daily.day === day ? daily.used : 0) + 1 };
  }
  if (barrier.type === "partner" && barrier.recoveryAt !== null && now >= barrier.recoveryAt) {
    next = { type: "pause", seconds: 30 };
  }
  if (barrier.type === "locked" && now >= barrier.until) next = barrier.after;
  const day = localDay(now);
  const passes = { day, count: passesToday(runtime, now) + 1 };
  return { barrier: next, runtime: { ...runtime, stats, daily, passes } };
}

export function useEscape(barrier: BarrierConfig): BarrierConfig {
  return barrier.type === "locked" ? { ...barrier, escapeUsed: true } : barrier;
}

export function startRecovery(barrier: BarrierConfig, now: number): BarrierConfig {
  return barrier.type === "partner" && barrier.recoveryAt === null
    ? { ...barrier, recoveryAt: now + RECOVERY_MS }
    : barrier;
}

/** Returns an error, or null if the config can be saved. */
export function validateBarrier(b: BarrierConfig, now: number): string | null {
  switch (b.type) {
    case "pause":
      return b.seconds >= PAUSE_MIN && b.seconds <= PAUSE_MAX ? null : "Wait must be 10 to 120 seconds";
    case "typing":
      return b.length >= TYPING_MIN && b.length <= TYPING_MAX
        ? null
        : "Length must be 20 to 200 characters";
    case "daily":
      return b.limit >= 1 && b.limit <= 100 ? null : "Allow 1 to 100 unlocks a day";
    case "schedule":
      return b.windows.some((w) => w.days.length > 0) ? null : "Add at least one weekly window";
    case "locked":
      if (b.until <= now) return "Choose a time in the future";
      return b.until - now <= LOCK_MAX_MS ? null : "Locks can be at most 7 days";
    case "partner":
      return b.hash ? null : "Set a password";
  }
}
