import type { SiteRule } from "@algone/rules";
import { AVOID_IDS, type Runtime, type Settings, type SiteSettings, type TunedFilters } from "./types";

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
    // Healthy where the rule can read the site's feed, otherwise No feed. TikTok's feed is
    // nothing but short video, so a "healthy" batch of it would still be short video.
    sites: Object.fromEntries(rules.map((r) => [r.id, { ...defaultSite(), mode: r.tuned && !SHORT_VIDEO_SITES.includes(r.id) ? "healthy" : "nofeed" }])),
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
    apps: {},
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
