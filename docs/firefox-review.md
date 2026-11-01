# Firefox review: source and build

For Mozilla add-on reviewers. Algone's Firefox build is bundled by esbuild but not minified, so the files in the package are readable and match this source.

Source: <https://github.com/JoshWright22/Algone>, also uploaded with each version as `algone-source.zip`.

## Build environment

- Tested on Windows. The script has no Windows-only step, but other systems have not been tried
- Node 24 (tested on 24.20.0), with the npm that ships with it
- Git is optional (see below)

## Exact build steps

From the root of the source:

```sh
npm ci
node apps/extension/scripts/build.mjs --target firefox
```

Output: `apps/extension/dist/firefox/`. Its contents are what `algone-firefox.zip` holds, with `manifest.json` at the top level.

The script is `apps/extension/scripts/build.mjs`. It has no network step. It compiles `apps/extension/src` and the `packages/` workspaces with esbuild, generates one CSS file per site from `packages/rules/sites/*.json`, and copies `apps/extension/public`.

**Release versions.** Release builds pass the version, such as `--version 0.1.0`, which sets the manifest version only. It defaults to the root `package.json` version.

**One expected difference.** The build embeds the last commit's timestamp as `BUILD_REV`, read with `git log`. In a copy with no `.git` folder this is `0`, so that one number differs, `git` prints a harmless "not a git repository" line, and the settings page shows a wrong bundled-rules date.

These steps were run on 2026-10-31 from a clean `git archive` of the source in a new folder, on Windows with Node 24.20.0. `npm ci` and the build both succeeded.

## No minification

`build.mjs` sets `minify: false` and uses no obfuscation. Bundled output keeps names and layout.

## No remote code

- No `eval`, `new Function`, or HTML strings. `tests/static/compliance.test.ts` checks this on the source and the build.
- No script is loaded from outside the package. Inter is bundled.
- One file is downloaded: `https://joshwright22.github.io/Algone/rules/v1/rules.json`. The URL is a constant. The file is JSON selector data, checked by `validateOverlay` in `packages/core/src/rulesUpdate.ts`, and is only ever inserted as CSS through `scripting.insertCSS`. Users can turn this off in Settings, About.
- Other requests happen only on request: RSS feeds the user adds, and Wikipedia if the user opts in.

`data_collection_permissions` is `{ required: ["none"] }`.

## Third-party libraries

No third-party JavaScript library ships in the add-on. The packages under `packages/` are part of this repository.

| Name | Use | Ships in the add-on | License |
|---|---|---|---|
| Inter (`apps/extension/public/fonts/Inter.woff2`) | Font | Yes | SIL OFL 1.1 |
| esbuild 0.28.2 | Build tool | No | MIT |
| TypeScript | Type checks | No | Apache 2.0 |
| Playwright, Vitest, sharp, web-ext, Selenium, geckodriver | Tests and assets | No | Their own licenses |

Some selectors were read from LinkOff, Escape the Algorithm, and Control Panel for Twitter, all MIT. No code was copied. See `THIRD_PARTY_NOTICES.md`.

## Testing the add-on

See `store/firefox/reviewer-notes.md`. It covers how to pass the default 30 second pause. No account is needed.
