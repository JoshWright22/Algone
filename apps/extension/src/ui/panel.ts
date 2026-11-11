import {
  COPY, currentBatch, pickRandom, rankItems, visibleQueue, type FeedItem, type HealthyBatch, type QueueItem,
  type Rating, type Settings, type HealthyStore,
} from "@algone/core";
import { siteMap } from "@algone/rules";
import { api, now } from "../browser";
import { send } from "../messages";
import { loadState } from "../state";
import { applyTheme, h, mount } from "./h";

const params = new URLSearchParams(location.search);
const kind = params.get("kind") ?? "feed";
const siteId = params.get("site") ?? "";
const pageUrl = params.get("url") ?? "";
const rule = siteMap()[siteId];
const root = document.getElementById("root")!;
/** Survives re-renders caused by storage changes. */
let showAllQueue = false;
let promptThisPanel = false;

/** Messages go to the content script in the same tab, through the background-free tabs API. */
async function toPage(msg: object): Promise<void> {
  const tab = await api.tabs.getCurrent();
  if (tab?.id !== undefined) await api.tabs.sendMessage(tab.id, msg);
}

function searchBox(prompt: boolean): HTMLElement {
  const input = h("input", { type: "search", id: "search", placeholder: `Search ${rule?.name ?? ""}`, "aria-label": "Search" }) as HTMLInputElement;
  const go = (e: Event) => {
    e.preventDefault();
    if (rule?.searchUrl && input.value.trim()) {
      void toPage({ t: "go", path: rule.searchUrl + encodeURIComponent(input.value.trim()) });
    }
  };
  // Shown once a tab session. Re-renders in this panel keep it until the panel closes.
  if (prompt && !promptThisPanel && sessionStorage.getItem("algone-prompted") !== "1") {
    promptThisPanel = true;
    sessionStorage.setItem("algone-prompted", "1");
  }
  const once = prompt && promptThisPanel;
  return h(
    "form",
    { class: "search", onsubmit: go },
    once ? h("p", { class: "prompt", id: "intent-prompt" }, "What do you want to watch?") : null,
    input,
  );
}

function queueList(queue: QueueItem[], cap: number): HTMLElement | null {
  if (!queue.length) return null;
  const render = (): HTMLElement => {
    const v = visibleQueue(queue, cap, showAllQueue);
    const box = h(
      "section",
      { id: "queue" },
      h("h2", {}, "Your queue"),
      ...v.items.map((q) =>
        h("div", { class: "row" },
          h("a", { href: q.url, target: "_top" }, q.title),
          h("button", { class: "ghost small", "aria-label": `Remove ${q.title}`, onclick: () => void send({ t: "queueRemove", id: q.id }) }, "Remove"),
        ),
      ),
      v.hiddenCount
        ? h("button", { class: "ghost", id: "show-all", onclick: () => {
            showAllQueue = true;
            box.replaceWith(render());
          } }, `Show all (${v.hiddenCount} more)`)
        : null,
    );
    return box;
  };
  return render();
}

function artPattern(seed: number): SVGSVGElement {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 400 220");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "A generated pattern");
  let s = seed;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 90; i++) {
    const c = document.createElementNS(ns, "circle");
    c.setAttribute("cx", String(r() * 400));
    c.setAttribute("cy", String(r() * 220));
    c.setAttribute("r", String(2 + r() * 34));
    c.setAttribute("fill", "none");
    c.setAttribute("stroke", `oklch(${0.45 + r() * 0.35} 0.17 ${240 + r() * 50})`);
    c.setAttribute("stroke-width", String(0.5 + r() * 1.5));
    svg.append(c);
  }
  return svg;
}

function randomPanel(): HTMLElement {
  const seed = Math.floor(now() / 3_600_000) + siteId.length;
  const item = pickRandom(seed);
  if (item.kind === "puzzle" && item.puzzle) {
    const answer = h("p", { class: "muted", hidden: true, id: "answer" }, item.puzzle.answer);
    return h("section", { class: "random", id: "random" }, h("p", { class: "lead" }, item.text),
      h("button", { class: "ghost", onclick: () => answer.removeAttribute("hidden") }, "Show the answer"), answer);
  }
  return h(
    "section",
    { class: "random", id: "random" },
    item.kind === "art" ? artPattern(seed + 1) : null,
    h("p", { class: item.kind === "poem" ? "lead poem" : "lead" }, item.text),
    h("p", { class: "muted small" }, item.source),
  );
}

function customPanel(items: FeedItem[], sourceCount: number): HTMLElement {
  if (!items.length) {
    return h("section", { id: "custom" }, h("h2", {}, "Your feed"),
      h("p", { class: "muted" }, sourceCount ? "Nothing new yet." : "Add sources in Settings, or use Follow in Algone in the popup."));
  }
  return h(
    "section",
    { id: "custom" },
    h("h2", {}, "Your feed"),
    ...items.slice(0, 30).map((i) =>
      h("div", { class: "row" },
        h("a", { href: i.url, target: "_top", onclick: () => void send({ t: "feedSeen", id: i.id }) }, i.title),
        h("span", { class: "muted small" }, i.time ? new Date(i.time).toLocaleDateString() : ""),
      ),
    ),
  );
}

const RATINGS: Array<[Rating, string]> = [["worth", "Worth it"], ["notWorth", "Not worth it"], ["worse", "Made me feel worse"]];

