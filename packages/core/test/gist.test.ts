import { SITES } from "@algone/rules";
import { describe, expect, it } from "vitest";
import {
  applyPatch, defaultSettings, emptySyncState, isLocalPatch, pollDeviceFlow, POLICY_FILE, startDeviceFlow, syncOnce,
  type Fetch, type Patch, type Settings, type SyncState,
} from "../src/index";

const NOW = new Date(2026, 10, 10, 12, 0, 0).getTime();
const base = () => defaultSettings(SITES);

/** A tiny in-memory GitHub Gist API. */
function fakeGitHub(token = "t") {
  const gists = new Map<string, { files: Record<string, { content: string }>; history: string[] }>();
  let n = 0;
  const calls: string[] = [];
  /** Runs once, right before the next PATCH lands, to simulate another device. */
  let beforePatch: (() => void) | null = null;
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
  const view = (id: string) => {
    const g = gists.get(id)!;
    return { id, files: g.files, history: g.history.map((version) => ({ version })) };
  };
  const f: Fetch = async (url, init = {}) => {
    const method = init.method ?? "GET";
    const path = url.replace("https://api.github.com", "");
    calls.push(`${method} ${path}`);
    if ((init.headers as Record<string, string>).Authorization !== `Bearer ${token}`) return json({}, 401);
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
      if (beforePatch) {
        const run = beforePatch;
        beforePatch = null;
        run();
      }
      Object.assign(g.files, JSON.parse(String(init.body)).files);
      g.history.unshift(`v${++n}`);
    }
    return json(view(id));
  };
  return {
    f, gists, calls,
    policy: (id: string) => JSON.parse(gists.get(id)!.files[POLICY_FILE]!.content),
    edit(id: string, change: (p: any) => void) {
      const p = JSON.parse(gists.get(id)!.files[POLICY_FILE]!.content);
      change(p);
      p.rev += 1;
      gists.get(id)!.files[POLICY_FILE] = { content: JSON.stringify(p) };
      gists.get(id)!.history.unshift(`v${++n}`);
    },
    onNextPatch(fn: () => void) {
      beforePatch = fn;
    },
  };
}

const pc = { platform: "chrome", deviceId: "pc" };
const phone = { platform: "android", deviceId: "phone" };

async function run(gh: ReturnType<typeof fakeGitHub>, state: SyncState, local: Settings, where = pc) {
  return syncOnce(gh.f, "t", state, local, SITES, where, NOW);
}

