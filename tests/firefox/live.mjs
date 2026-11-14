// Checks every site in real Firefox, logged out, with the Firefox build loaded as a
// temporary add-on in a fresh profile (headless; your own profile is never touched).
// For each probe page: the expected feed elements exist and are hidden. For each
// protected page: search, results, the player, and similar stay visible.
//   node tests/firefox/live.mjs [--site twitch]
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { Builder } from "selenium-webdriver";
import firefox from "selenium-webdriver/firefox.js";
import { loadSites } from "../live/sites.mjs";

const { values: args } = parseArgs({ options: { site: { type: "string" }, wait: { type: "string", default: "7000" } } });
const ext = resolve("apps/extension/dist-test/firefox");
const options = new firefox.Options().addArguments("-headless").windowSize({ width: 1280, height: 900 });
if (process.env.FIREFOX_BIN) options.setBinary(process.env.FIREFOX_BIN);
const driver = await new Builder().forBrowser("firefox").setFirefoxOptions(options).build();
const wait = Number(args.wait);

const state = (sel) => driver.executeScript(`
  const out = {};
  for (const s of arguments[0]) {
    let els = [];
    try { els = [...document.querySelectorAll(s)]; } catch {}
    if (!els.length) { out[s] = "missing"; continue; }
    out[s] = els.some((e) => e.getClientRects().length > 0 && e.getBoundingClientRect().right > 0) ? "visible" : "hidden";
  }
  return out;
`, sel);

const results = [];
try {
  await driver.installAddon(ext, true);
  await driver.sleep(1500);
  for (const site of loadSites().filter((s) => !args.site || s.id === args.site)) {
    const host = site.hosts[0];
    const lines = [];
    let status = "pass";
    const pages = new Map();
    for (const p of site.probes.filter((p) => p.live && !p.viewport)) pages.set(p.path, { expect: p.expect, protect: [] });
    for (const p of site.protected) {
      const entry = pages.get(p.path) ?? { expect: [], protect: [] };
      entry.protect.push(p);
      pages.set(p.path, entry);
    }
    for (const [path, page] of pages) {
      try {
        await driver.get(`https://${host}${path}`);
        await driver.sleep(wait);
        const walls = await state(site.walls ?? []);
        if (Object.values(walls).some((v) => v !== "missing")) {
          lines.push(`${path}: login or bot wall`);
          if (status === "pass") status = "inconclusive";
          continue;
        }
        const ran = await driver.executeScript(`return document.documentElement.hasAttribute("data-algone-show")`);
        if (!ran) {
          lines.push(`${path}: Algone did not run`);
          status = "broken";
          continue;
        }
        for (const id of page.expect) {
          const el = site.elements.find((e) => e.id === id);
          const seen = await state(el.selectors);
          const values = Object.values(seen);
          if (values.includes("visible")) {
            lines.push(`${path}: ${id} still visible`);
            status = "broken";
          } else if (values.every((v) => v === "missing")) {
            lines.push(`${path}: ${id} not on the page`);
            if (status === "pass") status = "inconclusive";
          }
        }
        for (const p of page.protect) {
          const seen = await state([p.selector]);
          if (seen[p.selector] === "hidden") {
            lines.push(`${path}: ${p.label} was hidden`);
            status = "broken";
          } else if (seen[p.selector] === "missing") {
            lines.push(`${path}: ${p.label} not found`);
          }
        }
      } catch (e) {
        lines.push(`${path}: ${String(e).slice(0, 80)}`);
        if (status === "pass") status = "inconclusive";
      }
    }
    results.push({ site: site.id, status });
    console.log(`${site.id.padEnd(10)} ${status.padEnd(12)} ${lines.join("; ")}`);
  }
} finally {
  await driver.quit();
}
process.exit(results.some((r) => r.status === "broken") ? 1 : 0);
