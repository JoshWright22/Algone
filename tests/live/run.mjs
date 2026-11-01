// Checks rules against the real sites. Results are pass, broken, or inconclusive.
//   npm run test:live                     logged out
//   npm run check:logged-in -- --profile <dir>   a profile you signed in to, on your machine
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { chromium, devices } from "playwright";
import { KEEP_ATTRS, snapshotInPage } from "./sanitize.mjs";
import { loadSites } from "./sites.mjs";

const { values: args } = parseArgs({
  options: {
    "logged-in": { type: "boolean", default: false },
    profile: { type: "string" },
    out: { type: "string", default: "test-results/live" },
    site: { type: "string" },
    "simulate-break": { type: "string" },
  },
});

const EXT = resolve("apps/extension/dist-test/chrome");
if (!existsSync(EXT)) {
  console.error("Build first: node apps/extension/scripts/build.mjs --target chrome --test --out-dir apps/extension/dist-test");
  process.exit(2);
}
const loggedIn = args["logged-in"];
if (loggedIn && !args.profile) {
  console.error("--logged-in needs --profile <dir>, a browser profile you have signed in to.");
  process.exit(2);
}

const sites = loadSites().filter((s) => !args.site || s.id === args.site);
mkdirSync(args.out, { recursive: true });

const anyMatch = (page, selectors) =>
  page.evaluate((list) => list.some((s) => {
    try { return !!document.querySelector(s); } catch { return false; }
  }), selectors);

const visible = (page, selectors) =>
  page.evaluate((list) => list.some((s) => {
    try {
      return [...document.querySelectorAll(s)].some((e) => e.getClientRects().length > 0);
    } catch { return false; }
  }), selectors);

async function open(context, url) {
  const page = await context.newPage();
  try {
    const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(5000);
    return { page, status: res?.status() ?? 0 };
  } catch (e) {
    return { page, status: 0, error: String(e).slice(0, 120) };
  }
}

async function runProbe(site, probe, ctxPlain, ctxExt) {
  const url = `https://${site.hosts[0]}${probe.path}`;
  const plain = await open(ctxPlain, url);
  const wall = site.walls.length ? await anyMatch(plain.page, site.walls) : false;
  if (plain.error || plain.status >= 400 || plain.status === 0 || wall) {
    const reason = plain.error ?? (wall ? "login or bot wall" : `HTTP ${plain.status}`);
    await plain.page.close();
    return { path: probe.path, outcome: "inconclusive", reason };
  }
  const problems = [];
  for (const id of probe.expect) {
    const el = site.elements.find((e) => e.id === id);
    const selectors = el.selectors.map((s) => (args["simulate-break"] === site.id ? `${s}-simulated-break` : s));
    if (!(await anyMatch(plain.page, selectors))) problems.push(`${id}: no selector matches`);
  }
  const hidden = await open(ctxExt, url);
  for (const id of probe.expect) {
    const el = site.elements.find((e) => e.id === id);
    if (el.class === "algorithmic" && (await visible(hidden.page, el.selectors))) {
      problems.push(`${id}: still visible with Algone on`);
    }
  }
  for (const p of site.protected) {
    if (p.path !== probe.path) continue;
    const present = await anyMatch(plain.page, [p.selector]);
    if (present && !(await visible(hidden.page, [p.selector]))) problems.push(`${p.label}: hidden by Algone`);
  }
  let snapshot;
  if (problems.length) {
    snapshot = await plain.page.evaluate(snapshotInPage, { keep: KEEP_ATTRS, loggedIn });
  }
  await plain.page.close();
  await hidden.page.close();
  return { path: probe.path, outcome: problems.length ? "broken" : "pass", reason: problems.join("; "), snapshot };
}

const launch = (profile, ext, device) => {
  const dir = profile ?? mkdtempSync(join(tmpdir(), "algone-live-"));
  return chromium.launchPersistentContext(dir, {
    channel: "chromium",
    headless: !profile,
    ...(device ?? { viewport: { width: 1366, height: 900 } }),
    locale: "en-US",
    args: ext ? [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`] : [],
  });
};

const results = {};
for (const device of [null, devices["iPhone 15"]]) {
  const name = device ? "mobile" : "desktop";
  const plain = await launch(args.profile, false, device);
  const ext = await launch(args.profile ? `${args.profile}-ext` : undefined, true, device);
  for (const site of sites) {
    const hostIsMobileAware = site.probes.filter((p) => (p.viewport ?? "desktop") === name || !device);
    for (const probe of device ? [] : hostIsMobileAware) {
      if (!probe.live && !loggedIn) continue;
      const r = await runProbe(site, probe, plain, ext);
      if (r.snapshot) {
        writeFileSync(join(args.out, `${site.id}-${name}.json`), JSON.stringify(r.snapshot));
        delete r.snapshot;
      }
      (results[site.id] ??= []).push({ ...r, viewport: name });
      console.log(`${r.outcome.padEnd(13)} ${site.id} ${name} ${probe.path} ${r.reason ?? ""}`);
    }
  }
  await plain.close();
  await ext.close();
}

const summary = {
  date: new Date().toISOString(),
  loggedIn,
  sites: Object.fromEntries(sites.map((s) => {
    const list = results[s.id] ?? [];
    const outcome = list.some((r) => r.outcome === "broken")
      ? "broken"
      : list.some((r) => r.outcome === "pass")
        ? "pass"
        : list.length ? "inconclusive" : "not-checked";
    return [s.id, { outcome, tier: s.tier, method: s.verified.method, probes: list }];
  })),
};
writeFileSync(join(args.out, "results.json"), JSON.stringify(summary, null, 2));
const broken = Object.entries(summary.sites).filter(([, v]) => v.outcome === "broken").map(([k]) => k);
console.log(`broken: ${broken.join(", ") || "none"}`);
