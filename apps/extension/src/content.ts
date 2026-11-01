import { computeView, effectiveRule, isStale } from "@algone/core";
import { siteForHost, type SiteRule } from "@algone/rules";
import { primeRoutes, start, type PagePayload, type PageHost, type PageSite } from "@algone/engine";
import { api, now } from "./browser";
import { send } from "./messages";
import { loadState } from "./state";

function pageSite(rule: SiteRule): PageSite {
  return {
    id: rule.id,
    routes: rule.routes,
    ...(rule.tuned ? { tuned: rule.tuned } : {}),
    ...(rule.player ? { player: rule.player } : {}),
    ...(rule.slot ? { slot: rule.slot } : {}),
    ...(rule.subscriptionsPath ? { subscriptionsPath: rule.subscriptionsPath } : {}),
    ...(rule.capture ? { capture: rule.capture } : {}),
    effects: rule.elements.flatMap((e) =>
      e.effect
        ? [{ id: e.id, effect: e.effect, ...(e.effectSelector ? { selector: e.effectSelector } : {}) }]
        : [],
    ),
  };
}

function main(): void {
  const bundled = siteForHost(location.hostname);
  if (!bundled) return;
  primeRoutes(bundled.routes);

  const payload = async (): Promise<PagePayload> => {
    const state = await loadState();
    const rule = effectiveRule(bundled, state.rulesOverlay);
    return {
      site: pageSite(rule),
      view: computeView(state.settings, state.runtime, rule, now(), state.rulesOverlay),
      overlayCss: state.rulesOverlay?.sites[rule.id]?.css ?? "",
    };
  };

  const host: PageHost = {
    payload,
    onPayload(cb) {
      api.storage.onChanged.addListener(() => {
        // After an update the old script loses its context, and must stop.
        if (!api.runtime?.id) {
          stop();
          return;
        }
        void payload().then(cb);
      });
    },
    async applyCss(css) {
      try {
        return (await send({ t: "overlayCss", css })).ok;
      } catch {
        return false;
      }
    },
    hint() {},
    extension: {
      panelUrl: (kind) =>
        api.runtime.getURL(`panel.html?kind=${kind}&site=${bundled.id}&url=${encodeURIComponent(location.href)}`),
      capture: (items) => void send({ t: "capture", site: bundled.id, items }),
    },
  };

  const stop = start(host);

  api.runtime.onMessage.addListener((msg: { t: string }, _sender, reply) => {
    if (msg.t === "whichSite") {
      const title = document.title;
      const feed = document.querySelector('link[rel="alternate"][type="application/rss+xml"]');
      reply({ site: bundled.id, url: location.href, title, feedUrl: feed?.getAttribute("href") ?? "" });
    } else if (msg.t === "launchPassed") {
      sessionStorage.setItem("algone-launch-passed", "1");
      void payload().then((p) => {
        document.querySelector('iframe[data-algone-panel="launch"]')?.remove();
        void p;
      });
      reply({});
    } else if (msg.t === "closePanel") {
      document.querySelector(`iframe[data-algone-panel="${(msg as unknown as { kind: string }).kind}"]`)?.remove();
      reply({});
    } else if (msg.t === "go") {
      const to = (msg as unknown as { path: string }).path;
      if (to.startsWith("/") && !to.startsWith("//")) location.assign(to);
      reply({});
    }
    return false;
  });

  void loadState().then((s) => {
    if (s.settings.ruleUpdates && isStale(s.runtime.lastRuleCheck, now())) {
      void send({ t: "rulesCheck" }).catch(() => undefined);
    }
  });
}

main();
