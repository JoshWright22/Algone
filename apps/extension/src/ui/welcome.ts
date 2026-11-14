import { COPY, PRIVACY_URL } from "@algone/core";
import { SITES } from "@algone/rules";
import { api } from "../browser";
import { loadState } from "../state";
import { applyTheme, h, mount } from "./h";

const root = document.getElementById("root")!;

/** Browsers let people withhold site access, and then nothing is hidden on that site. */
async function accessRows(): Promise<HTMLElement[]> {
  const rows: HTMLElement[] = [];
  for (const site of SITES) {
    const origins = site.hosts.map((host) => `https://${host}/*`);
    const granted = await api.permissions.contains({ origins });
    if (!granted) {
      rows.push(h("div", { class: "row" }, h("span", {}, `${site.name} is not active`),
        h("button", { class: "primary small", onclick: () => void api.permissions.request({ origins }).then(render) }, "Allow")));
    }
  }
  return rows;
}

async function render(): Promise<void> {
  const state = await loadState();
  applyTheme(state.settings.theme);
  const missing = await accessRows();
  mount(
    root,
    h(
      "main",
      { class: "page" },
      h("h1", {}, "Algone is on"),
      h("p", { class: "lead" }, `Feeds and recommendations are now hidden on ${SITES.length} sites. Search, subscriptions, direct links, and messages keep working.`),
      missing.length ? h("section", { id: "access" }, h("h2", {}, "Allow Algone on these sites"), ...missing) : null,
      h("section", {}, h("h2", {}, "How it works"),
        h("ul", {},
          h("li", {}, "Hiding more is instant. Showing more asks you to pause first."),
          h("li", {}, "Every unlock is a timed snooze. After it, things hide again on their own."),
          h("li", {}, "Each site has four modes: No feed, Random, Tuned, and Custom."),
        ),
      ),
      h("section", { id: "limits" }, h("h2", {}, "What Algone cannot do"),
        h("p", {}, COPY.uninstall),
        h("p", {}, COPY.bypass),
        h("p", {}, COPY.browserOnly),
      ),
      h("section", {}, h("h2", {}, "Privacy"),
        h("p", {}, COPY.privacy),
        h("p", {}, COPY.rules),
        h("p", {}, h("a", { href: PRIVACY_URL, target: "_blank", rel: "noreferrer" }, "Read the privacy policy")),
      ),
      h("div", { class: "actions" },
        h("button", { class: "primary", onclick: () => void api.runtime.openOptionsPage() }, "Open settings"),
      ),
    ),
  );
}

void render();
