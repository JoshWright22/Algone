// Saves reduced copies of public pages: real structure, no text, no scripts.
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, devices } from "playwright";
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
  ["hackernews", "home", "https://news.ycombinator.com/"],
  ["hackernews", "newest", "https://news.ycombinator.com/newest"],
  ["hackernews", "item", "https://news.ycombinator.com/item?id=50493062"],
  ["github", "trending", "https://github.com/trending"],
  ["github", "explore", "https://github.com/explore"],
  ["github", "repo", "https://github.com/torvalds/linux"],
  ["abcnews", "home", "https://www.abc.net.au/"],
  ["abcnews", "foryou", "https://www.abc.net.au/news/for-you"],
  ["tumblr", "home", "https://www.tumblr.com/"],
  ["tumblr", "explore", "https://www.tumblr.com/explore/trending"],
  ["kick", "home", "https://kick.com/"],
  ["kick", "channel", "https://kick.com/destiny"],
  // Quora and Medium serve a bot check to desktop headless browsers, so these use a phone.
  ["quora", "question", "https://www.quora.com/What-is-the-best-programming-language-10", "mobile"],
  ["medium", "tag", "https://medium.com/tag/programming", "mobile"],];

// `node tests/fixtures/save-live.mjs kick medium` saves only those sites.
const only = process.argv.slice(2);
const browser = await chromium.launch();
const desktop = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: "en-US" });
const phone = await browser.newContext({ ...devices["iPhone 15"], locale: "en-US" });
for (const [site, name, url, device] of PAGES) {
  if (only.length && !only.includes(site)) continue;
  const ctx = device === "mobile" ? phone : desktop;
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
