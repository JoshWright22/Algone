import type { SiteRule } from "@algone/rules";
import { applyPatch } from "./commands";
import { nextRevision, parsePolicy, policyFromSettings, sharedSettings, type Policy } from "./policy";
import { applyPolicy, type Where } from "./sync";
import type { Patch, Pending, Settings } from "./types";

/**
 * Sync through one secret GitHub Gist the person owns. No Algone server. Every device
 * keeps its own settings as the truth and only ever sends the changes made on it, so one
 * device can never undo another's. What arrives goes through `applyPolicyText`: stricter
 * at once, looser after this device's barrier.
 */

export const POLICY_FILE = "algone-policy.json";
export const GIST_DESCRIPTION = "Algone settings (synced by the Algone extension and app)";
const API = "https://api.github.com";
const MAX_RETRIES = 3;

export type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

/** Kept on this device only. */
export interface SyncState {
  gistId: string;
  /** Highest policy rev applied or declined here. */
  seenRev: number;
  /** Changes made on this device and not yet sent. */
  outbox: Patch[];
  /** Looser changes from other devices, waiting for the person to pass the barrier. */
  pending: Pending | null;
  lastSync: number;
  lastError: string;
}

export const emptySyncState = (): SyncState => ({
  gistId: "",
  seenRev: 0,
  outbox: [],
  pending: null,
  lastSync: 0,
  lastError: "",
});

/** Settings that never leave the device, so they never go in the outbox. */
export function isLocalPatch(p: Patch): boolean {
  if (p.op === "setGlobal" && p.key === "theme") return true;
  if (p.op === "startBreak" || p.op === "endBreak") return true;
  if (p.op === "setBarrier" && p.barrier.type === "partner") return true;
  return false;
}

export class GistError extends Error {
  constructor(message: string, readonly status = 0) {
    super(message);
  }
}

