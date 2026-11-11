import { SITES, siteMap, type SiteRule } from "@algone/rules";
import { describe, expect, it } from "vitest";
import { applyPatch, defaultSettings, zenList } from "../src/index";

const AT = "2026-11-10T12:00:00Z";
const yt = siteMap().youtube as SiteRule;
const lines = (text: string) => text.split("\n").filter((l) => l && !l.startsWith("!"));

describe("Zen filter list", () => {
  it("hides every default algorithmic element with plain hide rules only", () => {
    const list = zenList(defaultSettings(SITES), SITES, AT);
    const rules = lines(list.text);
    expect(rules.length).toBe(list.rules);
    expect(rules).toContain(`www.youtube.com,m.youtube.com##${yt.elements.find((e) => e.id === "home")!.selectors[0]}`);
    for (const r of rules) {
      expect(r).toMatch(/^[a-z0-9.,-]+##\S/);
      expect(r).not.toMatch(/#@#|#\?#|#\$#|#%#|\$\$|[{}]/);
    }
    expect(list.text).toContain("! Expires: 1 hour");
  });

  it("leaves out page-limited and effect elements, and says so", () => {
    const list = zenList(defaultSettings(SITES), SITES, AT);
    expect(list.skipped).toContain("youtube.shortsPlayer");
    expect(list.skipped).toContain("youtube.autoplay");
    expect(list.text).not.toContain("##ytd-shorts\n");
    expect(list.text).toContain("! Not possible in Zen:");
  });

  it("follows the settings", () => {
    let s = applyPatch(defaultSettings(SITES), { op: "setElement", site: "youtube", element: "comments", hidden: true });
    s = applyPatch(s, { op: "setSiteEnabled", site: "reddit", enabled: false });
    s = applyPatch(s, { op: "setMode", site: "x", mode: "tuned" });
    const text = zenList(s, SITES, AT).text;
    expect(text).toContain("##ytd-comments#comments");
    expect(text).not.toContain("www.reddit.com");
    const xFeed = (siteMap().x as SiteRule).elements.find((e) => e.feed)!;
    for (const sel of xFeed.selectors) expect(text).not.toContain(`##${sel}\n`);
  });

  it("never writes a protected element's selector", () => {
    const text = zenList(defaultSettings(SITES), SITES, AT).text;
    for (const site of SITES) {
      for (const p of site.protected ?? []) expect(lines(text)).not.toContain(`${site.hosts.join(",")}##${p.selector}`);
    }
  });

  it("never writes a selector that adblock syntax would read as more than a hide rule", () => {
    const bad = ['div[title="x\n@@||*^$document"]', "+js(alert)", "^script", "a##b", "div:style(color:red)", "x { }", "!comment", "@@||x"];
    const rule = { ...(siteMap().youtube as SiteRule), elements: [{ id: "home", label: "x", group: "g", class: "algorithmic" as const, selectors: bad }] };
    const list = zenList(defaultSettings(SITES), [rule], AT);
    expect(list.rules).toBe(0);
    expect(list.skipped).toEqual(["youtube.home"]);
  });

  it("is stable for the same input", () => {
    expect(zenList(defaultSettings(SITES), SITES, AT)).toEqual(zenList(defaultSettings(SITES), SITES, AT));
  });
});
