import avoidLists from "./content/avoid.json" with { type: "json" };
import { localDay } from "./barriers";
import { matchesTopic, shouldHide } from "./tuned";
import type { AvoidId, HealthySettings, Settings, TunedFilters } from "./types";

/**
 * The healthy feed: a short batch picked from what the site already loaded, ranked for
 * what the person said they want and against outrage, clickbait, comparison and doom,
 * that ends. Pure and deterministic. Text rules miss some and wrongly catch some.
 */

export type Rating = "worth" | "notWorth" | "worse";

export interface HealthyItem {
  id: string;
  title: string;
  /** Creator or channel name, as the site shows it. */
  channel: string;
  url: string;
  /** Epoch ms, when known. */
  time?: number;
}

export interface HealthyContext {
  /** Keyed by lower-case creator name. */
  ratings: Record<string, Rating>;
  allowTopics: string[];
  avoid: AvoidId[];
  healthy: HealthySettings;
  /** Minutes already used today, on this device. */
  usedMinutes: number;
  /** Item ids opened before. */
  seen: string[];
  now: number;
  /** The site's Tuned filters, which the healthy feed also honors. */
  filters?: TunedFilters;
}

export interface HealthyBatch {
  items: HealthyItem[];
  /** Why nothing more is shown. */
  end: "batch" | "budget" | "empty";
}

const LISTS = avoidLists as Record<AvoidId, string[]>;
const RATING_SCORE: Record<Rating, number> = { worth: 1, notWorth: 0, worse: -1 };
const UNRATED = 0.5;
const SUPERLATIVE = /\b(best|worst|most|craziest|biggest|insane|scariest|shocking)\b/i;

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const phraseRe = new Map<string, RegExp>();
function hasPhrase(text: string, phrase: string): boolean {
  let re = phraseRe.get(phrase);
  if (!re) {
    re = new RegExp(`(^|[^a-z0-9])${escape(phrase.toLowerCase())}([^a-z0-9]|$)`);
    phraseRe.set(phrase, re);
  }
  return re.test(text);
}

/** The avoid lists a title matches, plus the shape signals: shouting, "?!", "Top 10 craziest". */
export function avoidHits(title: string, avoid: AvoidId[]): string[] {
  const t = title.toLowerCase().replace(/[’‘]/g, "'");
  const hits: string[] = avoid.filter((id) => (LISTS[id] ?? []).some((p) => hasPhrase(t, p)));
  const letters = title.replace(/[^A-Za-z]/g, "");
  if (letters.length >= 10 && letters.replace(/[^A-Z]/g, "").length / letters.length > 0.5) hits.push("shouting");
  if (/[?!]!|!\?/.test(title)) hits.push("punctuation");
  if (/^\s*\d+/.test(title) && SUPERLATIVE.test(title)) hits.push("listicle");
  return hits;
}

/** Own properties only: a channel named "constructor" must not read the object's prototype. */
export function ratingOf(ratings: Record<string, Rating>, channel: string): Rating | undefined {
  const key = channel.trim().toLowerCase();
  return Object.hasOwn(ratings, key) ? ratings[key] : undefined;
}

export function healthyScore(item: HealthyItem, ctx: HealthyContext): number {
  const rating = ratingOf(ctx.ratings, item.channel);
  const creator = rating ? RATING_SCORE[rating] : UNRATED;
  const topic = ctx.allowTopics.some((t) => matchesTopic(item.title, t)) ? 1 : 0;
  const recency = item.time ? Math.exp(-Math.max(0, ctx.now - item.time) / 3_600_000 / 48) : 0.5;
  const seen = ctx.seen.includes(item.id) ? 10 : 0;
  return 2 * creator + topic + recency - 3 * avoidHits(item.title, ctx.avoid).length - seen;
}

/** Picks today's batch. One creator fills at most a third of it. */
export function healthyBatch(items: HealthyItem[], ctx: HealthyContext): HealthyBatch {
  if (ctx.usedMinutes >= ctx.healthy.dailyBudgetMinutes) return { items: [], end: "budget" };
  const seenIds = new Set<string>();
  const scored = items
    .filter((i) => i.title && !seenIds.has(i.id) && seenIds.add(i.id))
    .map((item) => ({ item, score: healthyScore(item, ctx), hits: avoidHits(item.title, ctx.avoid).length }))
    // Matched an avoid rule and nothing outweighs it, or the person said it made them feel worse.
    .filter((s) => !(s.hits > 0 && s.score < 0) && ratingOf(ctx.ratings, s.item.channel) !== "worse")
    .filter((s) => !(ctx.filters && shouldHide({ title: s.item.title, channel: s.item.channel, kinds: [] }, ctx.filters)))
    .filter((s) => !ctx.seen.includes(s.item.id))
    .sort((a, b) => b.score - a.score || (b.item.time ?? 0) - (a.item.time ?? 0) || (a.item.id < b.item.id ? -1 : 1));
  const cap = Math.max(1, Math.floor(ctx.healthy.batchSize / 3));
  const perCreator = new Map<string, number>();
  const out: HealthyItem[] = [];
  for (const { item } of scored) {
    if (out.length >= ctx.healthy.batchSize) break;
    const key = item.channel.toLowerCase();
    const n = perCreator.get(key) ?? 0;
    if (key && n >= cap) continue;
    perCreator.set(key, n + 1);
    out.push(item);
  }
  return { items: out, end: out.length ? "batch" : "empty" };
}

