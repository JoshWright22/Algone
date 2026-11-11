import { publishRules, SITES, siteMap, type SiteRule } from "@algone/rules";
import { describe, expect, it } from "vitest";
import {
  addSource, addToQueue, applyPatch, checkBreak, barrierStep, clearIfBundled, computeView, createPartnerBarrier,
  defaultRuntime, defaultSettings, dueSources, effectiveRule, emptyTuned, feedUrlFor, handleRulesFile,
  inWindow, isLikelyAi, isStricterBarrier, isWeakening, localDay, makePuzzle, matchesTopic, mergeEntries,
  migrateSettings, moveInQueue, nextFetchAt, parseFeed, pickRandom, randomContentCount, rankItems, recordPass,
  removeSource, safeHttps, shouldHide, startRecovery, startSnooze, typingText, useEscape, validateBarrier,
  verifyPassword, visibleQueue, warnTime, webKdf,
  type BarrierConfig, type FeedStore, type Patch, type Settings,
} from "../src/index";

const yt = siteMap().youtube as SiteRule;
/** Older tests start from No feed everywhere; the healthy default has its own test. */
const base = (): Settings => {
  const s = defaultSettings(SITES);
  for (const id of Object.keys(s.sites)) s.sites[id] = { ...s.sites[id]!, mode: "nofeed" };
  return s;
};
const rt = defaultRuntime;
const NOW = new Date(2026, 9, 31, 12, 0, 0).getTime();
const tok = (id: string) => `youtube.${id}`;

describe("defaults", () => {
  it("starts every site with a feed rule on the healthy feed", () => {
    const s = defaultSettings(SITES);
    expect(Object.values(s.sites).every((site) => site.mode === "healthy")).toBe(true);
    expect(computeView(s, rt(), yt, NOW).panel?.content).toBe("healthy");
    expect(computeView(s, rt(), yt, NOW).show).not.toContain(tok("home"));
  });
  it("hides algorithmic and shows extras", () => {
    const v = computeView(base(), rt(), yt, NOW);
    expect(v.show).toEqual([]);
    expect(v.hide).toEqual([]);
    expect(v.mode).toBe("nofeed");
    expect(v.panel).toBeNull();
    expect(v.effects).toContain("autoplay");
  });
  it("migration adds new sites and keeps choices", () => {
    const s = base();
    delete s.sites.substack;
    s.snoozeMinutes = 5;
    const m = migrateSettings(s, SITES);
    expect(m.sites.substack).toBeDefined();
    expect(m.snoozeMinutes).toBe(5);
  });
  it("migration fills nested fields an older version did not have", () => {
    const s = base();
    const old = s.sites.youtube as unknown as Record<string, unknown>;
    old.tuned = { blockKeywords: ["prank"] };
    delete old.intent;
    s.sites.youtube!.elements = { comments: true };
    const m = migrateSettings(s, SITES);
    expect(m.sites.youtube!.tuned).toEqual({ ...emptyTuned(), blockKeywords: ["prank"] });
    expect(m.sites.youtube!.intent.searchHome).toBe(false);
    expect(m.sites.youtube!.elements).toEqual({ comments: true });
  });
});

