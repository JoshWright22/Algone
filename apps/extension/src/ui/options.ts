import {
  AVOID_IDS, COPY, GITHUB_CLIENT_ID, localDay, pollDeviceFlow, startDeviceFlow, createPartnerBarrier, KIND_LABELS, KOFI_URL, PRIVACY_URL, randomContentCount, REPO_URL, SPONSOR_URL,
  TOPIC_NAMES, webKdf, WEB_ITERATIONS, type AvoidId, type BarrierConfig, type Patch, type TunedFilters,
} from "@algone/core";
import { SITES, type SiteRule } from "@algone/rules";
import { api, now } from "../browser";
import { send, type Stored } from "../messages";
import { loadState } from "../state";
import { elementList, modePicker, MODES } from "./common";
import { applyTheme, h, mount, toggle } from "./h";

const root = document.getElementById("root")!;
let tab = location.hash.slice(1) || "sites";
let open = "";

const patch = (p: Patch) => send({ t: "patch", patch: p });

const METHOD_LABELS: Record<string, string> = {
  "live-logged-out": "checked on the live site, logged out",
  "live-logged-in": "checked on the live site, logged in",
  fixture: "checked on a saved page",
  unverified: "not yet checked on the live site",
};


const list = (text: string) => text.split(",").map((s) => s.trim()).filter(Boolean);

function chips(options: string[], chosen: string[], onChange: (next: string[]) => void, name: string): HTMLElement {
  return h("div", { class: "chips", role: "group", "aria-label": name },
    ...options.map((o) =>
      h("button", {
        class: chosen.includes(o) ? "chip on" : "chip",
        "aria-pressed": String(chosen.includes(o)),
        onclick: () => onChange(chosen.includes(o) ? chosen.filter((c) => c !== o) : [...chosen, o]),
      }, o),
    ),
  );
}

function tunedEditor(rule: SiteRule, f: TunedFilters): HTMLElement {
  const set = (next: Partial<TunedFilters>) => patch({ op: "setTuned", site: rule.id, filters: { ...f, ...next } });
  const kinds = [...Object.keys(rule.tuned?.kinds ?? {}), "likelyAi"];
  const field = (label: string, key: "blockKeywords" | "blockChannels") =>
    h("label", { class: "field" }, label,
      h("input", {
        value: f[key].join(", "),
        placeholder: "Comma separated",
        onchange: (e: Event) => void set({ [key]: list((e.target as HTMLInputElement).value) }),
      }),
    );
  return h("div", { class: "tuned", id: `tuned-${rule.id}` },
    h("h3", {}, "Tuned filters"),
    field("Hide items with these words", "blockKeywords"),
    field("Hide these channels", "blockChannels"),
    h("p", { class: "label" }, "Hide these topics"),
    chips(TOPIC_NAMES, f.blockTopics, (v) => void set({ blockTopics: v }), "Hide topics"),
    h("p", { class: "label" }, "Show only these topics"),
    chips(TOPIC_NAMES, f.allowTopics, (v) => void set({ allowTopics: v }), "Show only topics"),
    h("p", { class: "label" }, "Hide kinds"),
    chips(kinds.map((k) => KIND_LABELS[k] ?? k), f.hideKinds.map((k) => KIND_LABELS[k] ?? k), (v) => {
      void set({ hideKinds: kinds.filter((k) => v.includes(KIND_LABELS[k] ?? k)) });
    }, "Hide kinds"),
    h("p", { class: "muted small" }, COPY.likelyAi),
  );
}

