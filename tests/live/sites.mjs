import { readdirSync, readFileSync } from "node:fs";

export function loadSites(dir = "packages/rules/sites") {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(`${dir}/${f}`, "utf8")));
}
