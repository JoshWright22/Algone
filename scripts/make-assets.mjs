// Generates store icons, tiles, and screenshots. Run with `npm run assets`.
// Screenshots come from the real extension test build, loaded in Chromium.
// The Random shot uses a plain placeholder page, and the popup shot places the real
// popup on a plain backdrop. Neither shows anything a real user would not see from Algone.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const OUT = "store/assets";
const SHOTS = "store/screenshots";
const EXT = resolve("apps/extension/dist-test/chrome");

const iconSvg = readFileSync("assets/icon.svg", "utf8");
const inter = readFileSync("apps/extension/public/fonts/Inter.woff2").toString("base64");

/** Same mark on a full square, for stores that round the corners themselves. */
const fullBleedSvg = iconSvg
  .replace('<rect width="96" height="96" rx="22" fill="#14141c"/>', '<rect width="96" height="96" fill="#14141c"/>')
  .replace(/\s*<rect x="\.75"[^>]*\/>/, "");

const write = async (input, file) => {
  mkdirSync(dirname(file), { recursive: true });
  await sharp(input).png().toFile(file);
};
/** Stores want 24-bit PNG with no alpha for screenshots, tiles, and the App Store icon. */
const opaque = (input) => sharp(input).flatten({ background: "#0b0b0f" }).removeAlpha().png().toBuffer();

async function paddedIcon(size, file) {
  const inner = Math.round((size * 96) / 128);
  const art = await sharp(Buffer.from(iconSvg), { density: 900 }).resize(inner, inner).png().toBuffer();
  const canvas = sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } });
  await write(await canvas.composite([{ input: art }]).png().toBuffer(), file);
}

const fullIcon = (size) => sharp(Buffer.from(fullBleedSvg), { density: 1200 }).resize(size, size).png().toBuffer();

/** A feed of blank rows with one violet line through it: the mark's idea, at tile scale. */
function feedArt() {
  const rows = [78, 100, 62, 90].map((w) => `<div class="row" style="width:${w}%"><i></i><b></b></div>`).join("");
  return `<div class="art"><div class="rows">${rows}</div><div class="strike"></div></div>`;
}

function tileHtml({ width, height, mark, name, line, tag, gap, art }) {
  return `<!doctype html><meta charset="utf-8"><style>
    @font-face { font-family: Inter; src: url(data:font/woff2;base64,${inter}) format("woff2"); font-weight: 100 900; }
    * { box-sizing: border-box; margin: 0; }
    html, body { width: ${width}px; height: ${height}px; overflow: hidden; }
    body { background: radial-gradient(${Math.round(width * 0.62)}px ${Math.round(height * 1.1)}px at 78% 40%, oklch(.68 .17 264 / .2), transparent 70%), #0b0b0f;
      color: #f1f1f4; font-family: Inter, sans-serif; display: flex; align-items: center; gap: ${gap}px; padding: 0 ${Math.round(width * 0.07)}px; }
    .text { flex: none; width: ${art ? "54%" : "100%"}; }
    .mark { width: ${mark}px; height: ${mark}px; display: block; margin-bottom: ${Math.round(mark * 0.24)}px; }
    .mark svg { display: block; width: 100%; height: 100%; }
    h1 { font-size: ${name}px; line-height: 1; font-weight: 650; letter-spacing: -.035em; }
    p { font-size: ${line}px; line-height: 1.3; font-weight: 450; color: #c9c9d4; letter-spacing: -.012em; margin-top: ${Math.round(line * 0.65)}px; text-wrap: balance; }
    p.tag { font-size: ${tag}px; color: oklch(.78 .13 264); margin-top: ${Math.round(tag * 0.8)}px; font-weight: 500; letter-spacing: 0; }
    .art { position: relative; flex: 1; min-width: 0; }
    .rows { display: flex; flex-direction: column; gap: ${Math.round(height * 0.04)}px; }
    .row { display: flex; align-items: center; gap: ${Math.round(height * 0.03)}px; padding: ${Math.round(height * 0.03)}px; border: 1px solid #ffffff14; border-radius: 12px; background: #ffffff0a; }
    .row i { flex: none; width: ${Math.round(height * 0.085)}px; height: ${Math.round(height * 0.085)}px; border-radius: 8px; background: #ffffff14; }
    .row b { flex: 1; height: ${Math.round(height * 0.024)}px; border-radius: 99px; background: #ffffff14; }
    .strike { position: absolute; left: -4%; right: -4%; top: 36%; height: ${Math.max(6, Math.round(height * 0.024))}px; margin-top: ${-Math.round(height * 0.012)}px; border-radius: 99px; background: oklch(.68 .17 264); }
  </style><div class="text"><span class="mark">${iconSvg}</span><h1>Algone</h1>
  <p>Replace algorithmic feeds with something you control.</p>${tag ? `<p class="tag">Works in your browser</p>` : ""}</div>${art ? feedArt() : ""}`;
}

