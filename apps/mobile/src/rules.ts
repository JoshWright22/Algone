import { handleRulesFile, isStale, RULES_URL } from "@algone/core";
import { siteMap } from "@algone/rules";
import type { Store } from "./store";

export interface RulesConfig {
  remote: boolean;
  buildRev: number;
}

type Fetcher = (url: string, init: RequestInit) => Promise<Pick<Response, "ok" | "status" | "text">>;

/**
 * The daily validated fetch. Bundled rules stay in force unless a file passes
 * `handleRulesFile`. With REMOTE_RULES off, no request is made at all.
 */
export async function checkRules(
  store: Store,
  config: RulesConfig,
  now: number = Date.now(),
  fetcher: Fetcher = fetch,
): Promise<void> {
  const { settings, runtime, rulesOverlay } = store.get();
  if (!config.remote || !settings.ruleUpdates || !isStale(runtime.lastRuleCheck, now)) return;
  try {
    const res = await fetcher(RULES_URL, { credentials: "omit", cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const r = handleRulesFile(
      await res.text(),
      siteMap(),
      config.buildRev,
      runtime.lastAcceptedRev,
      rulesOverlay,
    );
    // "rev is not newer" is the normal daily result, not an error.
    await store.recordRuleCheck({
      at: now,
      error: /newer/.test(r.error) ? "" : r.error || r.rejected.join("; "),
      lastAcceptedRev: r.lastAcceptedRev,
      overlay: r.overlay,
    });
  } catch (e) {
    await store.recordRuleCheck({ at: now, error: String(e) });
  }
}
