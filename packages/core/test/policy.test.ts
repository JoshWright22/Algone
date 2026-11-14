import { APPS, SITES } from "@algone/rules";
import { describe, expect, it } from "vitest";
import {
  applyPatch, defaultSettings, describePatch, diffSettings, isWeakening, nextRevision, parsePolicy,
  activeAndroidRules, applyPolicyText, planSync, policyFromSettings, settingsFromPolicy, validatePolicy,
  type Patch, type Settings,
} from "../src/index";

const NOW = new Date(2026, 10, 10, 12, 0, 0).getTime();
const base = () => defaultSettings(SITES);
const here = { platform: "chrome", deviceId: "pc-1", local: { theme: "dark" as const, breakUntil: 0, barrier: base().barrier } };
const apply = (s: Settings, patches: Patch[]) => patches.reduce(applyPatch, s);

describe("policy file", () => {
  it("round-trips settings, keeping the theme on the device", () => {
    const s = applyPatch(base(), { op: "setMode", site: "youtube", mode: "random" });
    const p = policyFromSettings({ ...s, theme: "light" }, 3, "pc-1", NOW);
    expect(p.settings).not.toHaveProperty("theme");
    const r = parsePolicy(JSON.stringify(p), SITES);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const back = settingsFromPolicy(r.policy, SITES, here);
    expect(back).toEqual({ ...s, theme: "dark" });
  });

  it("fills settings an agent left out", () => {
    const r = validatePolicy(
      { schema: "algone-policy/1", rev: 1, updatedAt: "x", updatedBy: "agent:claude",
        settings: { sites: { youtube: { mode: "tuned" } }, barrier: { type: "pause", seconds: 30 } } },
      SITES,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.policy.settings.sites.youtube?.mode).toBe("tuned");
    expect(r.policy.settings.sites.youtube?.tuned.blockKeywords).toEqual([]);
    expect(r.policy.settings.sites.reddit?.mode).toBe("nofeed");
  });

  it.each([
    ["bad JSON", "{"],
    ["wrong schema", { schema: "algone-policy/9" }],
    ["unknown mode", { sites: { youtube: { mode: "everything" } } }],
    ["unknown site", { sites: { myspace: {} } }],
    ["unknown setting", { volume: 11 }],
    ["theme in shared settings", { theme: "dark" }],
    ["pause too short", { barrier: { type: "pause", seconds: 1 } }],
    ["bad schedule time", { barrier: { type: "schedule", windows: [{ days: [1], start: "25:00", end: "26:00" }] } }],
    ["string for boolean", { stopAtEnd: "yes" }],
    ["lock in a lock", { barrier: { type: "locked", until: 1, escapeUsed: false, after: { type: "locked", until: 1, escapeUsed: false, after: { type: "pause", seconds: 30 } } } }],
  ])("rejects %s", (_name, change) => {
    const p = policyFromSettings(base(), 1, "pc-1", NOW);
    const text = typeof change === "string" ? change : JSON.stringify({ ...p, ...("schema" in change ? change : { settings: { ...p.settings, ...change } }) });
    const r = parsePolicy(text, SITES);
    expect(r.ok).toBe(false);
  });

  it("checks native app entries", () => {
    const p = policyFromSettings(base(), 1, "pc-1", NOW);
    const withApps = (apps: object) => ({ ...p, settings: { ...p.settings, apps } });
    const ok = withApps({ android: { youtube: { mode: "cover", shortVideo: true } }, ios: { instagram: { mode: "limit", minutes: 20 } } });
    expect(validatePolicy(ok, SITES).ok).toBe(true);
    expect(validatePolicy(withApps({ ios: { instagram: { mode: "limit" } } }), SITES).ok).toBe(false);
    expect(validatePolicy(withApps({ windows: {} }), SITES).ok).toBe(false);
  });

  it("keeps break mode and barrier progress on the device", () => {
    let s = applyPatch(base(), { op: "startBreak", until: NOW + 1000 });
    s = { ...s, barrier: { type: "locked", until: NOW + 5000, escapeUsed: true, after: { type: "pause", seconds: 30 } } };
    const p = policyFromSettings(s, 1, "pc-1", NOW);
    expect(p.settings).not.toHaveProperty("breakUntil");
    expect(p.settings.barrier).toMatchObject({ escapeUsed: false });
    const back = settingsFromPolicy(p, SITES, { ...here, local: { theme: "dark", breakUntil: 7, barrier: s.barrier } });
    expect(back.breakUntil).toBe(7);
    expect(back.barrier).toMatchObject({ escapeUsed: true });
    expect(validatePolicy({ ...p, settings: { ...p.settings, breakUntil: 5 } }, SITES).ok).toBe(false);
  });

  it("applies platform then device overrides", () => {
    const p = policyFromSettings(base(), 1, "pc-1", NOW);
    p.overrides = {
      "platform:chrome": { sites: { youtube: { mode: "random" } }, snoozeMinutes: 5 },
      "device:pc-1": { sites: { youtube: { mode: "tuned" } } },
    };
    expect(validatePolicy(p, SITES).ok).toBe(true);
    const s = settingsFromPolicy(p, SITES, here);
    expect(s.sites.youtube?.mode).toBe("tuned");
    expect(s.snoozeMinutes).toBe(5);
    expect(settingsFromPolicy(p, SITES, { ...here, platform: "firefox", deviceId: "x" }).sites.youtube?.mode).toBe("nofeed");
  });

  it("counts revisions", () => {
    const p = policyFromSettings(base(), 4, "pc-1", NOW);
    const n = nextRevision(p, p.settings, "agent:claude", NOW + 1);
    expect([n.rev, n.updatedBy]).toEqual([5, "agent:claude"]);
  });
});

