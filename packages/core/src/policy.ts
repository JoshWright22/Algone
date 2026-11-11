import type { SiteRule } from "@algone/rules";
import { migrateSettings } from "./defaults";
import {
  APP_MODES, APP_PLATFORMS, AVOID_IDS, type AppMode, type AvoidId, type BarrierConfig, type Mode, type Ranking,
  type Settings,
} from "./types";

/**
 * The shared policy: one JSON file every Algone surface reads, and that people and
 * agents may edit. It is data only. Loosening from it still passes each device's barrier.
 */
export const POLICY_SCHEMA = "algone-policy/1";
export const MAX_POLICY_BYTES = 256 * 1024;

/** Settings minus what stays on each device. */
export type SharedSettings = Omit<Settings, "theme" | "breakUntil">;
type Local = Pick<Settings, "theme" | "breakUntil" | "barrier">;

export interface Policy {
  schema: typeof POLICY_SCHEMA;
  /** Rises by one on every write. */
  rev: number;
  updatedAt: string;
  /** Device id, or "agent:<name>" for an agent's edit. */
  updatedBy: string;
  settings: SharedSettings;
  /** Partial settings applied on top, keyed "platform:<name>" or "device:<id>". */
  overrides: Record<string, DeepPartial<SharedSettings>>;
}

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

export type PolicyResult = { ok: true; policy: Policy } | { ok: false; error: string };

/** Shared in place of a partner password, which never leaves the device it was set on. */
export const PARTNER_STAND_IN: BarrierConfig = { type: "typing", length: 200 };

/**
 * The shared part of settings. Barrier progress (a used escape) stays local, and so does
 * a partner password: its hash in a file the person can read could be guessed offline.
 */
export function sharedSettings(settings: Settings): SharedSettings {
  const { theme: _t, breakUntil: _b, ...shared } = settings;
  shared.barrier = shareBarrier(shared.barrier);
  return shared;
}

function shareBarrier(b: BarrierConfig): BarrierConfig {
  if (b.type === "partner") return PARTNER_STAND_IN;
  if (b.type === "locked") return { ...b, escapeUsed: false, after: shareBarrier(b.after) };
  return b;
}

export function policyFromSettings(settings: Settings, rev: number, updatedBy: string, now: number): Policy {
  return {
    schema: POLICY_SCHEMA,
    rev,
    updatedAt: new Date(now).toISOString(),
    updatedBy,
    settings: sharedSettings(settings),
    overrides: {},
  };
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function mergeDeep<T>(base: T, patch: unknown): T {
  if (!isObj(base) || !isObj(patch)) return (patch === undefined ? base : patch) as T;
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(patch)) out[k] = mergeDeep(out[k], v);
  return out as T;
}

/**
 * The settings this device should end up with: the shared settings, then the
 * platform override, then the device override. The local theme is kept.
 */
export function settingsFromPolicy(
  policy: Policy,
  rules: SiteRule[],
  where: { platform: string; deviceId: string; local: Local },
): Settings {
  let shared = policy.settings;
  for (const key of [`platform:${where.platform}`, `device:${where.deviceId}`]) {
    if (policy.overrides[key]) shared = mergeDeep(shared, policy.overrides[key]);
  }
  const { theme, breakUntil, barrier: localBarrier } = where.local;
  let barrier = shared.barrier;
  // A partner password set here stays. Otherwise keep this device's escape if a lock is still on.
  if (localBarrier.type === "partner") barrier = localBarrier;
  else if (barrier.type === "locked" && localBarrier.type === "locked") {
    barrier = { ...barrier, escapeUsed: barrier.escapeUsed || localBarrier.escapeUsed };
    if (localBarrier.after.type === "partner" && JSON.stringify(barrier.after) === JSON.stringify(PARTNER_STAND_IN)) {
      barrier = { ...barrier, after: localBarrier.after };
    }
  }
  return migrateSettings({ ...shared, barrier, theme, breakUntil } as Settings, rules);
}

// ---- Validation. Strict on shape, so a typo is an error and not a silent loosening.

const MODES: Mode[] = ["nofeed", "random", "healthy", "tuned", "custom"];
const RANKINGS: Ranking[] = ["newest", "fair", "oldestUnseen"];
const MAX_LIST = 500;
const MAX_TEXT = 200;

class Invalid extends Error {}
const need = (cond: unknown, msg: string): void => {
  if (!cond) throw new Invalid(msg);
};

function strings(v: unknown, path: string): void {
  need(Array.isArray(v), `${path} must be a list`);
  const list = v as unknown[];
  need(list.length <= MAX_LIST, `${path} has more than ${MAX_LIST} entries`);
  for (const s of list) need(typeof s === "string" && s.length <= MAX_TEXT, `${path} entries must be short text`);
}

function bool(v: unknown, path: string): void {
  need(typeof v === "boolean", `${path} must be true or false`);
}

