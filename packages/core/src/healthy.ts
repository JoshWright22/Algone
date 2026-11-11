import avoidLists from "./content/avoid.json" with { type: "json" };
import { matchesTopic } from "./tuned";
import type { AvoidId, HealthySettings } from "./types";

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

export function healthyScore(item: HealthyItem, ctx: HealthyContext): number {
  const rating = ctx.ratings[item.channel.toLowerCase()];
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
    .filter((s) => !(s.hits > 0 && s.score < 0) && ctx.ratings[s.item.channel.toLowerCase()] !== "worse")
    .filter((s) => !ctx.seen.includes(s.item.id))
    .sort((a, b) => b.score - a.score || (b.item.time ?? 0) - (a.item.time ?? 0) || (a.item.id < b.item.id ? -1 : 1));
  const cap = Math.max(1, Math.ceil(ctx.healthy.batchSize / 3));
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
    const left = saved.items.filter((i) => !ctx.seen.includes(i.id));
    return { saved, batch: { items: saved.items, end: left.length ? "batch" : "empty" } };
  }
  const batch = healthyBatch(available, ctx);
  return { saved: batch.items.length ? { day, items: batch.items } : null, batch };
}