function sitesTab(s: Stored): HTMLElement {
  return h("div", { id: "sites" },
    ...SITES.map((rule) => {
      const site = s.settings.sites[rule.id]!;
      const isOpen = open === rule.id;
      const intent = (key: keyof typeof site.intent, label: string, show = true) =>
        show
          ? h("div", { class: "row" }, h("span", {}, label),
              toggle(site.intent[key], (v) => void patch({ op: "setIntent", site: rule.id, key, value: v }), label))
          : null;
      return h("section", { class: "site-card", "data-site": rule.id },
        h("button", {
          class: "site-head",
          "aria-expanded": String(isOpen),
          onclick: () => {
            open = isOpen ? "" : rule.id;
            void render();
          },
        },
          h("span", {}, rule.name),
          h("span", { class: "muted small" }, site.enabled ? (MODES.find((m) => m.id === site.mode)?.label ?? "") : "Off"),
        ),
        isOpen
          ? h("div", { class: "site-body" },
              h("div", { class: "row" }, h("span", {}, `Algone on ${rule.name}`),
                toggle(site.enabled, (v) => void patch({ op: "setSiteEnabled", site: rule.id, enabled: v }), `Algone on ${rule.name}`)),
              modePicker(rule, site),
              h("button", { class: "ghost", "data-snooze": rule.id, onclick: () => void send({ t: "snooze", site: rule.id }) },
                `Show for ${s.settings.snoozeMinutes} minutes`),
              elementList(rule, site),
              h("section", {}, h("h3", {}, "Picking what to watch"),
                intent("searchHome", "Search-first home"),
                intent("prompt", "Ask what I want to watch", site.intent.searchHome),
                intent("subsFirst", "Open subscriptions instead of home", !!rule.subscriptionsPath),
                intent("launchPause", "Pause when opening this site"),
              ),
              rule.tuned ? tunedEditor(rule, site.tuned) : null,
              h("p", { class: "muted small" }, `Rules ${METHOD_LABELS[rule.verified.method]}. Support tier ${rule.tier}.`),
            )
          : null,
      );
    }),
  );
}

function barrierForm(s: Stored): HTMLElement {
  const b = s.settings.barrier;
  const body = h("div", {});
  const types: Array<[BarrierConfig["type"], string]> = [
    ["pause", "Pause and choose"], ["typing", "Typing challenge"], ["daily", "Daily unlock limit"],
    ["schedule", "Scheduled unlock"], ["locked", "Locked until"], ["partner", "Partner password"],
  ];
  const select = h("select", { id: "barrier-type", "aria-label": "Barrier" },
    ...types.map(([id, label]) => h("option", { value: id, selected: b.type === id }, label)),
  ) as HTMLSelectElement;
  const save = async (barrier: BarrierConfig) => {
    const r = await patch({ op: "setBarrier", barrier });
    error.textContent = r.error ?? "";
  };
  const error = h("p", { class: "muted", role: "alert", id: "barrier-error" });
  const number = (id: string, label: string, value: number, min: number, max: number) =>
    h("label", { class: "field" }, label, h("input", { id, type: "number", min, max, value })) ;
  const val = (id: string) => Number((document.getElementById(id) as HTMLInputElement).value);
  const paint = () => {
    const t = select.value;
    if (t === "pause") {
      mount(body, number("b-seconds", "Wait, in seconds", b.type === "pause" ? b.seconds : 30, 10, 120),
        h("button", { class: "primary", id: "barrier-save", onclick: () => void save({ type: "pause", seconds: val("b-seconds") }) }, "Save"));
    } else if (t === "typing") {
      mount(body, number("b-length", "Text length", b.type === "typing" ? b.length : 60, 20, 200),
        h("button", { class: "primary", id: "barrier-save", onclick: () => void save({ type: "typing", length: val("b-length") }) }, "Save"));
    } else if (t === "daily") {
      mount(body, number("b-limit", "Unlocks per day", b.type === "daily" ? b.limit : 3, 1, 50),
        h("button", { class: "primary", id: "barrier-save", onclick: () => void save({ type: "daily", limit: val("b-limit"), step: "pause" }) }, "Save"));
    } else if (t === "schedule") {
      mount(body,
        h("label", { class: "field" }, "From", h("input", { id: "b-start", type: "time", value: "19:00" })),
        h("label", { class: "field" }, "Until", h("input", { id: "b-end", type: "time", value: "21:00" })),
        h("p", { class: "muted small" }, "Every day. Unlocks work only inside this window."),
        h("button", { class: "primary", id: "barrier-save", onclick: () => {
          const v = (id: string) => (document.getElementById(id) as HTMLInputElement).value;
          void save({ type: "schedule", windows: [{ days: [0, 1, 2, 3, 4, 5, 6], start: v("b-start"), end: v("b-end") }] });
        } }, "Save"));
    } else if (t === "locked") {
      mount(body, number("b-hours", "Lock for this many hours (at most 168)", 24, 1, 168),
        h("p", { class: "muted small" }, "One escape is available during a lock, after a 2 minute wait."),
        h("button", { class: "primary", id: "barrier-save", onclick: () =>
          void save({ type: "locked", until: now() + val("b-hours") * 3_600_000, escapeUsed: false, after: b.type === "locked" ? b.after : b }) }, "Save"));
    } else {
      mount(body,
        h("label", { class: "field" }, "Partner's password", h("input", { id: "b-pass", type: "password", autocomplete: "new-password" })),
        h("p", { class: "muted small" }, "Stored only as a hash on this device. If it is forgotten, a 24 hour wait resets the barrier."),
        h("button", { class: "primary", id: "barrier-save", onclick: async () => {
          const value = (document.getElementById("b-pass") as HTMLInputElement).value;
          if (!value) return;
          const r = await send({ t: "setPartner", barrier: await createPartnerBarrier(value, webKdf, WEB_ITERATIONS) });
          error.textContent = r.error ?? "";
        } }, "Save"));
    }
  };
  select.addEventListener("change", paint);
  paint();
  return h("section", {}, h("h2", {}, "Unlock barrier"), select, body, error,
    h("p", { class: "muted" }, COPY.uninstall), h("p", { class: "muted" }, COPY.bypass));
}

