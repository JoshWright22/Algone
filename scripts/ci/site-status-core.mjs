// Decisions for the daily site check. Pure: site-status.mjs does the GitHub calls.
import { BOT_LOGIN, marker, parseMarker } from "./markers.mjs";

export const WALLED_AFTER_DAYS = 7;
/** Mentions the logins in the MAINTAINERS repo variable. */
export const mention = (raw = process.env.MAINTAINERS) =>
  String(raw ?? "").split(/[\s,]+/).filter(Boolean).map((l) => `@${l}`).join(" ") || "Maintainers:";

// Reasons come from the checker, but a failed probe must never carry page text into an issue.
export const safeReason = (s) => String(s).replace(/[^\w ./:;#-]/g, "").slice(0, 200);

const brokenReasons = (r) =>
  (r.probes ?? [])
    .filter((p) => p.outcome === "broken")
    .map((p) => ({ path: safeReason(p.path), reason: safeReason(p.reason) }));

/**
 * Folds one run into the stored status.
 * Sites absent from this run keep their entry. The counter moves at most once a day, so a
 * manual run cannot shorten seven days.
 */
export function nextStatus(prev, results, { today, runId }) {
  const sites = { ...(prev?.sites ?? {}) };
  const broken = [];
  const newlyWalled = [];
  for (const [id, r] of Object.entries(results.sites)) {
    if (r.outcome === "not-checked") continue;
    const old = sites[id] ?? {};
    const entry = {
      ...old,
      outcome: r.outcome,
      tier: r.tier,
      method: r.method,
      inconclusiveDays: old.inconclusiveDays ?? 0,
      walled: old.walled ?? false,
    };
    if (r.outcome === "inconclusive") {
      if (old.lastCounted !== today) {
        entry.inconclusiveDays += 1;
        entry.lastCounted = today;
      }
      if (entry.inconclusiveDays >= WALLED_AFTER_DAYS) {
        entry.walled = true;
        if (!old.walled) newlyWalled.push(id);
      }
    } else {
      entry.inconclusiveDays = 0;
      entry.walled = false;
      delete entry.lastCounted;
      if (r.outcome === "pass") entry.lastPass = today;
      else broken.push({ site: id, reasons: brokenReasons(r) });
    }
    sites[id] = entry;
  }
  return { status: { date: results.date, run: String(runId), sites }, broken, newlyWalled };
}

export function brokenIssue({ site, reasons }, { runId, runUrl, simulated }) {
  return {
    title: `${simulated ? "[simulated] " : ""}Site check: ${site} is broken`,
    labels: ["site-change"],
    body: [
      `${mention()} the daily check found a problem on **${site}**.${simulated ? " This run used a deliberately wrong selector." : ""}`,
      "",
      ...reasons.map((r) => `- \`${r.path}\`: ${r.reason}`),
      "",
      `Run: ${runUrl}`,
      "",
      `Add the \`claude-fix\` label to start a repair. The sanitized snapshot from this run will be at \`test-results/live/${site}-desktop.json\`.`,
      "",
      marker(site, runId),
    ].join("\n"),
  };
}

export function walledIssue(site, { runId, runUrl }) {
  return {
    title: `Site check: ${site} has been inconclusive for ${WALLED_AFTER_DAYS} days`,
    labels: ["site-walled"],
    body: [
      `${mention()} **${site}** served a login, bot, or error page to the daily check for ${WALLED_AFTER_DAYS} days in a row.`,
      "",
      "Its rules are not being checked by this job. Use the logged-in check in docs/setup.md until a probe passes.",
      "",
      `Run: ${runUrl}`,
      "",
      marker(site, runId),
    ].join("\n"),
  };
}

/**
 * Finds the open issue for a site. Only the bot's issues with the label count,
 * so a stranger's issue with the same title cannot suppress a report.
 */
export function findOpenIssue(issues, label, site) {
  return (
    issues.find(
      (i) =>
        !i.pull_request &&
        i.state === "open" &&
        i.user?.login === BOT_LOGIN &&
        i.labels?.some((l) => l.name === label) &&
        parseMarker(i.body, i.user.login)?.site === site,
    ) ?? null
  );
}
