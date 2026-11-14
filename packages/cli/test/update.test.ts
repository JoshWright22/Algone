import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkBuild, pickRelease } from "../src/update";

const asset = (name: string, tag: string) => ({ name, browser_download_url: `https://github.com/JoshWright22/Algone/releases/download/${tag}/${name}` });

describe("updater", () => {
  it("picks the newest release with a build for the browser, nightly included", () => {
    const list = [
      { tag_name: "v0.2.0-draft", draft: true, assets: [asset("algone-chrome.zip", "x")] },
      { tag_name: "v0.1.0-nightly.2", prerelease: true, assets: [asset("algone-edge.zip", "v0.1.0-nightly.2")] },
      { tag_name: "v0.1.0-nightly.1", prerelease: true, assets: [asset("algone-chrome.zip", "v0.1.0-nightly.1")] },
    ];
    expect(pickRelease(list, "chrome")?.tag).toBe("v0.1.0-nightly.1");
    expect(pickRelease(list, "edge")?.tag).toBe("v0.1.0-nightly.2");
  });
  it("only downloads from this repository's releases", () => {
    const list = [{ tag_name: "v1", assets: [{ name: "algone-chrome.zip", browser_download_url: "https://evil.example/algone-chrome.zip" }] }];
    expect(pickRelease(list, "chrome")).toBeNull();
    expect(pickRelease({}, "chrome")).toBeNull();
  });
  it("checks a folder is an Algone build before installing it", () => {
    const dir = mkdtempSync(join(tmpdir(), "algone-test-"));
    expect(() => checkBuild(dir)).toThrow();
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "manifest.json"), JSON.stringify({ name: "Algone", manifest_version: 3 }));
    writeFileSync(join(dir, "build.json"), JSON.stringify({ rev: 5 }));
    expect(checkBuild(dir)).toEqual({ rev: 5 });
    writeFileSync(join(dir, "manifest.json"), JSON.stringify({ name: "Other", manifest_version: 3 }));
    expect(() => checkBuild(dir)).toThrow();
  });
});

describe("installing", () => {
  it("never replaces a newer build with an older one", async () => {
    const { installFrom, folderFor } = await import("../src/update");
    const root = mkdtempSync(join(tmpdir(), "algone-home-"));
    process.env.LOCALAPPDATA = root;
    const build = (rev: number) => {
      const d = mkdtempSync(join(tmpdir(), "algone-build-"));
      writeFileSync(join(d, "manifest.json"), JSON.stringify({ name: "Algone", manifest_version: 3 }));
      writeFileSync(join(d, "build.json"), JSON.stringify({ rev }));
      return d;
    };
    installFrom(build(10), "chrome", "a");
    expect(checkBuild(folderFor("chrome")).rev).toBe(10);
    expect(() => installFrom(build(5), "chrome", "b")).toThrow(/newer/);
    installFrom(build(11), "chrome", "c");
    expect(checkBuild(folderFor("chrome")).rev).toBe(11);
  });
});

describe("firefox", () => {
  it("needs both AMO credentials, and says how to get them", async () => {
    const { hasAmoCredentials, FIREFOX_SETUP } = await import("../src/firefox");
    expect(hasAmoCredentials({})).toBe(false);
    expect(hasAmoCredentials({ WEB_EXT_API_KEY: "a" })).toBe(false);
    expect(hasAmoCredentials({ WEB_EXT_API_KEY: "a", WEB_EXT_API_SECRET: "b" })).toBe(true);
    expect(FIREFOX_SETUP).toContain("unlisted");
  });
});
