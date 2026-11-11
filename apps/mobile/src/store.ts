import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  addFeedItems, addMinute, checkBreak, emptyHealthyStore, markSeen, rateCreator, safeHttps, validatePatch,
  type HealthyStore, type Rating,
  applyPolicyText, diffSettings, emptySyncState, isLocalPatch, policyFromSettings,
  type SyncResult, type SyncState,
  addSource, addToQueue, applyPatch, barrierStep, clearIfBundled, clearSnooze, defaultRuntime,
  describePatch, isWeakening, migrateSettings, moveInQueue, recordPass, removeFromQueue, removeSource,
  startRecovery, startSnooze, useEscape,
  type BarrierConfig, type FeedStore, type Overlay, type Patch, type Pending, type QueueItem,
  type Runtime, type Settings,
} from "@algone/core";
import { SITES, siteMap } from "@algone/rules";

export interface Stored {
  settings: Settings;
  runtime: Runtime;
  queue: QueueItem[];
  feeds: FeedStore;
  rulesOverlay: Overlay | null;
  /** The healthy feed's pools, batches, ratings and minutes. Never synced. */
  healthy: HealthyStore;
  /** A random id that names this device in the shared policy. */
  device: string;
  /** Sync state, plus the settings as last synced: the base the outbox is worked out from. */
  sync: MobileSync;
  /**
   * The GitHub token. expo-secure-store is not a dependency, so it is kept here, in the
   * app's own storage like everything else, and never handed to a page.
   */
  syncToken: string;
}

export type MobileSync = SyncState & { base: Settings | null };

export interface Result {
  ok: boolean;
  needsBarrier?: boolean;
  error?: string;
  /** Settings changed by an import or a sync round. */
  applied?: number;
}

const emptySync = (): MobileSync => ({ ...emptySyncState(), base: null });

