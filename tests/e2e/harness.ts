import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium, test as base, type BrowserContext, type Page, type Worker } from "@playwright/test";

const EXT = resolve("apps/extension/dist-test/chrome");

export interface Harness {
  context: BrowserContext;
  worker: Worker;
  id: string;
}

export const FIXTURES: Record<string, Record<string, string>> = {
  "www.youtube.com": {
    "/": "youtube/home", "/watch": "youtube/watch", "/results": "youtube/results",
    "/feed/subscriptions": "youtube/home", "/shorts/abc": "youtube/home",
  },
  "www.reddit.com": { "/r/popular/": "reddit/popular", "/r/programming/": "reddit/sub", "/": "reddit/popular" },
  "x.com": { "/home": "x/home" },
  "www.instagram.com": { "/": "instagram/home" },
  "www.facebook.com": { "/": "facebook/home" },
  "www.linkedin.com": { "/feed/": "linkedin/feed" },
  "www.tiktok.com": { "/": "tiktok/home", "/explore": "tiktok/explore" },
  "www.threads.com": { "/": "threads/home" },
  "bsky.app": { "/": "bluesky/home" },
  "www.twitch.tv": { "/": "twitch/home" },
  "www.pinterest.com": { "/ideas/": "pinterest/ideas" },
  "substack.com": { "/": "substack/home" },
  "news.ycombinator.com": { "/": "hackernews/home", "/newest": "hackernews/newest", "/item": "hackernews/item" },
  "github.com": { "/trending": "github/trending", "/explore": "github/explore", "/torvalds/linux": "github/repo" },
  "www.abc.net.au": { "/": "abcnews/home", "/news/for-you": "abcnews/foryou" },
  "www.tumblr.com": { "/": "tumblr/home", "/explore/trending": "tumblr/explore" },
  "www.quora.com": { "/What-is-the-best-programming-language-10": "quora/question" },
  "medium.com": { "/tag/programming": "medium/tag" },
  "kick.com": { "/": "kick/home", "/destiny": "kick/channel" },
};

export function fixture(name: string): string {
  const file = join("tests/fixtures", `${name}.html`);
  return existsSync(file) ? readFileSync(file, "utf8") : "<!doctype html><html><body></body></html>";
}

export async function routeFixtures(context: BrowserContext, extra?: (url: URL) => string | null): Promise<void> {
  await context.route(/^https:\/\/[^/]*(youtube|reddit|x|instagram|facebook|linkedin|tiktok|threads|bsky|twitch|pinterest|substack|ycombinator|github|abc|tumblr|quora|medium|kick)\.[a-z.]+\//, (route) => {
    const url = new URL(route.request().url());
    if (route.request().resourceType() !== "document") return route.fulfill({ status: 204, body: "" });
    const custom = extra?.(url);
    const name = custom ?? FIXTURES[url.hostname]?.[url.pathname];
    return route.fulfill({
      status: 200,
      contentType: "text/html",
      body: custom?.startsWith("<") ? custom : fixture(name ?? ""),
    });
  });
  // No test ever reaches the real rules URL or any other host.
  await context.route("https://joshwright22.github.io/**", (r) => r.fulfill({ status: 404, body: "" }));
}

export const test = base.extend<{ h: Harness }>({
  // eslint-disable-next-line no-empty-pattern
  h: async ({}, use) => {
    const context = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), "algone-")), {
      channel: "chromium",
      headless: true,
      args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
      viewport: { width: 1280, height: 800 },
    });
    await routeFixtures(context);
    let worker = context.serviceWorkers()[0];
    if (!worker) worker = await context.waitForEvent("serviceworker");
    const id = worker.url().split("/")[2]!;
    // Wait for install, and close the welcome tab so tests start clean.
    await worker.evaluate(async () => {
      for (let i = 0; i < 50; i++) {
        const s = await chrome.storage.local.get("settings");
        if (s.settings) return;
        await new Promise((r) => setTimeout(r, 50));
      }
    });
    await use({ context, worker, id });
    await context.close();
  },
});

export const expect = test.expect;

export async function sendCmd(h: Harness, page: Page, cmd: object): Promise<unknown> {
  return page.evaluate((c) => chrome.runtime.sendMessage(c), cmd);
}

export async function extPage(h: Harness, path: string): Promise<Page> {
  const page = await h.context.newPage();
  await page.goto(`chrome-extension://${h.id}/${path}`);
  return page;
}

export async function setStorage(h: Harness, data: Record<string, unknown>): Promise<void> {
  await h.worker.evaluate((d) => chrome.storage.local.set(d), data);
}

export async function getStorage<T = Record<string, any>>(h: Harness, key: string): Promise<T> {
  return (await h.worker.evaluate((k) => chrome.storage.local.get(k), key))[key] as T;
}

/** True if the element exists and cannot be seen: no space, or moved off-screen (Healthy mode). */
export const isHiddenEl = (page: Page, selector: string) =>
  page.evaluate((s) => {
    const e = document.querySelector(s);
    return !!e && (e.getClientRects().length === 0 || e.getBoundingClientRect().right <= 0);
  }, selector);

export const isVisibleEl = (page: Page, selector: string) =>
  page.evaluate((s) => {
    const e = document.querySelector(s);
    if (!e) return false;
    let n: Element | null = e;
    while (n) {
      if (getComputedStyle(n).display === "none") return false;
      n = n.parentElement;
    }
    return true;
  }, selector);

export async function waitAttrs(page: Page): Promise<void> {
  await page.waitForFunction(() => document.documentElement.hasAttribute("data-algone-show"));
}
