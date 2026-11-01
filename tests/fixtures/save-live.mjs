// Saves reduced copies of public pages: real structure, no text, no scripts.
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { KEEP_ATTRS, snapshotInPage, toHtml } from "../live/sanitize.mjs";

const PAGES = [
  ["youtube", "home", "https://www.youtube.com/"],
  ["youtube", "watch", "https://www.youtube.com/watch?v=dQw4w9WgXcQ"],
  ["youtube", "results", "https://www.youtube.com/results?search_query=music"],
  ["reddit", "popular", "https://www.reddit.com/r/popular/"],
  ["reddit", "sub", "https://www.reddit.com/r/programming/"],
  ["tiktok", "home", "https://www.tiktok.com/"],
  ["tiktok", "explore", "https://www.tiktok.com/explore"],
  ["bluesky", "home", "https://bsky.app/"],
  ["twitch", "home", "https://www.twitch.tv/"],
  ["pinterest", "ideas", "https://www.pinterest.com/ideas/"],
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: "en-US" });
for (const [site, name, url] of PAGES) {
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await p.waitForTimeout(6000);
  const tree = await p.evaluate(snapshotInPage, { keep: KEEP_ATTRS, loggedIn: false });
  mkdirSync(`tests/fixtures/${site}`, { recursive: true });
  const stamp = `<!-- saved from ${url} on ${new Date().toISOString().slice(0, 10)}; text and scripts removed -->`;
  writeFileSync(
    `tests/fixtures/${site}/${name}.html`,
    `${stamp}\n<!doctype html><html><head><title>Fixture</title></head>${toHtml(tree)}</html>\n`,
  );
  console.log(site, name);
  await p.close();
}
await browser.close();
