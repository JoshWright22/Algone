import type { Mode, Patch, Runtime, Settings } from "./types";

/** Applies one patch and returns new settings. Pure. */
export function applyPatch(settings: Settings, patch: Patch): Settings {
  const site = "site" in patch ? settings.sites[patch.site] : undefined;
  const withSite = (next: NonNullable<typeof site>): Settings => ({
    ...settings,
    sites: { ...settings.sites, [(patch as { site: string }).site]: next },
  });
  switch (patch.op) {
    case "setElement":
      if (!site) return settings;
      return withSite({ ...site, elements: { ...site.elements, [patch.element]: patch.hidden } });
    case "setSiteEnabled":
      if (!site) return settings;
      return withSite({ ...site, enabled: patch.enabled });
    case "setMode":
      if (!site) return settings;
      return withSite({ ...site, mode: patch.mode });
    case "setIntent":
      if (!site) return settings;
      return withSite({ ...site, intent: { ...site.intent, [patch.key]: patch.value } });
    case "setTuned":
      if (!site) return settings;
      return withSite({ ...site, tuned: patch.filters });
    case "setBarrier":
      return { ...settings, barrier: patch.barrier };
    case "setGlobal":
      if (patch.key === "wikipedia") {
        return { ...settings, webSources: { wikipedia: patch.value === true } };
      }
      if (!GLOBAL_KEYS.includes(patch.key)) return settings;
      return { ...settings, [patch.key]: patch.value };
    case "useBundledRules":
      return { ...settings, ruleUpdates: false };
    case "batch":
      return patch.patches.reduce(applyPatch, settings);
    case "setHealthy":
      return {
        ...settings,
        healthy: {
          batchSize: patch.batchSize ?? settings.healthy.batchSize,
          dailyBudgetMinutes: patch.dailyBudgetMinutes ?? settings.healthy.dailyBudgetMinutes,
        },
      };
    case "setAvoid":
      return { ...settings, avoid: [...patch.ids] };
    case "setActivities":
      return { ...settings, activities: [...patch.items] };
    case "startBreak":
      return { ...settings, breakUntil: patch.until };
    case "endBreak":
      return { ...settings, breakUntil: 0 };
    case "setApp": {
      const list = { ...settings.apps[patch.platform] };
      if (patch.config) list[patch.app] = patch.config;
      else delete list[patch.app];
      return { ...settings, apps: { ...settings.apps, [patch.platform]: list } };
    }
    case "setRecommend":
      return { ...settings, recommend: { ...settings.recommend, ...patch.rules } };
    case "addOpenSource":
      if (settings.sources.some((s) => s.url === patch.source.url)) return settings;
      return { ...settings, sources: [...settings.sources, patch.source] };
    case "removeOpenSource":
      return { ...settings, sources: settings.sources.filter((s) => s.url !== patch.url) };
    default:
      return settings;
  }
}

const GLOBAL_KEYS = ["snoozeMinutes", "stopAtEnd", "ruleUpdates", "theme", "queueSoftCap", "customRanking"];

export const MODE_NAMES: Record<Mode, string> = {
  nofeed: "No feed",
  random: "Random",
  healthy: "Healthy",
  custom: "Custom",
  tuned: "Tuned",
};

/** Short user-facing text for a pending change. */
export function describePatch(patch: Patch, siteName = ""): string {
  switch (patch.op) {
    case "setElement":
      return `Show ${patch.element} on ${siteName}`;
    case "setSiteEnabled":
      return `Turn Algone off on ${siteName}`;
    case "setMode":
      return `Switch ${siteName} to ${MODE_NAMES[patch.mode]}`;
    case "setIntent":
      return `Turn off an intent feature on ${siteName}`;
    case "setBarrier":
      return "Change the unlock barrier";
    case "setTuned":
      return `Loosen Tuned filters on ${siteName}`;
    case "useBundledRules":
      return "Use bundled rules and stop rule updates";
    case "setHealthy":
      return "Show more in the healthy feed";
    case "setAvoid":
      return "Show more of the content you chose to avoid";
    case "startBreak":
      return `Take a break until ${new Date(patch.until).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}`;
    case "setApp":
      return `Loosen ${patch.app} on ${patch.platform}`;
    case "setRecommend":
      return "Loosen your recommendation rules";
    case "batch":
      return `Loosen ${patch.patches.length} ${patch.patches.length === 1 ? "setting" : "settings"} from ${patch.source}`;
    default:
      return "Change a setting";
  }
}

export function startSnooze(
  runtime: Runtime,
  site: string,
  minutes: number,
  now: number,
): Runtime {
  return {
    ...runtime,
    snoozes: { ...runtime.snoozes, [site]: { until: now + minutes * 60_000 } },
  };
}

export function clearSnooze(runtime: Runtime, site: string): Runtime {
  const { [site]: _gone, ...snoozes } = runtime.snoozes;
  return { ...runtime, snoozes };
}

export const BREAK_MAX_MS = 24 * 3_600_000;
export const BREAK_EVERY_MS = 7 * 86_400_000;

/** Returns an error, or null if a break may start now. */
export function checkBreak(until: number, runtime: Runtime, now: number): string | null {
  if (until <= now) return "Choose a time in the future";
  if (until - now > BREAK_MAX_MS) return "A break can last at most 24 hours";
  if (runtime.lastBreakAt && now - runtime.lastBreakAt < BREAK_EVERY_MS) {
    return `One break a week. The next one is possible on ${new Date(runtime.lastBreakAt + BREAK_EVERY_MS).toLocaleDateString()}`;
  }
  return null;
}
