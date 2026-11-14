import { describe, expect, it } from "vitest";
import {
  checkSelector,
  compileOverlayCss,
  compileSiteCss,
  publishRules,
  SITES,
  siteMap,
  validateOverlay,
  validateSite,
} from "../src/index";

const known = siteMap();
const file = (o: object) => JSON.stringify({ schema: 1, rev: 100, sites: {}, ...o });
const yt = known.youtube!;

describe("bundled rules", () => {
  it("has 12 sites", () => expect(SITES).toHaveLength(12));
  it.each(SITES.map((s) => [s.id, s] as const))("%s is valid", (_id, site) => {
    expect(validateSite(site)).toEqual([]);
  });
  it("has a label for every element", () => {
    for (const s of SITES) for (const e of s.elements) expect(e.label.length).toBeGreaterThan(2);
  });
  it("does not let a selector equal a protected selector", () => {
    for (const s of SITES) {
      const prot = new Set(s.protected.map((p) => p.selector));
      for (const e of s.elements) for (const sel of e.selectors) expect(prot.has(sel)).toBe(false);
    }
  });
});

describe("checkSelector", () => {
  it.each([
    ["ytd-browse[page-subtype=\"home\"]", true],
    ["a:has(> b, c)", true],
    ["a, b", false],
    ["a { color: red }", false],
    ["a<b", false],
    ["@import x", false],
    ["a /* c */", false],
    ["url(x)", false],
    ["a\\b", false],
    ["a[b", false],
    ["a(b", false],
    ["a[b='c]", false],
    ["*", false],
    ["body", false],
    ["html", false],
    [":root", false],
    ["", false],
    ["x".repeat(501), false],
  ])("%s -> %s", (sel, ok) => expect(checkSelector(sel) === null).toBe(ok));
});

describe("compile", () => {
  const css = compileSiteCss(yt);
  it("gates algorithmic rules on show and off", () => {
    expect(css).toContain(
      'html:not([data-algone-show~="youtube.home"]):not([data-algone-off~="youtube.home"]) ytd-browse[page-subtype="home"]',
    );
  });
  it("gates extras on hide and off", () => {
    expect(css).toContain(
      'html[data-algone-hide~="youtube.comments"]:not([data-algone-off~="youtube.comments"]) ytd-comments#comments',
    );
  });
  it("adds the route gate to html, as one compound", () => {
    expect(css).toContain(
      ':is([data-algone-route~="shorts"], :not([data-algone-route])) ytd-shorts',
    );
  });
  it("emits one rule per selector", () => {
    const n = yt.elements.reduce((a, e) => a + e.selectors.length, 0);
    expect(css.split("\n").filter((l) => l.includes("display: none")).length).toBe(n);
  });
  it("overlay CSS has no off gate and covers only changes", () => {
    const pub = publishRules([yt], 1).sites.youtube!;
    expect(compileOverlayCss(yt, pub)).toBe("");
    pub.elements[0]!.selectors = ["ytd-new-home"];
    const out = compileOverlayCss(yt, pub);
    expect(out).toContain("ytd-new-home");
    expect(out).not.toContain("data-algone-off");
  });
});

describe("validateOverlay", () => {
  it("rejects a bad file whole", () => {
    expect(validateOverlay("nope", known, 0).ok).toBe(false);
    expect(validateOverlay(file({ schema: 2 }), known, 0).ok).toBe(false);
    expect(validateOverlay(file({ rev: "x" }), known, 0).ok).toBe(false);
    expect(validateOverlay(file({}), known, 100).ok).toBe(false);
    expect(validateOverlay("x".repeat(600_000), known, 0).ok).toBe(false);
  });
  it("ignores unknown sites and keys, so older clients keep working", () => {
    const r = validateOverlay(
      file({ future: true, sites: { myspace: { elements: [] }, youtube: { elements: [], newKey: 1 } } }),
      known,
      0,
    );
    expect(r.ok).toBe(true);
    expect(Object.keys(r.sites)).toEqual(["youtube"]);
    expect(r.sites.youtube).not.toHaveProperty("newKey");
  });
  it("drops one bad element and keeps the rest", () => {
    const good = { id: "home", label: "Home", group: "Feeds", class: "algorithmic", selectors: ["x-a"] };
    const bad = { ...good, id: "bad", selectors: ["a { color: red }"] };
    const r = validateOverlay(file({ sites: { youtube: { elements: [good, bad] } } }), known, 0);
    expect(r.sites.youtube!.elements.map((e) => e.id)).toEqual(["home"]);
    expect(r.rejected).toHaveLength(1);
  });
  it("enforces the field table: no behavior can arrive remotely", () => {
    const entry = {
      elements: [
        {
          id: "x1", label: "X", group: "G", class: "algorithmic", selectors: ["x-a"],
          effect: "stopAutoplay", effectSelector: "x-b", routes: ["home"],
        },
      ],
      searchUrl: "/evil", subscriptionsPath: "/evil", capture: { item: "a" },
      player: { selector: "a" }, hosts: ["evil.example"], auxHosts: ["evil.example"],
      walls: ["x-a"], probes: [], protected: [],
    };
    const r = validateOverlay(file({ sites: { youtube: entry } }), known, 0);
    const out = r.sites.youtube!;
    expect(Object.keys(out)).toEqual(["elements"]);
    expect(Object.keys(out.elements[0]!).sort()).toEqual(["class", "group", "id", "label", "selectors"]);
  });
  it("keeps bound routes out but allows hide-only routes", () => {
    const routes = { home: ["/evil"], subscriptions: ["/evil"], popular: ["/r/hot*"] };
    const r = validateOverlay(file({ sites: { reddit: { elements: [], routes } } }), known, 0);
    expect(r.sites.reddit!.routes).toEqual({ popular: ["/r/hot*"] });
  });
  it("rejects bad paths", () => {
    const r = validateOverlay(
      file({ sites: { reddit: { elements: [], routes: { popular: ["//evil", "x"] } } } }),
      known,
      0,
    );
    expect(r.sites.reddit!.routes).toEqual({});
    expect(r.rejected.length).toBeGreaterThan(0);
  });
  it("accepts its own published output", () => {
    const pub = publishRules(SITES, 500);
    const r = validateOverlay(JSON.stringify(pub), known, 0);
    expect(r.ok).toBe(true);
    expect(r.rejected).toEqual([]);
    expect(Object.keys(r.sites)).toHaveLength(12);
  });
});

describe("twitch", () => {
  it("never hides the followed channels page", () => {
    const tw = SITES.find((s) => s.id === "twitch")!;
    const matches = (pattern: string, path: string) =>
      pattern.endsWith("*") ? path.startsWith(pattern.slice(0, -1)) : path === pattern;
    for (const el of tw.elements) {
      for (const route of el.routes ?? []) {
        for (const m of tw.routes[route] ?? []) {
          const pattern = typeof m === "string" ? m : m.path;
          expect(matches(pattern, "/directory/following"), `${el.id} via ${route}`).toBe(false);
          expect(matches(pattern, "/directory/following/live"), `${el.id} via ${route}`).toBe(false);
        }
      }
    }
  });
});