function generalTab(s: Stored): HTMLElement {
  const st = s.settings;
  return h("div", { id: "general" },
    barrierForm(s),
    h("section", {}, h("h2", {}, "Snooze"),
      h("label", { class: "field" }, "Minutes per unlock",
        h("input", { id: "snooze-minutes", type: "number", min: 1, max: 60, value: st.snoozeMinutes,
          onchange: (e: Event) => void patch({ op: "setGlobal", key: "snoozeMinutes", value: Number((e.target as HTMLInputElement).value) }) })),
    ),
    h("section", {}, h("h2", {}, "Viewing"),
      h("div", { class: "row" }, h("span", {}, "Stop at the end of a video"),
        toggle(st.stopAtEnd, (v) => void patch({ op: "setGlobal", key: "stopAtEnd", value: v }), "Stop at the end")),
      h("div", { class: "row" }, h("span", {}, "Theme"),
        h("select", { id: "theme", "aria-label": "Theme", onchange: (e: Event) => void patch({ op: "setGlobal", key: "theme", value: (e.target as HTMLSelectElement).value }) },
          ...[["system", "System"], ["dark", "Dark"], ["light", "Light"]].map(([t, label]) => h("option", { value: t, selected: st.theme === t }, label)))),
    ),
    h("section", {}, h("h2", {}, "Random sources"),
      h("p", { class: "muted" }, `${randomContentCount()} items and generated puzzles are bundled and work offline.`),
      h("div", { class: "row" }, h("span", {}, "Wikipedia random article"),
        toggle(st.webSources.wikipedia, async (v) => {
          if (v) {
            if (!confirm(COPY.wikipedia)) return void render();
            const ok = await api.permissions.request({ origins: ["https://en.wikipedia.org/*"] });
            if (!ok) return void render();
          }
          void patch({ op: "setGlobal", key: "wikipedia", value: v });
        }, "Wikipedia random article")),
      h("p", { class: "muted small" }, COPY.wikipedia),
    ),
    h("section", {}, h("h2", {}, "Local stats"),
      h("p", { id: "stats" }, `Unlocks started ${s.runtime.stats.started}, dismissed ${s.runtime.stats.dismissed}, completed ${s.runtime.stats.completed}.`),
      h("p", { class: "muted small" }, "These counts stay on this device."),
    ),
  );
}

const AVOID_LABELS: Record<AvoidId, string> = {
  outrage: "Outrage and ragebait",
  clickbait: "Clickbait",
  comparison: "Rich, perfect-life and looks comparison",
  doom: "Doom and disaster",
};

