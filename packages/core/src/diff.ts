import type { SiteRule } from "@algone/rules";
import { applyPatch } from "./commands";
import { isHidden } from "./defaults";
import { APP_PLATFORMS, type GlobalKey, type IntentSettings, type Patch, type Settings } from "./types";
import { isWeakening } from "./weakening";

/** Settings every device shares. `theme` and `breakUntil` stay on each device. */
export const SHARED_GLOBALS: GlobalKey[] = [
  "snoozeMinutes",
  "stopAtEnd",
  "ruleUpdates",
  "queueSoftCap",
  "customRanking",
  "wikipedia",
];

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function globalValue(s: Settings, key: GlobalKey): unknown {
  return key === "wikipedia" ? s.webSources.wikipedia : s[key];
}

/** The patches that turn `from` into `to`, using the same ops the popup sends. */
export function diffSettings(from: Settings, to: Settings, rules: SiteRule[]): Patch[] {
  const out: Patch[] = [];
  if (!same(from.barrier, to.barrier)) out.push({ op: "setBarrier", barrier: to.barrier });
  for (const rule of rules) {
    const a = from.sites[rule.id];
    const b = to.sites[rule.id];
    if (!a || !b) continue;
    const site = rule.id;
    if (a.enabled !== b.enabled) out.push({ op: "setSiteEnabled", site, enabled: b.enabled });
    if (a.mode !== b.mode) out.push({ op: "setMode", site, mode: b.mode });
    for (const el of rule.elements) {
      const hidden = isHidden(el, b);
      if (isHidden(el, a) !== hidden) out.push({ op: "setElement", site, element: el.id, hidden });
    }
    // Elements added by a rules overlay are not in the bundled rule; copy explicit choices.
    for (const [element, hidden] of Object.entries(b.elements)) {
      if (rule.elements.some((e) => e.id === element)) continue;
      if (a.elements[element] !== hidden) out.push({ op: "setElement", site, element, hidden });
    }
    for (const key of Object.keys(b.intent) as Array<keyof IntentSettings>) {
      if (a.intent[key] !== b.intent[key]) out.push({ op: "setIntent", site, key, value: b.intent[key] });
    }
    if (!same(a.tuned, b.tuned)) out.push({ op: "setTuned", site, filters: b.tuned });
  }
  for (const key of SHARED_GLOBALS) {
    const value = globalValue(to, key);
    if (!same(globalValue(from, key), value)) out.push({ op: "setGlobal", key, value });
  }
  if (!same(from.healthy, to.healthy)) out.push({ op: "setHealthy", ...to.healthy });
  if (!same(from.avoid, to.avoid)) out.push({ op: "setAvoid", ids: to.avoid });
  if (!same(from.activities, to.activities)) out.push({ op: "setActivities", items: to.activities });
  for (const platform of APP_PLATFORMS) {
    const a = from.apps[platform] ?? {};
    const b = to.apps[platform] ?? {};
    for (const app of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (!same(a[app], b[app])) out.push({ op: "setApp", platform, app, config: b[app] ?? null });
    }
  }
  return out;
}

export interface SyncPlan {
  /** Stricter or neutral: applied without a barrier. */
  applyNow: Patch[];
  /** Looser: waits for this device's barrier, as one batch. */
  pending: Patch[];
}

/**
 * Splits incoming changes. Each patch is judged against the settings as they stand
 * after the stricter ones before it, so a stricter barrier lands before anything waits on it.
 */
export function planSync(local: Settings, incoming: Settings, rules: SiteRule[]): SyncPlan {
  const plan: SyncPlan = { applyNow: [], pending: [] };
  let current = local;
  for (const patch of diffSettings(local, incoming, rules)) {
    if (isWeakening(current, patch, rules)) {
      plan.pending.push(patch);
    } else {
      plan.applyNow.push(patch);
      current = applyPatch(current, patch);
    }
  }
  return plan;
}