describe("computeView", () => {
  it("shows an element when overridden, hides an extra when asked", () => {
    let s = applyPatch(base(), { op: "setElement", site: "youtube", element: "sidebar", hidden: false });
    s = applyPatch(s, { op: "setElement", site: "youtube", element: "comments", hidden: true });
    const v = computeView(s, rt(), yt, NOW);
    expect(v.show).toContain(tok("sidebar"));
    expect(v.hide).toContain(tok("comments"));
  });
  it("snooze reveals everything hidden, then expires", () => {
    const s = applyPatch(base(), { op: "setElement", site: "youtube", element: "comments", hidden: true });
    const r = startSnooze(rt(), "youtube", 10, NOW);
    const v = computeView(s, r, yt, NOW + 1000);
    expect(v.show).toContain(tok("home"));
    expect(v.hide).toEqual([]);
    expect(v.snoozedUntil).toBe(NOW + 600_000);
    expect(v.effects).toEqual([]);
    expect(computeView(s, r, yt, NOW + 600_001).show).toEqual([]);
  });
  it("a disabled site shows everything and has no panels", () => {
    let s = applyPatch(base(), { op: "setSiteEnabled", site: "youtube", enabled: false });
    s = applyPatch(s, { op: "setIntent", site: "youtube", key: "searchHome", value: true });
    const v = computeView(s, rt(), yt, NOW);
    expect(v.enabled).toBe(false);
    expect(v.show).toContain(tok("home"));
    expect(v.panel).toBeNull();
  });
  it.each([
    ["nofeed", false, null],
    ["random", true, "random"],
    ["custom", true, "custom"],
  ] as const)("mode %s hides feed, panel %s", (mode, hasPanel, content) => {
    const s = applyPatch(base(), { op: "setMode", site: "youtube", mode });
    const v = computeView(s, rt(), yt, NOW);
    expect(v.show).not.toContain(tok("home"));
    expect(v.panel !== null).toBe(hasPanel);
    expect(v.panel?.content ?? null).toBe(content);
  });
  it("tuned shows the feed and passes filters", () => {
    const s = applyPatch(base(), { op: "setMode", site: "youtube", mode: "tuned" });
    const v = computeView(s, rt(), yt, NOW);
    expect(v.show).toContain(tok("home"));
    expect(v.show).not.toContain(tok("sidebar"));
    expect(v.tuned).not.toBeNull();
  });
  it("search-first adds a search box, and tuned gets only that", () => {
    let s = applyPatch(base(), { op: "setIntent", site: "youtube", key: "searchHome", value: true });
    expect(computeView(s, rt(), yt, NOW).panel).toEqual({ search: true, prompt: false, content: null });
    s = applyPatch(s, { op: "setMode", site: "youtube", mode: "random" });
    expect(computeView(s, rt(), yt, NOW).panel?.content).toBe("random");
  });
  it("prompt needs search-first", () => {
    const s = applyPatch(base(), { op: "setIntent", site: "youtube", key: "prompt", value: true });
    expect(computeView(s, rt(), yt, NOW).panel).toBeNull();
  });
  it("stop at the end needs a player definition", () => {
    expect(computeView(base(), rt(), yt, NOW).stopAtEnd).toBe(true);
    const li = siteMap().linkedin!;
    expect(computeView(base(), rt(), li, NOW).stopAtEnd).toBe(false);
  });
  it("overlay adds off tokens", () => {
    const o = { rev: 2, sites: { youtube: { replaced: ["home"], retired: ["sidebar"], added: [], css: "" } } };
    expect(computeView(base(), rt(), yt, NOW, o).off).toEqual([tok("home"), tok("sidebar")]);
  });
});