function healthyTab(s: Stored): HTMLElement {
  const st = s.settings;
  const day = localDay(now());
  const used = s.healthy.usage.day === day ? s.healthy.usage.minutes : 0;
  const activities = h("textarea", { id: "activities", rows: 4, "aria-label": "Things you'd rather do, one per line" },
    st.activities.join("\n")) as HTMLTextAreaElement;
  const hours = h("select", { id: "break-hours", "aria-label": "Break length" },
    ...[1, 4, 12, 24].map((n) => h("option", { value: n }, `${n} ${n === 1 ? "hour" : "hours"}`))) as HTMLSelectElement;
  const breakError = h("p", { class: "muted", role: "status", id: "break-error" });
  const onBreak = st.breakUntil > now();
  return h("div", { id: "healthy-tab" },
    h("h2", {}, "Healthy feed"),
    h("p", {}, "On sites in Healthy mode, Algone hides the feed and shows a short batch picked from what the site already loaded: its own picks and the people you follow. It pushes out outrage, clickbait and doom, then ends so you can go."),
    h("p", { class: "muted" }, "It ranks only what the site loaded. It cannot change the site's own ranking or rerank inside apps. The word lists miss some and wrongly catch some."),
    h("section", {}, h("h2", {}, "Amount"),
      h("label", { class: "field" }, "Items per day, per site",
        h("input", { id: "batch-size", type: "number", min: 1, max: 50, value: st.healthy.batchSize,
          onchange: (e: Event) => void patch({ op: "setHealthy", batchSize: Number((e.target as HTMLInputElement).value) }) })),
      h("label", { class: "field" }, "Minutes per day on picked items",
        h("input", { id: "budget", type: "number", min: 1, max: 1440, value: st.healthy.dailyBudgetMinutes,
          onchange: (e: Event) => void patch({ op: "setHealthy", dailyBudgetMinutes: Number((e.target as HTMLInputElement).value) }) })),
      h("p", { class: "muted small", id: "used-today" }, `Used today on this device: ${used} of ${st.healthy.dailyBudgetMinutes} minutes.`),
    ),
    h("section", {}, h("h2", {}, "Keep out"),
      ...AVOID_IDS.map((id) => h("div", { class: "row" }, h("span", {}, AVOID_LABELS[id]),
        toggle(st.avoid.includes(id), (v) => void patch({ op: "setAvoid", ids: v ? [...st.avoid, id] : st.avoid.filter((a) => a !== id) }), AVOID_LABELS[id]))),
    ),
    h("section", {}, h("h2", {}, "Instead"),
      h("p", { class: "muted" }, "Things you'd rather do, one per line. They show when a batch ends."),
      activities,
      h("button", { class: "primary small", id: "activities-save", onclick: () =>
        void patch({ op: "setActivities", items: activities.value.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 20) }) }, "Save")),
    h("section", {}, h("h2", {}, "Take a break"),
      h("p", {}, "Shows the sites' feeds for a while, then Algone comes back by itself. Shorts, Reels and autoplay stay off. One break a week, through your barrier."),
      onBreak
        ? h("div", { class: "row" }, h("span", { id: "break-status" }, `On a break until ${new Date(st.breakUntil).toLocaleString()}`),
            h("button", { class: "ghost small", id: "break-end", onclick: () => void patch({ op: "endBreak" }) }, "End the break now"))
        : h("div", { class: "row" }, hours,
            h("button", { class: "ghost", id: "break-start", onclick: async () => {
              const r = await send({ t: "patch", patch: { op: "startBreak", until: now() + Number(hours.value) * 3_600_000 } });
              breakError.textContent = r.error ?? "";
            } }, "Start a break")),
      breakError),
  );
}

function queueTab(s: Stored): HTMLElement {
  return h("div", { id: "queue-tab" },
    h("h2", {}, "Queue"),
    s.queue.length ? null : h("p", { class: "muted" }, "Nothing saved yet."),
    ...s.queue.map((q) =>
      h("div", { class: "row" },
        h("a", { href: q.url, target: "_blank", rel: "noreferrer" }, q.title),
        h("span", {},
          h("button", { class: "ghost small", "aria-label": "Move up", onclick: () => void send({ t: "queueMove", id: q.id, delta: -1 }) }, "Up"),
          h("button", { class: "ghost small", onclick: () => void send({ t: "queueRemove", id: q.id }) }, "Remove"),
        ),
      ),
    ),
  );
}

