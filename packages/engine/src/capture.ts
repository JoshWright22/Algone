import type { Capture } from "@algone/rules";
import type { CapturedItem } from "./types";

const sent = new Set<string>();

/** Reads items the user's page already shows, using bundled selectors. */
export function collectItems(capture: Capture): CapturedItem[] {
  const out: CapturedItem[] = [];
  let items: NodeListOf<Element>;
  try {
    items = document.querySelectorAll(capture.item);
  } catch {
    return out;
  }
  for (const item of items) {
    const title = item.querySelector(capture.title)?.textContent?.trim();
    const href = item.querySelector(capture.link)?.getAttribute("href");
    if (!title || !href) continue;
    const url = new URL(href, location.origin).href;
    if (sent.has(url)) continue;
    sent.add(url);
    out.push({ title: title.slice(0, 200), url });
  }
  return out;
}
