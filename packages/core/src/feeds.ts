import { safeHttps } from "./queue";
import type { FeedItem, FeedSource, FeedStore, Ranking } from "./types";

export const MAX_FEED_BYTES = 2 * 1024 * 1024;
export const MAX_ITEMS = 500;
export const MAX_CONCURRENT = 3;
export const REFRESH_MS = 3_600_000;

export interface ParsedEntry {
  title: string;
  url: string;
  time: number;
}

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
};

function decode(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
      if (code[0] === "#") {
        const n = code[1]?.toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
        return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : "";
      }
      return ENTITIES[code.toLowerCase()] ?? m;
    });
}

function tag(block: string, name: string): string {
  const m = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i").exec(block);
  return m?.[1]?.trim() ?? "";
}

function atomLink(block: string): string {
  const links = [...block.matchAll(/<link\b([^>]*?)\/?>/gi)].map((m) => m[1] ?? "");
  const pick = links.find((l) => /rel=["']alternate["']/i.test(l)) ?? links.find((l) => !/rel=/i.test(l));
  return /href=["']([^"']+)["']/i.exec(pick ?? "")?.[1] ?? "";
}

/**
 * A small RSS and Atom text parser. Service workers have no DOMParser. The output is
 * plain text and is only ever rendered with textContent.
 */
export function parseFeed(xml: string): { title: string; entries: ParsedEntry[] } {
  if (xml.length > MAX_FEED_BYTES) return { title: "", entries: [] };
  const clean = xml.replace(/<!--[\s\S]*?-->/g, "");
  const isAtom = /<feed[\s>]/i.test(clean);
  const blockTag = isAtom ? "entry" : "item";
  const entries: ParsedEntry[] = [];
  for (const m of clean.matchAll(new RegExp(`<${blockTag}[\\s>][\\s\\S]*?</${blockTag}>`, "gi"))) {
    const b = m[0];
    const url = safeHttps(decode(isAtom ? atomLink(b) : tag(b, "link")).trim());
    if (!url) continue;
    const when =
      tag(b, "published") || tag(b, "updated") || tag(b, "pubDate") || tag(b, "dc:date");
    const time = Date.parse(decode(when));
    const title = decode(tag(b, "title")).replace(/<[^>]*>/g, "").trim();
    entries.push({ title: title || url, url, time: Number.isNaN(time) ? 0 : time });
  }
  const head = clean.slice(0, clean.search(new RegExp(`<${blockTag}[\\s>]`, "i")) >>> 0);
  return { title: decode(tag(head, "title")).replace(/<[^>]*>/g, "").trim(), entries };
}

/** Merges new entries and trims the cache, keeping seen flags. */
export function mergeEntries(
  store: FeedStore,
  sourceId: string,
  entries: ParsedEntry[],
): FeedStore {
  const byUrl = new Map(store.items.map((i) => [i.url, i]));
  for (const e of entries) {
    if (!byUrl.has(e.url)) {
      byUrl.set(e.url, { id: e.url, sourceId, title: e.title, url: e.url, time: e.time, seen: false });
    }
  }
  const items = [...byUrl.values()].sort((a, b) => b.time - a.time).slice(0, MAX_ITEMS);
  return { ...store, items };
}

export function rankItems(items: FeedItem[], ranking: Ranking): FeedItem[] {
  if (ranking === "newest") return [...items].sort((a, b) => b.time - a.time);
  if (ranking === "oldestUnseen") {
    return items.filter((i) => !i.seen).sort((a, b) => a.time - b.time);
  }
  const bySource = new Map<string, FeedItem[]>();
  for (const i of [...items].sort((a, b) => b.time - a.time)) {
    bySource.set(i.sourceId, [...(bySource.get(i.sourceId) ?? []), i]);
  }
  const lists = [...bySource.values()];
  const out: FeedItem[] = [];
  for (let n = 0; out.length < items.length; n++) {
    for (const l of lists) {
      const v = l[n];
      if (v) out.push(v);
    }
  }
  return out;
}

/** Exponential backoff for failing sources, capped at a day. */
export function nextFetchAt(failures: number, now: number): number {
  if (failures === 0) return now + REFRESH_MS;
  return now + Math.min(86_400_000, REFRESH_MS * 2 ** failures);
}

export function dueSources(store: FeedStore, now: number): FeedSource[] {
  return store.sources.filter((s) => s.kind === "rss" && s.nextAt <= now).slice(0, MAX_CONCURRENT);
}

export function addSource(
  store: FeedStore,
  source: { kind: "rss" | "tile"; url: string; title: string; site: string },
): FeedStore {
  const url = safeHttps(source.url);
  if (!url || store.sources.some((s) => s.url === url)) return store;
  return {
    ...store,
    sources: [...store.sources, { ...source, id: url, url, failures: 0, nextAt: 0 }],
  };
}

export function removeSource(store: FeedStore, id: string): FeedStore {
  return {
    sources: store.sources.filter((s) => s.id !== id),
    items: store.items.filter((i) => i.sourceId !== id),
  };
}

/** Turns a creator's page into a feed URL where the site has a public one. */
export function feedUrlFor(pageUrl: string): string | null {
  const url = safeHttps(pageUrl);
  if (!url) return null;
  const u = new URL(url);
  if (u.hostname.endsWith("reddit.com")) {
    const m = /^\/(r|user)\/[^/]+/.exec(u.pathname);
    return m ? `https://www.reddit.com${m[0]}/.rss` : null;
  }
  if (u.hostname === "bsky.app") {
    const m = /^\/profile\/[^/]+/.exec(u.pathname);
    return m ? `https://bsky.app${m[0]}/rss` : null;
  }
  if (u.hostname.endsWith("substack.com") && u.hostname !== "substack.com") {
    return `https://${u.hostname}/feed`;
  }
  return null;
}
