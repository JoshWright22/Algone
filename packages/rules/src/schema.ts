/** Rule data types and validators. Rules are data: nothing here is ever executed. */

export const RULE_SCHEMA = 1;
export const MAX_FILE_BYTES = 512 * 1024;
export const MAX_SELECTOR_LENGTH = 500;

export const EFFECTS = ["stopAutoplay", "shortsToWatch", "selectTab"] as const;
export type EffectName = (typeof EFFECTS)[number];

export const VERIFY_METHODS = [
  "live-logged-out",
  "live-logged-in",
  "fixture",
  "unverified",
] as const;
export type VerifyMethod = (typeof VERIFY_METHODS)[number];

export type RouteMatcher = string | { path: string; query: Record<string, string> };
export type Routes = Record<string, RouteMatcher[]>;

export interface RuleElement {
  id: string;
  label: string;
  group: string;
  class: "algorithmic" | "extra";
  feed?: boolean;
  selectors: string[];
  routes?: string[] | null;
  effect?: EffectName;
  effectSelector?: string;
}

export interface Slot {
  selector: string;
  fallback: "fixed";
}

export interface Tuned {
  item: string;
  title: string;
  channel?: string;
  kinds?: Record<string, string>;
}

export interface Capture {
  routes: string[];
  item: string;
  title: string;
  link: string;
}

export interface Player {
  selector: string;
  adMarker?: string;
}

export interface ProtectedItem {
  path: string;
  selector: string;
  label: string;
}

export interface Probe {
  path: string;
  live: boolean;
  /** The feed exists only when signed in, so a logged-out miss is inconclusive. */
  needsLogin?: boolean;
  expect: string[];
  viewport?: "desktop" | "mobile";
}

export interface SiteRule {
  id: string;
  name: string;
  tier: 1 | 2;
  hosts: string[];
  routes: Routes;
  elements: RuleElement[];
  slot?: Slot;
  tuned?: Tuned;
  capture?: Capture;
  player?: Player;
  protected: ProtectedItem[];
  probes: Probe[];
  walls: string[];
  auxHosts?: string[];
  subscriptionsPath?: string;
  searchUrl?: string;
  feedUrls?: string[];
  verified: { date: string; method: VerifyMethod; notes: string };
}

/** One site's entry in the published rules file. */
export interface PublishedSite {
  elements: Array<Pick<RuleElement, "id" | "label" | "group" | "class" | "selectors">>;
  retired?: string[];
  slot?: Slot;
  tuned?: Tuned;
  routes?: Routes;
}

export interface PublishedRules {
  schema: number;
  rev: number;
  sites: Record<string, PublishedSite>;
}

/** Route names the packaged behavior depends on. A remote file cannot change them. */
export const BOUND_ROUTES = ["home", "watch", "shorts", "subscriptions"];

const BROAD = new Set(["*", "html", "body", "main", "div", ":root", "span", "section", "a"]);
const FORBIDDEN = [/[{}<\\]/, /url\(/i, /\/\*/];

/** Returns an error message, or null if the selector is acceptable. */
export function checkSelector(selector: unknown): string | null {
  if (typeof selector !== "string" || selector.trim() === "") return "empty selector";
  if (selector.length > MAX_SELECTOR_LENGTH) return "selector too long";
  for (const re of FORBIDDEN) if (re.test(selector)) return `forbidden text in ${selector}`;
  if (BROAD.has(selector.trim().toLowerCase())) return `selector too broad: ${selector}`;
  let quote: string | null = null;
  const stack: string[] = [];
  for (const ch of selector) {
    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "@") return `at-sign outside quotes in ${selector}`;
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === "(" || ch === "[") stack.push(ch);
    else if (ch === ")" && stack.pop() !== "(") return `unbalanced ) in ${selector}`;
    else if (ch === "]" && stack.pop() !== "[") return `unbalanced ] in ${selector}`;
    else if (ch === "," && stack.length === 0) return `top-level comma in ${selector}`;
  }
  if (quote) return `unbalanced quote in ${selector}`;
  if (stack.length) return `unbalanced bracket in ${selector}`;
  return null;
}

function checkPath(path: unknown): string | null {
  if (typeof path !== "string" || !path.startsWith("/")) return `bad path ${String(path)}`;
  if (path.startsWith("//")) return `bad path ${path}`;
  return null;
}

