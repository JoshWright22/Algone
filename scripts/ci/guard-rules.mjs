// Runs in pages.yml after the website build. Compares the built rules with the live file,
// checks only the sites this publish changes, and rewrites the built file if one regressed.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { notice, summary, warning } from "./github.mjs";
import { applyGuard, changedSites, parsePublished } from "./guard-rules-core.mjs";

const RULES_FILE = process.env.RULES_FILE ?? "apps/website/dist/rules/v1/rules.json";
const RULES_URL = process.env.RULES_URL ?? "https://joshwright22.github.io/Algone/rules/v1/rules.json";

async function fetchLive() {
  try {
    const res = await fetch(RULES_URL, { cache: "no-store", signal: AbortSignal.timeout(30_000) });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const file = parsePublished(await res.text());
    if (!file) warning("The live rules file did not parse, so every site counts as changed.");
    return file;
  } catch (e) {
    warning(`Could not fetch the live rules file (${e.message}), so every site counts as changed.`);
    return null;
  }
}

function checkSite(id) {
  const out = join("test-results", "guard", id);
  const run = spawnSync("node", ["tests/live/run.mjs", "--site", id, "--out", out], { stdio: "inherit" });
  const file = join(out, "results.json");
  if (run.status !== 0 || !existsSync(file)) {
    warning(`${id}: the live check did not finish, so it counts as inconclusive.`);
    return "inconclusive";
  }
  return JSON.parse(readFileSync(file, "utf8")).sites[id]?.outcome ?? "inconclusive";
}

const next = parsePublished(readFileSync(RULES_FILE, "utf8"));
if (!next) throw new Error(`${RULES_FILE} is not a rules file`);

const previous = await fetchLive();
const changed = changedSites(previous, next);
if (!changed.length) {
  notice("No site's rules changed in this publish.");
  process.exit(0);
}
notice(`Rules changed for: ${changed.join(", ")}.`);

const run = (cmd, args) => execFileSync(cmd, args, { stdio: "inherit" });
run("npx", ["playwright", "install", "--with-deps", "chromium"]);
run("node", ["apps/extension/scripts/build.mjs", "--target", "chrome", "--test", "--out-dir", "apps/extension/dist-test"]);

const outcomes = Object.fromEntries(changed.map((id) => [id, checkSite(id)]));
const { rules, kept, withheld } = applyGuard(previous, next, outcomes);
writeFileSync(RULES_FILE, `${JSON.stringify(rules)}\n`);

summary(`### Rules guard\n\n${changed.map((id) => `- ${id}: ${outcomes[id]}`).join("\n")}`);
if (kept.length) notice(`Regressed to broken, previous entry kept: ${kept.join(", ")}.`);
if (withheld.length) notice(`Broken and new, left out of the file: ${withheld.join(", ")}.`);