function newDeviceId(): string {
  const bytes = new Uint8Array(4);
  const c = (globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } }).crypto;
  if (c?.getRandomValues) c.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return `app-${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

/** This device's changes since the last sync round. Theme, breaks and partner passwords stay here. */
export function outboxOf(s: Stored): Patch[] {
  return diffSettings(s.sync.base ?? s.settings, s.settings, SITES).filter((p) => !isLocalPatch(p));
}

export interface KeyValue {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<unknown>;
}

/** One key, so a state change that spans settings and runtime lands whole or not at all. */
export const STATE_KEY = "algone:state:v1";

type Step = { next?: Partial<Stored>; result?: Result };

function initialState(raw?: Partial<Stored>): Stored {
  return {
    settings: migrateSettings(raw?.settings, SITES),
    runtime: { ...defaultRuntime(), ...raw?.runtime },
    queue: raw?.queue ?? [],
    feeds: raw?.feeds ?? { sources: [], items: [] },
    rulesOverlay: raw?.rulesOverlay ?? null,
    healthy: { ...emptyHealthyStore(), ...raw?.healthy },
    device: typeof raw?.device === "string" && raw.device ? raw.device : newDeviceId(),
    sync: { ...emptySync(), ...raw?.sync },
    syncToken: typeof raw?.syncToken === "string" ? raw.syncToken : "",
  };
}

const RATINGS: Rating[] = ["worth", "notWorth", "worse"];

/**
 * Items a page reported from its hidden feed. The page is the site's, so everything is
 * checked again here, as the extension's background does: the URL is on this site's hosts.
 */
export function cleanFeedItems(site: string, items: unknown): Array<{ title: string; channel: string; url: string }> {
  const rule = siteMap()[site];
  if (!rule || !Array.isArray(items)) return [];
  return items.slice(0, 60).flatMap((i) => {
    const url = typeof i?.url === "string" && i.url.length <= 2048 ? safeHttps(i.url) : null;
    if (!url || !rule.hosts.includes(new URL(url).hostname) || typeof i.title !== "string" || !i.title) return [];
    return [{ title: i.title.slice(0, 200), channel: typeof i.channel === "string" ? i.channel.slice(0, 100) : "", url }];
  });
}

/** A lock that has run out behaves as the barrier it was set to return to. */
export function activeBarrier(barrier: BarrierConfig, now: number): BarrierConfig {
  return barrier.type === "locked" && now >= barrier.until ? activeBarrier(barrier.after, now) : barrier;
}

/**
 * The single writer. Every change goes through `run`, one at a time, persists first, and
 * only then becomes visible, so concurrent commands cannot lose updates.
 */
export function createStore(kv: KeyValue, clock: () => number = Date.now) {
  let state = initialState();
  let chain: Promise<unknown> = Promise.resolve();
  const listeners = new Set<() => void>();

  const run = (step: (s: Stored) => Step): Promise<Result> => {
    const job = chain.then(async (): Promise<Result> => {
      try {
        const { next, result } = step(state);
        if (next) {
          const candidate = { ...state, ...next };
          await kv.setItem(STATE_KEY, JSON.stringify(candidate));
          state = candidate;
          // Saved is saved: a listener's error must not report the change as failed.
          for (const fn of listeners) {
            try {
              fn();
            } catch {
              // A broken listener (such as a missing native module) only loses its own update.
            }
          }
        }
        return result ?? { ok: true };
      } catch (e) {
        return { ok: false, error: String(e) };
      }
    });
    chain = job;
    return job;
  };

  const requestPending = (s: Stored, pending: Pending): Step => ({
    next: {
      runtime: {
        ...s.runtime,
        pending,
        stats: { ...s.runtime.stats, started: s.runtime.stats.started + 1 },
      },
    },
    result: { ok: true, needsBarrier: true },
  });

  const withPatch = (s: Stored, patch: Patch, settings: Settings): Partial<Stored> => ({
    settings: applyPatch(settings, patch),
    ...(patch.op === "useBundledRules" ? { rulesOverlay: null } : {}),
  });

  /** Applies a change whose barrier was passed (or escaped). The one place this happens. */
  const finishPending = (s: Stored, pending: Pending, settings: Settings, runtime: Runtime): Step => {
    const cleared = { ...runtime, pending: null };
    if (pending.kind === "snooze") {
      return { next: { settings, runtime: startSnooze(cleared, pending.site, pending.minutes, clock()) } };
    }
    // Checked again: time has passed, and the one-a-week rule counts from the last break taken.
    const { patch } = pending;
    const error = validatePatch(patch, SITES, clock())
      ?? (patch.op === "startBreak" ? checkBreak(patch.until, s.runtime, clock()) : null);
    if (error) return { next: { settings, runtime: cleared }, result: { ok: false, error } };
    const next = patch.op === "startBreak" ? { ...cleared, lastBreakAt: clock() } : cleared;
    return { next: { runtime: next, ...withPatch(s, patch, settings) } };
  };

  return {
    get: () => state,
    subscribe(fn: () => void) {
      listeners.add(fn);
      return () => void listeners.delete(fn);
    },

    /** A corrupt record falls back to defaults, which have filtering on. */
    load(buildRev: number): Promise<Result> {
      return kv.getItem(STATE_KEY).then((text) => {
        let raw: Partial<Stored> | undefined;
        try {
          raw = text ? (JSON.parse(text) as Partial<Stored>) : undefined;
        } catch {
          raw = undefined;
        }
        return run(() => {
          const loaded = initialState(raw);
          return {
            next: {
              ...loaded,
              rulesOverlay: clearIfBundled(loaded.rulesOverlay, buildRev),
              // A change left waiting when the app closed counts as Never mind.
              runtime: { ...loaded.runtime, pending: null },
            },
          };
        });
      });
    },

    patch(patch: Patch) {
      return run((s) => {
        // Every change, from any source, is checked first, as the extension's handlePatch does.
        const error = validatePatch(patch, SITES, clock())
          ?? (patch.op === "startBreak" ? checkBreak(patch.until, s.runtime, clock()) : null);
        if (error) return { result: { ok: false, error } };
        if (isWeakening(s.settings, patch, SITES)) {
          const name = "site" in patch ? siteMap()[patch.site]?.name : "";
          return requestPending(s, { kind: "patch", patch, label: describePatch(patch, name) });
        }
        return { next: withPatch(s, patch, s.settings) };
      });
    },

    requestSnooze(site: string) {
      return run((s) => {
        const minutes = s.settings.snoozeMinutes;
        const name = siteMap()[site]?.name ?? "this site";
        return requestPending(s, { kind: "snooze", site, minutes, label: `Show ${name} for ${minutes} minutes` });
      });
    },

    endSnooze(site: string) {
      return run((s) => ({ next: { runtime: clearSnooze(s.runtime, site) } }));
    },

    barrierPass() {
      return run((s) => {
        const pending = s.runtime.pending;
        if (!pending) return { result: { ok: false, error: "Nothing is waiting" } };
        const step = barrierStep(s.settings.barrier, s.runtime, clock());
        if (step.kind === "blocked") return { result: { ok: false, error: step.reason } };
        const pass = recordPass(s.settings.barrier, s.runtime, clock());
        return finishPending(s, pending, { ...s.settings, barrier: pass.barrier }, pass.runtime);
      });
    },

    barrierCancel() {
      return run((s) => ({
        next: {
          runtime: {
            ...s.runtime,
            pending: null,
            stats: { ...s.runtime.stats, dismissed: s.runtime.stats.dismissed + 1 },
          },
        },
      }));
    },

    barrierEscape() {
      return run((s) => {
        const barrier = s.settings.barrier;
        const pending = s.runtime.pending;
        if (barrier.type !== "locked" || barrier.escapeUsed || !pending) {
          return { result: { ok: false, error: "No escape is available" } };
        }
        const stats = { ...s.runtime.stats, completed: s.runtime.stats.completed + 1 };
        const settings = { ...s.settings, barrier: useEscape(barrier) };
        return finishPending(s, pending, settings, { ...s.runtime, stats });
      });
    },

    barrierRecover() {
      return run((s) => ({
        next: { settings: { ...s.settings, barrier: startRecovery(s.settings.barrier, clock()) } },
      }));
    },

    queueAdd(item: { url: string; title: string; site: string }) {
      return run((s) => ({ next: { queue: addToQueue(s.queue, item, clock()) } }));
    },
    queueRemove(id: string) {
      return run((s) => ({ next: { queue: removeFromQueue(s.queue, id) } }));
    },
    queueMove(id: string, delta: number) {
      return run((s) => ({ next: { queue: moveInQueue(s.queue, id, delta) } }));
    },

    sourceAdd(source: { kind: "rss"; url: string; title: string; site: string }) {
      return run((s) => ({ next: { feeds: addSource(s.feeds, source) } }));
    },
    sourceRemove(id: string) {
      return run((s) => ({ next: { feeds: removeSource(s.feeds, id) } }));
    },
    feedSeen(id: string) {
      return run((s) => ({
        next: {
          feeds: { ...s.feeds, items: s.feeds.items.map((i) => (i.id === id ? { ...i, seen: true } : i)) },
        },
      }));
    },
    /** Network results arrive here, so they merge with whatever changed meanwhile. */
    updateFeeds(change: (feeds: FeedStore) => FeedStore) {
      return run((s) => ({ next: { feeds: change(s.feeds) } }));
    },

    /** Feed items a site page read from its hidden feed. */
    healthyFeedItems(site: string, items: unknown) {
      return run((s) => {
        const clean = cleanFeedItems(site, items);
        if (!clean.length) return { result: { ok: false } };
        const healthy = addFeedItems(s.healthy, site, clean, s.settings, clock());
        // The page sends every 2 s; write only when something actually changed.
        if (JSON.stringify(healthy) === JSON.stringify(s.healthy)) return { result: { ok: true } };
        return { next: { healthy } };
      });
    },
    healthySeen(id: string) {
      return run((s) => {
        if (typeof id !== "string" || id.length > 2048) return { result: { ok: false } };
        return { next: { healthy: markSeen(s.healthy, id) } };
      });
    },
    rate(channel: string, rating: Rating) {
      return run((s) => {
        if (!RATINGS.includes(rating) || typeof channel !== "string" || channel.length > 100) {
          return { result: { ok: false } };
        }
        return { next: { healthy: rateCreator(s.healthy, channel, rating) } };
      });
    },
    /** One visible minute on a page opened from the batch. */
    healthyMinute() {
      return run((s) => ({ next: { healthy: addMinute(s.healthy, clock()) } }));
    },

    /** The settings file. The partner password becomes a stand-in; theme and breaks stay out. */
    exportPolicy(): string {
      return JSON.stringify(policyFromSettings(state.settings, 0, state.device, clock()), null, 2);
    },
    /** Stricter settings apply at once, looser ones wait for the barrier. */
    importPolicy(text: string, platform: string) {
      return run((s) => {
        if (typeof text !== "string" || !text.trim()) return { result: { ok: false, error: "Paste a settings file first." } };
        const where = { platform, deviceId: s.device };
        const r = applyPolicyText(s.settings, text, SITES, where, "an imported file", clock());
        if (!r.ok) return { result: { ok: false, error: r.error } };
        if (!r.pending) return { next: { settings: r.settings }, result: { ok: true, applied: r.applied } };
        const step = requestPending({ ...s, settings: r.settings }, r.pending);
        return { next: { settings: r.settings, ...step.next }, result: { ...step.result!, applied: r.applied } };
      });
    },

    syncConnect(token: string) {
      return run(() => ({ next: { syncToken: token, sync: emptySync() } }));
    },
    syncDisconnect() {
      return run(() => ({ next: { syncToken: "", sync: emptySync() } }));
    },
    /**
     * Lands a sync round. Settings changed here while the round was out are kept on top of
     * what it brought, and stay out of the base, so the next round sends them.
     */
    syncFinish(token: string, before: Settings, r: SyncResult) {
      return run((s) => {
        if (s.syncToken !== token) return { result: { ok: false, error: "Signed out" } };
        const later = s.settings === before ? [] : diffSettings(before, s.settings, SITES);
        const { base: _drop, ...synced } = r.state as MobileSync;
        // A change made here during the round lands on top only if it is no looser than what
        // the round brought; otherwise it waits behind the barrier like any other loosening.
        let settings = r.settings;
        const waiting: Patch[] = [];
        for (const p of later) {
          if (isWeakening(settings, p, SITES)) waiting.push(p);
          else settings = applyPatch(settings, p);
        }
        const pending = waiting.length
          ? { kind: "patch" as const, patch: { op: "batch" as const, patches: waiting, source: "this device" }, label: `Loosen ${waiting.length} ${waiting.length === 1 ? "setting" : "settings"} from this device` }
          : synced.pending ?? null;
        return {
          next: { settings, sync: { ...synced, pending, base: r.settings } },
          result: { ok: true, applied: r.applied },
        };
      });
    },
    syncFailed(token: string, error: string) {
      return run((s) => {
        if (s.syncToken !== token) return { result: { ok: false, error } };
        return { next: { sync: { ...s.sync, lastError: error, lastSync: clock() } }, result: { ok: false, error } };
      });
    },
    /** Looser changes from another device: through this device's barrier, like any other. */
    syncReview() {
      return run((s) => {
        const pending = s.sync.pending;
        if (!pending) return { result: { ok: false, error: "Nothing is waiting" } };
        const step = requestPending(s, pending);
        return { next: { ...step.next, sync: { ...s.sync, pending: null } }, result: step.result };
      });
    },

    recordRuleCheck(update: { at: number; error: string; lastAcceptedRev?: number; overlay?: Overlay | null }) {
      return run((s) => ({
        next: {
          runtime: {
            ...s.runtime,
            lastRuleCheck: update.at,
            lastRuleError: update.error,
            lastAcceptedRev: update.lastAcceptedRev ?? s.runtime.lastAcceptedRev,
          },
          ...(update.overlay !== undefined ? { rulesOverlay: update.overlay } : {}),
        },
      }));
    },
  };
}

export type Store = ReturnType<typeof createStore>;

export const store = createStore(AsyncStorage);