function checkRoutes(routes: unknown): string[] {
  if (typeof routes !== "object" || routes === null) return ["routes must be an object"];
  const errors: string[] = [];
  for (const [name, list] of Object.entries(routes)) {
    if (!Array.isArray(list)) {
      errors.push(`route ${name} must be an array`);
      continue;
    }
    for (const m of list) {
      const path = typeof m === "string" ? m : (m as { path?: unknown })?.path;
      const e = checkPath(path);
      if (e) errors.push(e);
      if (typeof path === "string" && path.slice(0, -1).includes("*")) {
        errors.push(`wildcard only at end: ${path}`);
      }
    }
  }
  return errors;
}

function checkTuned(tuned: Tuned): string[] {
  const out: string[] = [];
  for (const v of [tuned.item, tuned.title, tuned.channel]) {
    if (v === undefined) continue;
    const e = checkSelector(v);
    if (e) out.push(e);
  }
  for (const v of Object.values(tuned.kinds ?? {})) {
    // A kind is a compound suffix such as :has(a), so it is checked as a selector.
    const e = checkSelector(v);
    if (e) out.push(e);
  }
  return out;
}

function checkElementShape(el: Partial<RuleElement>): string[] {
  const out: string[] = [];
  if (!el.id || !/^[a-zA-Z][a-zA-Z0-9]*$/.test(el.id)) out.push(`bad element id ${el.id}`);
  if (!el.label) out.push(`element ${el.id} has no label`);
  if (!el.group) out.push(`element ${el.id} has no group`);
  if (el.class !== "algorithmic" && el.class !== "extra") out.push(`bad class on ${el.id}`);
  if (!Array.isArray(el.selectors) || el.selectors.length === 0) {
    out.push(`element ${el.id} has no selectors`);
  } else {
    for (const s of el.selectors) {
      const e = checkSelector(s);
      if (e) out.push(`${el.id}: ${e}`);
    }
  }
  return out;
}

const SITE_KEYS = new Set([
  "id", "name", "tier", "hosts", "routes", "elements", "slot", "tuned", "capture", "player",
  "protected", "probes", "walls", "auxHosts", "subscriptionsPath", "searchUrl", "feedUrls",
  "verified",
]);

/** Strict check for rules in this repo. Used by build, tests, and CI. */
export function validateSite(site: SiteRule): string[] {
  const errors: string[] = [];
  const at = (m: string) => errors.push(`${site?.id ?? "?"}: ${m}`);
  for (const k of Object.keys(site)) if (!SITE_KEYS.has(k)) at(`unknown key ${k}`);
  if (!/^[a-z]+$/.test(site.id ?? "")) at("bad id");
  if (!site.name) at("no name");
  if (site.tier !== 1 && site.tier !== 2) at("bad tier");
  if (!Array.isArray(site.hosts) || site.hosts.length === 0) at("no hosts");
  for (const e of checkRoutes(site.routes)) at(e);
  const ids = new Set<string>();
  for (const el of site.elements ?? []) {
    for (const e of checkElementShape(el)) at(e);
    if (ids.has(el.id)) at(`duplicate element ${el.id}`);
    ids.add(el.id);
    for (const r of el.routes ?? []) if (!site.routes?.[r]) at(`unknown route ${r} on ${el.id}`);
    if (el.effect && !EFFECTS.includes(el.effect)) at(`unknown effect ${el.effect}`);
    if (el.effectSelector) {
      const e = checkSelector(el.effectSelector);
      if (e) at(e);
    }
  }
  if (!site.elements?.some((e) => e.feed)) at("no feed element");
  if (site.slot) {
    const e = checkSelector(site.slot.selector);
    if (e) at(e);
  }
  if (site.tuned) for (const e of checkTuned(site.tuned)) at(e);
  if (site.capture) {
    for (const v of [site.capture.item, site.capture.title, site.capture.link]) {
      const e = checkSelector(v);
      if (e) at(e);
    }
    for (const r of site.capture.routes) if (!site.routes?.[r]) at(`unknown capture route ${r}`);
  }
  if (site.player) {
    const e = checkSelector(site.player.selector);
    if (e) at(e);
  }
  for (const p of site.protected ?? []) {
    const e = checkSelector(p.selector) ?? checkPath(p.path);
    if (e) at(e);
  }
  for (const v of site.walls ?? []) {
    const e = checkSelector(v);
    if (e) at(e);
  }
  for (const p of site.probes ?? []) {
    const e = checkPath(p.path);
    if (e) at(e);
    for (const id of p.expect) if (!ids.has(id)) at(`probe expects unknown ${id}`);
  }
  for (const v of [site.subscriptionsPath, site.searchUrl]) {
    if (v !== undefined) {
      const e = checkPath(v);
      if (e) at(e);
    }
  }
  if (!VERIFY_METHODS.includes(site.verified?.method)) at("bad verified.method");
  return errors;
}

