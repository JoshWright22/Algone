# Releases

Nightly and stable releases both come from `.github/workflows/release.yml`. Stable only ever ships a commit that nightly users already ran.

## Version scheme

| | Tag | Title | Manifest version |
|---|---|---|---|
| Nightly | `v0.1.0-nightly.20261031.12` | `Algone Nightly 0.1.0-nightly.20261031.12 (abc1234)` | `0.1.0.12` |
| Stable | `v0.1.1` | `Algone 0.1.1` | `0.1.1` |

The nightly's base is the `version` in the root `package.json`. The last number is the workflow's run number. Browsers require numeric versions, which is why the manifest uses the run number.

A stable version defaults to the next patch after the latest stable tag. With no stable tag yet, it is the `package.json` version.

**After a stable release, raise `version` in `package.json` in a PR.** Nothing does this for you. Until you do, nightlies keep the old base. For example, after stable `0.1.1`, nightlies still say `0.1.0.N`, a lower version than stable. Stores never see nightlies, so this only matters to people installing nightlies by hand over a stable build.

## Nightly

1. Runs daily at 05:23 UTC. It can also be run by hand from the Actions tab.
2. A scheduled run stops if there are no commits since the last nightly tag. A manual run always goes ahead.
3. Builds every browser, runs unit tests, builds the website for `rules.json`, and zips the assets.
4. Builds the APK. If this fails, the release still ships without one, and the notes say so.
5. Creates the tag and a prerelease with `gh release create`.

Nightlies do not go to stores.

## Stable

1. Actions > Release > **Run workflow**. Set `channel` to `stable`. Leave `version` empty for the next patch, or enter `X.Y.Z`.
2. The run finds the latest nightly's commit and builds that, not the head of `main`. It stops if no nightly exists, or if the version is not above the latest stable.
3. The `sign-and-tag` job waits for your approval in the `release` environment. Then it signs the APK if a keystore is there, and creates the tag.
4. The publish job creates the release.
5. The `stores` job starts all five publish workflows with `gh workflow run`, because a tag made with `GITHUB_TOKEN` starts no workflows.
6. Approve each publish workflow. A store with no secrets exits with a notice.

First submissions to every store are by hand: see `store/<store>/checklist.md`. To run one store again: Actions > Publish ... > **Run workflow**, and enter the tag.

## Assets

| File | What it is |
|---|---|
| `algone-chrome.zip`, `algone-edge.zip` | Store-ready builds |
| `algone-firefox.zip` | Unsigned. Firefox needs a signed build, and the notes say so |
| `algone-safari-source.zip` | The built web extension, for packaging on a Mac or in App Store Connect |
| `algone-source.zip` | `git archive` of the released commit |
| `algone-browser-android.apk` | Algone Browser. Debug-signed and labeled a testing build unless a keystore was present |
| `rules.json` | The rules as built for this commit |
| `SHA256SUMS` | Checksums of everything above |

Note categories come from `.github/release.yml`, by label.

## Store releases after an overlay

A rules fix reaches users through `rules.json` within a day, as an overlay. While an overlay exists, each page load takes a slower path, so overlay selectors can flash until a release bundles them.

So ship a stable release at the next opportunity after any overlay is published:

- For a `site-change` fix on a Tier 1 site, aim for the same week. Store review adds days on top.
- Group several fixes if they land close together.
- Do not hold a repair back to wait for a release. The overlay is the fast path, and the release only removes the flash.

When a build's own `rev` catches up with the overlay's, the overlay is deleted and the fast path returns.

## Firefox source and build steps for reviewers

Mozilla asks for source when code is bundled. `publish-firefox.yml` uploads `algone-source.zip` with each version.

Reviewers need:

- `algone-source.zip`, plus Node 24 and npm.
- These steps, from the root of the source:

  ```sh
  npm ci
  node apps/extension/scripts/build.mjs --target firefox --version <manifest version>
  ```

- Output in `apps/extension/dist/firefox/`. It is bundled with esbuild and not minified.

`BUILD_REV` is `0` when built outside a git checkout, so that value differs from the release. The full reviewer document is `docs/firefox-review.md`. Each release run also prints this list in its summary.

## Recovery

**A bad rules file went out.** Revert the rules change in a PR and merge. `rev` is the commit time, so it rises even on a revert. `pages.yml` publishes after CI. Clients pick it up within about 24 hours. If `pages.yml` is stuck, run it by hand from the Actions tab. There is no staged rollout.

**A bad nightly.** Fix forward. The next nightly replaces it. To stop anyone promoting it, delete the prerelease and its tag:

```sh
gh release delete <tag> --cleanup-tag
```

Stable then promotes the nightly before it. Check what that is first.

**A release run failed before the release was created.** A nightly has no tag yet, so just run it again. A stable run can fail after creating its tag. Use **Re-run failed jobs** on that run, because a new run would stop on the existing version. If that is not possible, delete the tag and start again:

```sh
gh api -X DELETE repos/JoshWright22/Algone/git/refs/tags/<tag>
```

**A bad stable release.** Release assets do not reach users until a store accepts them. If a store has it in review, cancel the submission there. If it is live, promote a fix as a new patch: stores reject a version that is not higher. Chrome has a rollback option in the Developer Dashboard. Check each store's current options.

**A publish workflow failed.** Fix the cause and run that workflow again with the same tag. Chrome rejects an upload if the version is not higher, so a version that was already accepted needs no new upload.

**The APK is missing.** Read the `apk` job's log, then fix forward. The next nightly builds it again. Stable can be re-run from its failed jobs only if the release was not yet created. Otherwise attach a build by hand, and update `SHA256SUMS`:

```sh
gh release upload <tag> algone-browser-android.apk SHA256SUMS --clobber
```

**Keys leaked.** Remove the secret, and revoke it at its source. Run `claude setup-token` again for a new token, or delete the API key in the Console.
