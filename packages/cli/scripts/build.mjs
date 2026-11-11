// Bundles the CLI into one file Node runs directly: node packages/cli/dist/algone.mjs
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const here = resolve(dirname(fileURLToPath(import.meta.url)), "..");
await build({
  entryPoints: [join(here, "src/main.ts")],
  outfile: join(here, "dist/algone.mjs"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  banner: { js: "#!/usr/bin/env node" },
  logLevel: "warning",
});
console.log("Built packages/cli/dist/algone.mjs");
