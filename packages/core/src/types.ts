export type Mode = "nofeed" | "random" | "tuned" | "custom";
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
  schema: 1;
  sites: Record<string, SiteSettings>;
  barrier: BarrierConfig;
  snoozeMinutes: number;
  stopAtEnd: boolean;
  ruleUpdates: boolean;
  webSources: { wikipedia: boolean };
  theme: Theme;
  queueSoftCap: number;
  customRanking: Ranking;
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
  | { op: "useBundledRules" };

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
  content: "random" | "custom" | null;
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
