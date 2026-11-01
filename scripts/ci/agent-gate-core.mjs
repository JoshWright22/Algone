// Decisions for the claude-fix gate. Pure: agent-gate.mjs supplies the data.
export const TRIGGER_LABEL = "claude-fix";
export const DEFAULT_CAP = 3;

/** The MAINTAINERS repo variable: logins split by commas or spaces. */
export function parseMaintainers(raw) {
  return String(raw ?? "").split(/[\s,]+/).filter(Boolean);
}

export function parseCap(raw) {
  const text = String(raw ?? "").trim();
  return /^\d+$/.test(text) ? Number(text) : DEFAULT_CAP;
}

/** site-change may use the whole cap, bug one less, everything else two less. */
export function slotsFor(labels, cap) {
  if (labels.includes("site-change")) return cap;
  return Math.max(0, labels.includes("bug") ? cap - 1 : cap - 2);
}

/** A run counts if its agent job started. A gate that stopped leaves the job skipped. */
export function countAgentRuns(jobs) {
  return jobs.filter((j) => j.name === "agent" && j.started_at && j.conclusion !== "skipped").length;
}

/**
 * Lists who other than a maintainer changed the body or title.
 * GitHub reports the original text as the oldest edit once an issue has been edited,
 * and its editor is the author, so that entry is not an edit.
 */
export function outsideEditors({ includesCreatedEdit, bodyEdits, titleRenames, truncated, maintainers = [] }) {
  if (truncated) return { complete: false, editors: [] };
  const byTime = [...bodyEdits].sort((a, b) => Date.parse(a.editedAt) - Date.parse(b.editedAt));
  const real = includesCreatedEdit ? byTime.slice(1) : byTime;
  const logins = [...real.map((e) => e.editor), ...titleRenames.map((r) => r.actor)];
  // A deleted account has no login, and it is not a maintainer.
  const editors = [...new Set(logins.map((l) => l ?? "unknown"))].filter((l) => !maintainers.includes(l));
  return { complete: true, editors };
}

const stop = (kind, message) => ({ proceed: false, kind, message });

/** kind "notice" only logs. kind "comment" also explains on the issue. */
export function decide({ label, sender, maintainers = [], hasCredential, edits, labels, usedToday, cap }) {
  if (label !== TRIGGER_LABEL) return stop("notice", `Label ${label} does not start the agent.`);
  if (!maintainers.includes(sender)) return stop("notice", `Only a maintainer can start the agent. Sender was ${sender}.`);
  if (!hasCredential) {
    return stop(
      "notice",
      "No CLAUDE_CODE_OAUTH_TOKEN or ANTHROPIC_API_KEY secret, so the agent did not run. See docs/setup.md.",
    );
  }
  if (!edits.complete) {
    return stop("comment", "This issue has too many edits to check, so the agent did not run. Repost the text in a new issue.");
  }
  if (edits.editors.length) {
    return stop(
      "comment",
      "Someone other than a maintainer edited this issue's title or body, so the agent did not run. Read it again, and repost the text in a new issue if it is safe.",
    );
  }
  const slots = slotsFor(labels, cap);
  if (usedToday >= slots) {
    return stop(
      "comment",
      `The daily agent limit for this priority is used (${usedToday} runs today, ${slots} slots, cap ${cap}). Remove and re-add ${TRIGGER_LABEL} tomorrow, or raise AGENT_MAX_RUNS_PER_DAY.`,
    );
  }
  return { proceed: true, kind: "proceed", message: `Agent approved: ${usedToday} runs today, ${slots} slots.` };
}
