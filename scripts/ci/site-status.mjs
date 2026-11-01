// Turns tests/live results into issues, status.json, and optional phone pushes.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { notice, ntfy, rest, restPages } from "./github.mjs";
import { brokenIssue, findOpenIssue, nextStatus, walledIssue } from "./site-status-core.mjs";

const repo = process.env.GITHUB_REPOSITORY;
const runId = process.env.GITHUB_RUN_ID;
const runUrl = `${process.env.GITHUB_SERVER_URL}/${repo}/actions/runs/${runId}`;
const simulated = Boolean(process.env.SIMULATE_BREAK);
const topic = process.env.NTFY_TOPIC;
const BRANCH = "site-status";
const dir = process.env.RESULTS_DIR ?? "test-results/live";

const results = JSON.parse(readFileSync(join(dir, "results.json"), "utf8"));

async function readStatus() {
  const file = await rest(`/repos/${repo}/contents/status.json?ref=${BRANCH}`, { allow404: true });
  if (!file) return { sha: undefined, status: null };
  return { sha: file.sha, status: JSON.parse(Buffer.from(file.content, "base64").toString("utf8")) };
}

async function open(label, issue, site) {
  const existing = await restPages(`/repos/${repo}/issues?state=open&labels=${label}`);
  const found = findOpenIssue(existing, label, site);
  if (found) {
    notice(`${site}: issue #${found.number} is already open.`);
    return;
  }
  const made = await rest(`/repos/${repo}/issues`, { method: "POST", body: issue });
  notice(`${site}: opened issue #${made.number}.`);
  await ntfy(topic, "Algone site check", `${issue.title} (#${made.number})`, made.html_url);
}

const { sha, status: prev } = await readStatus();
const today = new Date().toISOString().slice(0, 10);
const next = nextStatus(prev, results, { today, runId });

for (const b of next.broken) await open("site-change", brokenIssue(b, { runId, runUrl, simulated }), b.site);

// A simulated run tests the issue path. It must not change the record of real results.
if (simulated) {
  notice("Simulated run: status.json and the inconclusive counters were left alone.");
} else {
  for (const site of next.newlyWalled) await open("site-walled", walledIssue(site, { runId, runUrl }), site);
  await rest(`/repos/${repo}/contents/status.json`, {
    method: "PUT",
    body: {
      message: `Site status ${today}`,
      branch: BRANCH,
      content: Buffer.from(`${JSON.stringify(next.status, null, 2)}\n`).toString("base64"),
      ...(sha ? { sha } : {}),
    },
  });
}
