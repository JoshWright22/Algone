import type { Hint } from "@algone/engine";
import { isAllowedUrl } from "./navigationPolicy";

const MAX_MESSAGE = 4096;
const MAX_PATH = 2048;

/** All a hint can reach. There is no store and no URL opener here, on purpose. */
export interface HintTargets {
  /** Dismisses the "filtering is not active" check for this page load. */
  injectionConfirmed(): void;
  /** Picks which native strip to show. Display only. */
  routeChanged(path: string): void;
  /** Shows the native end-of-video sheet. */
  showEndSheet(): void;
}

/** Page messages can be forged, so this rebuilds a known hint or returns null. */
export function parseHint(data: unknown, senderUrl: string): Hint | null {
  if (typeof data !== "string" || data.length > MAX_MESSAGE) return null;
  if (!isAllowedUrl(senderUrl)) return null;
  let msg: unknown;
  try {
    msg = JSON.parse(data);
  } catch {
    return null;
  }
  if (typeof msg !== "object" || msg === null) return null;
  const { type, path } = msg as { type?: unknown; path?: unknown };
  if (type === "injectionOk" || type === "videoEnded") return { type };
  if (type === "route" && typeof path === "string" && path.startsWith("/") && path.length <= MAX_PATH) {
    return { type, path };
  }
  return null;
}

export function handleMessage(
  data: unknown,
  senderUrl: string,
  options: { stopAtEnd: boolean },
  targets: HintTargets,
): void {
  const hint = parseHint(data, senderUrl);
  if (!hint) return;
  if (hint.type === "injectionOk") targets.injectionConfirmed();
  else if (hint.type === "route") targets.routeChanged(hint.path);
  else if (options.stopAtEnd) targets.showEndSheet();
}
