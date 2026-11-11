import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ExpoConfig } from "expo/config";

const rootPackage = JSON.parse(readFileSync(resolve(__dirname, "../../package.json"), "utf8")) as {
  version: string;
};

/** `rev` is the commit timestamp (D-39). 0 accepts any published rules file. */
function buildRev(): number {
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%ct"], { encoding: "utf8" });
    return Number(out.trim()) || 0;
  } catch {
    return 0;
  }
}

/** Apple builds can set REMOTE_RULES=false (D-35). Remote rules are on otherwise. */
const remoteRules = process.env.REMOTE_RULES !== "false";

const config: ExpoConfig = {
  name: "Algone Browser",
  slug: "algone-browser",
  scheme: "algone",
  version: rootPackage.version,
  orientation: "default",
  userInterfaceStyle: "automatic",
  icon: "./assets/icon.png",
  backgroundColor: "#0b0b0f",
  ios: {
    bundleIdentifier: "io.github.joshwright22.algone",
    supportsTablet: true,
    config: { usesNonExemptEncryption: false },
  },
  android: {
    package: "io.github.joshwright22.algone",
    // Keeps the sync token and settings out of Android's cloud backup and device transfer.
    allowBackup: false,
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-foreground.png",
      backgroundColor: "#14141c",
    },
    // These only served the web view's file downloader, which the app does not offer.
    blockedPermissions: [
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
    ],
  },
  plugins: [
    [
      "expo-share-intent",
      {
        iosActivationRules: {
          NSExtensionActivationSupportsWebURLWithMaxCount: 1,
          NSExtensionActivationSupportsWebPageWithMaxCount: 1,
          NSExtensionActivationSupportsText: true,
        },
        androidIntentFilters: ["text/*"],
      },
    ],
    "expo-status-bar",
  ],
  extra: { REMOTE_RULES: remoteRules, BUILD_REV: buildRev() },
};

export default config;
