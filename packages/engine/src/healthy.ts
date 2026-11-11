import type { Tuned } from "@algone/rules";
import type { PickedItem } from "./types";

const sent = new Set<string>();
/** Short-video and ad kinds never enter the healthy batch. */
const SKIP_KINDS = ["shorts", "reels", "ads"];
const MAX_ITEMS = 60;

function text(root: Element, selector: string | undefined): string {
  if (!selector) return "";
  try {
    return root.querySelector(selector)?.textContent?.replace(/\s+/g, " ").trim() ?? "";
  } catch {
    return "";
  }
}

function skipped(item: Element, kinds: Record<string, string> | undefined): boolean {
  return SKIP_KINDS.some((k) => {
    const selector = kinds?.[k];
    if (!selector) return false;
    try {
      return item.matches(selector);
    } catch {
      return false;
    }
  });
}

/** Paths that open the item itself rather than its author: a post, a video, a pin, an article. */
const ITEM_PATH = /\/(post|status|watch|p|comments|video|pin|live|reel)(\/|\?|$)/;

/** The link to the item. Feeds put the author's profile link first, so prefer one that opens the item. */
function itemLink(item: Element): string | null {
  const links = [...item.querySelectorAll("a[href]")].map((a) => a.getAttribute("href") ?? "");
  return links.find((h) => ITEM_PATH.test(h)) ?? links[0] ?? null;
}

/** When a site's title selector misses, the longest text block in the item is the post text. */
function fallbackTitle(item: Element): string {
  let best = "";
  for (const el of item.querySelectorAll('[dir="auto"], p, h1, h2, h3')) {
    const t = el.textContent?.replace(/\s+/g, " ").trim() ?? "";
    if (t.length > best.length) best = t;
  }
  return best.length >= 12 ? best : "";
}

/**
 * Reads the items the site already loaded into its hidden feed: its own picks and the
 * people the user follows. Nothing is clicked or scrolled; only what is on the page counts.
 */
export function collectFeed(tuned: Tuned): PickedItem[] {
  const out: PickedItem[] = [];
  let items: NodeListOf<Element>;
  try {
    items = document.querySelectorAll(tuned.item);
  } catch {
    return out;
  }
  for (const item of items) {
    if (sent.size >= MAX_ITEMS) break;
    if (skipped(item, tuned.kinds)) continue;
    const title = text(item, tuned.title) || fallbackTitle(item);
    const href = itemLink(item);
    if (!title || !href) continue;
    let url: URL;
    try {
      url = new URL(href, location.origin);
    } catch {
      continue;
    }
    if (url.origin !== location.origin || /^\/shorts\/|\/reels?\//.test(url.pathname)) continue;
    if (sent.has(url.href)) continue;
    sent.add(url.href);
    out.push({ title: title.slice(0, 200), channel: text(item, tuned.channel).slice(0, 100), url: url.href });
  }
  return out;
}
