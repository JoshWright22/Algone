import { publishRules, SITES } from "../../packages/rules/src/index";
import { expect, extPage, getStorage, isHiddenEl, isVisibleEl, setStorage, test, waitAttrs, type Harness } from "./harness";

async function configure(h: Harness, fn: (s: any) => void): Promise<void> {
  const settings = await getStorage(h, "settings");
  fn(settings);
  await setStorage(h, { settings });
}

async function frame(page: import("@playwright/test").Page, kind: string) {
  const el = page.locator(`iframe[data-algone-panel="${kind}"]`);
  await el.waitFor({ state: "attached" });
  return page.frameLocator(`iframe[data-algone-panel="${kind}"]`);
}

test("no feed mode has no panel", async ({ h }) => {
  await configure(h, (s) => (s.sites.youtube.mode = "nofeed"));
  const page = await h.context.newPage();
  await page.goto("https://www.youtube.com/");
  await waitAttrs(page);
  await page.waitForTimeout(200);
  expect(await page.locator("iframe[data-algone-panel]").count()).toBe(0);
});

test("random mode shows bundled content with attribution", async ({ h }) => {
  await configure(h, (s) => (s.sites.youtube.mode = "random"));
  const page = await h.context.newPage();
  await page.goto("https://www.youtube.com/");
  const f = await frame(page, "feed");
  await expect(f.locator("#random")).toBeVisible();
  await expect(f.locator("#random p").first()).not.toBeEmpty();
});

test("search-first home searches through the site", async ({ h }) => {
  await configure(h, (s) => {
    s.sites.youtube.intent.searchHome = true;
    s.sites.youtube.intent.prompt = true;
  });
  const page = await h.context.newPage();
  await page.goto("https://www.youtube.com/");
  const f = await frame(page, "feed");
  await expect(f.locator("#intent-prompt")).toHaveText("What do you want to watch?");
  await f.locator("#search").fill("cats");
  await f.locator("#search").press("Enter");
  await page.waitForURL("**/results?search_query=cats");
});

test("queue shows five, the rest behind one click, and saving is never blocked", async ({ h }) => {
  const queue = Array.from({ length: 7 }, (_, i) => ({
    id: String(i), url: `https://www.youtube.com/watch?v=${i}`, title: `Video ${i}`, site: "youtube", addedAt: i,
  }));
  await setStorage(h, { queue });
  await configure(h, (s) => (s.sites.youtube.intent.searchHome = true));
  const page = await h.context.newPage();
  await page.goto("https://www.youtube.com/");
  const f = await frame(page, "feed");
  await expect(f.locator("#queue a")).toHaveCount(5);
  await f.locator("#show-all").click();
  await expect(f.locator("#queue a")).toHaveCount(7);
});

