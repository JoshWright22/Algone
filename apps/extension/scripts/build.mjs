// Builds the extension for each browser. Output is not minified, so reviewers read what runs.
import { execSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { build } from "esbuild";

const here = dirname(fileURLToPath(import.meta.url));
const app = resolve(here, "..");
const root = resolve(app, "../..");
const { values: args } = parseArgs({
  options: {
    target: { type: "string", default: "all" },
    version: { type: "string" },
    test: { type: "boolean", default: false },
    "no-remote-rules": { type: "boolean", default: false },
    "out-dir": { type: "string" },
    "build-rev": { type: "string" },
  },
});

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const version = args.version ?? pkg.version;
const TARGETS = ["chrome", "edge", "firefox", "safari"];
const targets = args.target === "all" ? TARGETS : args.target.split(",");
const outRoot = args["out-dir"] ? resolve(args["out-dir"]) : join(app, "dist");

function buildRev() {
  try {
    return Number(execSync("git log -1 --format=%ct", { cwd: root }).toString().trim());
  } catch {
    return 0;
  }
}
const BUILD_REV = args["build-rev"] ? Number(args["build-rev"]) : buildRev();

const { SITES, compileSiteCss, BASE_CSS } = await (async () => {
  const out = join(app, "dist", ".tools", "rules.mjs");
  await build({
    entryPoints: [join(root, "packages/rules/src/index.ts")],
    outfile: out,
    bundle: true,
    format: "esm",
    platform: "node",
    logLevel: "silent",
  });
  return import(`file:///${out.replaceAll("\\", "/")}`);
})();

function manifest(target) {
  const hosts = SITES.flatMap((s) => s.hosts.map((h) => `https://${h}/*`));
  const m = {
    manifest_version: 3,
    name: "Algone: Algorithm Control",
    short_name: "Algone",
    version,
    description: "Replace algorithmic feeds with something you control. Works in your browser, stored on your device.",
    homepage_url: "https://joshwright22.github.io/Algone/",
    icons: { 16: "icons/icon-16.png", 32: "icons/icon-32.png", 48: "icons/icon-48.png", 128: "icons/icon-128.png" },
    action: {
      default_title: "Algone",
      default_popup: "popup.html",
      default_icon: { 16: "icons/icon-16.png", 32: "icons/icon-32.png", 48: "icons/icon-48.png" },
    },
    options_ui: { page: "options.html", open_in_tab: true },
    permissions: ["storage", "alarms", "scripting"],
    host_permissions: hosts,
    // github.com only during "Sign in with GitHub"; it is removed again right after.
    optional_host_permissions: ["https://en.wikipedia.org/*", "https://github.com/*"],
    content_scripts: SITES.map((s) => ({
      matches: s.hosts.map((h) => `https://${h}/*`),
      css: ["css/base.css", `css/${s.id}.css`],
      js: ["content.js"],
      run_at: "document_start",
      all_frames: false,
    })),
    web_accessible_resources: [{ resources: ["panel.html", "panel.js", "theme.css", "fonts/*"], matches: hosts }],
  };
  if (target === "chrome" || target === "edge") {
    m.background = { service_worker: "background.js" };
    m.minimum_chrome_version = "116";
  } else if (target === "firefox") {
    m.background = { scripts: ["background.js"] };
    m.browser_specific_settings = {
      gecko: {
        id: "algone@joshwright22.github.io",
        strict_min_version: "140.0",
        data_collection_permissions: { required: ["none"] },
      },
      gecko_android: { strict_min_version: "142.0" },
    };
  } else {
    m.background = { scripts: ["background.js"], persistent: false };
  }
  if (args.test) {
    // Test builds also run on a local host for the Firefox smoke test.
    const local = "http://youtube.localhost/*";
    m.host_permissions.push(local);
    m.content_scripts[0].matches.push(local);
    m.web_accessible_resources[0].matches.push(local);
    m.permissions.push("tabs");
  }
  return m;
}

async function one(target) {
  const out = join(outRoot, target);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(join(out, "css"), { recursive: true });
  await build({
    entryPoints: {
      background: join(app, "src/background.ts"),
      content: join(app, "src/content.ts"),
      popup: join(app, "src/ui/popup.ts"),
      options: join(app, "src/ui/options.ts"),
      unlock: join(app, "src/ui/unlock.ts"),
      panel: join(app, "src/ui/panel.ts"),
      welcome: join(app, "src/ui/welcome.ts"),
    },
    outdir: out,
    bundle: true,
    format: "iife",
    target: "es2022",
    charset: "utf8",
    minify: false,
    logLevel: "warning",
    define: {
      SHOW_TIPS: String(target !== "safari"),
      REMOTE_RULES: String(!args["no-remote-rules"]),
      TEST_HOOKS: String(args.test),
      BUILD_REV: String(BUILD_REV),
      BUILD_TARGET: JSON.stringify(target),
    },
  });
  writeFileSync(join(out, "css/base.css"), BASE_CSS);
  for (const s of SITES) writeFileSync(join(out, `css/${s.id}.css`), compileSiteCss(s));
  cpSync(join(app, "src/ui/theme.css"), join(out, "theme.css"));
  cpSync(join(app, "public"), out, { recursive: true });
  writeFileSync(join(out, "manifest.json"), `${JSON.stringify(manifest(target), null, 2)}\n`);
}

for (const t of targets) await one(t);
rmSync(join(app, "dist", ".tools"), { recursive: true, force: true });
console.log(`Built ${targets.join(", ")} at version ${version}, rev ${BUILD_REV}`);