function num(v: unknown, path: string, min: number, max: number): void {
  need(typeof v === "number" && Number.isFinite(v) && v >= min && v <= max, `${path} must be a number from ${min} to ${max}`);
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

function barrier(v: unknown, path: string, depth = 0): void {
  need(isObj(v), `${path} must be an object`);
  const b = v as Record<string, unknown>;
  switch (b.type as BarrierConfig["type"]) {
    case "pause":
      return num(b.seconds, `${path}.seconds`, 10, 120);
    case "typing":
      return num(b.length, `${path}.length`, 20, 200);
    case "daily":
      num(b.limit, `${path}.limit`, 1, 100);
      return need(b.step === "pause" || b.step === "typing", `${path}.step must be "pause" or "typing"`);
    case "schedule": {
      need(Array.isArray(b.windows) && b.windows.length > 0 && b.windows.length <= 50, `${path}.windows needs 1 to 50 windows`);
      for (const w of b.windows as unknown[]) {
        need(isObj(w), `${path}.windows entries must be objects`);
        const win = w as Record<string, unknown>;
        need(
          Array.isArray(win.days) && win.days.length > 0 &&
            (win.days as unknown[]).every((d) => Number.isInteger(d) && (d as number) >= 0 && (d as number) <= 6),
          `${path}.windows days must be 0 (Sunday) to 6`,
        );
        need(typeof win.start === "string" && HHMM.test(win.start), `${path}.windows start must be HH:MM`);
        need(typeof win.end === "string" && HHMM.test(win.end), `${path}.windows end must be HH:MM`);
      }
      return;
    }
    case "locked":
      need(depth === 0, `${path} cannot nest a lock in a lock`);
      num(b.until, `${path}.until`, 0, Number.MAX_SAFE_INTEGER);
      // How far ahead is checked against the clock where it is applied (validateBarrier, 7 days).
      bool(b.escapeUsed, `${path}.escapeUsed`);
      return barrier(b.after, `${path}.after`, depth + 1);
    case "partner":
      throw new Invalid(`${path}: a partner password is set on each device, not in the policy`);
    default:
      throw new Invalid(`${path}.type is not a known barrier`);
  }
}

function site(v: unknown, path: string): void {
  need(isObj(v), `${path} must be an object`);
  const s = v as Record<string, unknown>;
  if (s.enabled !== undefined) bool(s.enabled, `${path}.enabled`);
  if (s.mode !== undefined) need(MODES.includes(s.mode as Mode), `${path}.mode must be one of ${MODES.join(", ")}`);
  if (s.elements !== undefined) {
    need(isObj(s.elements), `${path}.elements must be an object`);
    for (const [k, h] of Object.entries(s.elements as object)) bool(h, `${path}.elements.${k}`);
  }
  if (s.tuned !== undefined) {
    need(isObj(s.tuned), `${path}.tuned must be an object`);
    for (const [k, list] of Object.entries(s.tuned as object)) strings(list, `${path}.tuned.${k}`);
  }
  if (s.intent !== undefined) {
    need(isObj(s.intent), `${path}.intent must be an object`);
    for (const [k, b] of Object.entries(s.intent as object)) bool(b, `${path}.intent.${k}`);
  }
}

function settings(v: unknown, path: string, partial: boolean, rules: SiteRule[]): void {
  need(isObj(v), `${path} must be an object`);
  const s = v as Record<string, unknown>;
  const has = (k: string) => s[k] !== undefined;
  if (!partial) need(isObj(s.sites) && has("barrier"), `${path} needs sites and barrier`);
  if (has("sites")) {
    need(isObj(s.sites), `${path}.sites must be an object`);
    const ids = new Set(rules.map((r) => r.id));
    for (const [id, sv] of Object.entries(s.sites as object)) {
      need(ids.has(id), `${path}.sites.${id} is not a supported site`);
      site(sv, `${path}.sites.${id}`);
    }
  }
  if (has("barrier")) barrier(s.barrier, `${path}.barrier`);
  if (has("snoozeMinutes")) num(s.snoozeMinutes, `${path}.snoozeMinutes`, 1, 120);
  if (has("stopAtEnd")) bool(s.stopAtEnd, `${path}.stopAtEnd`);
  if (has("ruleUpdates")) bool(s.ruleUpdates, `${path}.ruleUpdates`);
  if (has("queueSoftCap")) num(s.queueSoftCap, `${path}.queueSoftCap`, 1, 100);
  if (has("customRanking")) need(RANKINGS.includes(s.customRanking as Ranking), `${path}.customRanking is not known`);
  if (has("webSources")) {
    need(isObj(s.webSources), `${path}.webSources must be an object`);
    bool((s.webSources as Record<string, unknown>).wikipedia, `${path}.webSources.wikipedia`);
  }
  if (has("healthy")) {
    need(isObj(s.healthy), `${path}.healthy must be an object`);
    const h = s.healthy as Record<string, unknown>;
    if (h.batchSize !== undefined || !partial) num(h.batchSize, `${path}.healthy.batchSize`, 1, 50);
    if (h.dailyBudgetMinutes !== undefined || !partial) num(h.dailyBudgetMinutes, `${path}.healthy.dailyBudgetMinutes`, 1, 1440);
  }
  if (has("avoid")) {
    strings(s.avoid, `${path}.avoid`);
    for (const id of s.avoid as string[]) need(AVOID_IDS.includes(id as AvoidId), `${path}.avoid: "${id}" is not one of ${AVOID_IDS.join(", ")}`);
  }
  if (has("activities")) {
    strings(s.activities, `${path}.activities`);
    need((s.activities as string[]).length <= 20, `${path}.activities: at most 20`);
  }
  if (has("apps")) apps(s.apps, `${path}.apps`);
  need(!has("theme"), `${path}.theme stays on each device; remove it`);
  need(!has("breakUntil"), `${path}.breakUntil stays on each device; remove it`);
  const known = [
    "schema", "sites", "barrier", "snoozeMinutes", "stopAtEnd", "ruleUpdates", "queueSoftCap", "customRanking",
    "webSources", "healthy", "avoid", "activities", "apps",
  ];
  for (const k of Object.keys(s)) need(known.includes(k), `${path}.${k} is not a known setting`);
}

function apps(v: unknown, path: string): void {
  need(isObj(v), `${path} must be an object`);
  for (const [platform, list] of Object.entries(v as object)) {
    need((APP_PLATFORMS as readonly string[]).includes(platform), `${path}.${platform} is not a platform`);
    need(isObj(list), `${path}.${platform} must be an object`);
    for (const [id, app] of Object.entries(list as object)) {
      const p = `${path}.${platform}.${id}`;
      need(/^[a-z0-9.-]{1,64}$/.test(id), `${p}: app ids are lowercase letters, digits, dots and dashes`);
      need(isObj(app), `${p} must be an object`);
      const a = app as Record<string, unknown>;
      need(APP_MODES.includes(a.mode as AppMode), `${p}.mode must be one of ${APP_MODES.join(", ")}`);
      if (a.minutes !== undefined) num(a.minutes, `${p}.minutes`, 1, 1440);
      if (a.shortVideo !== undefined) bool(a.shortVideo, `${p}.shortVideo`);
      need(a.mode !== "limit" || a.minutes !== undefined, `${p}: limit needs minutes`);
    }
  }
}

/** Parses and checks a policy file. Never throws. */
export function parsePolicy(text: string, rules: SiteRule[]): PolicyResult {
  if (text.length > MAX_POLICY_BYTES) return { ok: false, error: "The policy file is too large" };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "The policy file is not valid JSON" };
  }
  return validatePolicy(raw, rules);
}

