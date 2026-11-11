export type Mode = "nofeed" | "random" | "healthy" | "tuned" | "custom";
export type AvoidId = "outrage" | "clickbait" | "comparison" | "doom";
export const AVOID_IDS: AvoidId[] = ["outrage", "clickbait", "comparison", "doom"];

/** What Algone asks of a native app. Ordered from loosest to strictest. */
export const APP_MODES = ["allow", "limit", "cover", "pause", "block"] as const;
export type AppMode = (typeof APP_MODES)[number];
export const APP_PLATFORMS = ["android", "ios", "desktop"] as const;
export type AppPlatform = (typeof APP_PLATFORMS)[number];

export interface AppPolicy {
  mode: AppMode;
  /** Daily minutes, for `limit`. */
  minutes?: number;
  /** Back out of Shorts, Reels and similar short-video screens. */
  shortVideo?: boolean;
}

export interface HealthySettings {
  batchSize: number;
  dailyBudgetMinutes: number;
}
export type Theme = "system" | "dark" | "light";
export type Ranking = "newest" | "fair" | "oldestUnseen";

export type BarrierConfig =
  | { type: "pause"; seconds: number }
  | { type: "typing"; length: number }
  | { type: "daily"; limit: number; step: "pause" | "typing" }
  | {
      type: "schedule";
      windows: Array<{ days: number[]; start: string; end: string }>;
    }
  | { type: "locked"; until: number; escapeUsed: boolean; after: BarrierConfig }
  | {
      type: "partner";
      salt: string;
      hash: string;
      iterations: number;
      recoveryAt: number | null;
    };

export interface TunedFilters {
  blockKeywords: string[];
  blockChannels: string[];
  blockTopics: string[];
  /** When non-empty, only matching items show. */
  allowTopics: string[];
  hideKinds: string[];
}

export interface IntentSettings {
  searchHome: boolean;
  prompt: boolean;
  subsFirst: boolean;
  launchPause: boolean;
}

export interface SiteSettings {
  enabled: boolean;
  mode: Mode;
  /** Overrides only. true = hidden. */
  elements: Record<string, boolean>;
  tuned: TunedFilters;
  intent: IntentSettings;
}

export interface Settings {
  schema: 2;
  sites: Record<string, SiteSettings>;
  barrier: BarrierConfig;
  snoozeMinutes: number;
  stopAtEnd: boolean;
  ruleUpdates: boolean;
  webSources: { wikipedia: boolean };
  theme: Theme;
  queueSoftCap: number;
  customRanking: Ranking;
  healthy: HealthySettings;
  avoid: AvoidId[];
  /** The user's own words, shown when a batch ends. */
  activities: string[];
  /** Break mode end on this device, epoch ms. 0 = none. Never synced. */
  breakUntil: number;
  /** Native apps, by platform then app id. */
  apps: Partial<Record<AppPlatform, Record<string, AppPolicy>>>;
}

export interface Runtime {
  snoozes: Record<string, { until: number }>;
  daily: { day: string; used: number };
  stats: { started: number; dismissed: number; completed: number };
  pending: Pending | null;
  lastRuleCheck: number;
  lastRuleError: string;
  lastAcceptedRev: number;
}

export type GlobalKey =
  | "snoozeMinutes"
  | "stopAtEnd"
  | "ruleUpdates"
  | "theme"
  | "queueSoftCap"
  | "customRanking"
  | "wikipedia";

export type Patch =
  | { op: "setElement"; site: string; element: string; hidden: boolean }
  | { op: "setSiteEnabled"; site: string; enabled: boolean }
  | { op: "setMode"; site: string; mode: Mode }
  | { op: "setIntent"; site: string; key: keyof IntentSettings; value: boolean }
  | { op: "setGlobal"; key: GlobalKey; value: unknown }
  | { op: "setBarrier"; barrier: BarrierConfig }
  | { op: "setTuned"; site: string; filters: TunedFilters }
  | { op: "useBundledRules" }
  | { op: "setHealthy"; batchSize?: number; dailyBudgetMinutes?: number }
  | { op: "setAvoid"; ids: AvoidId[] }
  | { op: "setActivities"; items: string[] }
  | { op: "startBreak"; until: number }
  | { op: "endBreak" }
  | { op: "setApp"; platform: AppPlatform; app: string; config: AppPolicy | null }
  /** Several changes from one sync or import. Weakening if any part is. */
  | { op: "batch"; patches: Patch[]; source: string };

export type Pending =
  | { kind: "patch"; patch: Patch; label: string }
  | { kind: "snooze"; site: string; minutes: number; label: string };

export interface QueueItem {
  id: string;
  url: string;
  title: string;
  site: string;
  addedAt: number;
}

export interface FeedSource {
  id: string;
  kind: "rss" | "tile";
  url: string;
  title: string;
  site: string;
  failures: number;
  nextAt: number;
}

export interface FeedItem {
  id: string;
  sourceId: string;
  title: string;
  url: string;
  time: number;
  seen: boolean;
}

export interface FeedStore {
  sources: FeedSource[];
  items: FeedItem[];
}

export interface PanelSpec {
  search: boolean;
  prompt: boolean;
  content: "random" | "custom" | "healthy" | null;
}

export interface View {
  site: string;
  enabled: boolean;
  mode: Mode;
  /** Tokens for algorithmic elements to show. */
  show: string[];
  /** Tokens for extra elements to hide. */
  hide: string[];
  /** Tokens whose bundled CSS is replaced or retired by an overlay. */
  off: string[];
  snoozedUntil: number;
  warnAt: number;
  panel: PanelSpec | null;
  launchPause: boolean;
  effects: string[];
  tuned: TunedFilters | null;
  stopAtEnd: boolean;
  subsFirst: boolean;
}