function headers(token: string): HeadersInit {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function call(f: Fetch, token: string, path: string, init: RequestInit = {}): Promise<any> {
  let res: Response;
  try {
    res = await f(`${API}${path}`, {
      ...init,
      cache: "no-store",
      credentials: "omit",
      headers: { ...headers(token), ...(init.body ? { "Content-Type": "application/json" } : {}) },
    });
  } catch {
    throw new GistError("Could not reach GitHub");
  }
  if (res.status === 401) throw new GistError("GitHub did not accept the sign-in. Sign in again.", 401);
  if (res.status === 403 || res.status === 404) {
    throw new GistError(path.startsWith("/gists/") ? "The settings Gist is gone or no longer yours." : "GitHub refused the request.", res.status);
  }
  if (!res.ok) throw new GistError(`GitHub answered ${res.status}`, res.status);
  return res.json();
}

/** Finds the person's Algone Gist, if there is one. Looks at their newest 100 Gists. */
export async function findGist(f: Fetch, token: string): Promise<string> {
  const list = (await call(f, token, "/gists?per_page=100")) as Array<{ id: string; files: Record<string, unknown> }>;
  return list.find((g) => g.files && POLICY_FILE in g.files)?.id ?? "";
}

export async function createGist(f: Fetch, token: string, policy: Policy): Promise<string> {
  const g = await call(f, token, "/gists", {
    method: "POST",
    body: JSON.stringify({ description: GIST_DESCRIPTION, public: false, files: { [POLICY_FILE]: { content: JSON.stringify(policy, null, 2) } } }),
  });
  return g.id as string;
}

export interface GistFile {
  text: string;
  /** Gist history, newest first. Used to see whether another write slipped in. */
  versions: string[];
}

export async function readGist(f: Fetch, token: string, id: string): Promise<GistFile> {
  const g = await call(f, token, `/gists/${encodeURIComponent(id)}`);
  const file = g.files?.[POLICY_FILE];
  if (!file) throw new GistError("The settings Gist has no settings file.");
  if (file.truncated && file.raw_url) {
    // Truncated only past 1 MB, far above the policy limit; refuse rather than fetch elsewhere.
    throw new GistError("The settings file is too large.");
  }
  const versions = Array.isArray(g.history) ? g.history.map((h: { version: string }) => String(h.version)) : [];
  return { text: String(file.content ?? ""), versions };
}

async function writeGist(f: Fetch, token: string, id: string, policy: Policy): Promise<void> {
  await call(f, token, `/gists/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ files: { [POLICY_FILE]: { content: JSON.stringify(policy, null, 2) } } }),
  });
}

export interface SyncResult {
  state: SyncState;
  settings: Settings;
  /** Stricter changes that arrived and were applied. */
  applied: number;
}

/**
 * One sync round. Sends this device's changes on top of the newest file, checks the
 * write landed, then applies what other devices changed.
 */
export async function syncOnce(
  f: Fetch,
  token: string,
  state: SyncState,
  local: Settings,
  rules: SiteRule[],
  where: Where,
  now: number,
): Promise<SyncResult> {
  let s = { ...state };
  if (!s.gistId) s.gistId = await findGist(f, token);
  if (!s.gistId) {
    const first = policyFromSettings(local, 1, where.deviceId, now);
    s.gistId = await createGist(f, token, first);
    return { state: { ...s, seenRev: 1, outbox: [], lastSync: now, lastError: "" }, settings: local, applied: 0 };
  }

  let version = "";
  const read = async (): Promise<Policy> => {
    const file = await readGist(f, token, s.gistId);
    const parsed = parsePolicy(file.text, rules);
    if (!parsed.ok) throw new GistError(`The settings file has a problem: ${parsed.error}. Nothing was changed here.`);
    lastVersions = file.versions;
    return parsed.policy;
  };
  let lastVersions: string[] = [];
  /** The file with this device's unsent changes on top, so they are never mistaken for someone else's. */
  const rebase = (p: Policy): Policy => {
    if (!s.outbox.length) return p;
    const merged = s.outbox.reduce(applyPatch, { ...p.settings, theme: local.theme, breakUntil: local.breakUntil } as Settings);
    return { ...p, settings: sharedSettings(merged) };
  };

  let remote = await read();
  version = lastVersions[0] ?? "";
  let settings = local;
  let applied = 0;

  // Receive what other devices changed: stricter now, looser waits.
  if (remote.rev > s.seenRev) {
    const r = applyPolicy(local, rebase(remote), rules, where, "another device", now);
    if (!r.ok) throw new GistError(r.error);
    settings = r.settings;
    applied = r.applied;
    s = { ...s, seenRev: remote.rev, pending: r.pending ?? s.pending };
  }

  // Send this device's changes on top of the newest file, and check the write landed.
  for (let attempt = 0; s.outbox.length && attempt < MAX_RETRIES; attempt++) {
    const next = nextRevision(remote, rebase(remote).settings, where.deviceId, now);
    await writeGist(f, token, s.gistId, next);
    const after = await read();
    // Ours is newest, and it came straight after the version we built on: nothing was lost.
    const ours = after.rev === next.rev && after.updatedBy === where.deviceId;
    const direct = !version || lastVersions[1] === version;
    if (ours && direct) {
      s = { ...s, outbox: [], seenRev: next.rev };
    } else if (ours) {
      // Another device wrote in between and we wrote over it. Its change is lost from the
      // file, so pull it back out of history on the next round: forget what we have seen.
      s = { ...s, outbox: [], seenRev: Math.min(s.seenRev, remote.rev - 1) };
      throw new GistError("Two devices saved at once. Some changes from the other device may need to be made again.");
    } else {
      remote = after;
    }
    version = lastVersions[0] ?? "";
  }
  if (s.outbox.length) throw new GistError("Another device kept writing at the same time. Will try again.");
  return { state: { ...s, lastSync: now, lastError: "" }, settings, applied };
}
