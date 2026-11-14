import {
  addFeedItems, addMinute, applyPolicyText, checkBreak, diffSettings, emptySyncState, GistError, isLocalPatch,
  markSeen, policyFromSettings, rateCreator, syncOnce, validatePatch, type Settings, type SyncState,
  addSource, addToQueue, applyPatch, barrierStep, clearIfBundled, clearSnooze, defaultRuntime, describePatch,
  dueSources, handleRulesFile, isWeakening, mergeEntries, migrateSettings, moveInQueue, nextFetchAt, parseFeed,
  recordPass, removeFromQueue, removeSource, RULES_URL, safeHttps, startRecovery, startSnooze, UNINSTALL_URL,
  useEscape, validateBarrier, MAX_FEED_BYTES, type Patch, type Pending, type Runtime,
} from "@algone/core";
import { SITES, siteMap } from "@algone/rules";
import { api, now } from "./browser";
import type { Command, CommandResult, Stored } from "./messages";
import { loadState } from "./state";

const CSS_FILES = (site: string) => ["css/base.css", `css/${site}.css`];

/** One writer: commands run one at a time, so concurrent writes cannot lose updates. */
let chain: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.catch(() => undefined);
  return run;
}

const save = (patch: Partial<Stored>) => api.storage.local.set(patch);

/** A random id for this browser profile, made once. Names this device in the shared policy. */
async function deviceId(): Promise<string> {
  const { device } = (await api.storage.local.get("device")) as { device?: string };
  if (device) return device;
  const id = `${BUILD_TARGET}-${Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) => b.toString(16).padStart(2, "0")).join("")}`;
  await api.storage.local.set({ device: id });
  return id;
}

async function openUnlock(): Promise<void> {
  await api.tabs.create({ url: api.runtime.getURL("unlock.html") });
}

async function requestPending(state: Stored, pending: Pending): Promise<CommandResult> {
  const runtime = {
    ...state.runtime,
    pending,
    stats: { ...state.runtime.stats, started: state.runtime.stats.started + 1 },
  };
  await save({ runtime });
  await openUnlock();
  return { ok: true, needsBarrier: true };
}

async function applyWithSideEffects(state: Stored, patch: Patch): Promise<void> {
  const settings = applyPatch(state.settings, patch);
  const update: Partial<Stored> = { settings };
  if (patch.op === "useBundledRules") update.rulesOverlay = null;
  await save(update);
}

async function handlePatch(state: Stored, patch: Patch): Promise<CommandResult> {
  const invalid = validatePatch(patch, SITES, now());
  if (invalid) return { ok: false, error: invalid };
  if (patch.op === "startBreak") {
    const error = checkBreak(patch.until, state.runtime, now());
    if (error) return { ok: false, error };
  }
  if (isWeakening(state.settings, patch, SITES)) {
    const name = "site" in patch ? siteMap()[patch.site]?.name : "";
    return requestPending(state, { kind: "patch", patch, label: describePatch(patch, name) });
  }
  await applyWithSideEffects(state, patch);
  return { ok: true };
}

async function completePending(state: Stored): Promise<CommandResult> {
  const pending = state.runtime.pending;
  if (!pending) return { ok: false, error: "Nothing is waiting" };
  const step = barrierStep(state.settings.barrier, state.runtime, now());
  if (step.kind === "blocked") return { ok: false, error: step.reason };
  const pass = recordPass(state.settings.barrier, state.runtime, now());
  const runtime: Runtime = { ...pass.runtime, pending: null };
  return finishPending(pending, { ...state.settings, barrier: pass.barrier }, runtime, state.runtime);
}

/** Applies a change whose barrier was passed (or escaped). The one place this happens. */
async function finishPending(pending: Pending, settings: Settings, runtime: Runtime, before: Runtime): Promise<CommandResult> {
  if (pending.kind === "snooze") {
    await save({ settings, runtime: startSnooze(runtime, pending.site, pending.minutes, now()) });
    return { ok: true };
  }
  // Checked again: time has passed, and the one-a-week rule counts from the last break taken.
  const invalid = validatePatch(pending.patch, SITES, now());
  const breakError = pending.patch.op === "startBreak" ? checkBreak(pending.patch.until, before, now()) : null;
  if (invalid || breakError) {
    await save({ settings, runtime });
    return { ok: false, error: invalid ?? breakError ?? "" };
  }
  const next = pending.patch.op === "startBreak" ? { ...runtime, lastBreakAt: now() } : runtime;
  const update: Partial<Stored> = { settings: applyPatch(settings, pending.patch), runtime: next };
  if (pending.patch.op === "useBundledRules") update.rulesOverlay = null;
  await save(update);
  return { ok: true };
}

