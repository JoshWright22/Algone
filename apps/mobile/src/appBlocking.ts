import { activeAndroidRules, type Settings } from "@algone/core";
import { APPS } from "@algone/rules";
import { a11y } from "../modules/algone-a11y";
import { store } from "./store";

/** The JSON the Android service enforces now, from this device's settings. Pure, for tests. */
export function rulesJson(settings: Settings, now: number): string {
  return JSON.stringify(activeAndroidRules(settings, APPS, now));
}

/**
 * Keeps the Android service's rules in step with the settings: on every change, and once a
 * minute so a break ends on time. Does nothing where the native module is absent.
 */
export function startAppBlocking(clock: () => number = Date.now): () => void {
  if (!a11y) return () => {};
  let last = "";
  const push = () => {
    const json = rulesJson(store.get().settings, clock());
    if (json !== last) {
      last = json;
      a11y?.setRules(json);
    }
  };
  push();
  const stop = store.subscribe(push);
  const timer = setInterval(push, 60_000);
  return () => {
    stop();
    clearInterval(timer);
  };
}
