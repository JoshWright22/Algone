import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, posix, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

const DIST = "apps/website/dist";
const built = existsSync(join(DIST, "index.html"));

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const files = () => walk(DIST);
const htmlFiles = () => files().filter((f) => f.endsWith(".html"));
const read = (f: string) => readFileSync(f, "utf8");
const isExternal = (ref: string) => /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(ref);
const refs = (html: string) => [...html.matchAll(/\s(?:href|src)="([^"]*)"/g)].map((m) => m[1]);

/** The built file a relative reference points at, or null if it leaves dist. */
function target(from: string, ref: string): string | null {
  const path = decodeURIComponent(ref.split(/[?#]/)[0]);
  if (!path) return from;
  const dir = relative(DIST, dirname(from)).split(sep).join("/") || ".";
  const joined = posix.normalize(posix.join(dir, path));
  if (joined.startsWith("..")) return null;
  return join(DIST, path.endsWith("/") ? posix.join(joined, "index.html") : joined);
}

describe.runIf(built)("built website", () => {
  it.each([
    "index.html", "install/index.html", "how-it-works/index.html", "sites/index.html",
    "privacy/index.html", "support/index.html", "ledger/index.html", "uninstalled/index.html",
    "rules/v1/rules.json", "fonts/Inter.woff2", "fonts/Newsreader.woff2",
  ])("has %s", (f) => {
    expect(existsSync(join(DIST, f))).toBe(true);
  });

  it("every internal href and src resolves to a built file", () => {
    const missing: string[] = [];
    for (const f of htmlFiles()) {
      for (const ref of refs(read(f))) {
        if (isExternal(ref)) continue;
        const file = target(f, ref);
        if (!file || !existsSync(file) || !statSync(file).isFile()) missing.push(`${f}: ${ref}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("uses relative links, which work under the /Algone/ base path", () => {
    const rooted = htmlFiles().flatMap((f) => refs(read(f)).filter((r) => /^\/(?!\/)/.test(r)).map((r) => `${f}: ${r}`));
    expect(rooted).toEqual([]);
  });

  it("every in-page anchor has a target", () => {
    const missing: string[] = [];
    for (const f of htmlFiles()) {
      for (const ref of refs(read(f))) {
        if (isExternal(ref) || !ref.includes("#")) continue;
        const [, id] = ref.split("#");
        const page = target(f, ref);
        if (page && !read(page).includes(`id="${id}"`)) missing.push(`${f}: ${ref}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("loads scripts only from its own files", () => {
    for (const f of htmlFiles()) {
      const scripts = [...read(f).matchAll(/<script\b[^>]*>/g)].map((m) => m[0]);
      expect(scripts.length).toBeGreaterThan(0);
      for (const tag of scripts) {
        const src = tag.match(/\ssrc="([^"]*)"/)?.[1];
        expect(src, `${f}: inline script`).toBeTruthy();
        expect(isExternal(src as string), `${f}: ${src}`).toBe(false);
      }
    }
  });

  it("loads no asset over http:// and no third-party asset", () => {
    for (const f of htmlFiles()) {
      const html = read(f);
      expect(html).not.toMatch(/\s(?:src|href)="http:\/\//);
      for (const tag of html.matchAll(/<(?:img|link|source|iframe|video|audio)\b[^>]*>/g)) {
        const ref = tag[0].match(/\s(?:src|href)="([^"]*)"/)?.[1] ?? "";
        expect(isExternal(ref), `${f}: ${tag[0]}`).toBe(false);
      }
    }
    for (const f of files().filter((x) => x.endsWith(".css"))) {
      for (const m of read(f).matchAll(/url\(["']?([^"')]+)/g)) {
        expect(isExternal(m[1]), `${f}: ${m[1]}`).toBe(false);
        expect(existsSync(join(dirname(f), m[1])), `${f}: ${m[1]}`).toBe(true);
      }
    }
  });

  it("makes no banned claims", () => {
    const text = htmlFiles().map(read).join("\n");
    expect(text).not.toMatch(/seamless|effortless|disable the algorithm|screen time/i);
    expect(text).not.toMatch(/\baccessibility\b/i);
    expect(text).not.toMatch(/available (?:now )?(?:on|in) the/i);
  });

  it("says the required limits on home and install", () => {
    for (const f of ["index.html", "install/index.html"]) {
      const text = read(join(DIST, f)).replace(/<[^>]+>/g, " ");
      expect(text).toMatch(/works in the browser/);
      expect(text).toMatch(/uninstall/i);
      expect(text).toMatch(/pending/i);
    }
  });

  it("the uninstall page links to the plain feedback form", () => {
    const html = read(join(DIST, "uninstalled/index.html"));
    expect(html).toContain('href="https://github.com/JoshWright22/Algone/issues/new?template=uninstall-feedback.yml"');
  });
});
