import { activeAndroidRules, type Settings } from "@algone/core";
import { APPS } from "@algone/rules";
import { a11y } from "../modules/algone-a11y";
import { store } from "./store";

/**
 * The rules the Android service enforces: what applies normally, what applies during a
 * break, and when the break ends. The service picks by its own clock, so a break ends on
 * time even when this app is not running. Pure, for tests.
 */
export function rulesJson(settings: Settings): string {
  return JSON.stringify({
    breakUntil: settings.breakUntil,
    normal: activeAndroidRules({ ...settings, breakUntil: 0 }, APPS, 0),
    onBreak: activeAndroidRules({ ...settings, breakUntil: Number.MAX_SAFE_INTEGER }, APPS, 0),
  });
}

/** Keeps the Android service's rules in step with the settings. Does nothing without the native module. */
export function startAppBlocking(): () => void {
  if (!a11y) return () => {};
  let last = "";
  const push = () => {
    const json = rulesJson(store.get().settings);
    if (json !== last) {
      last = json;
      a11y?.setRules(json);
    }
  };
  push();
  return store.subscribe(push);
}