describe("sync plan", () => {
  it("diff reproduces the target", () => {
    let to = applyPatch(base(), { op: "setMode", site: "youtube", mode: "custom" });
    to = applyPatch(to, { op: "setElement", site: "reddit", element: "comments", hidden: true });
    to = applyPatch(to, { op: "setBarrier", barrier: { type: "typing", length: 40 } });
    to = applyPatch(to, { op: "setGlobal", key: "wikipedia", value: true });
    to = applyPatch(to, { op: "setTuned", site: "youtube", filters: { ...to.sites.youtube!.tuned, blockKeywords: ["prank"] } });
    const patches = diffSettings(base(), to, SITES);
    expect(apply(base(), patches)).toEqual(to);
    expect(diffSettings(to, to, SITES)).toEqual([]);
  });

  it("ignores the theme and break mode", () => {
    expect(diffSettings(base(), { ...base(), theme: "light", breakUntil: 9 }, SITES)).toEqual([]);
  });

  it("diffs the new settings", () => {
    let to = applyPatch(base(), { op: "setHealthy", batchSize: 5 });
    to = applyPatch(to, { op: "setAvoid", ids: ["outrage"] });
    to = applyPatch(to, { op: "setActivities", items: ["Walk"] });
    to = applyPatch(to, { op: "setApp", platform: "android", app: "tiktok", config: { mode: "block" } });
    expect(apply(base(), diffSettings(base(), to, SITES))).toEqual(to);
    const plan = planSync(base(), to, SITES);
    expect(plan.pending).toEqual([{ op: "setAvoid", ids: ["outrage"] }]);
  });

  it("applies stricter changes now and holds looser ones for the barrier", () => {
    let local = applyPatch(base(), { op: "setMode", site: "reddit", mode: "tuned" });
    local = applyPatch(local, { op: "setGlobal", key: "snoozeMinutes", value: 10 });
    let remote = applyPatch(base(), { op: "setElement", site: "youtube", element: "comments", hidden: true });
    remote = applyPatch(remote, { op: "setSiteEnabled", site: "x", enabled: false });
    remote = applyPatch(remote, { op: "setMode", site: "reddit", mode: "nofeed" });
    remote = applyPatch(remote, { op: "setGlobal", key: "snoozeMinutes", value: 60 });
    const plan = planSync(local, remote, SITES);
    const now = apply(local, plan.applyNow);
    expect(now.sites.youtube?.elements.comments).toBe(true);
    expect(now.sites.reddit?.mode).toBe("nofeed");
    expect(now.sites.x?.enabled).toBe(true);
    expect(now.snoozeMinutes).toBe(10);
    expect(plan.pending).toEqual([
      { op: "setSiteEnabled", site: "x", enabled: false },
      { op: "setGlobal", key: "snoozeMinutes", value: 60 },
    ]);
    expect(apply(now, plan.pending)).toEqual(remote);
  });

  it("a stricter barrier lands before the looser changes wait on it", () => {
    let remote = applyPatch(base(), { op: "setBarrier", barrier: { type: "pause", seconds: 90 } });
    remote = applyPatch(remote, { op: "setElement", site: "youtube", element: "home", hidden: false });
    const plan = planSync(base(), remote, SITES);
    expect(plan.applyNow).toEqual([{ op: "setBarrier", barrier: { type: "pause", seconds: 90 } }]);
    expect(plan.pending).toHaveLength(1);
  });

  it("a weaker barrier waits", () => {
    const remote = applyPatch(base(), { op: "setBarrier", barrier: { type: "pause", seconds: 10 } });
    expect(planSync(base(), remote, SITES).pending).toHaveLength(1);
  });

  it("an agent turning everything off gets no free pass", () => {
    let remote = base();
    for (const site of SITES) remote = applyPatch(remote, { op: "setSiteEnabled", site: site.id, enabled: false });
    const plan = planSync(base(), remote, SITES);
    expect(plan.applyNow).toEqual([]);
    expect(plan.pending).toHaveLength(SITES.length);
  });

  it("a batch is weakening if any part is, and is described", () => {
    const tight: Patch = { op: "setElement", site: "youtube", element: "comments", hidden: true };
    const loose: Patch = { op: "setSiteEnabled", site: "youtube", enabled: false };
    expect(isWeakening(base(), { op: "batch", patches: [tight], source: "sync" }, SITES)).toBe(false);
    const batch: Patch = { op: "batch", patches: [tight, loose], source: "sync" };
    expect(isWeakening(base(), batch, SITES)).toBe(true);
    expect(describePatch(batch)).toBe("Loosen 2 settings from sync");
    expect(applyPatch(base(), batch).sites.youtube?.enabled).toBe(false);
  });
});

