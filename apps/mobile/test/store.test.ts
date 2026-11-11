import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { createPartnerBarrier, MOBILE_ITERATIONS, webKdf, verifyPassword, type Overlay, type Patch } from "@algone/core";
import { describe, expect, it, vi } from "vitest";

vi.mock("@react-native-async-storage/async-storage", () => ({ default: {} }));

import { mobileKdf } from "../src/kdf";
import { checkRules } from "../src/rules";
import { launchPauseSeen, markLaunchPauseSeen } from "../src/session";
import { activeBarrier, createStore, STATE_KEY, type KeyValue } from "../src/store";

function memory(initial?: string): KeyValue & { data: Map<string, string>; writes: string[] } {
  const data = new Map<string, string>(initial ? [[STATE_KEY, initial]] : []);
  const writes: string[] = [];
  return {
    data,
    writes,
    getItem: async (k) => data.get(k) ?? null,
    async setItem(k, v) {
      await new Promise((r) => setTimeout(r, Math.random() * 3));
      data.set(k, v);
      writes.push(v);
    },
  };
}

const saved = (kv: ReturnType<typeof memory>) => JSON.parse(kv.data.get(STATE_KEY)!);

async function ready(kv = memory(), clock?: () => number) {
  const store = createStore(kv, clock);
  await store.load(0);
  return { store, kv };
}

