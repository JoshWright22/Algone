// Thin wrappers for the GitHub API and workflow commands. No decisions live here.
import { appendFileSync } from "node:fs";

const API = process.env.GITHUB_API_URL ?? "https://api.github.com";

export async function rest(path, { method = "GET", body, token = process.env.GH_TOKEN, allow404 = false } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "x-github-api-version": "2022-11-28",
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (allow404 && res.status === 404) return null;
  if (!res.ok) throw new Error(`${method} ${path}: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
  return res.status === 204 ? null : res.json();
}

/** Follows page numbers. `pick` extracts the list from each response. */
export async function restPages(path, pick = (r) => r) {
  const out = [];
  const sep = path.includes("?") ? "&" : "?";
  for (let page = 1; page <= 20; page += 1) {
    const list = pick(await rest(`${path}${sep}per_page=100&page=${page}`));
    out.push(...list);
    if (list.length < 100) return out;
  }
  throw new Error(`${path}: more than 20 pages`);
}

export async function graphql(query, variables) {
  const r = await rest("/graphql", { method: "POST", body: { query, variables } });
  if (r.errors?.length) throw new Error(`GraphQL: ${JSON.stringify(r.errors).slice(0, 300)}`);
  return r.data;
}

export function setOutputs(values) {
  const lines = Object.entries(values).map(([k, v]) => `${k}=${String(v).replaceAll("\n", " ")}`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join("\n")}\n`);
  else console.log(lines.join("\n"));
}

export function summary(text) {
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n`);
}

const escapeCommand = (s) => String(s).replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A");
export const notice = (s) => console.log(`::notice::${escapeCommand(s)}`);
export const warning = (s) => console.log(`::warning::${escapeCommand(s)}`);

/** Optional phone push. A failed push never fails the run. */
export async function ntfy(topic, title, message, url) {
  if (!topic) return;
  try {
    const res = await fetch(`https://ntfy.sh/${encodeURIComponent(topic)}`, {
      method: "POST",
      headers: { Title: title, ...(url ? { Click: url } : {}) },
      body: message,
    });
    if (!res.ok) warning(`ntfy returned HTTP ${res.status}`);
  } catch (e) {
    warning(`ntfy failed: ${e.message}`);
  }
}
