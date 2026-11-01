import {
  compileOverlayCss,
  sameList,
  validateOverlay,
  type PublishedSite,
  type RuleElement,
  type SiteRule,
  type Tuned,
  type Routes,
  type Slot,
} from "@algone/rules";

export const RULES_URL = "https://joshwright22.github.io/Algone/rules/v1/rules.json";
export const STALE_MS = 26 * 3_600_000;

export interface OverlaySite {
  /** Element ids whose bundled selectors are replaced. */
  replaced: string[];
  retired: string[];
  added: RuleElement[];
  css: string;
  slot?: Slot;
  tuned?: Tuned;
  routes?: Routes;
}

export interface Overlay {
  rev: number;
  sites: Record<string, OverlaySite>;
}

function diffSite(site: SiteRule, pub: PublishedSite): OverlaySite | null {
  const bundled = new Map(site.elements.map((e) => [e.id, e]));
  const retired = (pub.retired ?? []).filter((id) => bundled.has(id));
  const replaced = pub.elements
    .filter((e) => {
      const b = bundled.get(e.id);
      return b && !retired.includes(e.id) && !sameList(b.selectors, e.selectors);
    })
    .map((e) => e.id);
  const added = pub.elements.filter((e) => !bundled.has(e.id));
  const slot = pub.slot && pub.slot.selector !== site.slot?.selector ? pub.slot : undefined;
  const tuned =
    pub.tuned && JSON.stringify(pub.tuned) !== JSON.stringify(site.tuned) ? pub.tuned : undefined;
  const routes = changedRoutes(site, pub);
  if (!replaced.length && !retired.length && !added.length && !slot && !tuned && !routes) {
    return null;
  }
  return {
    replaced,
    retired,
    added,
    css: compileOverlayCss(site, pub),
    ...(slot ? { slot } : {}),
    ...(tuned ? { tuned } : {}),
    ...(routes ? { routes } : {}),
  };
}

function changedRoutes(site: SiteRule, pub: PublishedSite): Routes | undefined {
  const changed = Object.entries(pub.routes ?? {}).filter(
    ([name, list]) => JSON.stringify(site.routes[name]) !== JSON.stringify(list),
  );
  return changed.length ? Object.fromEntries(changed) : undefined;
}

export interface UpdateResult {
  overlay: Overlay | null;
  lastAcceptedRev: number;
  error: string;
  rejected: string[];
}

/**
 * Handles a fetched rules file. On any file-level failure the previous overlay stays.
 * An entry rejected by validation keeps its previous value too.
 */
export function handleRulesFile(
  text: string,
  bundled: Record<string, SiteRule>,
  buildRev: number,
  lastAcceptedRev: number,
  previous: Overlay | null,
): UpdateResult {
  const floor = Math.max(buildRev, lastAcceptedRev);
  const v = validateOverlay(text, bundled, floor);
  if (!v.ok) {
    return { overlay: previous, lastAcceptedRev, error: v.error ?? "invalid", rejected: [] };
  }
  const sites: Record<string, OverlaySite> = {};
  for (const [id, rule] of Object.entries(bundled)) {
    const pub = v.sites[id];
    const rejectedHere = v.rejected.some((r) => r.startsWith(`${id}:`));
    if (rejectedHere && previous?.sites[id]) {
      sites[id] = previous.sites[id];
      continue;
    }
    if (!pub) {
      if (previous?.sites[id]) sites[id] = previous.sites[id];
      continue;
    }
    const diff = diffSite(rule, pub);
    if (diff) sites[id] = diff;
  }
  const overlay = Object.keys(sites).length ? { rev: v.rev, sites } : null;
  return { overlay, lastAcceptedRev: v.rev, error: "", rejected: v.rejected };
}

/** A store update can include an overlay's fixes. Then the overlay is dropped. */
export function clearIfBundled(overlay: Overlay | null, buildRev: number): Overlay | null {
  return overlay && buildRev >= overlay.rev ? null : overlay;
}

export function isStale(lastCheck: number, now: number): boolean {
  return now - lastCheck > STALE_MS;
}

/** The bundled rule with overlay data the engine needs applied. */
export function effectiveRule(rule: SiteRule, overlay: Overlay | null): SiteRule {
  const o = overlay?.sites[rule.id];
  if (!o) return rule;
  return {
    ...rule,
    slot: o.slot ?? rule.slot,
    tuned: o.tuned ?? rule.tuned,
    routes: { ...rule.routes, ...o.routes },
  };
}