async function refreshFeeds(): Promise<void> {
  const state = await loadState();
  let feeds = state.feeds;
  for (const source of dueSources(feeds, now())) {
    let failures = source.failures + 1;
    try {
      const res = await fetch(source.url, { credentials: "omit" });
      const text = res.ok ? await res.text() : "";
      if (text && text.length <= MAX_FEED_BYTES) {
        const parsed = parseFeed(text);
        if (parsed.entries.length) {
          feeds = mergeEntries(feeds, source.id, parsed.entries);
          failures = 0;
        }
      }
    } catch {
      // Counted as a failure, which backs this source off.
    }
    feeds = {
      ...feeds,
      sources: feeds.sources.map((s) =>
        s.id === source.id ? { ...s, failures, nextAt: nextFetchAt(failures, now()) } : s,
      ),
    };
  }
  await save({ feeds });
}

async function checkRules(): Promise<void> {
  if (!REMOTE_RULES) return;
  const state = await loadState();
  if (!state.settings.ruleUpdates) return;
  const runtime = { ...state.runtime, lastRuleCheck: now() };
  try {
    const res = await fetch(RULES_URL, { credentials: "omit", cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const r = handleRulesFile(
      await res.text(),
      siteMap(),
      BUILD_REV,
      state.runtime.lastAcceptedRev,
      state.rulesOverlay,
    );
    // "rev is not newer" is the normal daily result, not an error.
    runtime.lastRuleError = /newer/.test(r.error) ? "" : r.error || r.rejected.join("; ");
    runtime.lastAcceptedRev = r.lastAcceptedRev;
    await save({ rulesOverlay: r.overlay, runtime });
  } catch (e) {
    runtime.lastRuleError = String(e);
    await save({ runtime });
  }
}

// ---- Sync. The token and sync state live in their own keys, read only here and on the Sync tab.

interface SyncStored {
  sync: SyncState & { base: Settings | null };
  syncToken: string;
}

async function loadSync(): Promise<SyncStored> {
  const raw = (await api.storage.local.get(["sync", "syncToken"])) as Partial<SyncStored>;
  return { sync: { ...emptySyncState(), base: null, ...raw.sync }, syncToken: raw.syncToken ?? "" };
}

/** One round. Never throws: problems are kept in `lastError` and shown on the Sync tab. */
async function runSync(): Promise<CommandResult> {
  const { sync, syncToken } = await loadSync();
  if (!syncToken) return { ok: false, error: "Not signed in" };
  const state = await loadState();
  // This device's changes since the last round. Theme, breaks and partner passwords stay here.
  const outbox = diffSettings(sync.base ?? state.settings, state.settings, SITES).filter((p) => !isLocalPatch(p));
  try {
    const r = await syncOnce(fetch.bind(globalThis), syncToken, { ...sync, outbox }, state.settings, SITES,
      { platform: BUILD_TARGET, deviceId: await deviceId() }, now());
    if (JSON.stringify(r.settings) !== JSON.stringify(state.settings)) await save({ settings: r.settings });
    await api.storage.local.set({ sync: { ...r.state, base: r.settings } });
    return { ok: true, applied: r.applied };
  } catch (e) {
    const error = e instanceof GistError ? e.message : String(e);
    await api.storage.local.set({ sync: { ...sync, lastError: error, lastSync: now() } });
    return { ok: false, error };
  }
}

async function handle(cmd: Command, sender: chrome.runtime.MessageSender): Promise<CommandResult> {
  const state = await loadState();
  switch (cmd.t) {
    case "patch":
      return handlePatch(state, cmd.patch);
    case "snooze":
      return requestPending(state, {
        kind: "snooze",
        site: cmd.site,
        minutes: cmd.minutes ?? state.settings.snoozeMinutes,
        label: `Show ${siteMap()[cmd.site]?.name ?? "this site"} for ${cmd.minutes ?? state.settings.snoozeMinutes} minutes`,
      });
    case "endSnooze":
      await save({ runtime: clearSnooze(state.runtime, cmd.site) });
      return { ok: true };
    case "barrierPass":
      return completePending(state);
    case "barrierCancel": {
      const stats = { ...state.runtime.stats, dismissed: state.runtime.stats.dismissed + 1 };
      await save({ runtime: { ...state.runtime, pending: null, stats } });
      return { ok: true };
    }
    case "barrierEscape": {
      const barrier = useEscape(state.settings.barrier);
      await save({ settings: { ...state.settings, barrier } });
      if (state.settings.barrier.type === "locked" && !state.settings.barrier.escapeUsed) {
        const fresh = await loadState();
        const pending = fresh.runtime.pending;
        if (!pending) return { ok: false, error: "Nothing is waiting" };
        const stats = { ...fresh.runtime.stats, completed: fresh.runtime.stats.completed + 1 };
        return finishPending(pending, fresh.settings, { ...fresh.runtime, pending: null, stats }, fresh.runtime);
      }
      return { ok: true };
    }
    case "barrierRecover":
      await save({ settings: { ...state.settings, barrier: startRecovery(state.settings.barrier, now()) } });
      return { ok: true };
    case "setPartner": {
      const error = validateBarrier(cmd.barrier, now());
      if (error) return { ok: false, error };
      return handlePatch(state, { op: "setBarrier", barrier: cmd.barrier });
    }
    case "queueAdd":
      await save({ queue: addToQueue(state.queue, cmd, now()) });
      return { ok: true };
    case "queueRemove":
      await save({ queue: removeFromQueue(state.queue, cmd.id) });
      return { ok: true };
    case "queueMove":
      await save({ queue: moveInQueue(state.queue, cmd.id, cmd.delta) });
      return { ok: true };
    case "sourceAdd":
      await save({ feeds: addSource(state.feeds, cmd) });
      void refreshFeeds();
      return { ok: true };
    case "sourceRemove":
      await save({ feeds: removeSource(state.feeds, cmd.id) });
      return { ok: true };
    case "feedSeen":
      await save({
        feeds: {
          ...state.feeds,
          items: state.feeds.items.map((i) => (i.id === cmd.id ? { ...i, seen: true } : i)),
        },
      });
      return { ok: true };
    case "capture": {
      const entries = cmd.items.flatMap((i) => {
        const url = safeHttps(i.url);
        return url ? [{ title: i.title, url, time: now() }] : [];
      });
      await save({ feeds: mergeEntries(state.feeds, `capture:${cmd.site}`, entries) });
      return { ok: true };
    }
    case "overlayCss": {
      const tabId = sender.tab?.id;
      if (tabId === undefined) return { ok: false };
      try {
        await api.scripting.insertCSS({
          target: { tabId, frameIds: [sender.frameId ?? 0] },
          css: cmd.css,
          origin: "USER",
        });
        return { ok: true };
      } catch (e) {
        return { ok: false, error: String(e) };
      }
    }
    case "rulesCheck":
      await checkRules();
      return { ok: true };
    case "feedRefresh":
      await refreshFeeds();
      return { ok: true };
    case "feedItems": {
      // From a content script, which reads a page the site controls: check everything.
      const rule = siteMap()[cmd.site];
      if (!rule || !Array.isArray(cmd.items)) return { ok: false };
      const items = cmd.items.slice(0, 60).flatMap((i) => {
        const url = typeof i?.url === "string" && i.url.length <= 2048 ? safeHttps(i.url) : null;
        if (!url || !rule.hosts.includes(new URL(url).hostname) || typeof i.title !== "string") return [];
        return [{ title: i.title.slice(0, 200), channel: typeof i.channel === "string" ? i.channel.slice(0, 100) : "", url }];
      });
      await save({ healthy: addFeedItems(state.healthy, cmd.site, items, state.settings, now()) });
      return { ok: true };
    }
    case "healthySeen":
      if (typeof cmd.id !== "string" || cmd.id.length > 2048) return { ok: false };
      await save({ healthy: markSeen(state.healthy, cmd.id) });
      return { ok: true };
    case "rate":
      if (!["worth", "notWorth", "worse"].includes(cmd.rating) || typeof cmd.channel !== "string" || cmd.channel.length > 100) {
        return { ok: false };
      }
      await save({ healthy: rateCreator(state.healthy, cmd.channel, cmd.rating) });
      return { ok: true };
    case "healthyMinute":
      await save({ healthy: addMinute(state.healthy, now()) });
      return { ok: true };
    case "exportPolicy": {
      const device = await deviceId();
      return { ok: true, text: JSON.stringify(policyFromSettings(state.settings, 0, device, now()), null, 2) };
    }
    case "importPolicy": {
      if (typeof cmd.text !== "string") return { ok: false, error: "No file" };
      const r = applyPolicyText(state.settings, cmd.text, SITES, { platform: BUILD_TARGET, deviceId: await deviceId() }, "an imported file", now());
      if (!r.ok) return { ok: false, error: r.error };
      await save({ settings: r.settings });
      if (r.pending) {
        const fresh = await loadState();
        const res = await requestPending(fresh, r.pending);
        return { ...res, applied: r.applied };
      }
      return { ok: true, applied: r.applied };
    }
    case "syncConnect": {
      if (typeof cmd.token !== "string" || !/^[\w-]{20,255}$/.test(cmd.token.trim())) {
        return { ok: false, error: "That does not look like a GitHub token." };
      }
      await api.storage.local.set({ syncToken: cmd.token.trim(), sync: { ...emptySyncState(), base: null } });
      await api.alarms.create("sync", { periodInMinutes: 15 });
      const r = await runSync();
      if (!r.ok) await api.storage.local.remove(["syncToken"]);
      return r;
    }
    case "syncNow":
      return runSync();
    case "syncDisconnect":
      await api.storage.local.remove(["syncToken", "sync"]);
      await api.alarms.clear("sync");
      return { ok: true };
    case "syncReview": {
      const { sync } = await loadSync();
      if (!sync.pending) return { ok: false, error: "Nothing is waiting" };
      await api.storage.local.set({ sync: { ...sync, pending: null } });
      return requestPending(state, sync.pending);
    }
    case "closeTab":
      if (sender.tab?.id !== undefined) await api.tabs.remove(sender.tab.id);
      return { ok: true };
  }
}

api.runtime.onMessage.addListener((msg: Command, sender, reply) => {
  // Extension pages and content scripts only. Web pages cannot reach this listener.
  if (sender.id !== api.runtime.id) return false;
  void serial(() => handle(msg, sender))
    .then(reply)
    .catch((e) => reply({ ok: false, error: String(e) }));
  return true;
});

/** Manifest scripts do not reach tabs already open at install, so inject them. */
async function injectOpenTabs(): Promise<void> {
  const hosts = SITES.flatMap((s) => s.hosts.map((h) => ({ host: h, site: s.id })));
  const tabs = await api.tabs.query({ url: hosts.map((h) => `https://${h.host}/*`) });
  for (const tab of tabs) {
    if (tab.id === undefined || !tab.url) continue;
    const hostname = new URL(tab.url).hostname;
    const site = hosts.find((h) => h.host === hostname)?.site;
    if (!site) continue;
    try {
      await api.scripting.insertCSS({ target: { tabId: tab.id }, files: CSS_FILES(site) });
      await api.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
    } catch {
      // Tabs that cannot be injected pick the extension up on their next load.
    }
  }
}

api.runtime.onInstalled.addListener(async (details) => {
  const raw = (await api.storage.local.get(["settings", "runtime", "rulesOverlay"])) as Partial<Stored>;
  const update: Partial<Stored> = {
    settings: migrateSettings(raw.settings, SITES),
    runtime: { ...defaultRuntime(), ...raw.runtime },
  };
  update.rulesOverlay = clearIfBundled(raw.rulesOverlay ?? null, BUILD_REV);
  await save(update);
  await api.alarms.create("rules", { periodInMinutes: 24 * 60, delayInMinutes: 1 });
  await api.alarms.create("feeds", { periodInMinutes: 60, delayInMinutes: 2 });
  await api.alarms.create("selfUpdate", { periodInMinutes: 10, delayInMinutes: 10 });
  if (details.reason === "install") {
    await api.tabs.create({ url: api.runtime.getURL("welcome.html") });
    api.runtime.setUninstallURL?.(UNINSTALL_URL);
  }
  await injectOpenTabs();
});

/**
 * Auto-update for copies installed from a folder (Load unpacked), which no store updates.
 * The `algone update` task replaces the folder's files; the browser serves them from disk,
 * so a newer build.json means newer code is waiting, and a reload picks it up.
 * Store copies have an update_url and are left to the store.
 */
async function checkSelfUpdate(): Promise<void> {
  if ((api.runtime.getManifest() as { update_url?: string }).update_url) return;
  try {
    const res = await fetch(api.runtime.getURL("build.json"), { cache: "no-store" });
    const build = (await res.json()) as { rev?: number };
    if (typeof build.rev !== "number" || build.rev <= BUILD_REV) return;
    // Reload only once the new build is whole: a missing manifest would leave Algone off.
    const manifest = await fetch(api.runtime.getURL("manifest.json"), { cache: "no-store" });
    if (manifest.ok && (await manifest.json()).manifest_version === 3) api.runtime.reload();
  } catch {
    // An old or partly copied folder: try again at the next alarm.
  }
}

api.runtime.onStartup?.addListener(() => {
  void serial(checkRules);
});

api.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "rules") void serial(checkRules);
  else if (alarm.name === "feeds") void serial(refreshFeeds);
  else if (alarm.name === "sync" || alarm.name === "syncSoon") void serial(runSync);
  else if (alarm.name === "selfUpdate") void serial(checkSelfUpdate);
});

// A settings change is sent half a minute later, so a burst of clicks is one write.
api.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes.settings) return;
  void api.storage.local.get("syncToken").then(({ syncToken }) => {
    if (syncToken) void api.alarms.create("syncSoon", { delayInMinutes: 0.5 });
  });
});

if (TEST_HOOKS) {
  Object.assign(globalThis, {
    __algone: { checkRules: () => serial(checkRules), refreshFeeds: () => serial(refreshFeeds) },
  });
}