function healthyPanel(batch: HealthyBatch, settings: Settings, store: HealthyStore): HTMLElement {
  const name = rule?.name ?? "this site";
  const seen = new Set(store.seen);
  const left = batch.items.filter((i) => !seen.has(i.id));
  const ended = batch.end === "budget" || (batch.items.length > 0 && left.length === 0);
  const honest = h("p", { class: "muted small", id: "healthy-note" },
    `Picked from what ${name} already loaded, without outrage, clickbait and doom where the words give it away. It misses some and wrongly catches some.`);
  if (ended) {
    return h("section", { id: "healthy", class: "healthy-done" },
      h("h2", {}, batch.end === "budget" ? "That's your time for today" : "That's today's batch"),
      settings.activities.length
        ? h("div", { id: "activities" }, h("p", {}, "Something else to do:"),
            h("ul", {}, ...settings.activities.map((a) => h("li", {}, a))))
        : h("p", { class: "muted" }, "Add a few things you'd rather do in Settings, and they'll show here."),
      h("button", { class: "primary big", id: "leave", onclick: () => void send({ t: "closeTab" }) }, `Leave ${name}`),
      honest);
  }
  if (!batch.items.length) {
    return h("section", { id: "healthy" }, h("h2", {}, "Today's batch"),
      h("p", { class: "muted" }, `Picking from what ${name} loaded. If nothing shows, search instead.`), honest);
  }
  return h(
    "section",
    { id: "healthy" },
    h("h2", {}, "Today's batch"),
    h("p", { class: "muted small" }, `${left.length} of ${batch.items.length} left`),
    ...batch.items.map((i) => {
      const opened = seen.has(i.id);
      return h("div", { class: opened ? "row seen" : "row", "data-item": i.id },
        h("div", {},
          h("a", { href: `${i.url}#algone-pick`, target: "_top", onclick: () => void send({ t: "healthySeen", id: i.id }) }, i.title),
          i.channel ? h("span", { class: "muted small" }, ` ${i.channel}`) : null),
        opened && i.channel && !store.ratings[i.channel.toLowerCase()]
          ? h("div", { class: "rate", role: "group", "aria-label": `Rate ${i.channel}` },
              ...RATINGS.map(([r, label]) => h("button", { class: "ghost small", "data-rating": r, onclick: () => void send({ t: "rate", channel: i.channel, rating: r }) }, label)))
          : null,
      );
    }),
    honest,
  );
}

async function renderFeed(): Promise<void> {
  const state = await loadState();
  applyTheme(state.settings.theme);
  const site = state.settings.sites[siteId];
  if (!site) return;
  const queue = site.intent.searchHome ? queueList(state.queue, state.settings.queueSoftCap) : null;
  mount(
    root,
    site.intent.searchHome ? searchBox(site.intent.prompt) : null,
    queue,
    site.mode === "random" ? randomPanel() : null,
    site.mode === "custom"
      ? customPanel(rankItems(state.feeds.items, state.settings.customRanking), state.feeds.sources.length)
      : null,
    site.mode === "healthy"
      ? healthyPanel(currentBatch(state.settings, siteId, state.healthy, now()), state.settings, state.healthy)
      : null,
  );
}

async function renderLaunch(): Promise<void> {
  const state = await loadState();
  applyTheme(state.settings.theme);
  const body = document.body;
  body.classList.add("cover");
  mount(
    root,
    h(
      "main",
      { class: "card" },
      h("h1", {}, `Opening ${rule?.name ?? "this site"}`),
      h("button", {
        class: "primary big",
        id: "leave",
        autofocus: true,
        onclick: () => {
          void toPage({ t: "launchPassed" }).then(() => api.tabs.getCurrent()).then((tab) => {
            if (tab?.id !== undefined) void api.tabs.remove(tab.id);
          }).catch(() => send({ t: "closeTab" }));
        },
      }, "Leave"),
      rule?.searchUrl
        ? h("button", {
            class: "ghost",
            id: "search-instead",
            onclick: () => {
              const q = prompt("What are you looking for?");
              void toPage({ t: "launchPassed" }).then(() => {
                if (q) void toPage({ t: "go", path: rule.searchUrl + encodeURIComponent(q) });
              });
            },
          }, "Search for something specific")
        : null,
      h("button", { class: "ghost", id: "continue", onclick: () => void toPage({ t: "launchPassed" }) }, "Continue"),
    ),
  );
}

async function renderEnded(): Promise<void> {
  const state = await loadState();
  applyTheme(state.settings.theme);
  const next = state.queue.find((q) => q.url !== pageUrl);
  document.body.classList.add("cover");
  mount(
    root,
    h(
      "main",
      { class: "card" },
      h("h1", {}, "That is the end"),
      next ? h("a", { class: "primary big", id: "next", href: next.url, target: "_top" }, `Next in your queue: ${next.title}`) : null,
      h("button", { class: "ghost", id: "done", onclick: () => void toPage({ t: "closePanel", kind: "ended" }) }, "Done"),
    ),
  );
}

function renderSave(): void {
  void loadState().then((s) => applyTheme(s.settings.theme));
  const btn = h("button", {
    class: "primary small",
    id: "save",
    onclick: () => {
      void send({ t: "queueAdd", url: pageUrl, title: params.get("title") || pageUrl, site: siteId }).then(() => {
        btn.textContent = "Saved";
      });
    },
  }, "Save for later");
  mount(root, btn);
}

async function renderNotice(): Promise<void> {
  const state = await loadState();
  applyTheme(state.settings.theme);
  mount(root, h("div", { class: "notice", id: "notice", role: "status" }, "Your time is nearly up. The feed will hide again soon.",
    h("span", { hidden: true }, COPY.privacy)));
}

const renderers: Record<string, () => unknown> = {
  feed: renderFeed,
  launch: renderLaunch,
  ended: renderEnded,
  save: renderSave,
  notice: renderNotice,
};

document.documentElement.dataset.panel = kind;
void renderers[kind]?.();
if (kind === "feed") api.storage.onChanged.addListener(() => void renderFeed());
