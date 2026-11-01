// Refuses to pass if a logged-in snapshot still holds a handle or email.
//   npm run snapshot:scan -- <dir> <handle> [<handle>...]
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const [dir, ...handles] = process.argv.slice(2);
if (!dir || handles.length === 0) {
  console.error("Usage: npm run snapshot:scan -- <dir> <your handle or name> [...]");
  process.exit(2);
}
const walk = (d) =>
  readdirSync(d).flatMap((f) => {
    const p = join(d, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
let bad = 0;
for (const file of walk(dir)) {
  const text = readFileSync(file, "utf8").toLowerCase();
  for (const h of handles) {
    if (text.includes(h.toLowerCase())) {
      console.error(`${file}: contains ${h}`);
      bad += 1;
    }
  }
  if (/[a-z0-9._-]+@[a-z0-9-]+\.[a-z]{2,}/.test(text)) {
    console.error(`${file}: contains something that looks like an email`);
    bad += 1;
  }
}
if (bad) process.exit(1);
console.log("clean");
