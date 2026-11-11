// Checks the healthy feed on the real sites, logged out: does Algone read items from the
// hidden feed, and does it pick a batch? Prints one line per site.
//   node tests/live/healthy.mjs [--site youtube] [--profile <dir>]
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { chromium } from "playwright";
import { loadSites } from "./sites.mjs";

const { values: args } = parseArgs({ options: { site: { type: "string" }, profile: { type: "string" }, wait: { type: "string", default: "10000" } } });
const EXT = resolve("apps/extension/dist-test/chrome");
if (!existsSync(EXT)) {
  console.error("Build first: node apps/extension/scripts/build.mjs --target chrome --test --out-dir apps/extension/dist-test");
  process.exit(2);
}
const sites = loadSites().filter((s) => !args.site || s.id === args.site);
const context = await chromium.launchPersistentContext(args.profile ?? mkdtempSync(join(tmpdir(), "algone-healthy-")), {
  channel: "chromium",
  headless: false,
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, "--window-position=-2400,0"],
  viewport: { width: 1280, height: 900 },
});
let worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
await new Promise((r) => setTimeout(r, 1500));
for (const p of context.pages()) if (p.url().includes("welcome")) await p.close();

for (const site of sites) {
  const page = await context.newPage();
  const home = site.probes?.find((p) => p.expect?.some((e) => site.elements.find((el) => el.id === e)?.feed))?.path ?? "/";
  let line;
  try {
    await page.goto(`https://${site.hosts[0]}${home}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(Number(args.wait));
    const healthy = await worker.evaluate((id) => chrome.storage.local.get("healthy").then(({ healthy }) => ({
      pool: healthy?.pools?.[id]?.items?.length ?? 0,
      batch: healthy?.batches?.[id]?.items?.map((i) => `${i.title.slice(0, 30)} <${new URL(i.url).pathname.slice(0, 40)}>`) ?? [],
    })), site.id);
    const dom = await page.evaluate((sel) => {
      try {
        return { items: document.querySelectorAll(sel).length, panel: !!document.querySelector('iframe[data-algone-panel="feed"]'), attr: document.documentElement.getAttribute("data-algone-healthy") };
      } catch { return { items: -1, panel: false, attr: null }; }
    }, site.tuned?.item ?? "x");
    const wall = site.walls?.length ? await page.evaluate((w) => w.some((s) => { try { return !!document.querySelector(s); } catch { return false; } }), site.walls) : false;
    line = `${site.id.padEnd(10)} items-on-page=${dom.items} pool=${healthy.pool} batch=${healthy.batch.length} panel=${dom.panel} healthy=${dom.attr}${wall ? " WALL" : ""} ${healthy.batch.slice(0, 2).map((t) => JSON.stringify(t)).join(" ")}`;
  } catch (e) {
    line = `${site.id.padEnd(10)} error ${String(e).slice(0, 100)}`;
  }
  console.log(line);
  await page.close();
}
await context.close();
