import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";

/**
 * Installing and updating Algone from a folder, for browsers where it is not from a store.
 * `install` copies a build into a fixed folder per browser and schedules `update`, which
 * replaces the folder's files with the newest GitHub release. The extension notices the
 * newer build.json and reloads itself (see checkSelfUpdate in background.ts).
 */
export const REPO = "JoshWright22/Algone";
export const BROWSERS = ["chrome", "edge"] as const;
export type Browser = (typeof BROWSERS)[number];
const MARKER = ".algone-release";
const TASK = "Algone update";

export interface Release {
  tag: string;
  assets: Array<{ name: string; url: string }>;
}

export function home(): string {
  return join(process.env.LOCALAPPDATA ?? join(homedir(), ".local", "share"), "Algone");
}

export const folderFor = (browser: Browser) => join(home(), browser);

/** The newest release, nightly or stable, that has a build for this browser. */
export function pickRelease(list: unknown, browser: Browser): { tag: string; url: string } | null {
  if (!Array.isArray(list)) return null;
  for (const r of list as Array<{ draft?: boolean; tag_name?: string; assets?: Array<{ name?: string; browser_download_url?: string }> }>) {
    if (r.draft || !r.tag_name) continue;
    const asset = r.assets?.find((a) => a.name === `algone-${browser}.zip`);
    const url = asset?.browser_download_url ?? "";
    if (url.startsWith(`https://github.com/${REPO}/releases/download/`)) return { tag: r.tag_name, url };
  }
  return null;
}

/** Checks a folder holds an Algone build before it replaces a working one. */
export function checkBuild(dir: string): { rev: number } {
  const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8")) as { name?: string; manifest_version?: number };
  const build = JSON.parse(readFileSync(join(dir, "build.json"), "utf8")) as { rev?: number };
  if (!manifest.name?.startsWith("Algone") || manifest.manifest_version !== 3 || typeof build.rev !== "number") {
    throw new Error("That folder is not an Algone build");
  }
  return { rev: build.rev };
}

function installedRev(dir: string): number {
  try {
    return checkBuild(dir).rev;
  } catch {
    return 0;
  }
}

/**
 * Swaps in a new build as one step: copy beside the folder, move the old one aside, move
 * the new one into its place (the browser knows the folder by path), then delete the old.
 * A crash at any point leaves either the old or the new build whole.
 */
function replaceContents(from: string, to: string): void {
  const next = `${to}.new`;
  const old = `${to}.old`;
  rmSync(next, { recursive: true, force: true });
  rmSync(old, { recursive: true, force: true });
  cpSync(from, next, { recursive: true });
  checkBuild(next);
  if (existsSync(to)) renameSync(to, old);
  try {
    renameSync(next, to);
  } catch (e) {
    if (existsSync(old)) renameSync(old, to);
    throw e;
  }
  rmSync(old, { recursive: true, force: true });
}

export function installFrom(source: string, browser: Browser, tag: string): string {
  const { rev } = checkBuild(source);
  const dir = folderFor(browser);
  if (installedRev(dir) > rev) throw new Error(`${dir} already has a newer build`);
  replaceContents(source, dir);
  writeFileSync(join(dir, MARKER), `${tag}\n`);
  return dir;
}

export async function update(browser: Browser, log: (s: string) => void): Promise<boolean> {
  const dir = folderFor(browser);
  const res = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=10`, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
  const pick = pickRelease(await res.json(), browser);
  if (!pick) throw new Error("No release has a build for this browser yet");
  const current = existsSync(join(dir, MARKER)) ? readFileSync(join(dir, MARKER), "utf8").trim() : "";
  if (current === pick.tag) {
    log(`${browser}: up to date (${pick.tag})`);
    return false;
  }
  const temp = mkdtempSync(join(tmpdir(), "algone-update-"));
  try {
    const zip = join(temp, "build.zip");
    const download = await fetch(pick.url);
    if (!download.ok) throw new Error(`Download failed: ${download.status}`);
    writeFileSync(zip, Buffer.from(await download.arrayBuffer()));
    const out = join(temp, "build");
    mkdirSync(out);
    // Windows' own tar (bsdtar) reads zip files; a GNU tar earlier on PATH would not.
    const tar = process.platform === "win32" ? join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tar.exe") : "tar";
    execFileSync(tar, ["-xf", zip, "-C", out], { stdio: "ignore" });
    let rev: number;
    try {
      ({ rev } = checkBuild(out));
    } catch {
      // Remembered, so the hourly check does not download it again.
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, MARKER), `${pick.tag}\n`);
      log(`${browser}: ${pick.tag} is older than automatic updates; keeping the installed build`);
      return false;
    }
    if (installedRev(dir) >= rev) {
      writeFileSync(join(dir, MARKER), `${pick.tag}\n`);
      log(`${browser}: the installed build is as new as ${pick.tag}`);
      return false;
    }
    installFrom(out, browser, pick.tag);
    log(`${browser}: updated to ${pick.tag}. Algone reloads itself within 10 minutes.`);
    return true;
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

/** Copies this script beside the builds and schedules an hourly update (Windows Task Scheduler). */
export function schedule(self: string, browsers: Browser[]): string {
  const script = join(home(), "algone.mjs");
  mkdirSync(home(), { recursive: true });
  if (resolve(self) !== resolve(script)) cpSync(self, script);
  if (process.platform !== "win32") return `Run "node ${script} update" from cron to stay updated.`;
  const command = `"${process.execPath}" "${script}" update ${browsers.join(" ")}`;
  execFileSync("schtasks", ["/Create", "/F", "/SC", "HOURLY", "/TN", TASK, "/TR", command], { stdio: "ignore" });
  return `Scheduled "${TASK}" to run every hour.`;
}

export function unschedule(): void {
  if (process.platform === "win32") {
    try {
      execFileSync("schtasks", ["/Delete", "/F", "/TN", TASK], { stdio: "ignore" });
    } catch {
      // Not scheduled.
    }
  }
}
