import type { PublishedSite, RuleElement, SiteRule } from "./schema";

export const token = (siteId: string, elementId: string) => `${siteId}.${elementId}`;

const HIDE = "{ display: none !important; }";

function routeGate(routes: string[] | null | undefined): string {
  if (!routes?.length) return "";
  const names = routes.map((r) => `[data-algone-route~="${r}"]`).join(", ");
  // Before content.js sets the attribute, the rule still applies: hidden is the safe state.
  return `:is(${names}, :not([data-algone-route]))`;
}

function gate(t: string, el: RuleElement, withOff: boolean): string {
  const off = withOff ? `:not([data-algone-off~="${t}"])` : "";
  const base =
    el.class === "algorithmic"
      ? `html:not([data-algone-show~="${t}"])`
      : `html[data-algone-hide~="${t}"]`;
  return `${base}${off}${routeGate(el.routes)}`;
}

/** One CSS rule per selector, so an invalid selector loses only itself. */
function elementCss(siteId: string, el: RuleElement, withOff: boolean): string {
  const t = token(siteId, el.id);
  return el.selectors.map((s) => `${gate(t, el, withOff)} ${s} ${HIDE}`).join("\n");
}

function tunedCss(site: SiteRule): string {
  if (!site.tuned) return "";
  const item = site.tuned.item;
  // Unchecked items wait, invisible, until the engine has looked at them.
  return `html[data-algone-tuned="on"] ${item}:not([data-algone-seen]) { visibility: hidden !important; }`;
}

export function compileSiteCss(site: SiteRule): string {
  const parts = site.elements.map((el) => elementCss(site.id, el, true));
  const tuned = tunedCss(site);
  if (tuned) parts.push(tuned);
  return `${parts.join("\n")}\n`;
}

/** Overlay CSS has no `off` gate: `off` is what turns the replaced bundled rule off. */
export function compileOverlayCss(site: SiteRule, published: PublishedSite): string {
  const bundled = new Map(site.elements.map((e) => [e.id, e]));
  const retired = new Set(published.retired ?? []);
  const parts: string[] = [];
  for (const el of published.elements) {
    if (retired.has(el.id)) continue;
    const base = bundled.get(el.id);
    if (base && sameList(base.selectors, el.selectors)) continue;
    parts.push(elementCss(site.id, { ...(base ?? el), selectors: el.selectors }, false));
  }
  return parts.join("\n");
}

export function sameList(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/** Generic rules that apply on every site. */
export const BASE_CSS = `[data-algone-filtered] { display: none !important; }
html[data-algone-fade="on"] body { transition: opacity 600ms ease; }
iframe[data-algone-panel] { border: 0 !important; display: block !important; color-scheme: normal; background: transparent !important; }
iframe[data-algone-panel="feed"] { width: min(680px, 100%) !important; height: 60vh; margin: 24px auto !important; }
iframe[data-algone-panel="feed"][data-algone-fixed] { position: fixed !important; top: 72px; left: 50%; transform: translateX(-50%); z-index: 2147483000; }
iframe[data-algone-panel="launch"] { position: fixed !important; inset: 0; width: 100vw !important; height: 100vh !important; z-index: 2147483647; }
iframe[data-algone-panel="ended"] { position: absolute !important; inset: 0; width: 100% !important; height: 100% !important; z-index: 2147483000; }
iframe[data-algone-panel="save"] { position: fixed !important; right: 16px; bottom: 16px; width: 170px !important; height: 44px !important; z-index: 2147483000; }
iframe[data-algone-panel="notice"] { position: fixed !important; top: 16px; right: 16px; width: 320px !important; height: 76px !important; z-index: 2147483001; }
`;
