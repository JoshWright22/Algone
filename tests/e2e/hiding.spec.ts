import { SITES } from "../../packages/rules/src/index";
import { expect, FIXTURES, getStorage, isHiddenEl, isVisibleEl, setStorage, test, waitAttrs } from "./harness";

test("default rules hide the feed and keep protected items, on every site", async ({ h }) => {
  for (const site of SITES) {
    const host = site.hosts[0]!;
    const paths = Object.keys(FIXTURES[host] ?? {});
    const page = await h.context.newPage();
    for (const path of paths) {
      await page.goto(`https://${host}${path}`);
      await waitAttrs(page);
      for (const p of site.protected) {
        if (new URL(`https://x${p.path}`).pathname !== path) continue;
        const present = await page.evaluate((s) => !!document.querySelector(s), p.selector);
        if (present) {
          expect(await isVisibleEl(page, p.selector), `${site.id} ${p.label} must stay visible`).toBe(true);
        }
      }
    }
    await page.close();
  }
});

test("compiled CSS parses in Chromium, every selector", async ({ h }) => {
  const page = await h.context.newPage();
  await page.goto("https://www.youtube.com/");
  const bad = await page.evaluate((sites) => {
    const out: string[] = [];
    for (const s of sites) {
      for (const el of s.elements) {
        for (const sel of el.selectors) {
          try {
            document.querySelector(sel);
          } catch {
            out.push(`${s.id}.${el.id}: ${sel}`);
          }
        }
      }
    }
    return out;
  }, SITES);
  expect(bad).toEqual([]);
});

test("no flash: feed never paints, on load or on client navigation", async ({ h }) => {
  const page = await h.context.newPage();
  await page.addInitScript(() => {
    const log: string[] = [];
    (window as unknown as { __flash: string[] }).__flash = log;
    const check = () => {
      for (const e of document.querySelectorAll('ytd-browse[page-subtype="home"]')) {
        if (getComputedStyle(e).display !== "none" && e.getBoundingClientRect().right > 0) log.push("visible");
      }
    };
    new MutationObserver(check).observe(document, { childList: true, subtree: true });
    const frame = () => {
      check();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
  await page.goto("https://www.youtube.com/");
  await waitAttrs(page);
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const div = document.createElement("ytd-browse");
    div.setAttribute("page-subtype", "home");
    history.pushState({}, "", "/watch?v=1");
    document.body.append(div);
    history.pushState({}, "", "/");
  });
  await page.waitForTimeout(300);
  const flash = await page.evaluate(() => (window as unknown as { __flash: string[] }).__flash);
  expect(flash).toEqual([]);
  expect(await isHiddenEl(page, 'ytd-browse[page-subtype="home"]')).toBe(true);
});

test("route attribute follows client navigation", async ({ h }) => {
  const page = await h.context.newPage();
  await page.goto("https://www.youtube.com/");
  await waitAttrs(page);
  expect(await page.getAttribute("html", "data-algone-route")).toContain("home");
  await page.evaluate(() => {
    history.pushState({}, "", "/watch?v=1");
    document.body.append(document.createElement("div"));
  });
  await page.waitForFunction(() => document.documentElement.dataset.algoneRoute === "watch");
});

test("sidebar hidden, comments visible on watch by default", async ({ h }) => {
  const page = await h.context.newPage();
  await page.goto("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  await waitAttrs(page);
  expect(await isHiddenEl(page, "ytd-watch-next-secondary-results-renderer")).toBe(true);
  expect(await isVisibleEl(page, "ytd-comments#comments")).toBe(true);
});

test("hiding an extra is instant, and needs no barrier", async ({ h }) => {
  const page = await h.context.newPage();
  await page.goto("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  await waitAttrs(page);
  const settings = await getStorage(h, "settings");
  settings.sites.youtube.elements.comments = true;
  await setStorage(h, { settings });
  await page.waitForFunction(() => document.documentElement.getAttribute("data-algone-hide")?.includes("youtube.comments"));
  expect(await isHiddenEl(page, "ytd-comments#comments")).toBe(true);
});

test("hidden video is muted, and a shown one is left alone", async ({ h }) => {
  const settings = await getStorage(h, "settings");
  settings.sites.youtube.mode = "nofeed";
  await setStorage(h, { settings });
  const page = await h.context.newPage();
  await page.goto("https://www.youtube.com/");
  await waitAttrs(page);
  const state = await page.evaluate(async () => {
    const hidden = document.createElement("video");
    document.querySelector('ytd-browse[page-subtype="home"]')!.append(hidden);
    const shown = document.createElement("video");
    shown.style.cssText = "display:block;width:10px;height:10px";
    document.body.append(shown);
    // A hidden video only needs muting while it is playing, so mark it as playing.
    Object.defineProperty(hidden, "paused", { value: false, configurable: true });
    await new Promise((r) => setTimeout(r, 300));
    return { hiddenMuted: hidden.muted, shownMuted: shown.muted };
  });
  expect(state.shownMuted).toBe(false);
  expect(state.hiddenMuted).toBe(true);
});

test("a video in the off-screen healthy feed is not muted, so a reused player keeps its sound", async ({ h }) => {
  const page = await h.context.newPage();
  await page.goto("https://www.youtube.com/");
  await waitAttrs(page);
  const state = await page.evaluate(async () => {
    const v = document.createElement("video");
    v.style.cssText = "display:block;width:10px;height:10px";
    document.querySelector('ytd-browse[page-subtype="home"]')!.append(v);
    // Content scripts cannot see page-side stand-ins, so pausing itself is not observable here.
    await new Promise((r) => setTimeout(r, 300));
    return { muted: v.muted, right: v.getBoundingClientRect().right };
  });
  expect(state.right).toBeLessThan(0);
  expect(state.muted).toBe(false);
});

test("autoplay toggle is switched off once", async ({ h }) => {
  const page = await h.context.newPage();
  await page.goto("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  await waitAttrs(page);
  const clicks = await page.evaluate(async () => {
    let n = 0;
    const b = document.createElement("button");
    b.className = "ytp-autonav-toggle-button";
    b.setAttribute("aria-checked", "true");
    b.onclick = () => n++;
    document.body.append(b);
    await new Promise((r) => setTimeout(r, 300));
    return n;
  });
  expect(clicks).toBe(1);
});

test("a Shorts link opens the normal player", async ({ h }) => {
  const page = await h.context.newPage();
  await page.goto("https://www.youtube.com/shorts/abc");
  await page.waitForURL("**/watch?v=abc");
  expect(new URL(page.url()).searchParams.get("v")).toBe("abc");
});

test("X: opens Following instead of For You", async ({ h }) => {
  const page = await h.context.newPage();
  await page.goto("https://x.com/home");
  await waitAttrs(page);
  const clicked = await page.evaluate(async () => {
    const tab = document.querySelector('[role="tab"][aria-selected="false"]') as HTMLElement;
    return tab !== null;
  });
  expect(clicked).toBe(true);
  expect(await isVisibleEl(page, '[data-testid="tweetTextarea_0"]')).toBe(true);
});
