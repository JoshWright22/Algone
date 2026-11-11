import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { run } from "./cli";
import { BROWSERS, folderFor, installFrom, schedule, unschedule, update, type Browser } from "./update";

const args = process.argv.slice(2);
const browsersIn = (list: string[]): Browser[] => {
  const picked = list.filter((a): a is Browser => (BROWSERS as readonly string[]).includes(a));
  return picked.length ? picked : [...BROWSERS];
};

async function installOrUpdate(): Promise<number> {
  const [cmd, ...rest] = args;
  const fromAt = rest.indexOf("--from");
  const from = fromAt >= 0 ? rest[fromAt + 1] : undefined;
  const browsers = browsersIn(rest.filter((_, i) => i !== fromAt && i !== fromAt + 1));
  let failed = 0;
  for (const b of browsers) {
    try {
      if (from) {
        const dir = installFrom(resolve(from, b), b, "local build");
        console.log(`${b}: installed in ${dir}`);
      } else {
        await update(b, console.log);
      }
    } catch (e) {
      failed++;
      console.error(`${b}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  if (cmd === "install") {
    console.log(schedule(process.argv[1]!, browsers));
    console.log(`
One step only you can do, once per browser (browsers do not let programs add extensions):
${browsers.map((b) => `  ${b === "edge" ? "edge://extensions" : "chrome://extensions"}: turn on Developer mode, press "Load unpacked", pick ${folderFor(b)}`).join("\n")}
After that, updates install by themselves every hour and Algone reloads within 10 minutes.`);
  }
  return failed ? 1 : 0;
}

if (args[0] === "install" || args[0] === "update") {
  process.exitCode = await installOrUpdate();
} else if (args[0] === "stop-updates") {
  unschedule();
  console.log(`Stopped automatic updates. The installed copies in ${join(folderFor("chrome"), "..")} stay as they are.`);
} else {
  process.exitCode = await run(args, {
    readFile: (p) => readFile(p, "utf8"),
    writeFile: (p, t) => writeFile(p, t, "utf8"),
    out: (t) => console.log(t),
    err: (t) => console.error(t),
    env: process.env,
    fetch: (u, i) => fetch(u, i),
    now: () => Date.now(),
  });
}
