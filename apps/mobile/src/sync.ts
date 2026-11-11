import { GistError, syncOnce, type Fetch } from "@algone/core";
import { SITES } from "@algone/rules";
import { outboxOf, type Result, type Store } from "./store";

/** A settings change is sent half a minute later, so a burst of taps is one write. */
export const SYNC_SOON_MS = 30_000;
const SYNC_EVERY_MS = 15 * 60_000;

const netFetch: Fetch = (url, init) => fetch(url, init);

let running: Promise<Result> | null = null;

/** One round at a time. Never throws: problems are kept in `sync.lastError`. */
export function runSync(store: Store, platform: string, f: Fetch = netFetch, now: () => number = Date.now): Promise<Result> {
  running ??= round(store, platform, f, now).finally(() => {
    running = null;
  });
  return running;
}

async function round(store: Store, platform: string, f: Fetch, now: () => number): Promise<Result> {
  const s = store.get();
  const token = s.syncToken;
  if (!token) return { ok: false, error: "Not signed in" };
  const { base: _base, ...state } = s.sync;
  try {
    const r = await syncOnce(f, token, { ...state, outbox: outboxOf(s) }, s.settings, SITES,
      { platform, deviceId: s.device }, now());
    return await store.syncFinish(token, s.settings, r);
  } catch (e) {
    return store.syncFailed(token, e instanceof GistError ? e.message : String(e));
  }
}

/** Keeps a token only if the first round works with it, as the extension does. */
export async function connectSync(store: Store, token: string, platform: string, f: Fetch = netFetch): Promise<Result> {
  const t = token.trim();
  if (!/^[\w-]{20,255}$/.test(t)) return { ok: false, error: "That does not look like a GitHub token." };
  await store.syncConnect(t);
  const r = await runSync(store, platform, f);
  if (!r.ok) await store.syncDisconnect();
  return r;
}

/** Sends this device's changes soon after they are made, and checks in now and then. */
export function startSyncLoop(store: Store, platform: string, f: Fetch = netFetch): () => void {
  let last = store.get().settings;
  let soon: ReturnType<typeof setTimeout> | undefined;
  const unsubscribe = store.subscribe(() => {
    const s = store.get();
    if (s.settings === last) return;
    last = s.settings;
    if (!s.syncToken || !outboxOf(s).length) return;
    clearTimeout(soon);
    soon = setTimeout(() => void runSync(store, platform, f), SYNC_SOON_MS);
  });
  const every = setInterval(() => {
    if (store.get().syncToken) void runSync(store, platform, f);
  }, SYNC_EVERY_MS);
  return () => {
    unsubscribe();
    clearTimeout(soon);
    clearInterval(every);
  };
}