describe("isWeakening", () => {
  const s = base();
  const w = (p: Patch, st: Settings = s) => isWeakening(st, p, SITES);
  it("element toggles", () => {
    expect(w({ op: "setElement", site: "youtube", element: "home", hidden: false })).toBe(true);
    expect(w({ op: "setElement", site: "youtube", element: "comments", hidden: true })).toBe(false);
    expect(w({ op: "setElement", site: "youtube", element: "comments", hidden: false })).toBe(false);
    const hid = applyPatch(s, { op: "setElement", site: "youtube", element: "comments", hidden: true });
    expect(w({ op: "setElement", site: "youtube", element: "comments", hidden: false }, hid)).toBe(true);
  });
  it("unknown element fails closed", () => {
    expect(w({ op: "setElement", site: "youtube", element: "nope", hidden: false })).toBe(true);
  });
  it("modes", () => {
    expect(w({ op: "setMode", site: "youtube", mode: "random" })).toBe(false);
    expect(w({ op: "setMode", site: "youtube", mode: "tuned" })).toBe(true);
    expect(w({ op: "setMode", site: "youtube", mode: "custom" })).toBe(true);
    const t = applyPatch(s, { op: "setMode", site: "youtube", mode: "tuned" });
    expect(w({ op: "setMode", site: "youtube", mode: "custom" }, t)).toBe(false);
    expect(w({ op: "setMode", site: "youtube", mode: "healthy" }, t)).toBe(false);
    expect(w({ op: "setMode", site: "youtube", mode: "nofeed" }, t)).toBe(false);
    expect(w({ op: "setMode", site: "youtube", mode: "healthy" })).toBe(true);
    const c = applyPatch(s, { op: "setMode", site: "youtube", mode: "custom" });
    expect(w({ op: "setMode", site: "youtube", mode: "tuned" }, c)).toBe(true);
    expect(w({ op: "setMode", site: "youtube", mode: "healthy" }, c)).toBe(true);
    const hl = applyPatch(s, { op: "setMode", site: "youtube", mode: "healthy" });
    expect(w({ op: "setMode", site: "youtube", mode: "custom" }, hl)).toBe(true);
    expect(w({ op: "setMode", site: "youtube", mode: "random" }, hl)).toBe(false);
  });
  it("healthy, avoid, break and apps", () => {
    expect(w({ op: "setHealthy", batchSize: 5 })).toBe(false);
    expect(w({ op: "setHealthy", batchSize: 20 })).toBe(true);
    expect(w({ op: "setHealthy", dailyBudgetMinutes: 60 })).toBe(true);
    expect(w({ op: "setAvoid", ids: ["outrage", "clickbait", "comparison", "doom"] })).toBe(false);
    expect(w({ op: "setAvoid", ids: ["outrage"] })).toBe(true);
    expect(w({ op: "setActivities", items: ["Walk"] })).toBe(false);
    expect(w({ op: "startBreak", until: NOW + 3_600_000 })).toBe(true);
    expect(w({ op: "endBreak" })).toBe(false);
    const cover = { mode: "cover" as const, shortVideo: true };
    expect(w({ op: "setApp", platform: "android", app: "youtube", config: cover })).toBe(false);
    const a = applyPatch(s, { op: "setApp", platform: "android", app: "youtube", config: cover });
    expect(w({ op: "setApp", platform: "android", app: "youtube", config: { mode: "block" } }, a)).toBe(false);
    expect(w({ op: "setApp", platform: "android", app: "youtube", config: { mode: "cover" } }, a)).toBe(true);
    expect(w({ op: "setApp", platform: "android", app: "youtube", config: { mode: "limit", minutes: 5 } }, a)).toBe(true);
    expect(w({ op: "setApp", platform: "android", app: "youtube", config: null }, a)).toBe(true);
    const l = applyPatch(s, { op: "setApp", platform: "ios", app: "instagram", config: { mode: "limit", minutes: 20 } });
    expect(w({ op: "setApp", platform: "ios", app: "instagram", config: { mode: "limit", minutes: 10 } }, l)).toBe(false);
    expect(w({ op: "setApp", platform: "ios", app: "instagram", config: { mode: "limit", minutes: 30 } }, l)).toBe(true);
  });
  it("a break shows feeds but not Shorts or autoplay, then ends by itself", () => {
    const b = applyPatch(s, { op: "startBreak", until: NOW + 60_000 });
    const v = computeView(b, rt(), yt, NOW);
    expect(v.enabled).toBe(false);
    expect(v.show).toContain(tok("home"));
    expect(v.show).not.toContain(tok("shortsShelf"));
    expect(v.show).not.toContain(tok("autoplay"));
    expect(v.effects).toContain("autoplay");
    expect(computeView(b, rt(), yt, NOW + 60_001).enabled).toBe(true);
  });
  it("breaks: at most 24 hours, one a week", () => {
    expect(checkBreak(NOW + 3_600_000, rt(), NOW)).toBeNull();
    expect(checkBreak(NOW + 25 * 3_600_000, rt(), NOW)).toMatch(/24 hours/);
    expect(checkBreak(NOW + 3_600_000, { ...rt(), lastBreakAt: NOW - 86_400_000 }, NOW)).toMatch(/One break a week/);
    expect(checkBreak(NOW + 3_600_000, { ...rt(), lastBreakAt: NOW - 8 * 86_400_000 }, NOW)).toBeNull();
  });
  it("site and intent", () => {
    expect(w({ op: "setSiteEnabled", site: "youtube", enabled: false })).toBe(true);
    expect(w({ op: "setSiteEnabled", site: "youtube", enabled: true })).toBe(false);
    expect(w({ op: "setIntent", site: "youtube", key: "searchHome", value: true })).toBe(false);
    expect(w({ op: "setIntent", site: "youtube", key: "searchHome", value: false })).toBe(true);
  });
  it("globals", () => {
    expect(w({ op: "setGlobal", key: "theme", value: "dark" })).toBe(false);
    expect(w({ op: "setGlobal", key: "snoozeMinutes", value: 5 })).toBe(false);
    expect(w({ op: "setGlobal", key: "snoozeMinutes", value: 20 })).toBe(true);
    expect(w({ op: "setGlobal", key: "stopAtEnd", value: false })).toBe(true);
    expect(w({ op: "setGlobal", key: "stopAtEnd", value: true })).toBe(false);
    expect(w({ op: "setGlobal", key: "ruleUpdates", value: false })).toBe(true);
    expect(w({ op: "setGlobal", key: "ruleUpdates", value: true })).toBe(false);
    expect(w({ op: "setGlobal", key: "wikipedia", value: true })).toBe(true);
    expect(w({ op: "useBundledRules" })).toBe(true);
  });
  it("barriers: only stricter within a type is tightening", () => {
    expect(isStricterBarrier({ type: "pause", seconds: 30 }, { type: "pause", seconds: 60 })).toBe(true);
    expect(w({ op: "setBarrier", barrier: { type: "pause", seconds: 60 } })).toBe(false);
    expect(w({ op: "setBarrier", barrier: { type: "pause", seconds: 10 } })).toBe(true);
    expect(w({ op: "setBarrier", barrier: { type: "typing", length: 60 } })).toBe(true);
    const typing = applyPatch(s, { op: "setBarrier", barrier: { type: "typing", length: 60 } });
    expect(w({ op: "setBarrier", barrier: { type: "pause", seconds: 120 } }, typing)).toBe(true);
    const schedule: BarrierConfig = { type: "schedule", windows: [{ days: [1], start: "00:00", end: "23:59" }] };
    expect(w({ op: "setBarrier", barrier: schedule })).toBe(true);
    const lock = (until: number, after: BarrierConfig): BarrierConfig => ({ type: "locked", until, escapeUsed: false, after });
    expect(isStricterBarrier(lock(NOW + 10, { type: "typing", length: 200 }), lock(NOW + 20, { type: "pause", seconds: 10 }))).toBe(false);
    expect(isStricterBarrier(lock(NOW + 10, { type: "pause", seconds: 30 }), lock(NOW + 20, { type: "pause", seconds: 60 }))).toBe(true);
    expect(w({ op: "setBarrier", barrier: lock(NOW + 60_000, { type: "pause", seconds: 10 }) })).toBe(true);
    expect(w({ op: "setBarrier", barrier: schedule }, applyPatch(s, { op: "setBarrier", barrier: schedule }))).toBe(true);
    expect(
      isStricterBarrier({ type: "daily", limit: 3, step: "pause" }, { type: "daily", limit: 1, step: "pause" }),
    ).toBe(true);
  });
  it("tuned: blocks tighten, allow-lists are asymmetric", () => {
    const f = (o: object) => ({ ...emptyTuned(), ...o });
    const set = (x: object) => w({ op: "setTuned", site: "youtube", filters: f(x) });
    expect(set({ blockKeywords: ["a"] })).toBe(false);
    expect(set({ allowTopics: ["Science"] })).toBe(false);
    const st = applyPatch(s, { op: "setTuned", site: "youtube", filters: f({ blockKeywords: ["a"], allowTopics: ["Science", "Music"] }) });
    const set2 = (x: object) => w({ op: "setTuned", site: "youtube", filters: f(x) }, st);
    expect(set2({ blockKeywords: [], allowTopics: ["Science", "Music"] })).toBe(true);
    expect(set2({ blockKeywords: ["a"], allowTopics: ["Science", "Music", "Gaming"] })).toBe(true);
    expect(set2({ blockKeywords: ["a"], allowTopics: ["Science"] })).toBe(false);
    expect(set2({ blockKeywords: ["a"], allowTopics: [] })).toBe(true);
  });
});