const LARGE = { mark: 96, name: 104, line: 36, tag: 24, gap: 64, art: true };
const FEATURE = { mark: 76, name: 78, line: 28, tag: 19, gap: 44, art: true };
const SMALL = { mark: 58, name: 44, line: 17, tag: 0, gap: 0, art: false };

async function renderTile(browser, spec, file) {
  const page = await browser.newPage({ viewport: { width: spec.width, height: spec.height } });
  await page.setContent(tileHtml(spec));
  await page.evaluate(() => document.fonts.ready);
  await write(await opaque(await page.screenshot()), file);
  await page.close();
}

/** The Random panel seeds on the hour. This hour picks a generated art item, so the shot is stable. */
const RANDOM_TIME = Date.UTC(2026, 10, 1, 12) + 87 * 3_600_000;

const SITE_PAGE = `<!doctype html><meta charset="utf-8"><title>Placeholder site</title><style>
  body { margin: 0; background: #121212; color: #a0a0ad; font: 14px system-ui, sans-serif; }
  header { display: flex; gap: 20px; align-items: center; padding: 14px 24px; border-bottom: 1px solid #ffffff14; }
  header span { flex: 1; max-width: 420px; margin: 0 auto; padding: 8px 14px; border: 1px solid #ffffff14; border-radius: 99px; }
</style><header><strong>A website</strong><span>Search</span><strong>Subscriptions</strong></header><ytd-page-manager></ytd-page-manager>`;

async function launch(scale = 1) {
  const context = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), "algone-assets-")), {
    channel: "chromium",
    headless: true,
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: scale,
  });
  await context.route(/^https?:\/\//, (route) => {
    const url = new URL(route.request().url());
    if (route.request().resourceType() !== "document") return route.fulfill({ status: 204, body: "" });
    const fixture = url.pathname === "/fixture";
    const body = fixture ? readFileSync("tests/fixtures/youtube/home.html", "utf8") : SITE_PAGE;
    return route.fulfill({ status: 200, contentType: "text/html", body });
  });
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
  const id = worker.url().split("/")[2];
  await worker.evaluate(async () => {
    for (let i = 0; i < 100; i++) {
      if ((await chrome.storage.local.get("settings")).settings) return;
      await new Promise((r) => setTimeout(r, 50));
    }
  });
  await new Promise((r) => setTimeout(r, 300));
  for (const p of context.pages()) await p.close();
  return { context, worker, id };
}

async function configure(h, change) {
  const { settings } = await h.worker.evaluate(() => chrome.storage.local.get("settings"));
  change(settings);
  await h.worker.evaluate((s) => chrome.storage.local.set({ settings: s }), settings);
}

async function extPage(h, path) {
  const page = await h.context.newPage();
  await page.goto(`chrome-extension://${h.id}/${path}`);
  await page.locator("#root > *").first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  return page;
}

const shoot = async (page, name) => {
  await page.mouse.move(0, 0);
  await page.waitForTimeout(250);
  await write(await opaque(await page.screenshot()), join(SHOTS, `${name}.png`));
};

const demoSites = (s) => {
  s.theme = "dark";
  s.sites.youtube.mode = "random";
  s.sites.reddit.mode = "tuned";
  s.sites.bluesky.mode = "custom";
  s.sites.pinterest.enabled = false;
};

const openSite = async (page, site) => {
  await page.locator(`[data-site="${site}"] .site-head`).click();
  await page.locator(`[data-site="${site}"] .site-body`).waitFor();
};

async function settingsShots(h) {
  await configure(h, demoSites);
  const sites = await extPage(h, "options.html#sites");
  await shoot(sites, "01-settings-sites");

  await configure(h, (s) => {
    s.sites.youtube.mode = "tuned";
    s.sites.youtube.tuned = {
      ...s.sites.youtube.tuned,
      blockKeywords: ["spoilers", "giveaway"],
      blockChannels: ["Loud Reaction Clips"],
      hideKinds: ["shorts", "likelyAi"],
    };
  });
  await sites.reload();
  await sites.locator(".site-card").first().waitFor();
  await openSite(sites, "youtube");
  const topics = sites.locator('#tuned-youtube [aria-label="Hide topics"] .chip');
  await topics.nth(1).click();
  await sites.locator('#tuned-youtube [aria-label="Hide topics"] .chip.on').first().waitFor();
  await sites.locator("#tuned-youtube").evaluate((f) => f.scrollIntoView({ block: "center" }));
  await shoot(sites, "05-tuned-filters");

  const general = await extPage(h, "options.html#general");
  await shoot(general, "07-barrier-settings");
  await general.close();
  await sites.close();
}

async function unlockShot(h) {
  const opts = await extPage(h, "options.html");
  const [unlock] = await Promise.all([
    h.context.waitForEvent("page", (p) => p.url().includes("unlock.html")),
    opts.evaluate(() => chrome.runtime.sendMessage({ t: "snooze", site: "youtube" })),
  ]);
  await unlock.locator(".count").waitFor();
  await unlock.evaluate(() => document.fonts.ready);
  await unlock.waitForTimeout(4200);
  await shoot(unlock, "02-unlock-pause");
  await unlock.locator("#never-mind").click();
  await opts.close();
}