function feedTab(s: Stored): HTMLElement {
  const input = h("input", { id: "source-url", placeholder: "Feed address, such as https://www.reddit.com/r/books/.rss", "aria-label": "Feed address" }) as HTMLInputElement;
  return h("div", { id: "feed-tab" },
    h("h2", {}, "Custom feed sources"),
    h("p", { class: "muted" }, "RSS feeds from supported sites always work. Other feeds work only if their server allows it, because Algone never asks for access to all websites."),
    h("p", { class: "muted" }, COPY.capture),
    h("div", { class: "row" }, input,
      h("button", { class: "primary small", id: "source-add", onclick: () =>
        void send({ t: "sourceAdd", url: input.value.trim(), title: input.value.trim(), site: "custom", kind: "rss" }) }, "Add")),
    ...s.feeds.sources.map((src) =>
      h("div", { class: "row" },
        h("span", {}, src.title || src.url),
        h("span", {},
          src.failures ? h("span", { class: "muted small" }, "Could not read ") : null,
          h("button", { class: "ghost small", onclick: () => void send({ t: "sourceRemove", id: src.id }) }, "Remove")),
      ),
    ),
    h("label", { class: "field" }, "Ranking",
      h("select", { id: "ranking", onchange: (e: Event) => void patch({ op: "setGlobal", key: "customRanking", value: (e.target as HTMLSelectElement).value }) },
        h("option", { value: "newest", selected: s.settings.customRanking === "newest" }, "Newest first"),
        h("option", { value: "fair", selected: s.settings.customRanking === "fair" }, "Fair, one from each source"),
        h("option", { value: "oldestUnseen", selected: s.settings.customRanking === "oldestUnseen" }, "Oldest unseen first"),
      )),
  );
}

/** Kept across re-renders, which storage changes from the import itself cause. */
let syncMessage = "";

/** Sign in with GitHub's device flow. Polls from this page, since a service worker may stop mid-wait. */
async function signIn(status: HTMLElement): Promise<void> {
  // Firefox needs the request straight from the click, before any await.
  const granted = await api.permissions.request({ origins: ["https://github.com/*"] });
  if (!granted) return void (status.textContent = syncMessage = "Sign-in needs permission to reach github.com, only for signing in.");
  try {
    const code = await startDeviceFlow(fetch.bind(globalThis), GITHUB_CLIENT_ID, now());
    status.textContent = syncMessage = `On GitHub, enter the code ${code.userCode}. Waiting...`;
    await navigator.clipboard?.writeText(code.userCode).catch(() => undefined);
    await api.tabs.create({ url: code.verificationUri });
    let interval = code.interval;
    while (now() < code.expiresAt) {
      await new Promise((r) => setTimeout(r, interval * 1000));
      const r = await pollDeviceFlow(fetch.bind(globalThis), GITHUB_CLIENT_ID, code);
      if (r.kind === "wait") interval = r.interval;
      else if (r.kind === "failed") return void (status.textContent = syncMessage = r.error);
      else {
        const done = await send({ t: "syncConnect", token: r.token });
        syncMessage = done.ok ? "Signed in. Settings now sync." : `Could not sync: ${done.error}`;
        return void render();
      }
    }
    status.textContent = syncMessage = "The code expired. Start again.";
  } catch (e) {
    status.textContent = syncMessage = `Sign-in failed: ${String(e instanceof Error ? e.message : e)}`;
  } finally {
    void api.permissions.remove({ origins: ["https://github.com/*"] }).catch(() => undefined);
  }
}

