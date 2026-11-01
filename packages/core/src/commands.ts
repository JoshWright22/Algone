import type { Patch, Runtime, Settings } from "./types";

/** Applies one patch and returns new settings. Pure. */
export function applyPatch(settings: Settings, patch: Patch): Settings {
  const site = "site" in patch ? settings.sites[patch.site] : undefined;
  const withSite = (next: NonNullable<typeof site>): Settings => ({
    ...settings,
    sites: { ...settings.sites, [(patch as { site: string }).site]: next },
  });
  switch (patch.op) {
    case "setElement":
      if (!site) return settings;
      return withSite({ ...site, elements: { ...site.elements, [patch.element]: patch.hidden } });
    case "setSiteEnabled":
      if (!site) return settings;
      return withSite({ ...site, enabled: patch.enabled });
    case "setMode":
      if (!site) return settings;
      return withSite({ ...site, mode: patch.mode });
    case "setIntent":
      if (!site) return settings;
      return withSite({ ...site, intent: { ...site.intent, [patch.key]: patch.value } });
    case "setTuned":
      if (!site) return settings;
      return withSite({ ...site, tuned: patch.filters });
    case "setBarrier":
      return { ...settings, barrier: patch.barrier };
    case "setGlobal":
      if (patch.key === "wikipedia") {
        return { ...settings, webSources: { wikipedia: patch.value === true } };
      }
      return { ...settings, [patch.key]: patch.value };
    case "useBundledRules":
      return { ...settings, ruleUpdates: false };
  }
}

/** Short user-facing text for a pending change. */
export function describePatch(patch: Patch, siteName = ""): string {
  switch (patch.op) {
    case "setElement":
      return `Show ${patch.element} on ${siteName}`;
    case "setSiteEnabled":
      return `Turn Algone off on ${siteName}`;
    case "setMode":
      return `Switch ${siteName} to ${patch.mode === "tuned" ? "Tuned" : "Custom"}`;
    case "setIntent":
      return `Turn off an intent feature on ${siteName}`;
    case "setBarrier":
      return "Change the unlock barrier";
    case "setTuned":
      return `Loosen Tuned filters on ${siteName}`;
    case "useBundledRules":
      return "Use bundled rules and stop rule updates";
    default:
      return "Change a setting";
  }
}

export function startSnooze(
  runtime: Runtime,
  site: string,
  minutes: number,
  now: number,
): Runtime {
  return {
    ...runtime,
    snoozes: { ...runtime.snoozes, [site]: { until: now + minutes * 60_000 } },
  };
}

export function clearSnooze(runtime: Runtime, site: string): Runtime {
  const { [site]: _gone, ...snoozes } = runtime.snoozes;
  return { ...runtime, snoozes };
}