describe("gist sync", () => {
  it("the first device creates the Gist from its settings", async () => {
    const gh = fakeGitHub();
    const r = await run(gh, emptySyncState(), base());
    expect(r.state.gistId).toBe("g1");
    expect(gh.policy("g1").settings.sites.youtube.mode).toBe("healthy");
    expect(gh.policy("g1").settings.theme).toBeUndefined();
  });

  it("a second device finds it and applies stricter settings at once", async () => {
    const gh = fakeGitHub();
    const first = await run(gh, emptySyncState(), applyPatch(base(), { op: "setElement", site: "youtube", element: "comments", hidden: true }));
    const r = await run(gh, emptySyncState(), base(), phone);
    expect(r.state.gistId).toBe(first.state.gistId);
    expect(r.settings.sites.youtube?.elements.comments).toBe(true);
    expect(r.state.pending).toBeNull();
  });

  it("an agent's loosening edit waits for the barrier on every device", async () => {
    const gh = fakeGitHub();
    const first = await run(gh, emptySyncState(), base());
    gh.edit("g1", (p) => {
      p.updatedBy = "agent:claude";
      for (const site of Object.values<any>(p.settings.sites)) site.enabled = false;
    });
    const r = await run(gh, first.state, base());
    expect(r.applied).toBe(0);
    expect(Object.values(r.settings.sites).every((s) => s.enabled)).toBe(true);
    expect(r.state.pending?.label).toMatch(/^Loosen 12 settings from another device/);
  });

  it("sends only this device's changes, so it never undoes another device's", async () => {
    const gh = fakeGitHub();
    const first = await run(gh, emptySyncState(), base());
    // The phone turns comments off on YouTube.
    gh.edit("g1", (p) => (p.settings.sites.youtube.elements = { comments: true }));
    // Meanwhile the PC, not yet synced, changes Reddit.
    const patch: Patch = { op: "setElement", site: "reddit", element: "comments", hidden: true };
    const local = applyPatch(base(), patch);
    const r = await run(gh, { ...first.state, outbox: [patch] }, local);
    const p = gh.policy("g1");
    expect(p.settings.sites.youtube.elements.comments).toBe(true);
    expect(p.settings.sites.reddit.elements.comments).toBe(true);
    expect(r.settings.sites.youtube?.elements.comments).toBe(true);
    expect(r.state.outbox).toEqual([]);
  });

  it("this device's unsent tightening is not offered back as a loosening", async () => {
    const gh = fakeGitHub();
    const first = await run(gh, emptySyncState(), base());
    gh.edit("g1", (p) => (p.settings.stopAtEnd = true));
    const patch: Patch = { op: "setElement", site: "youtube", element: "comments", hidden: true };
    const r = await run(gh, { ...first.state, outbox: [patch] }, applyPatch(base(), patch));
    expect(r.state.pending).toBeNull();
    expect(r.settings.sites.youtube?.elements.comments).toBe(true);
  });

  it("retries when another device writes first", async () => {
    const gh = fakeGitHub();
    const first = await run(gh, emptySyncState(), base());
    const patch: Patch = { op: "setElement", site: "reddit", element: "comments", hidden: true };
    // The phone's write lands between our read and our write, with the same rev number.
    gh.onNextPatch(() => gh.edit("g1", (p) => {
      p.rev += 0;
      p.updatedBy = "phone";
      p.settings.sites.x.elements = { comments: true };
    }));
    await expect(run(gh, { ...first.state, outbox: [patch] }, applyPatch(base(), patch))).rejects.toThrow(/Two devices saved at once/);
  });

  it("keeps settings when the file is broken, and says why", async () => {
    const gh = fakeGitHub();
    const first = await run(gh, emptySyncState(), base());
    gh.gists.get("g1")!.files[POLICY_FILE] = { content: "{ nope" };
    await expect(run(gh, first.state, base())).rejects.toThrow(/problem/);
  });

  it("reports a revoked sign-in", async () => {
    const gh = fakeGitHub("other");
    await expect(run(gh, emptySyncState(), base())).rejects.toThrow(/Sign in again/);
  });

  it("theme, breaks and partner passwords never go out", () => {
    expect(isLocalPatch({ op: "setGlobal", key: "theme", value: "dark" })).toBe(true);
    expect(isLocalPatch({ op: "startBreak", until: 1 })).toBe(true);
    expect(isLocalPatch({ op: "setBarrier", barrier: { type: "partner", salt: "", hash: "h", iterations: 1, recoveryAt: null } })).toBe(true);
    expect(isLocalPatch({ op: "setMode", site: "youtube", mode: "nofeed" })).toBe(false);
  });
});

describe("GitHub device flow", () => {
  const reply = (body: unknown) => async () => new Response(JSON.stringify(body));
  it("starts and returns the code to show", async () => {
    const c = await startDeviceFlow(reply({ device_code: "d", user_code: "ABCD-1234", verification_uri: "https://github.com/login/device", interval: 5, expires_in: 900 }), "id", NOW);
    expect(c).toMatchObject({ userCode: "ABCD-1234", interval: 5, expiresAt: NOW + 900_000 });
  });
  it("refuses a sign-in address that is not GitHub", async () => {
    await expect(startDeviceFlow(reply({ device_code: "d", user_code: "x", verification_uri: "https://evil.example/" }), "id", NOW)).rejects.toThrow();
  });
  it.each([
    [{ access_token: "tok" }, { kind: "token", token: "tok" }],
    [{ error: "authorization_pending" }, { kind: "wait", interval: 5 }],
    [{ error: "slow_down", interval: 10 }, { kind: "wait", interval: 10 }],
    [{ error: "access_denied" }, { kind: "failed" }],
  ])("poll %j", async (body, expected) => {
    const code = { deviceCode: "d", userCode: "u", verificationUri: "https://github.com/login/device", interval: 5, expiresAt: NOW };
    expect(await pollDeviceFlow(reply(body), "id", code)).toMatchObject(expected);
  });
});
