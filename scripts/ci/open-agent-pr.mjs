// Opens the PR for the branch the Claude action pushed.
//
// The pinned action ends with a "Revoke app token" step, so its github_token output is
// normally dead by the time this runs. It is tried first anyway. The next source repeats the
// action's own OIDC exchange, which keeps the PR authored by the Claude app so CI starts.
// That endpoint is not a documented API. GITHUB_TOKEN is the last resort, and a PR opened
// with it starts no workflows.
import { execFileSync } from "node:child_process";
import { notice, rest, warning } from "./github.mjs";
import { openWithFallback, prBody } from "./open-agent-pr-core.mjs";

const repo = process.env.GITHUB_REPOSITORY;
const { BRANCH: branch, ISSUE: issue, ACTION_TOKEN: actionToken, WORKFLOW_TOKEN: workflowToken } = process.env;
const base = "main";

async function exchangeToken() {
  const { ACTIONS_ID_TOKEN_REQUEST_URL: url, ACTIONS_ID_TOKEN_REQUEST_TOKEN: bearer } = process.env;
  if (!url || !bearer) throw new Error("no OIDC request variables");
  const oidc = await fetch(`${url}&audience=claude-code-github-action`, {
    headers: { authorization: `Bearer ${bearer}` },
  });
  if (!oidc.ok) throw new Error(`OIDC HTTP ${oidc.status}`);
  const { value } = await oidc.json();
  const res = await fetch("https://api.anthropic.com/api/github/github-app-token-exchange", {
    method: "POST",
    headers: { authorization: `Bearer ${value}`, "content-type": "application/json" },
    body: JSON.stringify({ permissions: { pull_requests: "write" } }),
  });
  if (!res.ok) throw new Error(`exchange HTTP ${res.status}`);
  return (await res.json()).token;
}

const createPr = (token) =>
  execFileSync(
    "gh",
    ["pr", "create", "--repo", repo, "--base", base, "--head", branch, "--title", `Fix issue #${issue}`, "--body", prBody(issue)],
    { encoding: "utf8", env: { ...process.env, GH_TOKEN: token }, stdio: ["ignore", "pipe", "pipe"] },
  ).trim();

if (!branch) {
  notice("The action reported no branch, so there is no pull request to open.");
  process.exit(0);
}
const compare = await rest(
  `/repos/${repo}/compare/${base}...${branch.split("/").map(encodeURIComponent).join("/")}`,
  { token: workflowToken, allow404: true },
);
if (!compare || compare.ahead_by === 0) {
  notice(`Branch ${branch} has no new commits, so there is no pull request to open.`);
  process.exit(0);
}

let exchanged;
const result = await openWithFallback(
  [
    { name: "action output", get: () => actionToken },
    { name: "app token exchange", get: async () => (exchanged = await exchangeToken()) },
    { name: "GITHUB_TOKEN", get: () => workflowToken },
  ],
  createPr,
);

if (exchanged) await rest("/installation/token", { method: "DELETE", token: exchanged }).catch(() => {});
for (const e of result.errors) notice(`PR attempt failed. ${e.split("\n")[0].slice(0, 200)}`);
if (!result.url) {
  warning(`Could not open a PR. Open it by hand: https://github.com/${repo}/compare/${base}...${branch}?expand=1`);
  process.exit(1);
}
notice(`Opened ${result.url} with ${result.used}.`);
if (result.used === "GITHUB_TOKEN") {
  warning("This PR was opened with GITHUB_TOKEN, so CI did not start. Close and reopen the PR to start CI.");
}
