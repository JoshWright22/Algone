import { token, type SiteRule } from "@algone/rules";
import { isHidden } from "./defaults";
import type { Overlay } from "./rulesUpdate";
import { warnTime } from "./snooze";
import type { PanelSpec, Runtime, Settings, View } from "./types";

/** The one function that decides what a page shows, on every platform. */
export function computeView(
  settings: Settings,
  runtime: Runtime,
  rule: SiteRule,
  now: number,
  overlay?: Overlay | null,
): View {
  const site = settings.sites[rule.id];
  const snooze = runtime.snoozes[rule.id];
  const snoozed = !!snooze && snooze.until > now;
  const off = overlayOff(rule, overlay);
  const elements = [...rule.elements, ...overlayAdded(rule, overlay)];
  const onBreak = settings.breakUntil > now;
  const inactive = !site || !site.enabled;

  const show: string[] = [];
  const hide: string[] = [];
  const effects: string[] = [];
  for (const el of elements) {
    const t = token(rule.id, el.id);
    const hidden = site ? isHidden(el, site) : el.class === "algorithmic";
    const tunedFeed = site?.mode === "tuned" && el.feed;
    // A break shows the feeds but keeps short-video loops and autoplay off.
    const breakShows = onBreak && !(/shorts|reels/i.test(el.id) || el.effect === "stopAutoplay" || el.effect === "shortsToWatch");
    const visible = inactive || snoozed || tunedFeed || breakShows || !hidden;
    if (el.class === "algorithmic") {
      if (visible) show.push(t);
      else if (el.effect) effects.push(el.id);
    } else if (!visible) {
      hide.push(t);
    }
  }

  const mode = site?.mode ?? "nofeed";
  const active = !inactive && !snoozed && !onBreak;
  return {
    site: rule.id,
    enabled: !inactive && !onBreak,
    mode,
    show,
    hide,
    off,
    snoozedUntil: snoozed ? snooze.until : 0,
    warnAt: snoozed ? warnTime(snooze.until, settings.snoozeMinutes) : 0,
    panel: active && site ? panelFor(site.mode, site.intent.searchHome, site.intent.prompt) : null,
    launchPause: active && !!site?.intent.launchPause,
    effects,
    tuned: active && mode === "tuned" && site ? site.tuned : null,
    stopAtEnd: active && settings.stopAtEnd && !!rule.player,
    subsFirst: active && !!site?.intent.subsFirst && !!rule.subscriptionsPath,
  };
}

function panelFor(mode: string, search: boolean, prompt: boolean): PanelSpec | null {
  const content = mode === "random" || mode === "custom" || mode === "healthy" ? mode : null;
  if (!search && !content) return null;
  return { search, prompt: search && prompt, content };
}

function overlayOff(rule: SiteRule, overlay?: Overlay | null): string[] {
  const o = overlay?.sites[rule.id];
  if (!o) return [];
  const ids = [...o.replaced, ...o.retired];
  return ids.map((id) => token(rule.id, id));
}

function overlayAdded(rule: SiteRule, overlay?: Overlay | null) {
  return overlay?.sites[rule.id]?.added ?? [];
}