describe("store", () => {
  it("concurrent commands do not lose updates", async () => {
    const { store, kv } = await ready();
    await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        store.queueAdd({ url: `https://example.com/${i}`, title: `t${i}`, site: "" }),
      ),
    );
    expect(store.get().queue).toHaveLength(20);
    expect(saved(kv).queue).toHaveLength(20);
  });

  it("persists before anything can read the new state, and a failed write changes nothing", async () => {
    const kv = memory();
    const { store } = await ready(kv);
    kv.setItem = async () => {
      throw new Error("disk full");
    };
    const r = await store.queueAdd({ url: "https://example.com/", title: "t", site: "" });
    expect(r.ok).toBe(false);
    expect(store.get().queue).toEqual([]);
  });

  it("no other source file touches storage", () => {
    const src = join(__dirname, "../src");
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((f) => {
        const p = join(dir, f);
        return statSync(p).isDirectory() ? walk(p) : [p];
      });
    const users = walk(src).filter((f) => /async-storage|AsyncStorage/.test(readFileSync(f, "utf8")));
    expect(users.map((f) => f.slice(src.length + 1))).toEqual(["store.ts"]);
  });

  it("a corrupt record loads as defaults, and pending does not survive a restart", async () => {
    const { store } = await ready(memory("{broken"));
    expect(store.get().settings.barrier).toEqual({ type: "pause", seconds: 30 });
    await store.requestSnooze("youtube");
    expect(store.get().runtime.pending).not.toBeNull();
    const restarted = createStore({ getItem: async () => JSON.stringify(store.get()), setItem: async () => {} });
    await restarted.load(0);
    expect(restarted.get().runtime.pending).toBeNull();
  });

  it("weakening waits for the barrier, tightening does not", async () => {
    const { store } = await ready();
    expect(await store.patch({ op: "setMode", site: "youtube", mode: "custom" })).toEqual({ ok: true, needsBarrier: true });
    expect(store.get().settings.sites.youtube!.mode).toBe("healthy");
    expect((await store.barrierPass()).ok).toBe(true);
    expect(store.get().settings.sites.youtube!.mode).toBe("custom");
    expect(store.get().runtime.pending).toBeNull();
    expect(store.get().runtime.stats).toMatchObject({ started: 1, completed: 1 });
    expect(await store.patch({ op: "setMode", site: "youtube", mode: "nofeed" })).toEqual({ ok: true });
    expect(store.get().settings.sites.youtube!.mode).toBe("nofeed");
  });

  it("Never mind applies nothing", async () => {
    const { store } = await ready();
    await store.requestSnooze("youtube");
    await store.barrierCancel();
    expect(store.get().runtime.snoozes).toEqual({});
    expect(store.get().runtime.stats.dismissed).toBe(1);
    expect((await store.barrierPass()).ok).toBe(false);
  });

  it("a snooze starts only after the barrier passes", async () => {
    const { store } = await ready(memory(), () => 1000);
    await store.requestSnooze("youtube");
    expect(store.get().runtime.snoozes).toEqual({});
    await store.barrierPass();
    expect(store.get().runtime.snoozes.youtube).toEqual({ until: 1000 + 10 * 60_000 });
    await store.endSnooze("youtube");
    expect(store.get().runtime.snoozes).toEqual({});
  });

  it("a blocked barrier refuses a pass, and the one escape works once", async () => {
    const { store } = await ready(memory(), () => 1000);
    const lock = { type: "locked" as const, until: 2_000_000, escapeUsed: false, after: { type: "pause" as const, seconds: 30 } };
    await store.patch({ op: "setBarrier", barrier: lock });
    await store.barrierPass();
    expect(store.get().settings.barrier.type).toBe("locked");
    await store.requestSnooze("youtube");
    expect((await store.barrierPass()).ok).toBe(false);
    expect((await store.barrierEscape()).ok).toBe(true);
    expect(store.get().runtime.snoozes.youtube).toBeTruthy();
    await store.requestSnooze("youtube");
    expect((await store.barrierEscape()).ok).toBe(false);
  });

  it("an expired lock checks the barrier it returns to", () => {
    const after = { type: "partner" as const, salt: "s", hash: "h", iterations: 1, recoveryAt: null };
    expect(activeBarrier({ type: "locked", until: 5, escapeUsed: false, after }, 6)).toBe(after);
  });

  it("every change passes validatePatch first, and a bad one changes nothing", async () => {
    const { store } = await ready();
    const before = store.get().settings;
    for (const patch of [
      { op: "setHealthy", batchSize: 0 },
      { op: "setHealthy", dailyBudgetMinutes: 99_999 },
      { op: "setAvoid", ids: ["nonsense"] },
      { op: "setActivities", items: Array.from({ length: 21 }, () => "walk") },
      { op: "setMode", site: "nosuchsite", mode: "nofeed" },
      { op: "startBreak", until: Number.NaN },
    ] as Patch[]) {
      const r = await store.patch(patch);
      expect(r.ok).toBe(false);
      expect(r.needsBarrier).toBeUndefined();
    }
    expect(store.get().settings).toBe(before);
    expect(store.get().runtime.pending).toBeNull();
  });

  it("healthy settings: stricter applies at once, looser waits", async () => {
    const { store } = await ready();
    expect(await store.patch({ op: "setHealthy", batchSize: 5 })).toEqual({ ok: true });
    expect(store.get().settings.healthy.batchSize).toBe(5);
    expect((await store.patch({ op: "setHealthy", dailyBudgetMinutes: 60 })).needsBarrier).toBe(true);
    await store.barrierCancel();
    expect(store.get().settings.healthy.dailyBudgetMinutes).toBe(30);
    expect((await store.patch({ op: "setAvoid", ids: ["outrage"] })).needsBarrier).toBe(true);
    await store.barrierCancel();
    expect(await store.patch({ op: "setActivities", items: ["Call a friend"] })).toEqual({ ok: true });
    expect(store.get().settings.activities).toEqual(["Call a friend"]);
  });

  it("a break goes through the barrier, records lastBreakAt, and only one a week", async () => {
    let t = 1_800_000_000_000;
    const { store } = await ready(memory(), () => t);
    expect((await store.patch({ op: "startBreak", until: t + 25 * 3_600_000 })).ok).toBe(false);
    expect((await store.patch({ op: "startBreak", until: t + 3_600_000 })).needsBarrier).toBe(true);
    expect(store.get().settings.breakUntil).toBe(0);
    expect((await store.barrierPass()).ok).toBe(true);
    expect(store.get().settings.breakUntil).toBe(t + 3_600_000);
    expect(store.get().runtime.lastBreakAt).toBe(t);
    expect(await store.patch({ op: "endBreak" })).toEqual({ ok: true });
    expect(store.get().settings.breakUntil).toBe(0);
    t += 86_400_000;
    const again = await store.patch({ op: "startBreak", until: t + 3_600_000 });
    expect(again.ok).toBe(false);
    expect(again.error).toMatch(/One break a week/);
  });

  it("a break is checked again when the barrier passes", async () => {
    let t = 1_800_000_000_000;
    const { store } = await ready(memory(), () => t);
    await store.patch({ op: "startBreak", until: t + 3_600_000 });
    // The wait outlasted the break it asked for.
    t += 2 * 3_600_000;
    const r = await store.barrierPass();
    expect(r.ok).toBe(false);
    expect(store.get().settings.breakUntil).toBe(0);
    expect(store.get().runtime.pending).toBeNull();
    expect(store.get().runtime.lastBreakAt).toBe(0);
  });

  it("rejects an invalid barrier", async () => {
    const { store } = await ready();
    const r = await store.patch({ op: "setBarrier", barrier: { type: "pause", seconds: 1 } });
    expect(r.ok).toBe(false);
  });
});