export interface SavedBatch {
  day: string;
  items: HealthyItem[];
}

/**
 * The batch is picked once a day per site and then kept, so reloading the page never
 * deals a fresh batch. An empty pick is not kept: the feed may not have loaded yet.
 */
export function dailyBatch(
  saved: SavedBatch | undefined,
  available: HealthyItem[],
  ctx: HealthyContext,
  day: string,
): { saved: SavedBatch | null; batch: HealthyBatch } {
  if (ctx.usedMinutes >= ctx.healthy.dailyBudgetMinutes) {
    return { saved: saved ?? null, batch: { items: [], end: "budget" } };
  }
  if (saved?.day === day && saved.items.length) {
    // Stricter settings apply to today's batch at once: what no longer qualifies drops out.
    const still = healthyBatch(saved.items, { ...ctx, seen: [] }).items;
    const kept = saved.items.filter((i) => still.some((s) => s.id === i.id)).slice(0, ctx.healthy.batchSize);
    // A feed that was still loading may have filled less than a batch: top up, never reshuffle.
    const room = ctx.healthy.batchSize - kept.length;
    const extra = room > 0 && saved.items.length < ctx.healthy.batchSize
      ? healthyBatch(available.filter((i) => !saved.items.some((s) => s.id === i.id)), { ...ctx, healthy: { ...ctx.healthy, batchSize: room } }).items
      : [];
    const items = [...kept, ...extra];
    const next = extra.length ? { day, items: [...saved.items, ...extra] } : saved;
    const left = items.filter((i) => !ctx.seen.includes(i.id));
    return { saved: next, batch: { items, end: left.length ? "batch" : "empty" } };
  }
  const batch = healthyBatch(available, ctx);
  return { saved: batch.items.length ? { day, items: batch.items } : null, batch };
}

/** Everything the healthy feed keeps on this device. Never synced. */
export interface HealthyStore {
  /** Items read from each site's hidden feed today. */
  pools: Record<string, { day: string; items: HealthyItem[] }>;
  batches: Record<string, SavedBatch>;
  /** Ids opened from a batch. Kept for a week of batches at most. */
  seen: string[];
  ratings: Record<string, Rating>;
  usage: { day: string; minutes: number };
}

export const emptyHealthyStore = (): HealthyStore => ({
  pools: {},
  batches: {},
  seen: [],
  ratings: {},
  usage: { day: "", minutes: 0 },
});

const MAX_POOL = 100;
const MAX_SEEN = 500;

export function healthyContext(settings: Settings, site: string, store: HealthyStore, now: number): HealthyContext {
  const day = localDay(now);
  return {
    ratings: store.ratings,
    allowTopics: settings.sites[site]?.tuned.allowTopics ?? [],
    filters: settings.sites[site]?.tuned,
    avoid: settings.avoid,
    healthy: settings.healthy,
    usedMinutes: store.usage.day === day ? store.usage.minutes : 0,
    seen: store.seen,
    now,
  };
}

/** Adds items read from a site's feed, then picks today's batch if none is kept yet. */
export function addFeedItems(
  store: HealthyStore,
  site: string,
  picked: Array<{ title: string; channel: string; url: string }>,
  settings: Settings,
  now: number,
): HealthyStore {
  const day = localDay(now);
  const filters = settings.sites[site]?.tuned;
  const old = store.pools[site]?.day === day ? store.pools[site].items : [];
  const known = new Set(old.map((i) => i.id));
  const fresh = picked
    .filter((p) => !known.has(p.url) && !(filters && shouldHide({ title: p.title, channel: p.channel, kinds: [] }, filters)))
    .map((p) => ({ id: p.url, title: p.title, channel: p.channel, url: p.url }));
  const items = [...old, ...fresh].slice(0, MAX_POOL);
  const { saved } = dailyBatch(store.batches[site], items, healthyContext(settings, site, store, now), day);
  const batches = { ...store.batches };
  if (saved) batches[site] = saved;
  return { ...store, pools: { ...store.pools, [site]: { day, items } }, batches };
}

export function markSeen(store: HealthyStore, id: string): HealthyStore {
  if (store.seen.includes(id)) return store;
  return { ...store, seen: [...store.seen, id].slice(-MAX_SEEN) };
}

const MAX_RATINGS = 1000;

export function rateCreator(store: HealthyStore, channel: string, rating: Rating): HealthyStore {
  const key = channel.trim().toLowerCase();
  if (!key || key === "__proto__") return store;
  const ratings = { ...store.ratings, [key]: rating };
  const keys = Object.keys(ratings);
  if (keys.length > MAX_RATINGS) delete ratings[keys[0]!];
  return { ...store, ratings };
}

/** One visible minute on a page opened from the batch. */
export function addMinute(store: HealthyStore, now: number): HealthyStore {
  const day = localDay(now);
  const minutes = (store.usage.day === day ? store.usage.minutes : 0) + 1;
  return { ...store, usage: { day, minutes } };
}

/** What the panel shows for a site now. */
export function currentBatch(settings: Settings, site: string, store: HealthyStore, now: number): HealthyBatch {
  const items = store.pools[site]?.day === localDay(now) ? store.pools[site].items : [];
  return dailyBatch(store.batches[site], items, healthyContext(settings, site, store, now), localDay(now)).batch;
}
