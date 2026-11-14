import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { home } from "./update";

/**
 * Release Firefox keeps only add-ons Mozilla has signed. Mozilla signs an "unlisted"
 * add-on for its own author without putting it in the store: nobody else can find it.
 * That needs the author's AMO API credentials, read by web-ext from the environment.
 */
export const AMO_KEY_PAGE = "https://addons.mozilla.org/en-US/developers/addon/api/key/";

export function hasAmoCredentials(env: Record<string, string | undefined>): boolean {
  return !!env.WEB_EXT_API_KEY && !!env.WEB_EXT_API_SECRET;
}

export const FIREFOX_SETUP = `Firefox needs Algone signed by Mozilla, privately (unlisted: not in the store).
One-time setup:
  1. Sign in at ${AMO_KEY_PAGE} and press "Generate new credentials".
  2. In PowerShell, run (with your JWT issuer and JWT secret):
       setx WEB_EXT_API_KEY "<JWT issuer>"
       setx WEB_EXT_API_SECRET "<JWT secret>"
  3. Open a new terminal and run: algone install firefox --from apps/extension/dist
`;

/** Signs dist/firefox as unlisted and returns the signed .xpi. Each signing needs a new version. */
export function signFirefox(sourceDir: string): string {
  const out = join(home(), "firefox");
  mkdirSync(out, { recursive: true });
  execFileSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["--yes", "web-ext@10.8.0", "sign", "--channel=unlisted", "--source-dir", sourceDir, "--artifacts-dir", out],
    { stdio: "inherit", shell: process.platform === "win32" },
  );
  const xpis = readdirSync(out)
    .filter((f) => f.endsWith(".xpi"))
    .map((f) => join(out, f))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  if (!xpis[0]) throw new Error("Mozilla returned no signed file");
  return xpis[0];
}

/** Hands the signed file to Firefox, which shows its own "Add Algone?" prompt. */
export function openInFirefox(xpi: string): void {
  const candidates = [
    join(process.env.ProgramFiles ?? "C:\\Program Files", "Mozilla Firefox", "firefox.exe"),
    join(process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)", "Mozilla Firefox", "firefox.exe"),
  ];
  const exe = candidates.find((c) => existsSync(c)) ?? "firefox";
  spawn(exe, [xpi], { detached: true, stdio: "ignore" }).unref();
}
