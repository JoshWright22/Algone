import type { View } from "@algone/core";

/** Schedules expiry work. Timers stop in frozen pages, so callers also recheck on focus. */
export function scheduleSnooze(
  view: View,
  onWarn: () => void,
  onExpire: () => void,
  now = Date.now(),
): () => void {
  const timers: Array<ReturnType<typeof setTimeout>> = [];
  if (view.snoozedUntil > now) {
    timers.push(setTimeout(onExpire, view.snoozedUntil - now));
    if (view.warnAt > now) timers.push(setTimeout(onWarn, view.warnAt - now));
    else onWarn();
  }
  return () => timers.forEach(clearTimeout);
}

export function onWake(cb: () => void): () => void {
  const onVisible = () => {
    if (!document.hidden) cb();
  };
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("pageshow", cb);
  window.addEventListener("focus", cb);
  return () => {
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("pageshow", cb);
    window.removeEventListener("focus", cb);
  };
}
