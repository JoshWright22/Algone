// Gate for claude-fix.yml. Reads the event, gathers facts, and writes outputs for later jobs.
import { readFileSync } from "node:fs";
import { countAgentRuns, decide, OWNER, outsideEditors, parseCap, TRIGGER_LABEL } from "./agent-gate-core.mjs";
import { graphql, notice, rest, restPages, setOutputs } from "./github.mjs";
import { parseMarker } from "./markers.mjs";

const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
const repo = process.env.GITHUB_REPOSITORY;
const [owner, name] = repo.split("/");
const issue = event.issue;

const EDITS = `query($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    issue(number: $number) {
      includesCreatedEdit
      userContentEdits(first: 100) {
        pageInfo { hasNextPage }
        nodes { editedAt editor { login } }
      }
      timelineItems(first: 100, itemTypes: [RENAMED_TITLE_EVENT]) {
        pageInfo { hasNextPage }
        nodes { ... on RenamedTitleEvent { actor { login } } }
      }
    }
  }
}`;

async function readEdits() {
  const data = await graphql(EDITS, { owner, name, number: issue.number });
  const i = data.repository.issue;
  return outsideEditors({
    includesCreatedEdit: i.includesCreatedEdit,
    bodyEdits: i.userContentEdits.nodes.map((n) => ({ editedAt: n.editedAt, editor: n.editor?.login })),
    titleRenames: i.timelineItems.nodes.map((n) => ({ actor: n.actor?.login })),
    truncated: i.userContentEdits.pageInfo.hasNextPage || i.timelineItems.pageInfo.hasNextPage,
  });
}

async function agentRunsToday() {
  const today = new Date().toISOString().slice(0, 10);
  const runs = await restPages(
    `/repos/${repo}/actions/workflows/claude-fix.yml/runs?created=${encodeURIComponent(`>=${today}`)}`,
    (r) => r.workflow_runs,
  );
  let used = 0;
  for (const run of runs) {
    if (String(run.id) === process.env.GITHUB_RUN_ID) continue;
    const jobs = await rest(`/repos/${repo}/actions/runs/${run.id}/jobs?per_page=100`);
    used += countAgentRuns(jobs.jobs);
  }
  return used;
}

const label = event.label?.name;
const sender = event.sender?.login;
const hasCredential = process.env.HAS_OAUTH_TOKEN === "true" || process.env.HAS_API_KEY === "true";
// The API calls are only worth making once the cheap checks pass.
const ready = label === TRIGGER_LABEL && sender === OWNER && hasCredential;

const result = decide({
  label,
  sender,
  hasCredential,
  edits: ready ? await readEdits() : { complete: true, editors: [] },
  labels: issue.labels.map((l) => l.name),
  usedToday: ready ? await agentRunsToday() : 0,
  cap: parseCap(process.env.AGENT_MAX_RUNS_PER_DAY),
});

notice(result.message);
const found = parseMarker(issue.body, issue.user?.login);
setOutputs({
  proceed: result.proceed,
  comment: result.kind === "comment" ? result.message : "",
  snapshot_run: result.proceed && found ? found.runId : "",
});