describe("barriers", () => {
  const step = (b: BarrierConfig, r = rt(), now = NOW) => barrierStep(b, r, now, () => 0.5);
  it("pause and typing", () => {
    expect(step({ type: "pause", seconds: 30 })).toEqual({ kind: "wait", seconds: 30 });
    const t = step({ type: "typing", length: 20 });
    expect(t.kind).toBe("typing");
    if (t.kind === "typing") expect(t.text).toHaveLength(20);
    expect(typingText(60).length).toBe(60);
  });
  it("daily limit blocks after N and resets at midnight", () => {
    const b: BarrierConfig = { type: "daily", limit: 2, step: "pause" };
    let r = rt();
    r = recordPass(b, r, NOW).runtime;
    expect(step(b, r).kind).toBe("wait");
    r = recordPass(b, r, NOW).runtime;
    const blocked = step(b, r);
    expect(blocked.kind).toBe("blocked");
    expect(step(b, r, NOW + 86_400_000).kind).toBe("wait");
    expect(r.daily.day).toBe(localDay(NOW));
  });
  it("daily can use typing", () => {
    expect(step({ type: "daily", limit: 2, step: "typing" }).kind).toBe("typing");
  });
  it("schedule windows, including across midnight", () => {
    const day = new Date(NOW).getDay();
    expect(inWindow([{ days: [day], start: "11:00", end: "13:00" }], NOW)).toBe(true);
    expect(inWindow([{ days: [day], start: "13:00", end: "14:00" }], NOW)).toBe(false);
    const late = new Date(2026, 9, 31, 23, 30).getTime();
    const early = new Date(2026, 10, 1, 1, 0).getTime();
    const w = [{ days: [new Date(late).getDay()], start: "23:00", end: "02:00" }];
    expect(inWindow(w, late)).toBe(true);
    expect(inWindow(w, early)).toBe(true);
    expect(inWindow(w, new Date(2026, 10, 1, 3, 0).getTime())).toBe(false);
  });
  it("schedule: inside needs a short pause, outside is blocked until opening", () => {
    const day = new Date(NOW).getDay();
    expect(step({ type: "schedule", windows: [{ days: [day], start: "11:00", end: "13:00" }] })).toEqual({
      kind: "wait",
      seconds: 10,
    });
    const s = step({ type: "schedule", windows: [{ days: [day], start: "18:00", end: "19:00" }] });
    expect(s.kind).toBe("blocked");
    if (s.kind === "blocked") expect(new Date(s.until).getHours()).toBe(18);
  });
  it("lock blocks, allows one escape, then falls to its after barrier", () => {
    const b: BarrierConfig = { type: "locked", until: NOW + 3_600_000, escapeUsed: false, after: { type: "pause", seconds: 30 } };
    const s = step(b);
    expect(s.kind === "blocked" && s.canEscape).toBe(true);
    const used = useEscape(b);
    const s2 = step(used);
    expect(s2.kind === "blocked" && s2.canEscape).toBe(false);
    expect(step(b, rt(), NOW + 3_600_001)).toEqual({ kind: "wait", seconds: 30 });
    const r = recordPass(b, rt(), NOW + 3_600_001);
    expect(r.barrier).toEqual({ type: "pause", seconds: 30 });
  });
  it("partner: password, recovery after 24 h, then pause", async () => {
    const b = await createPartnerBarrier("hunter2", webKdf, 1000);
    expect(await verifyPassword("hunter2", b, webKdf)).toBe(true);
    expect(await verifyPassword("wrong", b, webKdf)).toBe(false);
    expect(step(b).kind).toBe("password");
    const rec = startRecovery(b, NOW);
    expect(step(rec).kind).toBe("blocked");
    const later = NOW + 24 * 3_600_000 + 1;
    expect(step(rec, rt(), later).kind).toBe("wait");
    expect(recordPass(rec, rt(), later).barrier).toEqual({ type: "pause", seconds: 30 });
  });
  it("validates configs", () => {
    expect(validateBarrier({ type: "pause", seconds: 5 }, NOW)).toBeTruthy();
    expect(validateBarrier({ type: "pause", seconds: 30 }, NOW)).toBeNull();
    expect(validateBarrier({ type: "typing", length: 300 }, NOW)).toBeTruthy();
    expect(validateBarrier({ type: "schedule", windows: [] }, NOW)).toBeTruthy();
    const lock = (u: number): BarrierConfig => ({ type: "locked", until: u, escapeUsed: false, after: { type: "pause", seconds: 30 } });
    expect(validateBarrier(lock(NOW + 8 * 86_400_000), NOW)).toBeTruthy();
    expect(validateBarrier(lock(NOW - 1), NOW)).toBeTruthy();
    expect(validateBarrier(lock(NOW + 86_400_000), NOW)).toBeNull();
  });
  it("records a completed pass in stats only, with no streak", () => {
    const r = recordPass({ type: "pause", seconds: 30 }, rt(), NOW).runtime;
    expect(r.stats.completed).toBe(1);
    expect(JSON.stringify(rt())).not.toContain("streak");
  });
});

