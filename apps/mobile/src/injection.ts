import type { PagePayload } from "@algone/engine";
import { PAGE_SCRIPT } from "./generated/pageScript";
import type { PageBoot } from "./page/boot";

const LINE_SEPARATORS = new RegExp("[" + String.fromCharCode(0x2028, 0x2029) + "]", "g");

/** Safe to place in JavaScript source, whatever text the data holds. */
function literal(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(LINE_SEPARATORS, (c) => `\\u${c.charCodeAt(0).toString(16)}`);
}

export const injectionScript = (boot: PageBoot): string =>
  `(function(__algoneBoot){${PAGE_SCRIPT}})(${literal(boot)});true;`;

export const updateScript = (payload: PagePayload): string =>
  `window.__algoneUpdate&&window.__algoneUpdate(${literal(payload)});true;`;

/** No background play: nothing keeps sounding once the app or the screen is left. */
export const PAUSE_MEDIA = `document.querySelectorAll("video,audio").forEach(function(m){m.pause()});true;`;
