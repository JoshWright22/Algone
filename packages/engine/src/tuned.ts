import { shouldHide, type TunedFilters } from "@algone/core";
import type { Tuned } from "@algone/rules";

const REVEAL_MS = 1000;
const firstSeen = new WeakMap<Element, number>();
const lastKey = new WeakMap<Element, string>();

function text(root: Element, selector: string | undefined): string {
  if (!selector) return "";
  try {
    return root.querySelector(selector)?.textContent?.trim() ?? "";
  } catch {
    return "";
  }
}

function kindsOf(item: Element, kinds: Record<string, string> | undefined): string[] {
  const out: string[] = [];
  for (const [kind, selector] of Object.entries(kinds ?? {})) {
    try {
      if (item.matches(selector)) out.push(kind);
    } catch {
      // A bad selector from a rule costs only that kind.
    }
  }
  return out;
}

/**
 * Checks feed items. Sites recycle nodes and fill titles late, so the check is keyed
 * by current content and redone when it changes.
 */
export function applyTuned(tuned: Tuned, filters: TunedFilters, now = Date.now()): void {
  let items: NodeListOf<Element>;
  try {
    items = document.querySelectorAll(tuned.item);
  } catch {
    return;
  }
  for (const item of items) {
    const title = text(item, tuned.title);
    const channel = text(item, tuned.channel);
    const key = `${title}\n${channel}\n${item.querySelector("a[href]")?.getAttribute("href") ?? ""}`;
    if (!firstSeen.has(item)) firstSeen.set(item, now);
    if (lastKey.get(item) === key && item.hasAttribute("data-algone-seen")) continue;
    if (!title && now - firstSeen.get(item)! < REVEAL_MS) continue; // Stay invisible for now.
    lastKey.set(item, key);
    if (shouldHide({ title, channel, kinds: kindsOf(item, tuned.kinds) }, filters)) {
      item.setAttribute("data-algone-filtered", "");
    } else {
      item.removeAttribute("data-algone-filtered");
    }
    item.setAttribute("data-algone-seen", "");
  }
}

export function clearTuned(): void {
  for (const el of document.querySelectorAll("[data-algone-filtered],[data-algone-seen]")) {
    el.removeAttribute("data-algone-filtered");
    el.removeAttribute("data-algone-seen");
  }
}
