import { expect, extPage, getStorage, isHiddenEl, setStorage, test, waitAttrs, type Harness } from "./harness";
import type { Page } from "@playwright/test";

const SHOW = { t: "snooze", site: "youtube" };

async function askUnlock(h: Harness): Promise<Page> {
  const opts = await extPage(h, "options.html");
  const [unlock] = await Promise.all([
    h.context.waitForEvent("page", (p) => p.url().includes("unlock.html")),
    opts.evaluate((c) => chrome.runtime.sendMessage(c), SHOW),
  ]);
  await unlock.waitForLoadState();
  return unlock;
}

test("pause: never mind is primary from the first second", async ({ h }) => {
  const unlock = await askUnlock(h);
  await expect(unlock.locator("#never-mind")).toHaveClass(/primary/);
  await expect(unlock.locator("#continue")).toBeDisabled();
  const closed = unlock.waitForEvent("close");
  await unlock.locator("#never-mind").click();
  await closed;
  const runtime = await getStorage(h, "runtime");
  expect(runtime.pending).toBeNull();
  expect(runtime.stats.dismissed).toBe(1);
});

test("pause: after the wait, the site shows for a while and hides again", async ({ h }) => {
  const settings = await getStorage(h, "settings");
  settings.barrier = { type: "pause", seconds: 2 };
  await setStorage(h, { settings });
  const yt = await h.context.newPage();
  await yt.goto("https://www.youtube.com/");
  await waitAttrs(yt);
  expect(await isHiddenEl(yt, 'ytd-browse[page-subtype="home"]')).toBe(true);
  const unlock = await askUnlock(h);
  await expect(unlock.locator("#continue")).toBeEnabled({ timeout: 5000 });
  const closed = unlock.waitForEvent("close");
  await unlock.locator("#continue").click();
  await closed;
  await yt.waitForFunction(() => document.documentElement.getAttribute("data-algone-show")?.includes("youtube.home"));
  expect(await isHiddenEl(yt, 'ytd-browse[page-subtype="home"]')).toBe(false);
  // Shorten the snooze and watch it end with no action.
  const runtime = await getStorage(h, "runtime");
  expect(runtime.snoozes.youtube.until).toBeGreaterThan(Date.now() + 9 * 60_000);
  runtime.snoozes.youtube.until = Date.now() + 1500;
  await setStorage(h, { runtime });
  await yt.waitForFunction(() => !document.documentElement.getAttribute("data-algone-show")?.includes("youtube.home"), undefined, { timeout: 6000 });
  expect(await isHiddenEl(yt, 'ytd-browse[page-subtype="home"]')).toBe(true);
});

test("notice appears before the snooze ends", async ({ h }) => {
  const runtime = await getStorage(h, "runtime");
  runtime.snoozes.youtube = { until: Date.now() + 30_000 };
  await setStorage(h, { runtime });
  const yt = await h.context.newPage();
  await yt.goto("https://www.youtube.com/");
  await yt.waitForSelector('iframe[data-algone-panel="notice"]');
});

test("typing: paste is blocked and exact text is needed", async ({ h }) => {
  const settings = await getStorage(h, "settings");
  settings.barrier = { type: "typing", length: 20 };
  await setStorage(h, { settings });
  const unlock = await askUnlock(h);
  const text = (await unlock.locator("#challenge").textContent())!;
  const box = unlock.locator("#typing");
  const prevented = await box.evaluate((el) => {
    const e = new ClipboardEvent("paste", { bubbles: true, cancelable: true });
    return !el.dispatchEvent(e);
  });
  expect(prevented).toBe(true);
  await box.fill("wrong");
  await expect(unlock.locator("#continue")).toBeDisabled();
  await box.fill(text);
  await expect(unlock.locator("#continue")).toBeEnabled();
});

test("daily limit: exhausted days are blocked", async ({ h }) => {
  const settings = await getStorage(h, "settings");
  settings.barrier = { type: "daily", limit: 1, step: "pause" };
  await setStorage(h, { settings });
  const runtime = await getStorage(h, "runtime");
  const d = new Date();
  runtime.daily = { day: `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`, used: 1 };
  await setStorage(h, { runtime });
  const unlock = await askUnlock(h);
  await expect(unlock.locator("h1")).toHaveText("Not available right now");
  await expect(unlock.locator("#never-mind")).toBeVisible();
});

test("schedule: outside a window is blocked", async ({ h }) => {
  const hour = (new Date().getHours() + 3) % 24;
  const start = `${String(hour).padStart(2, "0")}:00`;
  const end = `${String(hour).padStart(2, "0")}:30`;
  const settings = await getStorage(h, "settings");
  settings.barrier = { type: "schedule", windows: [{ days: [0, 1, 2, 3, 4, 5, 6], start, end }] };
  await setStorage(h, { settings });
  const unlock = await askUnlock(h);
  await expect(unlock.locator("h1")).toHaveText("Not available right now");
});

