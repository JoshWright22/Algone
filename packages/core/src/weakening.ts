import type { SiteRule } from "@algone/rules";
import { applyPatch } from "./commands";
import { isHidden } from "./defaults";
import {
  APP_MODES, type AppMode, type AppPolicy, type BarrierConfig, type Mode, type Patch, type Settings,
  type TunedFilters,
} from "./types";

/** Applying these never needs a barrier: they do not touch what is hidden. */
const NEUTRAL_GLOBALS = new Set(["theme", "queueSoftCap", "customRanking"]);

/**
 * Mode strictness. A move to a higher number never needs a barrier. Healthy and Custom
 * share a rank but differ (the site's picks vs your own sources), so moving between them waits.
 */
const MODE_RANK: Record<Mode, number> = { tuned: 0, custom: 1, healthy: 1, random: 2, nofeed: 2 };

const APP_RANK = Object.fromEntries(APP_MODES.map((m, i) => [m, i])) as Record<AppMode, number>;
const isMode = (m: Mode, rank: number) => MODE_RANK[m] === rank;

function appTightens(before: AppPolicy | undefined, after: AppPolicy | null): boolean {
  if (!after) return !before || before.mode === "allow";
  if (!before) return true; // A new entry only adds limits.
  // Turning short-video blocking off loosens, whatever the mode, unless the whole app is blocked.
  if (after.mode !== "block" && (before.shortVideo ?? true) && after.shortVideo === false) return false;
  if (APP_RANK[after.mode] !== APP_RANK[before.mode]) return APP_RANK[after.mode] > APP_RANK[before.mode];
  if (after.mode === "limit") return (after.minutes ?? Infinity) <= (before.minutes ?? Infinity);
  return true;
}

/**
 * True if `after` is the same barrier type made stricter. A change of type always waits:
 * type says little about strength (a schedule open all day is a 10 second wait), and a
 * new partner password chosen by the person loosening would be no barrier at all.
 */
export function isStricterBarrier(before: BarrierConfig, after: BarrierConfig): boolean {
  if (before.type === "pause" && after.type === "pause") return after.seconds > before.seconds;
  if (before.type === "typing" && after.type === "typing") return after.length > before.length;
  if (before.type === "daily" && after.type === "daily") {
    return after.limit < before.limit && after.step === before.step;
  }
  if (before.type === "locked" && after.type === "locked") {
    // A later end, and what follows the lock is no weaker than before.
    const sameAfter = JSON.stringify(after.after) === JSON.stringify(before.after);
    return after.until > before.until && (sameAfter || isStricterBarrier(before.after, after.after));
  }
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
      if (!site) return true;
      if (patch.hidden === true) return false;
      return !el || isHidden(el, site);
    }
    case "setSiteEnabled":
      return !patch.enabled;
    case "setMode": {
      const current = settings.sites[patch.site]?.mode;
      if (!(patch.mode in MODE_RANK)) return true;
      if (patch.mode === current || !current) return patch.mode !== current;
      if (MODE_RANK[patch.mode] === MODE_RANK[current]) return !isMode(patch.mode, 2);
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
      // Fails closed: anything but a finite number no larger than now waits.
      const h = settings.healthy;
      const looser = (v: unknown, now: number) => v !== undefined && !(typeof v === "number" && Number.isFinite(v) && v <= now);
      return looser(patch.batchSize, h.batchSize) || looser(patch.dailyBudgetMinutes, h.dailyBudgetMinutes);
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
    case "setRecommend": {
      // Wants, favored creators and sources are neutral: the daily cap bounds what comes through.
      const r = settings.recommend;
      const n = patch.rules;
      if (n.drop !== undefined && !(Array.isArray(n.drop) && isSubset(r.drop, n.drop))) return true;
      if (n.blockCreators !== undefined && !(Array.isArray(n.blockCreators) && isSubset(r.blockCreators, n.blockCreators))) return true;
      if (n.maxPerDay !== undefined && !(typeof n.maxPerDay === "number" && Number.isFinite(n.maxPerDay) && n.maxPerDay <= r.maxPerDay)) return true;
      return false;
    }
    case "addOpenSource":
    case "removeOpenSource":
      return false;
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