async function randomShot(h) {
  await configure(h, (s) => (s.sites.youtube.mode = "random"));
  const page = await h.context.newPage();
  await page.clock.setFixedTime(RANDOM_TIME);
  await page.goto("https://www.youtube.com/");
  const frame = page.frameLocator('iframe[data-algone-panel="feed"]');
  await frame.locator("#random").waitFor();
  await page.waitForTimeout(400);
  await shoot(page, "04-random-panel");
  await page.close();
}

async function lightShot(h) {
  await configure(h, (s) => {
    s.theme = "light";
    s.sites.youtube.mode = "nofeed";
  });
  const page = await extPage(h, "options.html#sites");
  await openSite(page, "reddit");
  await shoot(page, "06-light-theme");
  await page.close();
}

/** The popup runs in a tab, with the site tab active, so it reads the site as it does for a user. */
async function popupPng() {
  const h = await launch(2);
  await configure(h, (s) => {
    s.theme = "dark";
    s.sites.youtube.mode = "random";
  });
  const site = await h.context.newPage();
  await site.goto("https://www.youtube.com/fixture");
  await site.waitForFunction(() => document.documentElement.hasAttribute("data-algone-show"));
  const popup = await extPage(h, "popup.html");
  await popup.setViewportSize({ width: 340, height: 600 }); // Chrome caps a popup at 600 px tall.
  await site.bringToFront();
  await h.worker.evaluate(() => chrome.storage.local.set({ assetsRefresh: Date.now() }));
  await popup.locator(".site h2").waitFor();
  await popup.evaluate(() => document.fonts.ready);
  const png = await popup.screenshot();
  await h.context.close();
  return png;
}

async function popupShot(browser, png) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.setContent(`<!doctype html><meta charset="utf-8"><style>
    @font-face { font-family: Inter; src: url(data:font/woff2;base64,${inter}) format("woff2"); font-weight: 100 900; }
    * { box-sizing: border-box; margin: 0; }
    body { width: 1280px; height: 800px; overflow: hidden; background: radial-gradient(620px 620px at 70% 50%, oklch(.68 .17 264 / .16), transparent 70%), #0b0b0f;
      color: #f1f1f4; font-family: Inter, sans-serif; display: flex; align-items: center; justify-content: center; gap: 88px; }
    div { width: 400px; }
    h1 { font-size: 40px; line-height: 1.15; font-weight: 650; letter-spacing: -.03em; }
    p { font-size: 18px; line-height: 1.45; color: #a0a0ad; margin-top: 14px; }
    img { width: 425px; height: 750px; border: 1px solid #ffffff14; border-radius: 12px; }
  </style><div><h1>Every element has its own switch</h1><p>The popup shows the site you are on. Hiding more is instant. Showing more waits 30 seconds by default.</p></div>
  <img src="data:image/png;base64,${png.toString("base64")}">`);
  await page.evaluate(() => document.fonts.ready);
  await write(await opaque(await page.screenshot()), join(SHOTS, "03-popup.png"));
  await page.close();
}

async function main() {
  execFileSync(process.execPath, ["scripts/make-icons.mjs"], { stdio: "inherit" });
  execFileSync(
    process.execPath,
    ["apps/extension/scripts/build.mjs", "--target", "chrome", "--test", "--out-dir", "apps/extension/dist-test"],
    { stdio: "inherit" },
  );
  rmSync(OUT, { recursive: true, force: true });
  rmSync(SHOTS, { recursive: true, force: true });

  await paddedIcon(128, join(OUT, "chrome/icon-128.png"));
  await paddedIcon(128, join(OUT, "firefox/icon-128.png"));
  await paddedIcon(300, join(OUT, "edge/logo-300x300.png"));
  await write(await opaque(await fullIcon(1024)), join(OUT, "app-store/icon-1024.png"));
  await write(await opaque(await fullIcon(512)), join(OUT, "play/icon-512.png"));

  const browser = await chromium.launch();
  const tiles = [
    [{ width: 440, height: 280, ...SMALL }, "chrome/promo-tile-440x280.png"],
    [{ width: 1400, height: 560, ...LARGE }, "chrome/marquee-1400x560.png"],
    [{ width: 440, height: 280, ...SMALL }, "edge/tile-440x280.png"],
    [{ width: 1400, height: 560, ...LARGE }, "edge/tile-1400x560.png"],
    [{ width: 1024, height: 500, ...FEATURE }, "play/feature-graphic-1024x500.png"],
  ];
  for (const [spec, file] of tiles) await renderTile(browser, spec, join(OUT, file));

  const h = await launch();
  await settingsShots(h);
  await unlockShot(h);
  await randomShot(h);
  await lightShot(h);
  await h.context.close();

  await popupShot(browser, await popupPng());
  await browser.close();
  console.log(`assets written to ${OUT} and ${SHOTS}`);
}

await main();
