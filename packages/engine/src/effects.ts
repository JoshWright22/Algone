import type { View } from "@algone/core";
import type { PageEffect, PageSite } from "./types";

const clicked = new WeakSet<Element>();

function clickOnce(selector: string | undefined): void {
  if (!selector) return;
  let el: Element | null = null;
  try {
    el = document.querySelector(selector);
  } catch {
    return;
  }
  if (el instanceof HTMLElement && !clicked.has(el)) {
    clicked.add(el);
    el.click();
  }
}

/** `/shorts/ID` becomes `/watch?v=ID`, so a direct link still plays, without the swipe feed. */
export function shortsTarget(pathname: string): string | null {
  const id = /^\/shorts\/([\w-]+)/.exec(pathname)?.[1];
  return id ? `/watch?v=${id}` : null;
}

export function runEffects(effects: PageEffect[], active: string[], routes: string[]): void {
  for (const e of effects) {
    if (!active.includes(e.id)) continue;
    if (e.effect === "shortsToWatch") {
      const target = shortsTarget(location.pathname);
      if (target) location.replace(target);
    } else if (e.effect === "stopAutoplay" || (e.effect === "selectTab" && routes.includes("home"))) {
      clickOnce(e.selector);
    }
  }
}

/** Same-site redirect to the subscriptions page, on home routes only. Bundled path. */
export function subscriptionsRedirect(site: PageSite, view: View, routes: string[]): void {
  if (!view.subsFirst || !site.subscriptionsPath || !routes.includes("home")) return;
  const target = site.subscriptionsPath;
  if (`${location.pathname}${location.search}` !== target) location.replace(target);
}