describe("barriers in the policy", () => {
  it("keeps a partner password on its device and shares a stand-in", () => {
    const partner = { type: "partner" as const, salt: "s", hash: "h", iterations: 600_000, recoveryAt: null };
    const s = { ...base(), barrier: partner };
    const p = policyFromSettings(s, 1, "pc-1", NOW);
    expect(p.settings.barrier).toEqual({ type: "typing", length: 200 });
    expect(JSON.stringify(p)).not.toContain('"h"');
    expect(settingsFromPolicy(p, SITES, { ...here, local: { theme: "dark", breakUntil: 0, barrier: partner } }).barrier).toEqual(partner);
    expect(validatePolicy({ ...p, settings: { ...p.settings, barrier: partner } }, SITES).ok).toBe(false);
  });
  it("re-sending a lock does not give a fresh escape", () => {
    const lock = (until: number, escapeUsed: boolean) => ({ type: "locked" as const, until, escapeUsed, after: { type: "pause" as const, seconds: 30 } });
    const p = policyFromSettings({ ...base(), barrier: lock(NOW + 5000, false) }, 1, "pc-1", NOW);
    const local = { theme: "dark" as const, breakUntil: 0, barrier: lock(NOW + 4000, true) };
    expect(settingsFromPolicy(p, SITES, { ...here, local }).barrier).toMatchObject({ escapeUsed: true, until: NOW + 5000 });
  });
  it("refuses a daily limit of zero", () => {
    const p = policyFromSettings(base(), 1, "pc-1", NOW);
    expect(validatePolicy({ ...p, settings: { ...p.settings, barrier: { type: "daily", limit: 0, step: "pause" } } }, SITES).ok).toBe(false);
  });
});

describe("applying a policy file", () => {
  const where = { platform: "chrome", deviceId: "pc-1" };
  it("applies stricter changes and holds looser ones as one pending change", () => {
    let remote = applyPatch(base(), { op: "setElement", site: "youtube", element: "comments", hidden: true });
    remote = applyPatch(remote, { op: "setSiteEnabled", site: "reddit", enabled: false });
    const text = JSON.stringify(policyFromSettings(remote, 7, "agent:claude", NOW));
    const r = applyPolicyText(base(), text, SITES, where, "an imported file", NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.settings.sites.youtube?.elements.comments).toBe(true);
    expect(r.settings.sites.reddit?.enabled).toBe(true);
    expect(r.pending?.label).toBe("Loosen 1 setting from an imported file");
    expect(r.rev).toBe(7);
  });
  it("refuses a lock longer than 7 days, even onto a locked device", () => {
    const lock = (until: number) => ({ type: "locked" as const, until, escapeUsed: false, after: { type: "pause" as const, seconds: 30 } });
    const local = { ...base(), barrier: lock(NOW + 60_000) };
    const text = JSON.stringify(policyFromSettings({ ...base(), barrier: lock(9e15) }, 2, "agent:x", NOW));
    expect(applyPolicyText(local, text, SITES, where, "x", NOW)).toMatchObject({ ok: false, error: expect.stringMatching(/7 days/) });
  });
  it("round-trips a lock over a partner password without a change", () => {
    const partner = { type: "partner" as const, salt: "s", hash: "h", iterations: 600_000, recoveryAt: null };
    const local = { ...base(), barrier: { type: "locked" as const, until: NOW + 60_000, escapeUsed: false, after: partner } };
    const text = JSON.stringify(policyFromSettings(local, 2, "pc-1", NOW));
    const r = applyPolicyText(local, text, SITES, where, "x", NOW);
    expect(r).toMatchObject({ ok: true, applied: 0, pending: null });
  });
  it("reports a bad file and changes nothing", () => {
    expect(applyPolicyText(base(), "{}", SITES, where, "x", NOW)).toMatchObject({ ok: false });
  });
});

