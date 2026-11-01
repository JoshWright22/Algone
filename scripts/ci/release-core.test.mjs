import { describe, expect, it } from "vitest";
import {
  compareVersions, latestNightly, latestStable, nextPatch, nightlyNames, renderNotes,
  resolveRelease, stableVersion, utcDateStamp,
} from "./release-core.mjs";

const SHA = "a".repeat(40);
const OLD = "b".repeat(40);
const nightly = (run, sha = OLD) => ({ name: `v0.1.0-nightly.20261030.${run}`, sha });
const base = { pkgVersion: "0.1.0", runNumber: 12, startedAt: "2026-10-31T05:23:00Z", headSha: SHA };

describe("version computation", () => {
  it("names a nightly", () => {
    expect(nightlyNames(base)).toEqual({
      version: "0.1.0-nightly.20261031.12",
      tag: "v0.1.0-nightly.20261031.12",
      manifestVersion: "0.1.0.12",
    });
  });
  it("uses the UTC date", () => expect(utcDateStamp("2026-12-31T23:59:59-05:00")).toBe("20270101"));
  it("rejects a run number too big for a manifest", () => {
    expect(() => nightlyNames({ ...base, runNumber: 70000 })).toThrow();
  });
  it("compares numerically, not as text", () => {
    expect(compareVersions("0.10.0", "0.9.9")).toBeGreaterThan(0);
    const tags = [{ name: "v0.9.0" }, { name: "v0.10.0" }, { name: "v0.8.0-nightly.20260101.1" }];
    expect(latestStable(tags).version).toBe("0.10.0");
  });
  it("orders nightlies by run number", () => {
    expect(latestNightly([nightly(9), nightly(10), { name: "v1.0.0", sha: SHA }]).name).toContain(".10");
    expect(latestNightly([{ name: "v1.0.0", sha: SHA }])).toBeNull();
  });
  it("defaults stable to the next patch, or the package version with no stable tag", () => {
    expect(nextPatch("1.2.9")).toBe("1.2.10");
    expect(stableVersion({ pkgVersion: "0.1.0", tags: [{ name: "v0.1.4" }] })).toBe("0.1.5");
    expect(stableVersion({ pkgVersion: "0.1.0", tags: [] })).toBe("0.1.0");
  });
  it("accepts an input version, with or without v", () => {
    expect(stableVersion({ input: "v0.2.0", pkgVersion: "0.1.0", tags: [{ name: "v0.1.4" }] })).toBe("0.2.0");
  });
  it("rejects a bad or old stable version", () => {
    const tags = [{ name: "v0.1.4" }];
    for (const input of ["0.1.4", "0.1.3", "1.2", "1.2.3-beta; rm"]) {
      expect(() => stableVersion({ input, pkgVersion: "0.1.0", tags })).toThrow();
    }
  });
});

describe("resolveRelease", () => {
  it("skips a scheduled nightly with no new commits", () => {
    expect(resolveRelease({ ...base, event: "schedule", tags: [nightly(11, SHA)] }).skip).toBe(true);
  });
  it("runs a scheduled nightly on new commits", () => {
    expect(resolveRelease({ ...base, event: "schedule", tags: [nightly(11)] })).toMatchObject({
      skip: false,
      channel: "nightly",
      sha: SHA,
      prerelease: true,
      title: "Algone Nightly 0.1.0-nightly.20261031.12 (aaaaaaa)",
      previousTag: "v0.1.0-nightly.20261030.11",
    });
  });
  it("runs the first nightly", () => {
    expect(resolveRelease({ ...base, event: "schedule", tags: [] }).previousTag).toBe("");
  });
  it("lets a manual nightly run with no new commits", () => {
    const r = resolveRelease({ ...base, event: "workflow_dispatch", channel: "nightly", tags: [nightly(11, SHA)] });
    expect(r.skip).toBe(false);
  });
  it("promotes the latest nightly's commit, not main's head", () => {
    const tags = [nightly(10, "c".repeat(40)), nightly(11), { name: "v0.1.0", sha: OLD }];
    expect(resolveRelease({ ...base, event: "workflow_dispatch", channel: "stable", tags })).toMatchObject({
      sha: OLD,
      version: "0.1.1",
      tag: "v0.1.1",
      manifestVersion: "0.1.1",
      prerelease: false,
      title: "Algone 0.1.1",
      previousTag: "v0.1.0",
    });
  });
  it("refuses stable with no nightly, and an unknown channel", () => {
    expect(() => resolveRelease({ ...base, event: "workflow_dispatch", channel: "stable", tags: [] })).toThrow();
    expect(() => resolveRelease({ ...base, event: "workflow_dispatch", channel: "x", tags: [] })).toThrow();
  });
  it("labels the build in the notes", () => {
    const n = { channel: "nightly", version: "v", manifestVersion: "m" };
    expect(renderNotes({ ...n, apkState: "testing" })).toContain("testing build");
    expect(renderNotes({ ...n, apkState: "testing" })).toContain("needs a signed build");
    expect(renderNotes({ ...n, apkState: undefined })).toContain("No Android APK");
  });
});
