import type { AppRule, AppScreen } from "@algone/rules";
import type { AppPolicy, Settings } from "./types";

/** Native apps start with short video blocked and TikTok closed, the same spirit as the healthy default. */
export const DEFAULT_ANDROID_APPS: Record<string, AppPolicy> = {
  youtube: { mode: "cover", shortVideo: true },
  instagram: { mode: "cover", shortVideo: true },
  facebook: { mode: "cover", shortVideo: true },
  reddit: { mode: "cover", shortVideo: true },
  tiktok: { mode: "block" },
};

export interface ActiveAppRule {
  packages: string[];
  screens: AppScreen[];
}

/**
 * What the Android service enforces now: the app rules this device's settings switch on.
 * `block` sends the person home from the whole app; `cover` and `pause` back out of feed
 * screens; `shortVideo` backs out of Shorts and Reels. Limits by minutes are not enforced
 * on Android yet; such an app still has Shorts and Reels blocked unless `shortVideo` is false.
 */
export function activeAndroidRules(settings: Settings, apps: AppRule[], now: number): ActiveAppRule[] {
  if (settings.breakUntil > now) {
    // A break opens feeds but keeps short video closed, as on the web, for apps that block it.
    return apps.flatMap((a) => {
      const cfg = settings.apps.android?.[a.id];
      if (!cfg || cfg.mode === "allow" || (cfg.mode !== "block" && cfg.shortVideo === false)) return [];
      const screens = a.screens.filter((s) => s.kind === "shortVideo");
      return screens.length ? [{ packages: a.packages, screens }] : [];
    });
  }
  const out: ActiveAppRule[] = [];
  for (const app of apps) {
    const cfg = settings.apps.android?.[app.id];
    if (!cfg || cfg.mode === "allow") continue;
    if (cfg.mode === "block") {
      out.push({ packages: app.packages, screens: [{ id: "app", label: app.name, kind: "feed", action: "home", match: { always: true } }] });
      continue;
    }
    const screens = app.screens.filter((s) =>
      (s.kind === "shortVideo" && cfg.shortVideo !== false) || (s.kind === "feed" && (cfg.mode === "cover" || cfg.mode === "pause")),
    );
    if (screens.length) out.push({ packages: app.packages, screens });
  }
  return out;
}
