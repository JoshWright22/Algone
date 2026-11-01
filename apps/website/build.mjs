// Builds the static site into apps/website/dist. Every internal link and asset
// is relative, so the site works under the /Algone/ base path on GitHub Pages.
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isoMark, mark } from "./src/art.mjs";
import { REPO_URL, STATUS_URL } from "./src/constants.mjs";
import { buildPages } from "./src/pages.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const dist = join(here, "dist");

const NAV = [
  ["install/", "Install"],
  ["how-it-works/", "How it works"],
  ["sites/", "Site status"],
  ["privacy/", "Privacy"],
  ["support/", "Support"],
  ["ledger/", "Ledger"],
];

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

/** One rail entry for each section on the page that has both an id and a heading. */
function railIndex(body) {
  const entries = [...body.matchAll(/<section\b[^>]*\sid="([^"]+)"[^>]*>\s*<h2[^>]*>([\s\S]*?)<\/h2>/g)];
  if (!entries.length) return "";
  return `<nav class="rail-index" aria-label="On this page"><ol>${entries
    .map(([, id, title]) => `<li><a href="#${id}">${title}</a></li>`).join("")}</ol></nav>`;
}

function layout({ slug, title, description, body, script }) {
  const connect = script === "status.js" ? `connect-src ${new URL(STATUS_URL).origin}; ` : "";
  const csp = `default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; ${connect}base-uri 'none'; form-action 'none'`;
  const links = NAV.map(([path, label]) => {
    const current = slug && path === `${slug}/` ? ' aria-current="page"' : "";
    return `<li><a href="{{base}}${path}"${current}>${label}</a></li>`;
  }).join("");
  return `<!doctype html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="referrer" content="no-referrer">
<meta name="color-scheme" content="dark">
<title>${title}</title>
<meta name="description" content="${description}">
<link rel="icon" href="{{base}}assets/icon.svg" type="image/svg+xml">
<link rel="stylesheet" href="{{base}}assets/site.css">
<script src="{{base}}assets/site.js" defer></script>
${script ? `<script src="{{base}}assets/${script}" defer></script>\n` : ""}</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<div class="shell">
<aside class="rail">
<a class="brand" href="{{base}}">${mark(30)}Algone</a>
${slug ? '<div class="rail-gap"></div>' : `<div class="rail-art">${isoMark()}</div>`}
${railIndex(body)}
${slug === "install" ? "" : '<a class="rail-cta" href="{{base}}install/">Install Algone</a>'}
</aside>
<div class="column">
<header class="top">
<nav aria-label="Main"><ul>${links}</ul></nav>
</header>
<main id="main" tabindex="-1">
${body}
</main>
<footer class="foot"><div class="wrap">
<p>Algone is free, open source under the MIT license, and maintained by its community. It has no account and collects no data by default.</p>
<ul>
<li><a href="{{base}}privacy/">Privacy policy</a></li>
<li><a href="{{base}}support/">Support</a></li>
<li><a href="${REPO_URL}">Source on GitHub</a></li>
</ul>
</div></footer>
</div>
</div>
</body>
</html>
`.replaceAll("{{base}}", slug ? "../" : "./");
}

function screenshots() {
  const dir = join(root, "store/screenshots");
  if (!existsSync(dir)) return [];
  const files = readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".png")).sort();
  // An even count keeps the two-column gallery from ending on a lone image.
  return files.slice(0, files.length - files.length % 2);
}

const sites = readdirSync(join(root, "packages/rules/sites"))
  .filter((f) => f.endsWith(".json"))
  .map((f) => readJson(join(root, "packages/rules/sites", f)))
  .sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));
const ledger = readJson(join(root, "ledger/entries.json"));
const shots = screenshots();

rmSync(dist, { recursive: true, force: true });
mkdirSync(join(dist, "assets"), { recursive: true });
mkdirSync(join(dist, "fonts"));

for (const file of ["site.css", "site.js", "status.js"]) {
  copyFileSync(join(here, "src", file), join(dist, "assets", file));
}
copyFileSync(join(root, "assets/icon.svg"), join(dist, "assets/icon.svg"));
copyFileSync(join(root, "apps/extension/public/fonts/Inter.woff2"), join(dist, "fonts/Inter.woff2"));
copyFileSync(join(here, "src/fonts/Newsreader.woff2"), join(dist, "fonts/Newsreader.woff2"));
if (shots.length) {
  mkdirSync(join(dist, "screenshots"));
  for (const f of shots) copyFileSync(join(root, "store/screenshots", f), join(dist, "screenshots", f));
}

const pages = buildPages({ sites, ledger, shots });
for (const page of pages) {
  const dir = page.slug ? join(dist, page.slug) : dist;
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), layout(page));
}

const rules = spawnSync(process.execPath, [join(root, "packages/rules/scripts/publish-rules.mjs")], { stdio: "inherit" });
if (rules.status !== 0) throw new Error("publish-rules failed");

console.log(`website: ${pages.length} pages in ${dist}`);
