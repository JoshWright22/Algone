import type { Hint, PickedItem } from "@algone/engine";
import { isAllowedUrl } from "./navigationPolicy";

const MAX_MESSAGE = 4096;
const MAX_PATH = 2048;
/** Feed items come in chunks of at most FEED_CHUNK, each title, channel and URL capped. */
export const FEED_CHUNK = 10;
const MAX_FEED_MESSAGE = 32_768;

/** The engine's hints plus the one the app's page script adds for the healthy batch. */
export type MobileHint = Hint | { type: "feedItems"; items: PickedItem[] };

/** All a hint can reach. There is no store and no URL opener here, on purpose. */
export interface HintTargets {
  /** Dismisses the "filtering is not active" check for this page load. */
  injectionConfirmed(): void;
  /** Picks which native strip to show. Display only. */
  routeChanged(path: string): void;
  /** Shows the native end-of-video sheet. */
  showEndSheet(): void;
  /** Items read from the hidden feed. The receiver checks them again against the site. */
  feedItems(items: PickedItem[]): void;
}

function pickedItems(raw: unknown): PickedItem[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > FEED_CHUNK) return null;
  const out: PickedItem[] = [];
  for (const i of raw) {
    if (typeof i !== "object" || i === null) return null;
    const { title, channel, url } = i as Record<string, unknown>;
    if (typeof title !== "string" || typeof channel !== "string" || typeof url !== "string") return null;
    if (!title || title.length > 200 || channel.length > 100 || url.length > MAX_PATH) return null;
    out.push({ title, channel, url });
  }
  return out;
}

/** Page messages can be forged, so this rebuilds a known hint or returns null. */
export function parseHint(data: unknown, senderUrl: string): MobileHint | null {
  if (typeof data !== "string" || data.length > MAX_FEED_MESSAGE) return null;
  if (!isAllowedUrl(senderUrl)) return null;
  let msg: unknown;
  try {
    msg = JSON.parse(data);
  } catch {
    return null;
  }
  if (typeof msg !== "object" || msg === null) return null;
  const { type, path, items } = msg as { type?: unknown; path?: unknown; items?: unknown };
  if (type === "feedItems") {
    const picked = pickedItems(items);
    return picked ? { type, items: picked } : null;
  }
  if (data.length > MAX_MESSAGE) return null;
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
  else if (hint.type === "feedItems") targets.feedItems(hint.items);
  else if (options.stopAtEnd) targets.showEndSheet();
}
