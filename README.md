<p align="center"><img src="assets/icon.svg" width="96" height="96" alt="Algone icon"></p>

# Algone

**Algone: Algorithm Control.** Replace algorithmic feeds with something you control.

Algone is a browser extension that hides the algorithmic parts of 12 popular websites and lets you decide what goes in their place. Search, subscriptions, direct links, and messages keep working. By default it shows a **healthy feed**: a short batch picked from what the site already loaded, without the outrage, clickbait and doom it can spot, that ends so you can go. There is no Algone account and no data collection. Settings can sync between your devices through your own GitHub account, if you turn that on.

Today Algone works in the browser. It does not change the YouTube, Instagram, or TikTok apps, so open those sites in your browser. Native-app support on Android is being built; see [the system-wide design](docs/designs/system-wide.md). Uninstalling always works.

## What it does

- **Hides feeds from install.** Everything algorithmic starts hidden. Things like comments start visible, and you can hide them too.
- **A switch for every element.** The popup shows the site you are on. Settings shows all sites.
- **Five modes per site.** Healthy (the default: a short daily batch from the site's own picks and the people you follow, ranked against outrage, clickbait, comparison and doom, then it ends), No feed (clean empty space), Random (quotes, facts, poems, art, and puzzles, offline), Tuned (the site's feed with your filters), and Custom (your own feed from RSS and chosen creators, stored locally).
- **Leaving is the goal.** When the batch is done, or your daily minutes are used, the panel says so and shows the things you said you'd rather do. Rate what you opened (Worth it, Not worth it, Made me feel worse) and the next batches follow.
- **Breaks, not uninstalls.** Take a break of up to 24 hours once a week, through your barrier. Shorts, Reels and autoplay stay off during it, and Algone comes back by itself.
- **One settings file, every device.** Export it, import it, or sync it through a secret Gist in your own GitHub account. You or an AI assistant can edit it with the `algone` command. Stricter settings apply at once everywhere; looser ones wait for the barrier on each device, so asking an assistant is never a way around it.
- **Barriers against autopilot.** Hiding more is instant. Showing more passes a barrier: a 30 second pause by default, or a typing challenge, daily limit, schedule, timed lock, or partner password. Each unlock is a timed snooze.
- **Help picking what to watch.** Search-first home, subscriptions first, a saved queue, and stop at the end.

Barriers interrupt habits. They are not a lock. Changing your clock or using another browser also gets around them.

Filters are limited. "Likely AI" and the healthy feed's outrage, clickbait, comparison and doom lists are text matches on titles, so they miss some and wrongly catch some. The healthy feed ranks only what the site already loaded; it cannot change the site's own ranking. Sites change their pages, so a rule can stop working until it is repaired.

## What works where

| Where | Route | State |
|---|---|---|
| Chrome, Edge (computer) | Extension | Built and tested in Chromium |
| Firefox (computer, Android) | Extension | Built; lint and a small smoke test on desktop. Android not tested |
| Safari (Mac, iPhone, iPad) | Extension in the Algone for Safari app | Built, not packaged or tested. Needs Apple tools |
| Android | Algone Browser, or Firefox for Android | App in progress. Android Chrome has no extensions |
| iPhone, iPad | Algone for Safari is the main route; Algone Browser is optional | App in progress |
| Android native apps | Algone app, built-in blocking | Being built. Will cover feeds and back out of Shorts and Reels; it cannot rerank inside apps |
| iPhone native apps | None yet | Planned: whole-app pause and limits only, which is all iOS allows |
| Desktop apps that show web pages | Optional Zen filter list from `algone export-zen` | Hide rules only; needs Zen |

Algone Browser may be refused by the App Store or Google Play. See `store/browser-ios/` and `store/play/`. Algone for Safari is a separate app, so that would not affect it.

## Status

Algone is `0.1.0`. It is not in any store yet.

| Item | Status |
|---|---|
| Tests | Passing in CI: unit, Chromium, Firefox smoke, mobile typecheck and bundle |
| Rules checked on the real site, logged out | YouTube (and its mobile home), Reddit, TikTok, Twitch, Bluesky, Pinterest, Threads, Instagram Explore only |
| Rules not checked on the real site | X, Facebook, LinkedIn, Substack, and Instagram's home feed |
| Logged-in check | Not run. Needs a maintainer's accounts |
| Website and privacy policy | Live at <https://joshwright22.github.io/Algone/> |
| Store listings | Drafted in `store/`, not submitted |
| GitHub Releases | Nightly prereleases. No stable release yet |
| Algone Browser | Builds in CI. Never run on a device |

## Install

Builds are at <https://github.com/JoshWright22/Algone/releases>. Open the newest nightly.

**Chrome or Edge.** Download `algone-chrome.zip` or `algone-edge.zip` and unzip it. Open `chrome://extensions` or `edge://extensions`, turn on Developer mode, press Load unpacked, and pick the folder.

**Firefox.** `algone-firefox.zip` on Releases is unsigned, so ordinary Firefox will not keep it. Load it for one session from `about:debugging`, or wait for a signed build.

**From source.** Follow the development commands below, then load `apps/extension/dist/chrome` as above.

**With automatic updates (Windows, Chrome and Edge).** Run `npm run build && npm run cli`, then `node packages/cli/dist/algone.mjs install --from apps/extension/dist`. It copies Algone to `%LOCALAPPDATA%\Algone\chrome` and `...\edge` and schedules an hourly update from the newest release. Load each folder once with Load unpacked; after that Algone updates and reloads by itself. `algone stop-updates` removes the schedule.

## Repo layout

```text
apps/extension/    The browser extension: background, content script, UI, build script
apps/website/      Static website and privacy policy
apps/mobile/       Algone Browser (Expo)
packages/rules/    Per-site rules as JSON, the compiler, and the validator
packages/core/     Settings, modes, barriers, queue, and copy
packages/engine/   Page engine used by the extension
packages/cli/      The algone command: check, edit and sync the settings file, build a Zen list
store/             Listings, checklists, reviewer notes, and images for each store
tests/             Static checks, Playwright tests, fixtures, and live checks
scripts/           Icon and store asset generators
ledger/            Public funding ledger data
docs/              Design spec, research, and reviews
```

## Development

Use Node 24.

```sh
npm ci
npm run build                 # all browsers, to apps/extension/dist/
npm run typecheck
npm test                      # unit and static tests
node apps/extension/scripts/build.mjs --target chrome --test --out-dir apps/extension/dist-test
npm run test:e2e              # Chromium tests, needs the test build
npm run test:firefox          # Firefox smoke test
npm run test:live             # real sites, logged out
npm run check:logged-in -- --profile <dir>   # your signed-in browser profile
npm run assets                # store icons, tiles, and screenshots
npm run cli                   # build the algone command, then: node packages/cli/dist/algone.mjs help
```

## Community

Algone is maintained by its community. Reports, rule repairs, and features are welcome, and maintainers review every change. Start with [CONTRIBUTING.md](CONTRIBUTING.md).

## Docs

- [Design spec](docs/designs/algone.md)
- [System-wide design](docs/designs/system-wide.md): settings file, sync, healthy feed, apps
- [Project brief](docs/designs/project_brief.md)
- [Firefox review notes](docs/firefox-review.md)
- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)
- [Third-party notices](THIRD_PARTY_NOTICES.md)

## License

[MIT](LICENSE). Inter is under the SIL Open Font License. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Algone has no link with the sites it works on. All names belong to their owners.
