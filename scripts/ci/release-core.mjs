// Version and tag decisions for release.yml. Pure: all inputs are passed in.
const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;
const STABLE_TAG = /^v(\d+\.\d+\.\d+)$/;
const NIGHTLY_TAG = /^v(\d+\.\d+\.\d+)-nightly\.(\d{8})\.(\d+)$/;
// Chrome allows at most 65535 in each dotted part of a manifest version.
const MAX_VERSION_PART = 65535;

const parts = (v) => v.split(".").map(Number);

export function compareVersions(a, b) {
  const [x, y] = [parts(a), parts(b)];
  for (let i = 0; i < 3; i += 1) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
}

export function utcDateStamp(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) throw new Error(`Bad date: ${iso}`);
  return d.toISOString().slice(0, 10).replaceAll("-", "");
}

export function nightlyNames({ pkgVersion, runNumber, startedAt }) {
  if (!SEMVER.test(pkgVersion)) throw new Error(`package.json version must be X.Y.Z, got ${pkgVersion}`);
  if (runNumber > MAX_VERSION_PART) throw new Error(`Run number ${runNumber} does not fit a manifest version`);
  const version = `${pkgVersion}-nightly.${utcDateStamp(startedAt)}.${runNumber}`;
  return { version, tag: `v${version}`, manifestVersion: `${pkgVersion}.${runNumber}` };
}

export function latestNightly(tags) {
  const list = tags
    .map((t) => ({ ...t, m: NIGHTLY_TAG.exec(t.name) }))
    .filter((t) => t.m)
    // The run number alone orders them, since each nightly takes the next one.
    .sort((a, b) => Number(a.m[3]) - Number(b.m[3]));
  const last = list.at(-1);
  return last ? { name: last.name, sha: last.sha } : null;
}

export function latestStable(tags) {
  const list = tags
    .map((t) => ({ ...t, version: STABLE_TAG.exec(t.name)?.[1] }))
    .filter((t) => t.version)
    .sort((a, b) => compareVersions(a.version, b.version));
  return list.at(-1) ?? null;
}

export function nextPatch(version) {
  const [a, b, c] = parts(version);
  return `${a}.${b}.${c + 1}`;
}

export function stableVersion({ input, pkgVersion, tags }) {
  const latest = latestStable(tags);
  const raw = (input ?? "").trim().replace(/^v/, "");
  const version = raw || (latest ? nextPatch(latest.version) : pkgVersion);
  if (!SEMVER.test(version)) throw new Error(`Stable version must be X.Y.Z, got ${version}`);
  if (parts(version).some((p) => p > MAX_VERSION_PART)) throw new Error(`${version} does not fit a manifest version`);
  if (latest && compareVersions(version, latest.version) <= 0) {
    throw new Error(`${version} is not above the latest stable ${latest.version}`);
  }
  if (tags.some((t) => t.name === `v${version}`)) throw new Error(`Tag v${version} already exists`);
  return version;
}

/**
 * Decides what a run of release.yml does.
 * event: "schedule" or "workflow_dispatch". tags: [{ name, sha }].
 */
export function resolveRelease({ event, channel, inputVersion, pkgVersion, runNumber, startedAt, headSha, tags }) {
  const chosen = event === "schedule" ? "nightly" : channel || "nightly";
  if (chosen !== "nightly" && chosen !== "stable") throw new Error(`Unknown channel ${chosen}`);
  const lastNightly = latestNightly(tags);

  if (chosen === "nightly") {
    if (event === "schedule" && lastNightly?.sha === headSha) {
      return { skip: true, reason: `No commits since ${lastNightly.name}.` };
    }
    const names = nightlyNames({ pkgVersion, runNumber, startedAt });
    const shortSha = headSha.slice(0, 7);
    return {
      skip: false,
      channel: "nightly",
      ...names,
      sha: headSha,
      shortSha,
      title: `Algone Nightly ${names.version} (${shortSha})`,
      prerelease: true,
      previousTag: lastNightly?.name ?? "",
    };
  }

  if (!lastNightly) throw new Error("Stable promotes the latest nightly, and no nightly exists yet.");
  const version = stableVersion({ input: inputVersion, pkgVersion, tags });
  return {
    skip: false,
    channel: "stable",
    version,
    tag: `v${version}`,
    manifestVersion: version,
    sha: lastNightly.sha,
    shortSha: lastNightly.sha.slice(0, 7),
    title: `Algone ${version}`,
    prerelease: false,
    previousTag: latestStable(tags)?.name ?? "",
    promotedFrom: lastNightly.name,
  };
}

export const FIREFOX_REVIEW = [
  "Firefox source review needs:",
  "- algone-source.zip, the git archive of the released commit (uploaded with web-ext sign --upload-source-code).",
  "- Node 24 and npm. Full steps are in docs/firefox-review.md.",
  "- Commands: npm ci, then node apps/extension/scripts/build.mjs --target firefox --version <manifest version>.",
  "- Output: apps/extension/dist/firefox. Bundled with esbuild, not minified.",
  "- Rules are JSON data in packages/rules/sites. Nothing fetched is executed.",
  "- BUILD_REV is 0 when built outside a git checkout. That is the only expected difference in the bundles.",
].join("\n");

const APK_NOTE = {
  "release-signed": "`algone-browser-android.apk` is signed with the release key.",
  testing:
    "`algone-browser-android.apk` is a **testing build**, signed with a debug key. A later signed build will not install over it.",
  missing: "No Android APK in this release: the APK job did not finish. See the workflow run.",
};

export function renderNotes({ channel, version, manifestVersion, promotedFrom, apkState }) {
  return [
    channel === "stable"
      ? `Stable release ${version}, promoted from ${promotedFrom}.`
      : `Nightly build ${version}. Manifest version ${manifestVersion}.`,
    "",
    "- `algone-firefox.zip` is unsigned. Firefox needs a signed build, so install from addons.mozilla.org, or sign this one yourself.",
    `- ${APK_NOTE[apkState] ?? APK_NOTE.missing}`,
    "- `algone-safari-source.zip` is the built web extension. It needs packaging on a Mac or in App Store Connect.",
    "- Check downloads against `SHA256SUMS`.",
    "",
  ].join("\n");
}
