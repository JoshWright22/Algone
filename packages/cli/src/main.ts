import { readFile, writeFile } from "node:fs/promises";
import { run } from "./cli";

const code = await run(process.argv.slice(2), {
  readFile: (p) => readFile(p, "utf8"),
  writeFile: (p, t) => writeFile(p, t, "utf8"),
  out: (t) => console.log(t),
  err: (t) => console.error(t),
  env: process.env,
  fetch: (u, i) => fetch(u, i),
  now: () => Date.now(),
});
process.exitCode = code;
