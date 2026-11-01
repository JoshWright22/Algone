import type { PublishedRules, PublishedSite, SiteRule } from "./schema";
import { BOUND_ROUTES, RULE_SCHEMA } from "./schema";

/** Strips a bundled rule down to the fields allowed in the published file. */
export function toPublished(site: SiteRule): PublishedSite {
  const bound = new Set([...BOUND_ROUTES, ...(site.capture?.routes ?? [])]);
  const routes = Object.fromEntries(Object.entries(site.routes).filter(([n]) => !bound.has(n)));
  return {
    elements: site.elements.map(({ id, label, group, class: cls, selectors }) => ({
      id,
      label,
      group,
      class: cls,
      selectors,
    })),
    ...(site.slot ? { slot: site.slot } : {}),
    ...(site.tuned ? { tuned: site.tuned } : {}),
    ...(Object.keys(routes).length ? { routes } : {}),
  };
}

export function publishRules(sites: SiteRule[], rev: number): PublishedRules {
  return {
    schema: RULE_SCHEMA,
    rev,
    sites: Object.fromEntries(sites.map((s) => [s.id, toPublished(s)])),
  };
}