test("lock: blocked, one escape shown, no second escape", async ({ h }) => {
  const settings = await getStorage(h, "settings");
  settings.barrier = { type: "locked", until: Date.now() + 3_600_000, escapeUsed: false, after: { type: "pause", seconds: 30 } };
  await setStorage(h, { settings });
  let unlock = await askUnlock(h);
  await expect(unlock.locator("#escape")).toBeVisible();
  await unlock.close();
  settings.barrier.escapeUsed = true;
  await setStorage(h, { settings });
  unlock = await askUnlock(h);
  await expect(unlock.locator("#escape")).toHaveCount(0);
});

test("partner: wrong password fails, right password passes, recovery starts a wait", async ({ h }) => {
  const opts = await extPage(h, "options.html");
  const barrier = await opts.evaluate(async () => {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", enc.encode("open sesame"), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: enc.encode("aa"), iterations: 1000 }, key, 256);
    const hash = Array.from(new Uint8Array(bits), (b) => b.toString(16).padStart(2, "0")).join("");
    return { type: "partner", salt: "aa", hash, iterations: 1000, recoveryAt: null };
  });
  const settings = await getStorage(h, "settings");
  settings.barrier = barrier;
  await setStorage(h, { settings });
  const unlock = await askUnlock(h);
  await unlock.locator("#password").fill("nope");
  await unlock.locator("#continue").click();
  await expect(unlock.getByRole("alert")).toHaveText("That is not the password.");
  await unlock.locator("#forgot").click();
  await expect(unlock.locator("h1")).toHaveText("Not available right now");
  const after = await getStorage(h, "settings");
  expect(after.barrier.recoveryAt).toBeGreaterThan(Date.now());

  after.barrier.recoveryAt = null;
  await setStorage(h, { settings: after });
  await unlock.close();
  const again = await askUnlock(h);
  await again.locator("#password").fill("open sesame");
  const closed = again.waitForEvent("close");
  await again.locator("#continue").click();
  await closed;
  expect((await getStorage(h, "runtime")).snoozes.youtube).toBeTruthy();
});

test("weakening through settings needs a barrier, tightening does not", async ({ h }) => {
  const opts = await extPage(h, "options.html");
  const patch = (p: object) => opts.evaluate((c) => chrome.runtime.sendMessage(c), { t: "patch", patch: p });
  expect(await patch({ op: "setElement", site: "youtube", element: "comments", hidden: true })).toEqual({ ok: true });
  const [unlock] = await Promise.all([
    h.context.waitForEvent("page", (p) => p.url().includes("unlock.html")),
    patch({ op: "setElement", site: "youtube", element: "home", hidden: false }),
  ]);
  await unlock.waitForLoadState();
  const s = await getStorage(h, "settings");
  expect(s.sites.youtube.elements.home).toBeUndefined();
  expect(s.sites.youtube.elements.comments).toBe(true);
  expect((await getStorage(h, "runtime")).pending.kind).toBe("patch");
});

test("Random mode is exempt; Tuned needs a barrier", async ({ h }) => {
  const opts = await extPage(h, "options.html");
  const patch = (p: object) => opts.evaluate((c) => chrome.runtime.sendMessage(c), { t: "patch", patch: p });
  expect(await patch({ op: "setMode", site: "youtube", mode: "random" })).toEqual({ ok: true });
  const [unlock] = await Promise.all([
    h.context.waitForEvent("page", (p) => p.url().includes("unlock.html")),
    patch({ op: "setMode", site: "youtube", mode: "tuned" }),
  ]);
  await expect(unlock.locator("#never-mind")).toBeVisible();
});

test("importing a settings file: stricter now, looser waits for the barrier", async ({ h }) => {
  const opts = await extPage(h, "options.html#sync");
  const exported = (await opts.evaluate(() => chrome.runtime.sendMessage({ t: "exportPolicy" }))) as { ok: boolean; text: string };
  expect(exported.ok).toBe(true);
  const policy = JSON.parse(exported.text);
  expect(policy.schema).toBe("algone-policy/1");
  expect(policy.settings.theme).toBeUndefined();
  policy.settings.sites.youtube.elements = { comments: true };
  policy.settings.sites.reddit.enabled = false;
  const [unlock, result] = await Promise.all([
    h.context.waitForEvent("page", (p) => p.url().includes("unlock.html")),
    opts.evaluate((text) => chrome.runtime.sendMessage({ t: "importPolicy", text }), JSON.stringify(policy)),
  ]);
  expect(result).toMatchObject({ ok: true, needsBarrier: true, applied: 1 });
  const settings = await getStorage(h, "settings");
  expect(settings.sites.youtube.elements.comments).toBe(true);
  expect(settings.sites.reddit.enabled).toBe(true);
  await unlock.waitForLoadState();
  await expect(unlock.locator("body")).toContainText("Loosen 1 setting from an imported file");
  const bad = await opts.evaluate(() => chrome.runtime.sendMessage({ t: "importPolicy", text: "{}" }));
  expect(bad).toMatchObject({ ok: false });
});
