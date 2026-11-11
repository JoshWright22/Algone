import { clearAll, writeOff, writeRoute, writeView } from "./attrs";
import { collectItems } from "./capture";
import { collectFeed } from "./healthy";
import { runEffects, subscriptionsRedirect } from "./effects";
import { launchPassed } from "./launch";
import { pauseHiddenMedia } from "./media";
import { watchPage } from "./nav";
import { hasPanel, removePanel, showEndedPanel, showFeedPanel, showPanel } from "./panels";
import { watchPlayer } from "./player";
import { matchRoutes } from "./routes";
import { onWake, scheduleSnooze } from "./snooze";
import { applyTuned, clearTuned } from "./tuned";
import type { PageHost, PagePayload } from "./types";

export * from "./types";
export { matchRoutes } from "./routes";
export { shortsTarget } from "./effects";

/** Sets the route attribute synchronously, before anything paints. */
export function primeRoutes(routes: PagePayload["site"]["routes"]): string[] {
  const r = matchRoutes(routes, location.pathname, location.search);
  writeRoute(r);
  return r;
}

export function start(host: PageHost): () => void {
  let payload: PagePayload | null = null;
  let routes: string[] = [];
  let cancelSnooze = () => {};
  let appliedOverlay = "";

  const onNav = () => {
    if (!payload) return;
    routes = matchRoutes(payload.site.routes, location.pathname, location.search);
    writeRoute(routes);
    host.hint({ type: "route", path: location.pathname });
    subscriptionsRedirect(payload.site, payload.view, routes);
    renderPanels();
    tick();
  };

  const renderPanels = () => {
    if (!payload || !host.extension) return;
    const { view, site } = payload;
    const onHome = routes.includes("home");
    if (view.launchPause && !launchPassed()) showPanel(host, "launch");
    else removePanel("launch");
    if (view.panel && onHome) showFeedPanel(host, site);
    else removePanel("feed");
    if (routes.includes("watch") && view.enabled) showPanel(host, "save");
    else removePanel("save");
  };

  const tick = () => {
    if (!payload) return;
    const { view, site } = payload;
    runEffects(site.effects, view.effects, routes);
    if (view.tuned && site.tuned) applyTuned(site.tuned, view.tuned);
    pauseHiddenMedia(view.enabled && view.snoozedUntil === 0);
    if (view.stopAtEnd && site.player) {
      watchPlayer(site.player, (video) => {
        host.hint({ type: "videoEnded" });
        showEndedPanel(host, video);
      });
    }
    if (view.panel?.content === "healthy" && site.tuned && host.extension && routes.includes("home")) {
      const items = collectFeed(site.tuned);
      if (items.length) host.extension.feedItems(items);
    }
    if (site.capture && host.extension && site.capture.routes.some((r) => routes.includes(r))) {
      const items = collectItems(site.capture);
      if (items.length) host.extension.capture(items);
    }
    if (view.panel && routes.includes("home")) showFeedPanel(host, site);
  };

  const applyOverlay = async (css: string, off: string[]) => {
    const key = `${css}\n${off.join(" ")}`;
    if (key === appliedOverlay) return;
    appliedOverlay = key;
    // The old rule goes off only after its replacement is in place.
    const ok = css ? await host.applyCss(css) : true;
    if (ok) writeOff(off);
  };

  const apply = (next: PagePayload) => {
    const wasTuned = payload?.view.tuned;
    payload = next;
    writeView(next.view);
    void applyOverlay(next.overlayCss, next.view.off);
    if (wasTuned && !next.view.tuned) clearTuned();
    routes = matchRoutes(next.site.routes, location.pathname, location.search);
    writeRoute(routes);
    subscriptionsRedirect(next.site, next.view, routes);
    cancelSnooze();
    cancelSnooze = scheduleSnooze(
      next.view,
      () => {
        if (host.extension) showPanel(host, "notice");
      },
      () => {
        removePanel("notice");
        void host.payload().then(apply);
      },
    );
    if (!next.view.snoozedUntil && hasPanel("notice")) removePanel("notice");
    renderPanels();
    tick();
    host.hint({ type: "injectionOk" });
  };

  void host.payload().then(apply);
  host.onPayload(apply);
  const stopWatch = watchPage(onNav, tick);
  const stopWake = onWake(() => void host.payload().then(apply));
  return () => {
    stopWatch();
    stopWake();
    cancelSnooze();
    clearAll();
  };
}
