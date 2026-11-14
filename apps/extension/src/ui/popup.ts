import { computeView, COPY, feedUrlFor, reportUrl } from "@algone/core";
import { siteMap } from "@algone/rules";
import { api, now } from "../browser";
import { send } from "../messages";
import { loadState } from "../state";
import { allOffSwitch, elementList, modePicker } from "./common";
import { applyTheme, h, mount, toggle } from "./h";

interface Here {
  site: string;
  url: string;
  title: string;
  feedUrl: string;
}

const root = document.getElementById("root")!;

async function currentTab(): Promise<{ id: number; here: Here | null }> {
  const [tab] = await api.tabs.query({ active: true, currentWindow: true });
  if (tab?.id === undefined) return { id: -1, here: null };
  try {
    const here = (await api.tabs.sendMessage(tab.id, { t: "whichSite" })) as Here;
    return { id: tab.id, here };
  } catch {
    return { id: tab.id, here: null };
  }
}

async function render(): Promise<void> {
  const state = await loadState();
  applyTheme(state.settings.theme);
  const { here } = await currentTab();
  const header = h(
    "header",
    {},
    h("div", { class: "brand" }, h("img", { src: "icons/icon-32.png", width: 20, height: 20, alt: "" }), "Algone"),
    h("button", { class: "ghost", onclick: () => void api.runtime.openOptionsPage() }, "Settings"),
  );
  const rule = here ? siteMap()[here.site] : undefined;
  if (!here || !rule) {
    mount(
      root,
      header,
      allOffSwitch(state.settings),
      h(
        "div",
        { class: "empty" },
        h("p", {}, "Algone is not active on this page."),
        h("p", { class: "muted" }, COPY.browserOnly),
      ),
    );
    return;
  }
  const site = state.settings.sites[rule.id]!;
  const view = computeView(state.settings, state.runtime, rule, now());
  const snoozeLine = view.snoozedUntil
    ? h(
        "div",
        { class: "snooze" },
        `Showing until ${new Date(view.snoozedUntil).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`,
        h("button", { class: "ghost", onclick: () => void send({ t: "endSnooze", site: rule.id }) }, "Hide now"),
      )
    : h(
        "button",
        { class: "primary", id: "snooze", onclick: () => void send({ t: "snooze", site: rule.id }) },
        `Show for ${state.settings.snoozeMinutes} minutes`,
      );
  const creatorFeed = here.feedUrl || feedUrlFor(here.url);
  mount(
    root,
    header,
    allOffSwitch(state.settings),
    h(
      "div",
      { class: "site" },
      h("h2", {}, rule.name),
      toggle(site.enabled, (next) => {
        void send({ t: "patch", patch: { op: "setSiteEnabled", site: rule.id, enabled: next } });
      }, `Algone on ${rule.name}`),
    ),
    modePicker(rule, site),
    snoozeLine,
    elementList(rule, site),
    h(
      "div",
      { class: "actions" },
      h("button", {
        class: "ghost",
        onclick: () => void send({ t: "queueAdd", url: here.url, title: here.title, site: rule.id }),
      }, "Save for later"),
      h("button", {
        class: "ghost",
        onclick: () =>
          void send({
            t: "sourceAdd",
            url: creatorFeed || here.url,
            title: here.title,
            site: rule.id,
            kind: creatorFeed ? "rss" : "tile",
          }),
      }, "Follow in Algone"),
      h("a", {
        class: "ghost",
        href: reportUrl(rule.id, new URL(here.url).pathname, api.runtime.getManifest().version),
        target: "_blank",
        rel: "noreferrer",
      }, "Report a problem"),
    ),
  );
}

void render();
api.storage.onChanged.addListener(() => void render());
