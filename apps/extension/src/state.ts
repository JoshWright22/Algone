import { defaultRuntime, emptyHealthyStore, migrateSettings } from "@algone/core";
import { SITES } from "@algone/rules";
import { api } from "./browser";
import type { Stored } from "./messages";

/** Reads all state, with defaults, so a missing key behaves like a fresh install. */
export async function loadState(): Promise<Stored> {
  const raw = (await api.storage.local.get([
    "settings",
    "runtime",
    "queue",
    "feeds",
    "rulesOverlay",
    "healthy",
  ])) as Partial<Stored>;
  return {
    settings: migrateSettings(raw.settings, SITES),
    runtime: { ...defaultRuntime(), ...raw.runtime },
    queue: raw.queue ?? [],
    feeds: raw.feeds ?? { sources: [], items: [] },
    rulesOverlay: raw.rulesOverlay ?? null,
    healthy: { ...emptyHealthyStore(), ...raw.healthy },
  };
}