describe("Android app rules", () => {
  it("start with short video blocked and TikTok closed", () => {
    const rules = activeAndroidRules(base(), APPS, NOW);
    const yt = rules.find((r) => r.packages.includes("com.google.android.youtube"))!;
    expect(yt.screens.map((s) => s.kind)).toEqual(["shortVideo"]);
    const tt = rules.find((r) => r.packages.includes("com.zhiliaoapp.musically"))!;
    expect(tt.screens).toEqual([expect.objectContaining({ action: "home", match: { always: true } })]);
  });
  it("follow the settings: allow turns an app off, cover adds feed screens", () => {
    let s = applyPatch(base(), { op: "setApp", platform: "android", app: "youtube", config: { mode: "allow" } });
    s = applyPatch(s, { op: "setApp", platform: "android", app: "instagram", config: { mode: "cover", shortVideo: true } });
    const rules = activeAndroidRules(s, APPS, NOW);
    expect(rules.some((r) => r.packages.includes("com.google.android.youtube"))).toBe(false);
    expect(rules.find((r) => r.packages.includes("com.instagram.android"))!.screens.map((x) => x.id)).toEqual(["reels", "explore"]);
  });
  it("a break opens feeds but keeps short video closed", () => {
    const s = applyPatch(base(), { op: "startBreak", until: NOW + 60_000 });
    const rules = activeAndroidRules(s, APPS, NOW);
    expect(rules.every((r) => r.screens.every((x) => x.kind === "shortVideo"))).toBe(true);
    expect(rules.find((r) => r.packages.includes("com.zhiliaoapp.musically"))).toBeDefined();
  });
});

describe("recommendation rules", () => {
  it("are in the policy, checked, and loosen only through the barrier", () => {
    const p = policyFromSettings(base(), 1, "pc-1", NOW);
    expect(p.settings.recommend.maxPerDay).toBe(10);
    expect(p.settings.sources[0]?.kind).toBe("hn");
    const withRules = (recommend: object) => ({ ...p, settings: { ...p.settings, recommend } });
    expect(validatePolicy(withRules({ want: ["woodworking"], drop: ["true crime"], maxPerDay: 5 }), SITES).ok).toBe(true);
    expect(validatePolicy(withRules({ maxPerDay: 500 }), SITES).ok).toBe(false);
    expect(validatePolicy(withRules({ mood: "x" }), SITES).ok).toBe(false);
    expect(validatePolicy({ ...p, settings: { ...p.settings, sources: [{ kind: "rss", url: "http://x.example/feed", title: "x" }] } }, SITES).ok).toBe(false);

    let s = applyPatch(base(), { op: "setRecommend", rules: { drop: ["true crime"], maxPerDay: 5 } });
    const plan = (to: Settings) => planSync(s, to, SITES);
    expect(plan(applyPatch(s, { op: "setRecommend", rules: { drop: ["true crime", "polls"] } })).pending).toEqual([]);
    expect(plan(applyPatch(s, { op: "setRecommend", rules: { drop: [] } })).pending).toHaveLength(1);
    expect(plan(applyPatch(s, { op: "setRecommend", rules: { maxPerDay: 20 } })).pending).toHaveLength(1);
    expect(plan(applyPatch(s, { op: "setRecommend", rules: { want: ["chess"] } })).pending).toEqual([]);
    s = applyPatch(s, { op: "addOpenSource", source: { kind: "rss", url: "https://example.com/feed.xml", title: "Example" } });
    expect(s.sources).toHaveLength(2);
    expect(applyPatch(s, { op: "removeOpenSource", url: "https://example.com/feed.xml" }).sources).toHaveLength(1);
  });
});
