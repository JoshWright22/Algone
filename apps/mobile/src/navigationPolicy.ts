import { SITES, type SiteRule } from "@algone/rules";

export type Decision =
  /** Load in this web view. */
  | { action: "allow" }
  /** Allow-listed, but filtered by another site's script: reopen as that site. */
  | { action: "switchSite"; site: string; url: string }
  /** Hand to the system browser. */
  | { action: "external"; url: string }
  /** Drop silently. */
  | { action: "deny" };

function parse(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

/** The site that owns a host, through `hosts` or `auxHosts`. */
export function siteForAllowedHost(hostname: string, sites: SiteRule[] = SITES): SiteRule | undefined {
  return sites.find((s) => s.hosts.includes(hostname) || s.auxHosts?.includes(hostname));
}

export function isAllowedUrl(url: string, sites: SiteRule[] = SITES): boolean {
  const u = parse(url);
  return u?.protocol === "https:" && !!siteForAllowedHost(u.hostname, sites);
}

/**
 * The decision for one navigation. Only http and https ever leave the app: a page must
 * not be able to fire `algone://save`, `intent:`, or another app's scheme through us.
 */
export function decide(
  url: string,
  currentSite: string | null,
  isTopFrame: boolean,
  sites: SiteRule[] = SITES,
): Decision {
  const u = parse(url);
  if (!isTopFrame) {
    // Embeds load inside a page the allow-list already admitted. They run no injected
    // script, and must never pop the system browser on their own.
    return u?.protocol === "https:" || u?.protocol === "about:" ? { action: "allow" } : { action: "deny" };
  }
  if (!u) return { action: "deny" };
  if (u.protocol === "https:") {
    const site = siteForAllowedHost(u.hostname, sites);
    if (!site) return { action: "external", url };
    return site.id === currentSite ? { action: "allow" } : { action: "switchSite", site: site.id, url };
  }
  return u.protocol === "http:" ? { action: "external", url } : { action: "deny" };
}

export const homeUrl = (rule: SiteRule) => `https://${rule.hosts[0]}/`;

export function searchUrlFor(rule: SiteRule, query: string): string | null {
  const q = query.trim();
  if (!rule.searchUrl || !q) return null;
  return `https://${rule.hosts[0]}${rule.searchUrl}${encodeURIComponent(q)}`;
}