function syncAccount(s: Stored & { sync?: SyncInfo }, status: HTMLElement): HTMLElement {
  const sync = s.sync;
  if (sync?.signedIn) {
    return h("section", { id: "sync-on" }, h("h2", {}, "Sync"),
      h("p", { id: "sync-state" }, sync.lastError
        ? `Last try ${new Date(sync.lastSync).toLocaleString()}: ${sync.lastError}`
        : `Synced ${sync.lastSync ? new Date(sync.lastSync).toLocaleString() : "not yet"}.`),
      sync.pending
        ? h("div", { class: "row", id: "sync-pending" }, h("span", {}, sync.pending.label),
            h("button", { class: "ghost small", id: "sync-review", onclick: () => void send({ t: "syncReview" }) }, "Review"))
        : null,
      h("div", { class: "row" },
        h("button", { class: "ghost", id: "sync-now", onclick: async () => {
          const r = await send({ t: "syncNow" });
          status.textContent = syncMessage = r.ok ? "Synced." : `Could not sync: ${r.error}`;
        } }, "Sync now"),
        h("button", { class: "ghost", id: "sync-off", onclick: () => void send({ t: "syncDisconnect" }) }, "Stop syncing on this device")),
      h("p", { class: "muted small" }, "Stopping sync keeps your settings here exactly as they are."));
  }
  const token = h("input", { id: "sync-token", type: "password", autocomplete: "off", placeholder: "GitHub token with the Gist permission", "aria-label": "GitHub token" }) as HTMLInputElement;
  return h("section", { id: "sync-off-state" }, h("h2", {}, "Sync"),
    h("p", {}, "Keep the same settings on every computer and phone where Algone runs. Your settings go to one secret Gist in your own GitHub account. There is no Algone server."),
    GITHUB_CLIENT_ID
      ? h("button", { class: "primary", id: "sync-signin", onclick: () => void signIn(status) }, "Sign in with GitHub")
      : null,
    h("details", { open: !GITHUB_CLIENT_ID },
      h("summary", {}, "Use a token instead"),
      h("p", { class: "muted small" }, "On GitHub, create a fine-grained token with Gists read and write, and paste it here."),
      h("div", { class: "row" }, token,
        h("button", { class: "ghost small", id: "sync-connect", onclick: async () => {
          const r = await send({ t: "syncConnect", token: token.value });
          syncMessage = r.ok ? "Signed in. Settings now sync." : `Could not sync: ${r.error}`;
          void render();
        } }, "Connect"))),
    h("p", { class: "muted small" }, "A secret Gist is unlisted, not private: anyone with its link can read it. Algone keeps the sign-in on this device so it can sync. Partner passwords, breaks and the theme never leave this device."));
}

interface SyncInfo {
  signedIn: boolean;
  lastSync: number;
  lastError: string;
  pending: { label: string } | null;
}

function syncTab(s: Stored & { sync?: SyncInfo }): HTMLElement {
  const status = h("p", { role: "status", id: "sync-status" }, syncMessage);
  const file = h("input", { type: "file", accept: "application/json,.json", id: "policy-file", "aria-label": "Policy file" }) as HTMLInputElement;
  file.addEventListener("change", async () => {
    const f = file.files?.[0];
    if (!f) return;
    if (f.size > 256 * 1024) return void (status.textContent = syncMessage = "That file is too large to be an Algone policy.");
    const r = await send({ t: "importPolicy", text: await f.text() });
    syncMessage = !r.ok
      ? `Not imported: ${r.error}`
      : r.needsBarrier
        ? `${r.applied} stricter settings applied. The looser ones wait for your barrier.`
        : `Imported. ${r.applied} settings changed.`;
    status.textContent = syncMessage;
  });
  return h("div", { id: "sync-tab" },
    syncAccount(s, status),
    h("h2", {}, "Settings file"),
    h("p", {}, "One file holds every setting that applies on all your devices. You, or an assistant you trust, can edit it and import it anywhere Algone runs."),
    h("p", { class: "muted" }, "Importing is never a shortcut: stricter settings apply at once, looser ones wait for your barrier on this device. Your theme, breaks and partner password stay on this device."),
    h("div", { class: "row" },
      h("button", { class: "primary", id: "policy-export", onclick: async () => {
        const r = await send({ t: "exportPolicy" });
        if (!r.ok || !r.text) return;
        const url = URL.createObjectURL(new Blob([r.text], { type: "application/json" }));
        const a = h("a", { href: url, download: "algone-policy.json" });
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
      } }, "Export settings"),
      h("label", { class: "ghost button" }, "Import settings", file)),
    status,
  );
}