describe("snooze warn", () => {
  it("is 60 s before, or half for a short snooze", () => {
    expect(warnTime(100_000, 10)).toBe(40_000);
    expect(warnTime(100_000, 1)).toBe(70_000);
  });
});

describe("queue", () => {
  const q = (url: string, title = "t") => ({ url, title, site: "youtube" });
  it("adds https only and dedupes", () => {
    let list = addToQueue([], q("https://a.example/1"), 1);
    list = addToQueue(list, q("https://a.example/1"), 2);
    list = addToQueue(list, q("javascript:alert(1)"), 3);
    list = addToQueue(list, q("http://a.example/2"), 4);
    expect(list).toHaveLength(1);
    expect(safeHttps("not a url")).toBeNull();
  });
  it("soft cap never blocks saving", () => {
    let list: ReturnType<typeof addToQueue> = [];
    for (let i = 0; i < 9; i++) list = addToQueue(list, q(`https://a.example/${i}`), i);
    expect(list).toHaveLength(9);
    expect(visibleQueue(list, 5, false)).toMatchObject({ hiddenCount: 4 });
    expect(visibleQueue(list, 5, false).items).toHaveLength(5);
    expect(visibleQueue(list, 5, true).items).toHaveLength(9);
  });
  it("reorders", () => {
    let list = addToQueue([], q("https://a.example/1"), 1);
    list = addToQueue(list, q("https://a.example/2"), 2);
    expect(moveInQueue(list, list[1]!.id, -1)[0]!.url).toContain("/2");
    expect(moveInQueue(list, list[0]!.id, -1)).toBe(list);
  });
});

