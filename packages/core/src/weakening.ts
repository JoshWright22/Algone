import type { SiteRule } from "@algone/rules";
import { applyPatch } from "./commands";
import { isHidden } from "./defaults";
import type { BarrierConfig, Patch, Settings, TunedFilters } from "./types";

/** Applying these never needs a barrier: they do not touch what is hidden. */
const NEUTRAL_GLOBALS = new Set(["theme", "queueSoftCap", "customRanking"]);

/** True if `after` is stricter than `before` and both are the same barrier type. */
export function isStricterBarrier(before: BarrierConfig, after: BarrierConfig): boolean {
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
      if (patch.mode === current) return false;
      return !(patch.mode === "nofeed" || patch.mode === "random");
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
