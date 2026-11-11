import type { SiteRule } from "@algone/rules";
import { applyPatch, describePatch } from "./commands";
import { planSync } from "./diff";
import { parsePolicy, settingsFromPolicy, type Policy } from "./policy";
import type { Patch, Pending, Settings } from "./types";
import { validatePatch } from "./validatePatch";

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
  now: number,
): ApplyResult {
  const parsed = parsePolicy(text, rules);
  if (!parsed.ok) return parsed;
  return applyPolicy(local, parsed.policy, rules, where, source, now);
}

export function applyPolicy(
  local: Settings,
  policy: Policy,
  rules: SiteRule[],
  where: Where,
  source: string,
  now: number,
): ApplyResult {
  const incoming = settingsFromPolicy(policy, rules, {
    ...where,
    local: { theme: local.theme, breakUntil: local.breakUntil, barrier: local.barrier },
  });
  const plan = planSync(local, incoming, rules);
  // Every change is checked as if typed here, so a file cannot set a lock longer than 7 days.
  for (const p of [...plan.applyNow, ...plan.pending]) {
    const error = validatePatch(p, rules, now);
    if (error) return { ok: false, error: `Not applied: ${error}` };
  }
  const settings = plan.applyNow.reduce(applyPatch, local);
  let pending: Pending | null = null;
  if (plan.pending.length) {
    const patch: Patch = { op: "batch", patches: plan.pending, source };
    pending = { kind: "patch", patch, label: describePatch(patch) };
  }
  return { ok: true, settings, applied: plan.applyNow.length, pending, rev: policy.rev };
}
