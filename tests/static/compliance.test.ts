import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { COPY } from "../../packages/core/src/copy";

const DIST = "apps/extension/dist";
const built = existsSync(join(DIST, "chrome/manifest.json"));

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}
const manifest = (t: string) => JSON.parse(readFileSync(join(DIST, t, "manifest.json"), "utf8"));
const sources = () =>
  ["packages/core/src", "packages/engine/src", "packages/rules/src", "apps/extension/src"]
    .flatMap(walk)
    .filter((f) => f.endsWith(".ts"));

describe.runIf(built)("built extension", () => {
  it.each(["chrome", "edge", "firefox", "safari"])("%s has minimal permissions", (t) => {
    const m = manifest(t);
    expect(m.manifest_version).toBe(3);
    expect(m.permissions).toEqual(["storage", "alarms", "scripting"]);
    expect(m.optional_host_permissions).toEqual(["https://en.wikipedia.org/*"]);
    const text = JSON.stringify(m);
    for (const bad of ["<all_urls>", "*://*/*", "https://*/*", "webRequest", "tabs\"", "management", "history"]) {
      expect(text).not.toContain(bad);
    }
    for (const h of m.host_permissions) expect(h).toMatch(/^https:\/\/[a-z.]+\/\*$/);
  });
  it("Firefox declares no data collection, and its version floors", () => {
    const g = manifest("firefox").browser_specific_settings;
    expect(g.gecko.id).toBe("algone@joshwright22.github.io");
    expect(g.gecko.data_collection_permissions).toEqual({ required: ["none"] });
    expect(g.gecko.strict_min_version).toBe("140.0");
    expect(g.gecko_android.strict_min_version).toBe("142.0");
  });
  it("output has no dynamic code or remote scripts", () => {
    for (const t of ["chrome", "firefox", "safari"]) {
      for (const f of walk(join(DIST, t)).filter((x) => /\.(js|html)$/.test(x))) {
        const text = readFileSync(f, "utf8");
        expect(text, f).not.toMatch(/\beval\s*\(/);
        expect(text, f).not.toMatch(/new\s+Function\s*\(/);
        expect(text, f).not.toMatch(/\.innerHTML\s*=/);
        expect(text, f).not.toMatch(/\.outerHTML\s*=/);
        expect(text, f).not.toMatch(/document\.write/);
        expect(text, f).not.toMatch(/<script[^>]+src=["']https?:/);
      }
    }
  });
  it("Safari has no tip link, the others can", () => {
    const opt = (t: string) => readFileSync(join(DIST, t, "options.js"), "utf8");
    const tipCode = /id: "tips"/;
    expect(opt("safari")).not.toMatch(/"tips"\b.*GitHub Sponsors/s);
    expect(opt("chrome")).toMatch(tipCode);
  });
  it("icons meet the store rule", () => {
    expect(existsSync(join(DIST, "chrome/icons/icon-128.png"))).toBe(true);
  });
});

describe("source", () => {
  it("uses no dynamic code or HTML strings", () => {
    for (const f of sources()) {
      const text = readFileSync(f, "utf8");
      expect(text, f).not.toMatch(/\beval\(|new Function\(|innerHTML|insertAdjacentHTML/);
    }
  });
  it("contains no telemetry or analytics", () => {
    for (const f of sources()) {
      expect(readFileSync(f, "utf8").toLowerCase(), f).not.toMatch(/analytics|telemetry|mixpanel|sentry|gtag/);
    }
  });
});

describe("copy", () => {
  it("states the limits", () => {
    expect(COPY.uninstall).toContain("You can always uninstall Algone");
    expect(COPY.browserOnly).toContain("does not change");
    expect(COPY.likelyAi).toContain("will miss some");
  });
  it("makes no banned claims anywhere in the product", () => {
    const banned = [/can.?t be (removed|uninstalled)/i, /impossible to bypass/i, /blocks? reels in the .*app/i, /disable the algorithm/i];
    for (const f of sources()) for (const re of banned) expect(readFileSync(f, "utf8"), f).not.toMatch(re);
  });
});

describe("live checks", () => {
  it("cover every site", () => {
    const dir = "packages/rules/sites";
    for (const f of readdirSync(dir)) {
      const site = JSON.parse(readFileSync(join(dir, f), "utf8"));
      expect(site.probes.some((p: { live: boolean }) => p.live), f).toBe(true);
    }
  });
});

describe("ledger", () => {
  it("is well formed, and holds no donor names", () => {
    const entries = JSON.parse(readFileSync("ledger/entries.json", "utf8"));
    expect(Array.isArray(entries)).toBe(true);
    for (const e of entries) {
      expect(Object.keys(e).sort()).toEqual(["amount", "currency", "date", "kind", "note"]);
      expect(["donation", "cost"]).toContain(e.kind);
      expect(e.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(typeof e.amount).toBe("number");
    }
  });
});