describe("rules update", () => {
  const file = (rev: number) =>
    JSON.stringify({ schema: 1, rev, sites: { youtube: { elements: [{ id: "extraThing", label: "x", group: "g", class: "extra", selectors: [".x"] }] } } });
  const ok = (text: string) => vi.fn(async () => ({ ok: true, status: 200, text: async () => text }));

  it("stores a valid file through the store", async () => {
    const { store, kv } = await ready();
    await checkRules(store, { remote: true, buildRev: 1 }, 10 ** 12, ok(file(5)));
    expect(saved(kv).rulesOverlay.rev).toBe(5);
    expect(store.get().runtime.lastAcceptedRev).toBe(5);
  });

  it("makes no request when REMOTE_RULES is off, or within a day", async () => {
    const { store } = await ready();
    const off = ok(file(5));
    await checkRules(store, { remote: false, buildRev: 1 }, 10 ** 12, off);
    expect(off).not.toHaveBeenCalled();
    await checkRules(store, { remote: true, buildRev: 1 }, 10 ** 12, ok(file(5)));
    const again = ok(file(6));
    await checkRules(store, { remote: true, buildRev: 1 }, 10 ** 12 + 3_600_000, again);
    expect(again).not.toHaveBeenCalled();
  });

  it("keeps the previous overlay on a bad file", async () => {
    const { store } = await ready();
    await checkRules(store, { remote: true, buildRev: 1 }, 10 ** 12, ok(file(5)));
    const before: Overlay | null = store.get().rulesOverlay;
    await checkRules(store, { remote: true, buildRev: 1 }, 2 * 10 ** 12, ok("not json"));
    expect(store.get().rulesOverlay).toEqual(before);
    expect(store.get().runtime.lastRuleError).toBe("not JSON");
  });
});

describe("mobile kdf", () => {
  it("matches WebCrypto, so core's verification works unchanged", async () => {
    expect(await mobileKdf("pässword", "salt", 1000)).toBe(await webKdf("pässword", "salt", 1000));
  });

  it("creates and verifies a partner barrier at MOBILE_ITERATIONS", async () => {
    const barrier = await createPartnerBarrier("hunter2", mobileKdf, MOBILE_ITERATIONS);
    expect(barrier.iterations).toBe(100_000);
    expect(await verifyPassword("hunter2", barrier, mobileKdf)).toBe(true);
    expect(await verifyPassword("wrong", barrier, mobileKdf)).toBe(false);
  });
});

describe("launch pause", () => {
  it("is a per-site boolean, and no timestamp is stored or compared", () => {
    expect(launchPauseSeen("reddit")).toBe(false);
    markLaunchPauseSeen("reddit");
    expect(launchPauseSeen("reddit")).toBe(true);
    expect(launchPauseSeen("youtube")).toBe(false);
    const source = readFileSync(join(__dirname, "../src/session.ts"), "utf8");
    expect(source.replace(/^\/\/.*$/gm, "")).not.toMatch(/Date|now|time/i);
  });
});