describe("feeds", () => {
  const rss = `<?xml version="1.0"?><rss><channel><title>My &amp; Feed</title>
    <item><title><![CDATA[First <b>post</b>]]></title><link>https://a.example/1</link><pubDate>Fri, 30 Oct 2026 10:00:00 GMT</pubDate></item>
    <item><title>Bad link</title><link>javascript:alert(1)</link></item>
    <item><title>Second</title><link>http://a.example/insecure</link></item>
  </channel></rss>`;
  const atom = `<feed xmlns="http://www.w3.org/2005/Atom"><title>Chan</title>
    <entry><title>Vid &#39;1&#39;</title><link rel="alternate" href="https://www.youtube.com/watch?v=1"/><published>2026-10-30T10:00:00Z</published></entry>
  </feed>`;
  it("parses RSS, dropping non-https links and tags in titles", () => {
    const f = parseFeed(rss);
    expect(f.title).toBe("My & Feed");
    expect(f.entries).toHaveLength(1);
    expect(f.entries[0]!.title).toBe("First post");
    expect(f.entries[0]!.time).toBeGreaterThan(0);
  });
  it("parses Atom", () => {
    const f = parseFeed(atom);
    expect(f.title).toBe("Chan");
    expect(f.entries[0]).toMatchObject({ title: "Vid '1'", url: "https://www.youtube.com/watch?v=1" });
  });
  it("survives malformed input and enforces size", () => {
    expect(parseFeed("<<<not xml").entries).toEqual([]);
    expect(parseFeed("").entries).toEqual([]);
    expect(parseFeed("x".repeat(3_000_000)).entries).toEqual([]);
  });
  const item = (s: string, t: number, seen = false) => ({ url: `https://a.example/${s}${t}`, title: "t", time: t, sourceId: s, id: `${s}${t}`, seen });
  it("ranks three ways", () => {
    const items = [item("a", 1), item("a", 2), item("a", 3), item("b", 0, true)];
    expect(rankItems(items, "newest")[0]!.time).toBe(3);
    expect(rankItems(items, "oldestUnseen").map((i) => i.time)).toEqual([1, 2, 3]);
    expect(rankItems(items, "fair").map((i) => i.sourceId)).toEqual(["a", "b", "a", "a"]);
  });
  it("merges keep seen flags and cap the cache", () => {
    let s: FeedStore = { sources: [], items: [] };
    const entries = Array.from({ length: 600 }, (_, i) => ({ title: "t", url: `https://a.example/${i}`, time: i }));
    s = mergeEntries(s, "a", entries);
    expect(s.items).toHaveLength(500);
    s.items[0]!.seen = true;
    s = mergeEntries(s, "a", [entries[599]!]);
    expect(s.items[0]!.seen).toBe(true);
  });
  it("backs off and limits concurrency", () => {
    expect(nextFetchAt(3, 0)).toBeGreaterThan(nextFetchAt(1, 0));
    expect(nextFetchAt(20, 0)).toBe(86_400_000);
    let s: FeedStore = { sources: [], items: [] };
    for (let i = 0; i < 6; i++) s = addSource(s, { kind: "rss", url: `https://a.example/${i}`, title: "", site: "reddit" });
    expect(dueSources(s, 1)).toHaveLength(3);
    expect(removeSource(s, s.sources[0]!.id).sources).toHaveLength(5);
  });
  it("derives feed URLs where sites have them", () => {
    expect(feedUrlFor("https://www.reddit.com/r/programming/top/")).toBe("https://www.reddit.com/r/programming/.rss");
    expect(feedUrlFor("https://bsky.app/profile/x.bsky.social/post/1")).toBe("https://bsky.app/profile/x.bsky.social/rss");
    expect(feedUrlFor("https://name.substack.com/p/x")).toBe("https://name.substack.com/feed");
    expect(feedUrlFor("https://www.instagram.com/x/")).toBeNull();
  });
});

