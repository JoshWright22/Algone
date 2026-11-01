// Resolves the release decision from git tags and writes step outputs.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { notice, setOutputs } from "./github.mjs";
import { resolveRelease } from "./release-core.mjs";

const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();

if (process.env.GITHUB_REF !== "refs/heads/main") {
  console.error(`Releases run from main only, not ${process.env.GITHUB_REF}.`);
  process.exit(1);
}

// %(*objectname) is the commit behind an annotated tag, and empty for a lightweight one.
const tags = git("for-each-ref", "refs/tags", "--format=%(refname:short) %(objectname) %(*objectname)")
  .split("\n")
  .filter(Boolean)
  .map((line) => {
    const [name, sha, peeled] = line.split(" ");
    return { name, sha: peeled || sha };
  });

const r = resolveRelease({
  event: process.env.GITHUB_EVENT_NAME,
  channel: process.env.INPUT_CHANNEL,
  inputVersion: process.env.INPUT_VERSION,
  pkgVersion: JSON.parse(readFileSync("package.json", "utf8")).version,
  runNumber: Number(process.env.GITHUB_RUN_NUMBER),
  startedAt: new Date().toISOString(),
  headSha: process.env.GITHUB_SHA,
  tags,
});

if (r.skip) {
  notice(`Nightly skipped. ${r.reason}`);
  setOutputs({ skip: true });
  process.exit(0);
}
if (r.channel === "stable") {
  // A stable release must never ship a commit outside main.
  git("merge-base", "--is-ancestor", r.sha, "origin/main");
  notice(`Stable ${r.version} promotes ${r.sha}, the commit of ${r.promotedFrom}.`);
}
setOutputs({
  skip: false,
  channel: r.channel,
  version: r.version,
  tag: r.tag,
  title: r.title,
  manifest_version: r.manifestVersion,
  sha: r.sha,
  prerelease: r.prerelease,
  previous_tag: r.previousTag,
  promoted_from: r.promotedFrom ?? "",
});