export function validatePolicy(raw: unknown, rules: SiteRule[]): PolicyResult {
  try {
    need(isObj(raw), "The policy must be an object");
    const p = raw as Record<string, unknown>;
    need(p.schema === POLICY_SCHEMA, `schema must be "${POLICY_SCHEMA}"`);
    need(Number.isInteger(p.rev) && (p.rev as number) >= 0, "rev must be a whole number");
    need(typeof p.updatedAt === "string", "updatedAt must be text");
    need(typeof p.updatedBy === "string" && p.updatedBy.length <= 100, "updatedBy must be short text");
    settings(p.settings, "settings", false, rules);
    if (p.overrides !== undefined) {
      need(isObj(p.overrides), "overrides must be an object");
      for (const [k, o] of Object.entries(p.overrides as object)) {
        need(/^(platform|device):[\w.-]{1,64}$/.test(k), `overrides.${k}: keys are "platform:<name>" or "device:<id>"`);
        settings(o, `overrides.${k}`, true, rules);
      }
    }
    const known = ["$schema", "schema", "rev", "updatedAt", "updatedBy", "settings", "overrides"];
    for (const k of Object.keys(p)) need(known.includes(k), `${k} is not a known policy field`);
    const s = p.settings as Record<string, unknown>;
    const shared = sharedSettings(migrateSettings({ ...s, theme: "system" } as unknown as Settings, rules));
    return {
      ok: true,
      policy: {
        schema: POLICY_SCHEMA,
        rev: p.rev as number,
        updatedAt: p.updatedAt as string,
        updatedBy: p.updatedBy as string,
        settings: shared,
        overrides: (p.overrides ?? {}) as Policy["overrides"],
      },
    };
  } catch (e) {
    if (e instanceof Invalid) return { ok: false, error: e.message };
    throw e;
  }
}

/** A policy with one more revision, written by `by`. */
export function nextRevision(policy: Policy, settings: SharedSettings, by: string, now: number): Policy {
  return { ...policy, rev: policy.rev + 1, updatedAt: new Date(now).toISOString(), updatedBy: by, settings };
}
