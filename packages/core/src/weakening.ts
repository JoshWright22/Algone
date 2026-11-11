import type { SiteRule } from "@algone/rules";
import { applyPatch } from "./commands";
import { isHidden } from "./defaults";
import {
  APP_MODES, type AppMode, type AppPolicy, type BarrierConfig, type Mode, type Patch, type Settings,
  type TunedFilters,
} from "./types";

/** Applying these never needs a barrier: they do not touch what is hidden. */
const NEUTRAL_GLOBALS = new Set(["theme", "queueSoftCap", "customRanking"]);

/** Barrier types from weakest to strongest. Locks are temporary and only compare with locks. */
const BARRIER_RANK: Record<string, number> = { pause: 1, typing: 2, daily: 3, schedule: 4, partner: 5 };

/** Mode strictness: a move to an equal or higher number never needs a barrier. */
const MODE_RANK: Record<Mode, number> = { tuned: 0, custom: 1, healthy: 2, random: 3, nofeed: 3 };

const APP_RANK = Object.fromEntries(APP_MODES.map((m, i) => [m, i])) as Record<AppMode, number>;

function appTightens(before: AppPolicy | undefined, after: AppPolicy | null): boolean {
  if (!after) return !before || before.mode === "allow";
  if (!before) return true; // A new entry only adds limits.
  if (APP_RANK[after.mode] !== APP_RANK[before.mode]) return APP_RANK[after.mode] > APP_RANK[before.mode];
  if (before.shortVideo && !after.shortVideo) return false;
  if (after.mode === "limit") return (after.minutes ?? Infinity) <= (before.minutes ?? Infinity);
  return true;
}

/** True if `after` is stricter than `before`: a stronger type, or the same type made stricter. */
export function isStricterBarrier(before: BarrierConfig, after: BarrierConfig): boolean {
  const rb = BARRIER_RANK[before.type];
  const ra = BARRIER_RANK[after.type];
  if (rb && ra && ra !== rb) return ra > rb;
  if (before.type === "pause" && after.type === "pause") return after.seconds > before.seconds;
  if (before.type === "typing" && after.type === "typing") return after.length > before.length;
  if (before.type === "daily" && after.type === "daily") {
    return after.limit < before.limit && after.step === before.step;
  }
  if (before.type === "locked" && after.type === "locked") return after.until > before.until;
  return false;
}

function isSubset(small: string[], big: string[]): boolean {
  return small.every((v) => big.includes(v));
}

function tunedTightens(before: TunedFilters, after: TunedFilters): boolean {
  const blocksKept =
    isSubset(before.blockKeywords, after.blockKeywords) &&
    isSubset(before.blockChannels, after.blockChannels) &&
    isSubset(before.blockTopics, after.blockTopics) &&
    isSubset(before.hideKinds, after.hideKinds);
  if (!blocksKept) return false;
  if (before.allowTopics.length === 0) return true; // Starting an allow-list narrows.
  // Removing entries narrows; adding widens; emptying it shows everything.
  return after.allowTopics.length > 0 && isSubset(after.allowTopics, before.allowTopics);
}

/** Fails closed: a change is tightening only if it is listed here. */
export function isWeakening(settings: Settings, patch: Patch, rules: SiteRule[]): boolean {
  switch (patch.op) {
    case "setElement": {
      const site = settings.sites[patch.site];
      const el = rules.find((r) => r.id === patch.site)?.elements.find((e) => e.id === patch.element);
      if (!site || !el) return true;
      if (patch.hidden) return false;
      return isHidden(el, site);
    }
    case "setSiteEnabled":
      return !patch.enabled;
    case "setMode": {
      const current = settings.sites[patch.site]?.mode;
      if (patch.mode === current || !current) return patch.mode !== current;
      return MODE_RANK[patch.mode] < MODE_RANK[current];
    }
    case "setIntent":
      return !patch.value;
    case "setGlobal": {
      if (NEUTRAL_GLOBALS.has(patch.key)) return false;
      if (patch.key === "stopAtEnd") return patch.value !== true;
      if (patch.key === "ruleUpdates") return patch.value !== true;
      if (patch.key === "snoozeMinutes") {
        return !(typeof patch.value === "number" && patch.value <= settings.snoozeMinutes);
      }
      return true;
    }
    case "setBarrier":
      return !isStricterBarrier(settings.barrier, patch.barrier);
    case "setTuned": {
      const site = settings.sites[patch.site];
      return !site || !tunedTightens(site.tuned, patch.filters);
    }
    case "setHealthy": {
      const h = settings.healthy;
      return (patch.batchSize ?? 0) > h.batchSize || (patch.dailyBudgetMinutes ?? 0) > h.dailyBudgetMinutes;
    }
    case "setAvoid":
      return !isSubset(settings.avoid, patch.ids);
    case "setActivities":
      return false;
    case "startBreak":
      return true;
    case "endBreak":
      return false;
    case "setApp":
      return !appTightens(settings.apps[patch.platform]?.[patch.app], patch.config);
    case "batch": {
      let current = settings;
      for (const p of patch.patches) {
        if (isWeakening(current, p, rules)) return true;
        current = applyPatch(current, p);
      }
      return false;
    }
    default:
      return true;
  }
}
