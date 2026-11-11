import { POLICY_FILE, type Fetch } from "@algone/core";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@react-native-async-storage/async-storage", () => ({ default: {} }));

import { createStore, outboxOf, STATE_KEY, type KeyValue } from "../src/store";
import { connectSync, runSync, startSyncLoop, SYNC_SOON_MS } from "../src/sync";

const NOW = new Date(2026, 10, 10, 12).getTime();
const TOKEN = "github_pat_0123456789abcdefghij";

function memory(): KeyValue & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: async (k) => data.get(k) ?? null, setItem: async (k, v) => void data.set(k, v) };
}

async function device() {
  const kv = memory();
  const store = createStore(kv, () => NOW);
  await store.load(0);
  return { store, kv };
}

/** A tiny in-memory GitHub Gist API, shared by every "device" in a test. */
function fakeGitHub(token = TOKEN) {
  const gists = new Map<string, { files: Record<string, { content: string }>; history: string[] }>();
  let n = 0;
  let revoked = false;
  const calls: string[] = [];
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
  const view = (id: string) => {
    const g = gists.get(id)!;
    return { id, files: g.files, history: g.history.map((version) => ({ version })) };
  };
  const f: Fetch = async (url, init = {}) => {
    const method = init.method ?? "GET";
    const path = url.replace("https://api.github.com", "");
    calls.push(`${method} ${path}`);
    if (revoked || (init.headers as Record<string, string>).Authorization !== `Bearer ${token}`) return json({}, 401);
    if (method === "GET" && path.startsWith("/gists?")) return json([...gists.keys()].map(view));
    if (method === "POST" && path === "/gists") {
      const id = `g${++n}`;
      gists.set(id, { files: JSON.parse(String(init.body)).files, history: [`v${++n}`] });
      return json(view(id), 201);
    }
    const id = path.split("/")[2]!;
    const g = gists.get(id);
    if (!g) return json({}, 404);
    if (method === "PATCH") {
      Object.assign(g.files, JSON.parse(String(init.body)).files);
      g.history.unshift(`v${++n}`);
    }
    return json(view(id));
  };
  return {
    f,
    calls,
    revoke: () => void (revoked = true),
    policy: () => JSON.parse([...gists.values()][0]!.files[POLICY_FILE]!.content),
  };
}

afterEach(() => vi.useRealTimers());

describe("settings file", () => {
  it("exports a policy that another device imports, stricter at once", async () => {
    const a = await device();
    await a.store.patch({ op: "setMode", site: "youtube", mode: "nofeed" });
    const text = a.store.exportPolicy();
    expect(JSON.parse(text).schema).toBe("algone-policy/1");
    const b = await device();
    const r = await b.store.importPolicy(text, "android");
    expect(r).toMatchObject({ ok: true, applied: 1 });
    expect(r.needsBarrier).toBeUndefined();
    expect(b.store.get().settings.sites.youtube!.mode).toBe("nofeed");
  });

  it("looser settings in a file wait for the barrier", async () => {
    const a = await device();
    await a.store.patch({ op: "setMode", site: "youtube", mode: "tuned" });
    await a.store.barrierPass();
    const b = await device();
    const r = await b.store.importPolicy(a.store.exportPolicy(), "android");
    expect(r).toMatchObject({ ok: true, needsBarrier: true });
    expect(b.store.get().settings.sites.youtube!.mode).toBe("healthy");
    expect(b.store.get().runtime.pending?.kind).toBe("patch");
    expect((await b.store.barrierPass()).ok).toBe(true);
    expect(b.store.get().settings.sites.youtube!.mode).toBe("tuned");
  });

  it("a bad file changes nothing", async () => {
    const b = await device();
    const before = b.store.get().settings;
    for (const text of ["", "not json", JSON.stringify({ schema: "other" })]) {
      expect((await b.store.importPolicy(text, "android")).ok).toBe(false);
    }
    expect(b.store.get().settings).toBe(before);
  });

  it("the partner password does not leave the device", async () => {
    const a = await device();
    await a.store.patch({
      op: "setBarrier",
      barrier: { type: "partner", salt: "SALTSALT", hash: "HASHHASH", iterations: 100_000, recoveryAt: null },
    });
    await a.store.barrierPass();
    expect(a.store.exportPolicy()).not.toMatch(/SALTSALT|HASHHASH/);
  });
});