describe("tuned", () => {
  const item = (title: string, channel = "", kinds: string[] = []) => ({ title, channel, kinds });
  const f = (o: object) => ({ ...emptyTuned(), ...o });
  it("matches keywords, channels, kinds, and topics", () => {
    expect(shouldHide(item("Big Crypto news"), f({ blockKeywords: ["crypto"] }))).toBe(true);
    expect(shouldHide(item("x", "SpamChannel"), f({ blockChannels: ["spamchannel"] }))).toBe(true);
    expect(shouldHide(item("x", "", ["shorts"]), f({ hideKinds: ["shorts"] }))).toBe(true);
    expect(shouldHide(item("NBA playoffs tonight"), f({ blockTopics: ["Sports"] }))).toBe(true);
    expect(shouldHide(item("A quiet walk"), f({ blockTopics: ["Sports"] }))).toBe(false);
  });
  it("allow-list hides what does not match", () => {
    expect(shouldHide(item("NASA launch"), f({ allowTopics: ["Science"] }))).toBe(false);
    expect(shouldHide(item("Cat video"), f({ allowTopics: ["Science"] }))).toBe(true);
  });
  it("likely AI matches explicit phrases only", () => {
    expect(isLikelyAi("My AI generated movie")).toBe(true);
    expect(isLikelyAi("How airplanes fly")).toBe(false);
    expect(shouldHide(item("cool #aiart piece"), f({ hideKinds: ["likelyAi"] }))).toBe(true);
    expect(matchesTopic("goalkeeper", "Sports")).toBe(false);
  });
});