export interface OverlayValidation {
  ok: boolean;
  /** File-level failure: nothing is usable. */
  error?: string;
  rev: number;
  sites: Record<string, PublishedSite>;
  /** Entries dropped. Earlier good values stay in place for these. */
  rejected: string[];
}

function asObject(v: unknown): Record<string, unknown> | null {
  return typeof v === "object" && v !== null && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

/**
 * Validates a fetched rules file. One bad entry costs only that entry. Unknown sites
 * and keys are ignored, so a newer file still works on an older client.
 */
export function validateOverlay(
  text: string,
  knownSites: Record<string, SiteRule>,
  minRev: number,
): OverlayValidation {
  const fail = (error: string): OverlayValidation => ({
    ok: false,
    error,
    rev: 0,
    sites: {},
    rejected: [],
  });
  if (text.length > MAX_FILE_BYTES) return fail("file too large");
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return fail("not JSON");
  }
  const root = asObject(data);
  if (!root) return fail("not an object");
  if (root.schema !== RULE_SCHEMA) return fail(`unknown schema ${String(root.schema)}`);
  if (typeof root.rev !== "number" || !Number.isFinite(root.rev)) return fail("bad rev");
  if (root.rev <= minRev) return fail("rev is not newer");
  const inSites = asObject(root.sites);
  if (!inSites) return fail("no sites");

  const sites: Record<string, PublishedSite> = {};
  const rejected: string[] = [];
  for (const [id, raw] of Object.entries(inSites)) {
    const known = knownSites[id];
    const entry = asObject(raw);
    if (!known) continue;
    if (!entry) {
      rejected.push(`${id}: not an object`);
      continue;
    }
    const out: PublishedSite = { elements: [] };
    const bound = new Set([...BOUND_ROUTES, ...(known.capture?.routes ?? [])]);
    for (const rawEl of Array.isArray(entry.elements) ? entry.elements : []) {
      const el = asObject(rawEl) as Partial<RuleElement> | null;
      const errors = el ? checkElementShape(el) : ["not an object"];
      if (errors.length || !el) {
        rejected.push(`${id}: ${errors.join("; ")}`);
        continue;
      }
      out.elements.push({
        id: el.id!,
        label: el.label!,
        group: el.group!,
        class: el.class!,
        selectors: el.selectors!,
      });
    }
    if (Array.isArray(entry.retired)) {
      out.retired = entry.retired.filter((r): r is string => typeof r === "string");
    }
    const slot = asObject(entry.slot) as Slot | null;
    if (slot) {
      if (checkSelector(slot.selector)) rejected.push(`${id}: bad slot`);
      else out.slot = { selector: slot.selector, fallback: "fixed" };
    }
    const tuned = asObject(entry.tuned) as Tuned | null;
    if (tuned) {
      const errors = checkTuned(tuned);
      if (errors.length) rejected.push(`${id}: bad tuned`);
      else {
        out.tuned = {
          item: tuned.item,
          title: tuned.title,
          ...(tuned.channel ? { channel: tuned.channel } : {}),
          ...(tuned.kinds ? { kinds: tuned.kinds } : {}),
        };
      }
    }
    const routes = asObject(entry.routes);
    if (routes) {
      const kept: Routes = {};
      for (const [name, list] of Object.entries(routes)) {
        if (bound.has(name)) continue; // Effect, panel, and capture routes stay bundled.
        if (checkRoutes({ [name]: list }).length) rejected.push(`${id}: bad route ${name}`);
        else kept[name] = list as RouteMatcher[];
      }
      out.routes = kept;
    }
    sites[id] = out;
  }
  return { ok: true, rev: root.rev, sites, rejected };
}
