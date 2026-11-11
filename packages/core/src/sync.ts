import type { SiteRule } from "@algone/rules";
import { applyPatch, describePatch } from "./commands";
import { planSync } from "./diff";
import { parsePolicy, settingsFromPolicy } from "./policy";
import type { Patch, Pending, Settings } from "./types";

export interface Where {
  platform: string;
  deviceId: string;
}

export type ApplyResult =
  | { ok: false; error: string }
  | { ok: true; settings: Settings; applied: number; pending: Pending | null; rev: number };

/**
 * Takes a policy file from anywhere (an import, sync, an agent's edit) and splits it the
 * same way: stricter changes apply now, looser ones become one pending change that waits
 * for this device's barrier.
 */
export function applyPolicyText(
  local: Settings,
  text: string,
  rules: SiteRule[],
  where: Where,
  source: string,
): ApplyResult {
  const parsed = parsePolicy(text, rules);
  if (!parsed.ok) return parsed;
  const incoming = settingsFromPolicy(parsed.policy, rules, {
    ...where,
    local: { theme: local.theme, breakUntil: local.breakUntil, barrier: local.barrier },
  });
  const plan = planSync(local, incoming, rules);
  const settings = plan.applyNow.reduce(applyPatch, local);
  let pending: Pending | null = null;
  if (plan.pending.length) {
    const patch: Patch = { op: "batch", patches: plan.pending, source };
    pending = { kind: "patch", patch, label: describePatch(patch) };
  }
  return { ok: true, settings, applied: plan.applyNow.length, pending, rev: parsed.policy.rev };
}
