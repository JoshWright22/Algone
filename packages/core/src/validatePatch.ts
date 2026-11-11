import type { SiteRule } from "@algone/rules";
import { validateBarrier } from "./barriers";
import { APP_MODES, APP_PLATFORMS, AVOID_IDS, type GlobalKey, type Mode, type Patch, type Ranking } from "./types";

const MODES: Mode[] = ["nofeed", "random", "healthy", "tuned", "custom"];
const RANKINGS: Ranking[] = ["newest", "fair", "oldestUnseen"];
const THEMES = ["system", "dark", "light"];
const int = (v: unknown, min: number, max: number) => typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
const shortText = (v: unknown, max = 200) => typeof v === "string" && v.length <= max;
const texts = (v: unknown, n: number) => Array.isArray(v) && v.length <= n && v.every((s) => shortText(s));

const GLOBALS: Record<GlobalKey, (v: unknown) => boolean> = {
  snoozeMinutes: (v) => int(v, 1, 120),
  stopAtEnd: (v) => typeof v === "boolean",
  ruleUpdates: (v) => typeof v === "boolean",
  theme: (v) => THEMES.includes(v as string),
  queueSoftCap: (v) => int(v, 1, 100),
  customRanking: (v) => RANKINGS.includes(v as Ranking),
  wikipedia: (v) => typeof v === "boolean",
};

/**
 * Checks a change before it is applied or offered behind a barrier, wherever it came from:
 * the UI, an imported file, sync, or an agent. Returns an error, or null.
 */
export function validatePatch(patch: Patch, rules: SiteRule[], now: number): string | null {
  const site = "site" in patch ? rules.find((r) => r.id === patch.site) : undefined;
  if ("site" in patch && !site) return "Unknown site";
  switch (patch.op) {
    case "setElement":
      return shortText(patch.element, 64) && typeof patch.hidden === "boolean" ? null : "Bad element";
    case "setSiteEnabled":
      return typeof patch.enabled === "boolean" ? null : "Bad value";
    case "setMode":
      return MODES.includes(patch.mode) ? null : "Unknown mode";
    case "setIntent":
      return ["searchHome", "prompt", "subsFirst", "launchPause"].includes(patch.key) && typeof patch.value === "boolean"
        ? null
        : "Bad intent setting";
    case "setGlobal":
      return Object.hasOwn(GLOBALS, patch.key) && GLOBALS[patch.key](patch.value) ? null : "Bad setting";
    case "setBarrier":
      return validateBarrier(patch.barrier, now);
    case "setTuned": {
      const f = patch.filters as unknown as Record<string, unknown>;
      const keys = ["blockKeywords", "blockChannels", "blockTopics", "allowTopics", "hideKinds"];
      return f && keys.every((k) => texts(f[k], 500)) ? null : "Bad filters";
    }
    case "useBundledRules":
    case "endBreak":
      return null;
    case "setHealthy":
      if (patch.batchSize !== undefined && !int(patch.batchSize, 1, 50)) return "Items per day must be 1 to 50";
      if (patch.dailyBudgetMinutes !== undefined && !int(patch.dailyBudgetMinutes, 1, 1440)) return "Minutes per day must be 1 to 1440";
      return null;
    case "setAvoid":
      return Array.isArray(patch.ids) && patch.ids.every((id) => AVOID_IDS.includes(id)) ? null : "Unknown list";
    case "setActivities":
      return texts(patch.items, 20) ? null : "At most 20 lines of up to 200 characters";
    case "startBreak":
      return typeof patch.until === "number" && Number.isFinite(patch.until) ? null : "Bad time";
    case "setApp": {
      if (!(APP_PLATFORMS as readonly string[]).includes(patch.platform) || !/^[a-z0-9.-]{1,64}$/.test(patch.app)) return "Bad app";
      const c = patch.config;
      if (c === null) return null;
      if (!(APP_MODES as readonly string[]).includes(c.mode)) return "Unknown app mode";
      if (c.minutes !== undefined && !int(c.minutes, 1, 1440)) return "Minutes must be 1 to 1440";
      if (c.mode === "limit" && c.minutes === undefined) return "A limit needs minutes";
      return null;
    }
    case "batch": {
      if (!Array.isArray(patch.patches) || patch.patches.length > 2000) return "Bad batch";
      for (const p of patch.patches) {
        if (p.op === "batch") return "Bad batch";
        const e = validatePatch(p, rules, now);
        if (e) return e;
      }
      return null;
    }
    default:
      return "Unknown change";
  }
}