describe("sync", () => {
  it("refuses a token that does not look like one, without a request", async () => {
    const gh = fakeGitHub();
    const a = await device();
    expect((await connectSync(a.store, "nope", "android", gh.f)).ok).toBe(false);
    expect(gh.calls).toEqual([]);
    expect(a.store.get().syncToken).toBe("");
  });

  it("forgets a token GitHub refuses", async () => {
    const gh = fakeGitHub("other");
    const a = await device();
    const r = await connectSync(a.store, TOKEN, "android", gh.f);
    expect(r.ok).toBe(false);
    expect(a.store.get().syncToken).toBe("");
  });

  it("carries stricter changes between devices at once, and looser ones through the barrier", async () => {
    const gh = fakeGitHub();
    const a = await device();
    const b = await device();
    await a.store.patch({ op: "setMode", site: "youtube", mode: "nofeed" });
    expect((await connectSync(a.store, TOKEN, "android", gh.f)).ok).toBe(true);
    expect(gh.policy().settings.sites.youtube.mode).toBe("nofeed");
    // The token is kept in the app's own storage, with the rest of the state.
    expect(JSON.parse(a.kv.data.get(STATE_KEY)!).syncToken).toBe(TOKEN);

    expect((await connectSync(b.store, TOKEN, "ios", gh.f)).ok).toBe(true);
    expect(b.store.get().settings.sites.youtube!.mode).toBe("nofeed");
    expect(b.store.get().sync.base).toEqual(b.store.get().settings);

    // Stricter on b: sent, then applied on a without a barrier.
    await b.store.patch({ op: "setHealthy", batchSize: 5 });
    expect(outboxOf(b.store.get())).toHaveLength(1);
    expect((await runSync(b.store, "ios", gh.f)).ok).toBe(true);
    expect(outboxOf(b.store.get())).toEqual([]);
    expect((await runSync(a.store, "android", gh.f)).ok).toBe(true);
    expect(a.store.get().settings.healthy.batchSize).toBe(5);

    // Looser on b: through b's barrier, then a waits for its own.
    await b.store.patch({ op: "setHealthy", dailyBudgetMinutes: 60 });
    await b.store.barrierPass();
    await runSync(b.store, "ios", gh.f);
    await runSync(a.store, "android", gh.f);
    expect(a.store.get().settings.healthy.dailyBudgetMinutes).toBe(30);
    expect(a.store.get().sync.pending).not.toBeNull();
    expect(await a.store.syncReview()).toEqual({ ok: true, needsBarrier: true });
    expect(a.store.get().sync.pending).toBeNull();
    expect((await a.store.barrierPass()).ok).toBe(true);
    expect(a.store.get().settings.healthy.dailyBudgetMinutes).toBe(60);
  });

  it("keeps theme and breaks on the device", async () => {
    const gh = fakeGitHub();
    const a = await device();
    await connectSync(a.store, TOKEN, "android", gh.f);
    await a.store.patch({ op: "setGlobal", key: "theme", value: "light" });
    expect(outboxOf(a.store.get())).toEqual([]);
  });

  it("a change made while a round is out is kept and sent next time", async () => {
    const gh = fakeGitHub();
    const a = await device();
    await connectSync(a.store, TOKEN, "android", gh.f);
    const round = runSync(a.store, "android", gh.f);
    await a.store.patch({ op: "setMode", site: "reddit", mode: "nofeed" });
    expect((await round).ok).toBe(true);
    expect(a.store.get().settings.sites.reddit!.mode).toBe("nofeed");
    expect(outboxOf(a.store.get()).length).toBeGreaterThan(0);
    await runSync(a.store, "android", gh.f);
    expect(gh.policy().settings.sites.reddit.mode).toBe("nofeed");
  });

  it("a revoked token keeps the settings and shows the problem", async () => {
    const gh = fakeGitHub();
    const a = await device();
    await connectSync(a.store, TOKEN, "android", gh.f);
    gh.revoke();
    const before = a.store.get().settings;
    const r = await runSync(a.store, "android", gh.f);
    expect(r.ok).toBe(false);
    expect(a.store.get().settings).toBe(before);
    expect(a.store.get().sync.lastError).toMatch(/Sign in again/);
    await a.store.syncDisconnect();
    expect(a.store.get().syncToken).toBe("");
    expect(a.store.get().settings).toBe(before);
  });

  it("sends a settings change half a minute later, once", async () => {
    const gh = fakeGitHub();
    const a = await device();
    await connectSync(a.store, TOKEN, "android", gh.f);
    vi.useFakeTimers();
    const stop = startSyncLoop(a.store, "android", gh.f);
    await a.store.patch({ op: "setMode", site: "reddit", mode: "nofeed" });
    await a.store.patch({ op: "setMode", site: "x", mode: "nofeed" });
    const before = gh.calls.length;
    await vi.advanceTimersByTimeAsync(SYNC_SOON_MS - 1000);
    expect(gh.calls.length).toBe(before);
    await vi.advanceTimersByTimeAsync(2000);
    stop();
    vi.useRealTimers();
    await vi.waitFor(() => expect(outboxOf(a.store.get())).toEqual([]));
    expect(gh.calls.filter((c) => c.startsWith("PATCH"))).toHaveLength(1);
    expect(gh.policy().settings.sites.x.mode).toBe("nofeed");
  });
});
