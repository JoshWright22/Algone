import type {
  BarrierConfig, FeedStore, HealthyStore, Patch, QueueItem, Rating, Runtime, Settings,
} from "@algone/core";
import type { Overlay } from "@algone/core";
import { api } from "./browser";

export type Command =
  | { t: "patch"; patch: Patch }
  | { t: "snooze"; site: string; minutes?: number }
  | { t: "endSnooze"; site: string }
  | { t: "barrierPass" }
  | { t: "barrierCancel" }
  | { t: "barrierEscape" }
  | { t: "barrierRecover" }
  | { t: "setPartner"; barrier: BarrierConfig }
  | { t: "queueAdd"; url: string; title: string; site: string }
  | { t: "queueRemove"; id: string }
  | { t: "queueMove"; id: string; delta: number }
  | { t: "sourceAdd"; url: string; title: string; site: string; kind: "rss" | "tile" }
  | { t: "sourceRemove"; id: string }
  | { t: "feedSeen"; id: string }
  | { t: "capture"; site: string; items: Array<{ title: string; url: string }> }
  | { t: "overlayCss"; css: string }
  | { t: "rulesCheck" }
  | { t: "feedRefresh" }
  | { t: "closeTab" }
  | { t: "feedItems"; site: string; items: Array<{ title: string; channel: string; url: string }> }
  | { t: "healthySeen"; id: string }
  | { t: "rate"; channel: string; rating: Rating }
  | { t: "healthyMinute" };

export interface CommandResult {
  ok: boolean;
  needsBarrier?: boolean;
  error?: string;
}

export const send = (cmd: Command): Promise<CommandResult> => api.runtime.sendMessage(cmd);

export interface Stored {
  settings: Settings;
  runtime: Runtime;
  queue: QueueItem[];
  feeds: FeedStore;
  rulesOverlay: Overlay | null;
  healthy: HealthyStore;
}
