import type { SiteRule } from "@algone/rules";
import { DEFAULT_ANDROID_APPS } from "./apps";
import { AVOID_IDS, type Patch, type Runtime, type Settings, type SiteSettings, type TunedFilters } from "./types";

export const SHORT_VIDEO_SITES = ["tiktok"];

export const emptyTuned = (): TunedFilters => ({
  blockKeywords: [],
  blockChannels: [],
  blockTopics: [],
  allowTopics: [],
  hideKinds: [],
});

export const defaultSite = (): SiteSettings => ({
  enabled: true,
  mode: "nofeed",
  elements: {},
  tuned: emptyTuned(),
  intent: { searchHome: false, prompt: false, subsFirst: false, launchPause: false },
});

export function defaultSettings(rules: SiteRule[]): Settings {
  return {
    schema: 2,
    // Every feed off from the first minute, with no setup. Healthy, Random, Tuned and Custom
    // are choices a person makes later, per site.
    sites: Object.fromEntries(rules.map((r) => [r.id, defaultSite()])),
    barrier: { type: "pause", seconds: 30 },
    snoozeMinutes: 10,
    stopAtEnd: true,
    ruleUpdates: true,
    webSources: { wikipedia: false },
    theme: "system",
    queueSoftCap: 5,
    customRanking: "newest",
    healthy: { batchSize: 10, dailyBudgetMinutes: 30 },
    avoid: [...AVOID_IDS],
    activities: [],
    breakUntil: 0,
    apps: { android: { ...DEFAULT_ANDROID_APPS } },
    recommend: { want: [], drop: [], creators: [], blockCreators: [], maxPerDay: 10 },
    sources: [{ kind: "hn", url: "https://news.ycombinator.com/", title: "Hacker News" }],
  };
}

export const defaultRuntime = (): Runtime => ({
  snoozes: {},
  daily: { day: "", used: 0 },
  stats: { started: 0, dismissed: 0, completed: 0 },
  pending: null,
  lastRuleCheck: 0,
  lastRuleError: "",
  lastAcceptedRev: 0,
  lastBreakAt: 0,
  passes: { day: "", count: 0 },
});

/** Fills in every field added by a newer version, at every depth, without touching existing choices. */
export function migrateSettings(saved: Settings | undefined, rules: SiteRule[]): Settings {
  const base = defaultSettings(rules);
  if (!saved) return base;
  const sites: Record<string, SiteSettings> = { ...base.sites };
  for (const [id, site] of Object.entries(saved.sites ?? {})) sites[id] = migrateSite(site);
  return {
    ...base,
    ...saved,
    schema: base.schema,
    sites,
    webSources: { ...base.webSources, ...saved.webSources },
    healthy: { ...base.healthy, ...saved.healthy },
    recommend: { ...base.recommend, ...saved.recommend },
  };
}

export function migrateSite(saved: Partial<SiteSettings> | undefined): SiteSettings {
  const base = defaultSite();
  if (!saved) return base;
  return {
    ...base,
    ...saved,
    elements: { ...saved.elements },
    tuned: { ...base.tuned, ...saved.tuned },
    intent: { ...base.intent, ...saved.intent },
  };
}

export function isHidden(
  el: { id: string; class: string },
  site: SiteSettings,
): boolean {
  return site.elements[el.id] ?? el.class === "algorithmic";
}

/** One switch: every site on, in No feed, with every algorithmic element hidden. Stricter, so it never waits. */
export function allFeedsOffPatch(settings: Settings, rules: SiteRule[]): Patch {
  const patches: Patch[] = [];
  for (const rule of rules) {
    const site = settings.sites[rule.id];
    if (!site?.enabled) patches.push({ op: "setSiteEnabled", site: rule.id, enabled: true });
    if (site?.mode !== "nofeed") patches.push({ op: "setMode", site: rule.id, mode: "nofeed" });
    for (const el of rule.elements) {
      if (el.class === "algorithmic" && site && !isHidden(el, site)) {
        patches.push({ op: "setElement", site: rule.id, element: el.id, hidden: true });
      }
    }
  }
  return { op: "batch", patches, source: "All feeds off" };
}

export function allFeedsAreOff(settings: Settings, rules: SiteRule[]): boolean {
  const p = allFeedsOffPatch(settings, rules);
  return p.op === "batch" && p.patches.length === 0;
}