function aboutTab(s: Stored): HTMLElement {
  const overlay = s.rulesOverlay ? `published ${new Date(s.rulesOverlay.rev * 1000).toLocaleDateString()}` : "none";
  return h("div", { id: "about" },
    h("h2", {}, "Rules"),
    h("p", {}, `Bundled rules: ${new Date(BUILD_REV * 1000).toLocaleDateString()}. Update in use: ${overlay}.`),
    h("p", { class: "muted" }, `Last check: ${s.runtime.lastRuleCheck ? new Date(s.runtime.lastRuleCheck).toLocaleString() : "not yet"}.`),
    s.runtime.lastRuleError ? h("p", { class: "muted", id: "rule-error" }, `Last problem: ${s.runtime.lastRuleError}`) : null,
    h("p", { class: "muted" }, COPY.rules),
    h("div", { class: "row" }, h("span", {}, "Download rule updates"),
      toggle(s.settings.ruleUpdates, (v) => void patch({ op: "setGlobal", key: "ruleUpdates", value: v }), "Download rule updates")),
    h("button", { class: "ghost", id: "use-bundled", onclick: () => void patch({ op: "useBundledRules" }) }, "Use bundled rules"),
    h("h2", {}, "Privacy"),
    h("p", {}, COPY.privacy),
    h("p", {}, h("a", { href: PRIVACY_URL, target: "_blank", rel: "noreferrer" }, "Privacy policy")),
    h("h2", {}, "About"),
    h("p", {}, `Algone ${api.runtime.getManifest().version}. `, h("a", { href: REPO_URL, target: "_blank", rel: "noreferrer" }, "Source code"), " under the MIT license."),
    h("p", { class: "muted" }, COPY.browserOnly),
    SHOW_TIPS
      ? h("p", { id: "tips" }, "Algone is free, and no feature depends on a tip. ",
          h("a", { href: SPONSOR_URL, target: "_blank", rel: "noreferrer" }, "GitHub Sponsors"),
          KOFI_URL ? " or " : "",
          KOFI_URL ? h("a", { href: KOFI_URL, target: "_blank", rel: "noreferrer" }, "Ko-fi") : "",
          ".")
      : null,
  );
}

async function syncInfo(): Promise<SyncInfo> {
  const raw = (await api.storage.local.get(["sync", "syncToken"])) as {
    sync?: { lastSync: number; lastError: string; pending: { label: string } | null };
    syncToken?: string;
  };
  return {
    signedIn: !!raw.syncToken,
    lastSync: raw.sync?.lastSync ?? 0,
    lastError: raw.sync?.lastError ?? "",
    pending: raw.sync?.pending ?? null,
  };
}

async function render(): Promise<void> {
  const s = await loadState();
  applyTheme(s.settings.theme);
  const tabs: Array<[string, string]> = [
    ["sites", "Sites"], ["healthy", "Healthy feed"], ["general", "Barrier and general"], ["queue", "Queue"], ["feed", "Custom feed"], ["sync", "Sync"], ["about", "About"],
  ];
  const active = document.activeElement?.id;
  mount(root,
    h("div", { class: "layout" },
      h("nav", { "aria-label": "Settings sections" },
        h("div", { class: "brand" }, h("img", { src: "icons/icon-32.png", width: 22, height: 22, alt: "" }), "Algone"),
        ...tabs.map(([id, label]) => h("button", {
          class: tab === id ? "nav active" : "nav",
          "data-tab": id,
          onclick: () => {
            tab = id;
            location.hash = id;
            void render();
          },
        }, label)),
      ),
      h("main", { class: "content" },
        tab === "sites" ? sitesTab(s) : null,
        tab === "healthy" ? healthyTab(s) : null,
        tab === "general" ? generalTab(s) : null,
        tab === "queue" ? queueTab(s) : null,
        tab === "feed" ? feedTab(s) : null,
        tab === "sync" ? syncTab({ ...s, sync: await syncInfo() }) : null,
        tab === "about" ? aboutTab(s) : null,
      ),
    ),
  );
  if (active) document.getElementById(active)?.focus();
}

void render();
// Forms keep their typing: only re-render for changes outside a form.
api.storage.onChanged.addListener(() => {
  const a = document.activeElement;
  if (a instanceof HTMLInputElement && a.type !== "checkbox") return;
  if (a instanceof HTMLSelectElement) return;
  void render();
});
