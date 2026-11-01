import type { PanelKind, PageHost, PageSite } from "./types";

const ATTR = "data-algone-panel";

function find(kind: PanelKind): HTMLIFrameElement | null {
  return document.querySelector(`iframe[${ATTR}="${kind}"]`);
}

function frame(host: PageHost, kind: PanelKind): HTMLIFrameElement | null {
  if (!host.extension) return null;
  const f = document.createElement("iframe");
  f.setAttribute(ATTR, kind);
  f.src = host.extension.panelUrl(kind);
  f.title = "Algone";
  return f;
}

export function removePanel(kind: PanelKind): void {
  find(kind)?.remove();
}

/** Extension iframes keep page scripts away from the queue and from these buttons. */
export function showPanel(host: PageHost, kind: PanelKind, parent?: Element | null): void {
  if (find(kind)) return;
  const f = frame(host, kind);
  if (f) (parent ?? document.documentElement).appendChild(f);
}

export function showFeedPanel(host: PageHost, site: PageSite): void {
  if (find("feed")) return;
  const f = frame(host, "feed");
  if (!f) return;
  let anchor: Element | null = null;
  try {
    anchor = site.slot ? document.querySelector(site.slot.selector) : null;
  } catch {
    anchor = null;
  }
  if (anchor?.parentElement) anchor.parentElement.insertBefore(f, anchor);
  else if (document.body) {
    f.setAttribute("data-algone-fixed", "");
    document.body.appendChild(f);
  }
}

export function showEndedPanel(host: PageHost, video: Element): void {
  const parent = video.closest("#movie_player") ?? video.parentElement;
  showPanel(host, "ended", parent);
}

export const hasPanel = (kind: PanelKind) => find(kind) !== null;