test("save button on a watch page adds to the queue", async ({ h }) => {
  const page = await h.context.newPage();
  await page.goto("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  const f = await frame(page, "save");
  await f.locator("#save").click();
  await expect(f.locator("#save")).toHaveText("Saved");
  const queue = await getStorage<any[]>(h, "queue");
  expect(queue[0].url).toContain("dQw4w9WgXcQ");
});

test("stop at the end offers the queue and never autoplays", async ({ h }) => {
  await setStorage(h, {
    queue: [{ id: "1", url: "https://www.youtube.com/watch?v=next", title: "Next one", site: "youtube", addedAt: 1 }],
  });
  const page = await h.context.newPage();
  await page.goto("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  await waitAttrs(page);
  await page.waitForFunction(() => document.querySelector("video.html5-main-video") || true);
  await page.evaluate(() => {
    let v = document.querySelector("video.html5-main-video");
    if (!v) {
      v = document.createElement("video");
      v.className = "html5-main-video";
      document.body.append(v);
    }
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelector("video.html5-main-video")!.dispatchEvent(new Event("ended")));
  const f = await frame(page, "ended");
  await expect(f.locator("#next")).toContainText("Next one");
  await expect(f.locator("#done")).toBeVisible();
});

test("launch pause: leave is primary, shows once a tab session, stores no time", async ({ h }) => {
  await configure(h, (s) => (s.sites.youtube.intent.launchPause = true));
  const page = await h.context.newPage();
  await page.goto("https://www.youtube.com/");
  const f = await frame(page, "launch");
  await expect(f.locator("#leave")).toHaveClass(/primary/);
  await f.locator("#continue").click();
  await page.locator('iframe[data-algone-panel="launch"]').waitFor({ state: "detached" });
  expect(await page.evaluate(() => sessionStorage.getItem("algone-launch-passed"))).toBe("1");
  await page.reload();
  await waitAttrs(page);
  await page.waitForTimeout(200);
  expect(await page.locator('iframe[data-algone-panel="launch"]').count()).toBe(0);
});

test("subscriptions-first redirects home only", async ({ h }) => {
  await configure(h, (s) => (s.sites.youtube.intent.subsFirst = true));
  const page = await h.context.newPage();
  await page.goto("https://www.youtube.com/");
  await page.waitForURL("**/feed/subscriptions");
  await page.goto("https://www.youtube.com/results?search_query=x");
  await waitAttrs(page);
  expect(page.url()).toContain("/results");
});

test("tuned filters items by keyword, recheck on change, and reveals titleless items", async ({ h }) => {
  await configure(h, (s) => {
    s.sites.youtube.mode = "tuned";
    s.sites.youtube.tuned.blockKeywords = ["crypto"];
  });
  await h.context.unroute("https://joshwright22.github.io/**");
  const page = await h.context.newPage();
  await page.goto("https://www.youtube.com/");
  await waitAttrs(page);
  const result = await page.evaluate(async () => {
    const mk = (title: string) => {
      const item = document.createElement("ytd-rich-item-renderer");
      const t = document.createElement("div");
      t.id = "video-title";
      t.textContent = title;
      item.append(t);
      document.body.append(item);
      return item;
    };
    const a = mk("Crypto riches now");
    const b = mk("A calm walk");
    const c = mk("");
    await new Promise((r) => setTimeout(r, 300));
    const first = [a.hasAttribute("data-algone-filtered"), b.hasAttribute("data-algone-filtered"), c.hasAttribute("data-algone-seen")];
    b.querySelector("#video-title")!.textContent = "More crypto";
    document.body.append(document.createElement("i"));
    await new Promise((r) => setTimeout(r, 1300));
    document.body.append(document.createElement("i"));
    await new Promise((r) => setTimeout(r, 200));
    return { first, recheck: b.hasAttribute("data-algone-filtered"), revealed: c.hasAttribute("data-algone-seen") };
  });
  expect(result).toEqual({ first: [true, false, false], recheck: true, revealed: true });
});

test("rules: a published fix replaces a selector; a bad file changes nothing", async ({ h }) => {
  const pub = publishRules(SITES, 4_000_000_000);
  pub.sites.youtube!.elements.find((e) => e.id === "comments")!.selectors = ["ytd-new-comments"];
  await h.context.unroute("https://joshwright22.github.io/**");
  let body = "not json";
  await h.context.route("https://joshwright22.github.io/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body }));
  await h.worker.evaluate(() => (globalThis as any).__algone.checkRules());
  expect(await getStorage(h, "rulesOverlay")).toBeFalsy();
  expect((await getStorage(h, "runtime")).lastRuleError).toBeTruthy();

  body = JSON.stringify(pub);
  await h.worker.evaluate(() => (globalThis as any).__algone.checkRules());
  const overlay = await getStorage(h, "rulesOverlay");
  expect(overlay.sites.youtube.replaced).toEqual(["comments"]);

  await configure(h, (s) => (s.sites.youtube.elements.comments = true));
  const page = await h.context.newPage();
  await page.goto("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  await waitAttrs(page);
  await page.waitForFunction(() => document.documentElement.getAttribute("data-algone-off")?.includes("youtube.comments"));
  await page.evaluate(() => document.body.append(document.createElement("ytd-new-comments")));
  await page.waitForFunction(() => getComputedStyle(document.querySelector("ytd-new-comments")!).display === "none");
  // The old selector no longer applies.
  expect(await isVisibleEl(page, "ytd-comments#comments")).toBe(true);
});

test("rules: retiring an element undoes over-blocking", async ({ h }) => {
  const pub = publishRules(SITES, 4_000_000_000);
  pub.sites.youtube!.retired = ["sidebar"];
  await h.context.unroute("https://joshwright22.github.io/**");
  await h.context.route("https://joshwright22.github.io/**", (r) => r.fulfill({ status: 200, body: JSON.stringify(pub) }));
  await h.worker.evaluate(() => (globalThis as any).__algone.checkRules());
  const page = await h.context.newPage();
  await page.goto("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  await page.waitForFunction(() => document.documentElement.getAttribute("data-algone-off")?.includes("youtube.sidebar"));
  expect(await isVisibleEl(page, "ytd-watch-next-secondary-results-renderer")).toBe(true);
});

test("popup shows the current site and a toggle for every element", async ({ h }) => {
  const page = await h.context.newPage();
  await page.goto("https://www.youtube.com/");
  await waitAttrs(page);
  await page.bringToFront();
  const popup = await extPage(h, "popup.html");
  // A popup page opened as a tab has itself active, so it reports no site.
  await expect(popup.locator(".empty")).toContainText("not active");
  await expect(popup.locator(".empty")).toContainText("does not change the YouTube");
});

test("settings shows every site, with every element toggle", async ({ h }) => {
  const opts = await extPage(h, "options.html");
  await expect(opts.locator(".site-card")).toHaveCount(SITES.length);
  for (const site of SITES) {
    await opts.locator(`[data-site="${site.id}"] .site-head`).click();
    await expect(opts.locator(`[data-site="${site.id}"] [data-element]`)).toHaveCount(site.elements.length);
    await opts.locator(`[data-site="${site.id}"] .site-head`).click();
  }
});

test("welcome says uninstalling always works", async ({ h }) => {
  const page = await extPage(h, "welcome.html");
  await expect(page.locator("#limits")).toContainText("You can always uninstall Algone");
  await expect(page.locator("#limits")).toContainText("does not change the YouTube, Instagram, or TikTok apps");
});

test("custom mode lists a captured feed and fetched RSS, newest first", async ({ h }) => {
  await h.context.route("https://www.reddit.com/r/books/.rss", (r) =>
    r.fulfill({ status: 200, contentType: "application/atom+xml", body: `<feed><title>Books</title><entry><title>A book post</title><link href="https://www.reddit.com/r/books/1"/><updated>2026-10-30T10:00:00Z</updated></entry></feed>` }));
  await configure(h, (s) => (s.sites.youtube.mode = "custom"));
  const opts = await extPage(h, "options.html");
  await opts.evaluate(() => chrome.runtime.sendMessage({ t: "sourceAdd", url: "https://www.reddit.com/r/books/.rss", title: "Books", site: "reddit", kind: "rss" }));
  await opts.waitForTimeout(500);
  const page = await h.context.newPage();
  await page.goto("https://www.youtube.com/");
  const f = await frame(page, "feed");
  await expect(f.locator("#custom a")).toContainText("A book post");
  await expect(f.locator("#custom a")).toHaveAttribute("href", "https://www.reddit.com/r/books/1");
});

test("a page script cannot reach the queue inside the panel", async ({ h }) => {
  await setStorage(h, { queue: [{ id: "1", url: "https://www.youtube.com/watch?v=s", title: "Secret", site: "youtube", addedAt: 1 }] });
  await configure(h, (s) => (s.sites.youtube.intent.searchHome = true));
  const page = await h.context.newPage();
  await page.goto("https://www.youtube.com/");
  await frame(page, "feed");
  const read = await page.evaluate(() => {
    const f = document.querySelector("iframe[data-algone-panel]") as HTMLIFrameElement;
    try {
      return f.contentDocument?.body.textContent ?? "blocked";
    } catch {
      return "blocked";
    }
  });
  expect(read).toBe("blocked");
});

test("hidden feed stays hidden with panel fallback when the slot is missing", async ({ h }) => {
  await configure(h, (s) => (s.sites.youtube.mode = "random"));
  const page = await h.context.newPage();
  await page.goto("https://www.youtube.com/");
  await frame(page, "feed");
  expect(await isHiddenEl(page, 'ytd-browse[page-subtype="home"]')).toBe(true);
});

test("healthy is the default: a short batch from the hidden feed, without ragebait, that ends", async ({ h }) => {
  await configure(h, (s) => {
    s.healthy.batchSize = 2;
    s.activities = ["Go for a walk"];
  });
  const page = await h.context.newPage();
  await page.goto("https://www.youtube.com/");
  await waitAttrs(page);
  await page.evaluate(() => {
    const feed = document.querySelector('ytd-browse[page-subtype="home"]')!;
    const add = (title: string, channel: string, id: string) => {
      const item = document.createElement("ytd-rich-item-renderer");
      const a = document.createElement("a");
      a.href = `/watch?v=${id}`;
      a.id = "video-title";
      a.textContent = title;
      const name = document.createElement("ytd-channel-name");
      const c = document.createElement("a");
      c.textContent = channel;
      name.append(c);
      item.append(a, name);
      feed.append(item);
    };
    add("Pundit DESTROYS guest?!", "Rage TV", "r1");
    add("How bread rises", "Bakers", "b1");
    add("A quiet walk in Kyoto", "Walks", "w1");
    add("Learning Rust, part 3", "Coders", "c1");
  });
  expect(await isHiddenEl(page, 'ytd-browse[page-subtype="home"]')).toBe(true);
  const f = await frame(page, "feed");
  await expect(f.locator("#healthy .row")).toHaveCount(2, { timeout: 5000 });
  await expect(f.locator("#healthy")).not.toContainText("DESTROYS");
  await expect(f.locator("#healthy-note")).toContainText("misses some");
  const batch = await getStorage(h, "healthy");
  const kept = batch.batches.youtube.items.map((i: { title: string }) => i.title);
  // The batch is kept for the day: the same two after a reload.
  await page.reload();
  await waitAttrs(page);
  const f2 = await frame(page, "feed");
  await expect(f2.locator("#healthy .row")).toHaveCount(2);
  for (const t of kept) await expect(f2.locator("#healthy")).toContainText(t);
  // Opening both ends the batch.
  for (const id of batch.batches.youtube.items.map((i: { id: string }) => i.id)) {
    await h.worker.evaluate((x) => chrome.storage.local.get("healthy").then(({ healthy }) =>
      chrome.storage.local.set({ healthy: { ...healthy, seen: [...healthy.seen, x] } })), id);
  }
  await expect(f2.locator(".healthy-done h2")).toHaveText("That's today's batch");
  await expect(f2.locator("#activities")).toContainText("Go for a walk");
});
