import { computeView, effectiveRule } from "@algone/core";
import type { PagePayload, PageSite } from "@algone/engine";
import { BASE_CSS, compileSiteCss, type SiteRule, type Tuned } from "@algone/rules";
import type { PageBoot } from "./page/boot";
import type { Stored } from "./store";

const isAds = (kind: string) => kind.trim().toLowerCase() === "ads";

/** D-22: no ads filtering in the mobile app, whatever a rule or an overlay says. */
function withoutAds(tuned: Tuned): Tuned {
  const { kinds, ...rest } = tuned;
  if (!kinds) return rest;
  return { ...rest, kinds: Object.fromEntries(Object.entries(kinds).filter(([k]) => !isAds(k))) };
}

/** The rule subset page code needs. Slot and capture serve panels, which are native here. */
function pageSite(rule: SiteRule): PageSite {
  return {
    id: rule.id,
    routes: rule.routes,
    ...(rule.tuned ? { tuned: withoutAds(rule.tuned) } : {}),
    ...(rule.player ? { player: rule.player } : {}),
    ...(rule.subscriptionsPath ? { subscriptionsPath: rule.subscriptionsPath } : {}),
    effects: rule.elements.flatMap((e) =>
      e.effect
        ? [{ id: e.id, effect: e.effect, ...(e.effectSelector ? { selector: e.effectSelector } : {}) }]
        : [],
    ),
  };
}

/** The overlay is applied first, so that nothing remote can bring `ads` back. */
export function buildPayload(state: Stored, bundled: SiteRule, now: number): PagePayload {
  const overlay = state.rulesOverlay;
  const rule = effectiveRule(bundled, overlay);
  const view = computeView(state.settings, state.runtime, rule, now, overlay);
  return {
    site: pageSite(rule),
    view: {
      ...view,
      tuned: view.tuned ? { ...view.tuned, hideKinds: view.tuned.hideKinds.filter((k) => !isAds(k)) } : null,
    },
    overlayCss: overlay?.sites[rule.id]?.css ?? "",
  };
}

export function buildBoot(state: Stored, bundled: SiteRule, now: number): PageBoot {
  return {
    hosts: bundled.hosts,
    css: BASE_CSS + compileSiteCss(bundled),
    payload: buildPayload(state, bundled, now),
  };
}

/** Kinds Settings may offer for a site: never `ads`. */
export function offeredKinds(rule: SiteRule): string[] {
  return [...Object.keys(rule.tuned?.kinds ?? {}).filter((k) => !isAds(k)), "likelyAi"];
}
