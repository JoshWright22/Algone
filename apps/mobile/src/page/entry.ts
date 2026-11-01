// Runs in the page's main world, so page scripts can see and forge anything here.
// It holds no state of its own beyond the boot object, and can only send three hints.
import { primeRoutes, start, type Hint, type PageHost, type PagePayload } from "@algone/engine";
import type { PageBoot } from "./boot";

/** Supplied by the wrapper in src/injection.ts. */
declare const __algoneBoot: PageBoot;

type Win = Window & {
  __algoneOn?: boolean;
  __algoneUpdate?: (p: PagePayload) => void;
  ReactNativeWebView?: { postMessage(data: string): void };
};

/** Returns a setter for this stylesheet's text, or null if the CSS could not be applied. */
function addSheet(css: string): ((text: string) => void) | null {
  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    return (text) => sheet.replaceSync(text);
  } catch {
    // Older WebKit has no constructable sheets. Fall through to a <style> element.
  }
  try {
    const style = document.createElement("style");
    style.textContent = css;
    (document.head ?? document.documentElement).appendChild(style);
    if (!style.sheet) return null; // A page CSP blocked it.
    return (text) => {
      style.textContent = text;
    };
  } catch {
    return null;
  }
}

/** At document start the root element may not exist yet. */
function whenRootExists(run: () => void): void {
  if (document.documentElement) {
    run();
    return;
  }
  const observer = new MutationObserver(() => {
    if (!document.documentElement) return;
    observer.disconnect();
    run();
  });
  observer.observe(document, { childList: true });
}

function main(): void {
  const win = window as Win;
  const boot = __algoneBoot;
  if (win.__algoneOn || !boot.hosts.includes(location.hostname)) return;
  win.__algoneOn = true;

  const bridge = win.ReactNativeWebView;
  const cssApplied = addSheet(boot.css) !== null;
  primeRoutes(boot.payload.site.routes);

  let current = boot.payload;
  let setOverlay: ((text: string) => void) | null = null;
  const listeners: Array<(p: PagePayload) => void> = [];

  const host: PageHost = {
    payload: () => Promise.resolve(current),
    onPayload: (cb) => void listeners.push(cb),
    applyCss(css) {
      if (setOverlay) {
        setOverlay(css);
        return Promise.resolve(true);
      }
      setOverlay = addSheet(css);
      return Promise.resolve(setOverlay !== null);
    },
    hint(h: Hint) {
      // Filtering that failed must not report success: the app falls back to its banner.
      if (h.type === "injectionOk" && !cssApplied) return;
      bridge?.postMessage(JSON.stringify(h));
    },
  };

  Object.defineProperty(win, "__algoneUpdate", {
    value(next: PagePayload) {
      current = next;
      for (const cb of listeners) cb(next);
    },
  });

  start(host);
}

whenRootExists(main);
