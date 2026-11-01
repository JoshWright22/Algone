// Writes the published rules file for the website. Run: npm run build:rules
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const out = join(root, "apps/website/dist/rules/v1/rules.json");

const rev = Number(execFileSync("git", ["log", "-1", "--format=%ct"], { cwd: root, encoding: "utf8" }).trim());
if (!Number.isInteger(rev) || rev <= 0) throw new Error(`Bad rev from git log: ${rev}`);

const temp = mkdtempSync(join(tmpdir(), "algone-rules-"));
try {
  const bundle = join(temp, "rules.mjs");
  await build({
    entryPoints: [join(root, "packages/rules/src/index.ts")],
    bundle: true,
    format: "esm",
    platform: "node",
    outfile: bundle,
    logLevel: "silent",
  });
  const { SITES, publishRules, validateSite, MAX_FILE_BYTES } = await import(pathToFileURL(bundle).href);

  const errors = SITES.flatMap((s) => validateSite(s).map((e) => `${s.id}: ${e}`));
  if (errors.length) throw new Error(`Invalid rules:\n${errors.join("\n")}`);

  const text = JSON.stringify(publishRules(SITES, rev));
  const bytes = Buffer.byteLength(text);
  if (bytes > MAX_FILE_BYTES) throw new Error(`rules.json is ${bytes} bytes; clients reject over ${MAX_FILE_BYTES}`);

  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, text);
  console.log(`rules.json: ${SITES.length} sites, rev ${rev}, ${bytes} bytes`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