describe("rulesUpdate", () => {
  const known = siteMap();
  const published = (rev: number, edit?: (p: ReturnType<typeof publishRules>) => void) => {
    const p = publishRules(SITES, rev);
    edit?.(p);
    return JSON.stringify(p);
  };
  const noPrev = null;
  it("requires rev above both the build and the last accepted", () => {
    expect(handleRulesFile(published(50), known, 100, 0, noPrev).error).toMatch(/newer/);
    expect(handleRulesFile(published(150), known, 100, 200, noPrev).error).toMatch(/newer/);
    const ok = handleRulesFile(published(150), known, 100, 0, noPrev);
    expect(ok.error).toBe("");
    expect(ok.lastAcceptedRev).toBe(150);
    expect(ok.overlay).toBeNull();
  });
  it("a bad file keeps the last good overlay", () => {
    const prev = { rev: 120, sites: {} };
    const r = handleRulesFile("garbage", known, 100, 120, prev);
    expect(r.overlay).toBe(prev);
    expect(r.lastAcceptedRev).toBe(120);
    expect(r.error).toBeTruthy();
  });
  it("computes only differences, with retirement", () => {
    const r = handleRulesFile(
      published(150, (p) => {
        p.sites.youtube!.elements[0]!.selectors = ["ytd-new-home"];
        p.sites.reddit!.retired = ["popular"];
        p.sites.x!.elements.push({ id: "newThing", label: "New", group: "G", class: "algorithmic", selectors: ["x-new"] });
      }),
      known, 100, 0, noPrev,
    );
    expect(r.overlay!.sites.youtube!.replaced).toEqual(["home"]);
    expect(r.overlay!.sites.youtube!.css).toContain("ytd-new-home");
    expect(r.overlay!.sites.reddit!.retired).toEqual(["popular"]);
    expect(r.overlay!.sites.x!.added[0]!.id).toBe("newThing");
    expect(Object.keys(r.overlay!.sites)).toHaveLength(3);
  });
  it("a rejected entry keeps that site's previous overlay", () => {
    const prev = { rev: 120, sites: { youtube: { replaced: ["home"], retired: [], added: [], css: "x" } } };
    const r = handleRulesFile(
      published(150, (p) => {
        p.sites.youtube!.elements[0]!.selectors = ["a { color: red }"];
      }),
      known, 100, 120, prev,
    );
    expect(r.overlay!.sites.youtube).toBe(prev.sites.youtube);
    expect(r.rejected.length).toBeGreaterThan(0);
    expect(r.error).toBe("");
  });
  it("clears when a store update reaches the overlay", () => {
    const o = { rev: 150, sites: {} };
    expect(clearIfBundled(o, 149)).toBe(o);
    expect(clearIfBundled(o, 150)).toBeNull();
  });
  it("effectiveRule applies routes, tuned, and slot only", () => {
    const o = { rev: 2, sites: { youtube: { replaced: [], retired: [], added: [], css: "", slot: { selector: "x-slot", fallback: "fixed" as const } } } };
    const e = effectiveRule(yt, o);
    expect(e.slot!.selector).toBe("x-slot");
    expect(e.searchUrl).toBe(yt.searchUrl);
  });
});

describe("content", () => {
  it("has 100 or more attributed items", () => {
    expect(randomContentCount()).toBeGreaterThanOrEqual(100);
    for (let i = 1; i < 500; i++) {
      const r = pickRandom(i);
      expect(r.text.length).toBeGreaterThan(0);
      expect(r.source.length).toBeGreaterThan(0);
    }
  });
  it("makes three kinds of deterministic puzzles", () => {
    const kinds = new Set<string>();
    for (let i = 1; i < 60; i++) {
      const p = makePuzzle(i);
      kinds.add(p.kind);
      expect(makePuzzle(i)).toEqual(p);
    }
    expect(kinds.size).toBe(3);
  });
});

describe("effective view after patch", () => {
  it("useBundledRules stops updates", () => {
    expect(applyPatch(base(), { op: "useBundledRules" }).ruleUpdates).toBe(false);
  });
  it("wikipedia consent sets the web source", () => {
    expect(applyPatch(base(), { op: "setGlobal", key: "wikipedia", value: true }).webSources.wikipedia).toBe(true);
  });
});
