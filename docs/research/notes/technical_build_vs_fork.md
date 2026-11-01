# Technical and platform considerations: build vs. fork vs. use a feed-blocking Chrome extension

Research date: 2026-10-31. GitHub stats, commit counts, and Chrome Web Store (CWS) listing data were pulled that day via the GitHub API, `git log`, and the CWS listing page. "Last updated" dates on Chrome docs are given because several policy pages are old; old does not mean superseded, but it does mean they do not independently confirm 2026 practice.

## How current feed blockers hide content, and how they avoid a flash of feed content

### Takeaway
Every project inspected uses site-specific CSS selectors run from `document_start`, plus a polling or observer loop for SPA navigation and for things CSS alone cannot express. None of the feed blockers inspected uses declarativeNetRequest (DNR) redirects. Flash avoidance depends on whether the hiding CSS is present before first paint: manifest-declared CSS is the only documented route to that, and asynchronous JS-then-style injection has a live flash bug report in the most popular open-source project.

### Cited Findings
**Platform primitives**
- CSS files in the manifest's `css` key are injected "before any DOM is constructed or displayed for the page"; `document_start` scripts run "after any files from `css`, but before any other DOM is constructed or any other script is run" — [Chrome content scripts docs](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)
- Default `run_at` is `document_idle`, which runs between `document_end` and just after `window.onload`, so a script left on the default is too late to prevent a flash by design — [Chrome content scripts docs](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)
- DNR rules act on requests reaching the network stack; the docs do not address client-side routing — [DNR API reference](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest)

**News Feed Eradicator (NFE) v3, selector data plus injected style**
- Selectors live as per-site typed data, one TS file per site, 12 sites wired in (e.g., YouTube's main feed region is `ytd-browse`, type `hide`, with an `overlay-fixed` injected quote widget). `remove` regions use `:has()` selectors such as `ytd-guide-entry-renderer:has(a[title="Shorts"])` — [src/sitelist/youtube.ts](https://github.com/jordwest/news-feed-eradicator/blob/main/src/sitelist/youtube.ts), [src/sitelist/_index.ts](https://github.com/jordwest/news-feed-eradicator/blob/main/src/sitelist/_index.ts)
- When a user enables a site, the service worker calls `scripting.registerContentScripts` with a JS-only script at `document_start` and no `css` entry. The script then polls for `document.head` every 1 ms (a code comment says "DOMContentLoaded is too slow"), pings the service worker every 10 ms until it gets site details, and writes a `<style>` element into `<head>` — [service-worker.ts](https://github.com/jordwest/news-feed-eradicator/blob/main/src/entrypoints/service-worker/service-worker.ts), [intercept.tsx](https://github.com/jordwest/news-feed-eradicator/blob/main/src/entrypoints/intercept/intercept.tsx)
- A 15 ms interval re-sends the current `window.location.pathname` to the service worker, and a 1 s retry loop re-attempts widget injection. There is no `MutationObserver` in that file — [intercept.tsx](https://github.com/jordwest/news-feed-eradicator/blob/main/src/entrypoints/intercept/intercept.tsx)
- Open bug, 2026-08-18, v3.0.5: "YouTube Feed appears for a moment when user navigates to" subscriptions, channels, and You pages — [NFE issue #588](https://github.com/jordwest/news-feed-eradicator/issues/588)

**Remove YouTube Suggestions (RYS), static CSS gated by attributes**
- The manifest declares `content-script/main.css` and JS at `document_start` on `www.` and `m.youtube.com`; `all_frames` is true — [src/chrome_manifest.json](https://github.com/lawrencehook/remove-youtube-suggestions/blob/main/src/chrome_manifest.json)
- `main.css` (570 lines) gates every rule on attributes of `<html>`, e.g. `html[global_enable="true"][remove_all_shorts="true"] ytd-reel-shelf-renderer`; JS sets those attributes on `document.documentElement` — [main.css](https://github.com/lawrencehook/remove-youtube-suggestions/blob/main/src/content-script/main.css), [main.js](https://github.com/lawrencehook/remove-youtube-suggestions/blob/main/src/content-script/main.js)
- For what CSS cannot do, JS tags elements (e.g., `is_short`) so the CSS can match them. That loop uses `setTimeout` polling, starting at 100 ms and backing off to a cap of 250 to 500 ms, paused when the tab is hidden, not `MutationObserver` — [main.js](https://github.com/lawrencehook/remove-youtube-suggestions/blob/main/src/content-script/main.js)

**Control Panel for Twitter / for YouTube (insin), MAIN-world and observers**
- Control Panel for YouTube's MV3 manifest runs `content.js` in the isolated world plus `page.js` with `"world": "MAIN"`, both at `document_start`, with only the `storage` permission. `page.js` is 7,242 lines and uses `MutationObserver` — [manifest.mv3.json](https://github.com/insin/control-panel-for-youtube/blob/main/manifest.mv3.json), [page.js](https://github.com/insin/control-panel-for-youtube/blob/main/page.js)
- Control Panel for Twitter's `script.js` is 8,284 lines, with 175 lines referencing `data-testid` and 10 referencing `MutationObserver` — [script.js](https://github.com/insin/control-panel-for-twitter/blob/master/script.js)
- When a content script is in the MAIN world, the page's CSP applies to it — [Chrome content scripts docs](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)

**uBlock Origin Lite (uBOL), declarative**
- uBOL's design goal is that the service worker is "not required to initiate network-, cosmetic-, or scriptlet-based filtering in a timely manner" — [uBOL FAQ](https://github.com/uBlockOrigin/uBOL-home/wiki/Frequently-asked-questions-(FAQ))

### Inferences
- The most flash-resistant design for default-on hiding: put unconditional rules in the manifest `css` file (or a registered content script with a `css` entry) and let a JS-set attribute turn hiding *off* for disabled settings, so hiding is the state before JS has run. RYS's attribute gating is structurally closer to this than NFE, but its rules need `global_enable="true"` to be set first. It is a race on a storage read, so it may still flash; I did not measure either.
- NFE's lag is mostly its asynchronous service-worker round trip. A code comment in NFE confirms that the round trip can be delayed, and an MV3 service worker may also need to wake up. This is the main architectural thing a fork would change.
- DNR redirects are a poor primary mechanism for feed hiding: they can catch a hard load of `youtube.com/` but, by the network-stack logic above, not an in-app `pushState` transition to home. They also require host permission, count as "unsafe" rules, and replace the feed page rather than hiding part of it. Reasonable only as a hard-load supplement, or to redirect a whole URL such as `/shorts/*`.
- Polling at 100+ ms (RYS) leaves a visible window for JS-tagged items; CSS-only rules are immune. Prefer pure CSS (`:has()` works in Chrome) wherever possible; use JS only where selectors cannot express the rule.

### Gaps
- No published flash measurements for any extension; the comparison above is from code reading and one bug report.
- Closed-source products such as Unhook and DF Tube could not be inspected.
- I did not read all of RYS's `main.js`, so the attribute default order at first paint is unverified.

## Manifest V3 constraints, and the Manifest V2 phase-out in Chrome as of 2026

### Takeaway
MV2 is finished in Chrome stable: unusable from Chrome 139 and scheduled for full store removal on Aug 31, 2026. Any fork must be MV3. MV3's constraints mostly do not hurt cosmetic feed blocking, which needs CSS and content scripts rather than the blocking webRequest API; the constraint that matters is the remote-code ban, which limits how fast selector fixes can ship.

### Cited Findings
**MV2 timeline** — all from [Chrome MV2 support timeline](https://developer.chrome.com/docs/extensions/develop/migrate/mv2-deprecation-timeline), page last updated 2026-09-09:
- Jan 2022: CWS stopped accepting new public or unlisted MV2 extensions; Jun 2022: private ones.
- Jun 3, 2024: phase-out began on Beta/Dev/Canary. Oct 9, 2024: disabling began on stable.
- Mar 31, 2025: disabled by default, users could re-enable.
- Jul 24, 2025: with Chrome 138, MV2 disabled on all channels with no user re-enable. "Manifest V2 extensions will cease to function for any user upgrading to Chrome 139 and subsequent versions."
- Chrome 138 is the last version supporting MV2, and then only with the `ExtensionManifestV2Availability` policy; that policy was slated for removal in Chrome 139.
- Aug 31, 2026: all remaining MV2 extensions removed from CWS. Installs on Chrome 138 or earlier keep running but get no updates and cannot be reinstalled.

**MV3 constraints relevant here**
- Full functionality must be discernible from submitted code; external resources "must not contain any logic" — [MV3 requirements policy](https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements), updated 2024-04-03
- Extensions "need to bundle _all_ code they are using inside the extension itself" — [Chrome remote hosted code guide](https://developer.chrome.com/docs/extensions/develop/migrate/remote-hosted-code), updated 2023-12-13
- DNR limits: 30,000 guaranteed static rules; 30,000 dynamic since Chrome 121, of which at most 5,000 "unsafe" (anything other than block, allow, allowAllRequests, or upgradeScheme, so redirects are unsafe); 5,000 session rules; 1,000 regex rules per type; 50 enabled static rulesets, 100 declared — [DNR API reference](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest)
- Host permissions are needed for programmatic content script injection and DNR, but not for manifest-declared content scripts (whose `matches` can still trigger a warning). `optional_host_permissions` are granted at runtime — [Declare permissions](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions), updated 2024-02-05
- `chrome.userScripts` needs the per-extension "Allow User Scripts" toggle on Chrome 138+ (Developer mode before that) — [userScripts API reference](https://developer.chrome.com/docs/extensions/reference/api/userScripts)
- 2026 Chrome platform changes relevant here are small: synchronous `userScripts.execute()` validation in Chrome 149 (May 20, 2026), and no 2026 entries on MV3, content scripts, or DNR — [What's new in Chrome extensions](https://developer.chrome.com/docs/extensions/whats-new)

### Inferences
- Do not fork anything still MV2. NFE's last MIT tag (v2.3.3) is `manifest_version: 2`, so reusing the MIT code means porting it; see the fork section.
- A narrow CSS blocker uses well under any DNR limit, likely zero rules.

### Gaps
- The only source for the Aug 31, 2026 removal is Chrome's own timeline; I found no independent confirmation that it ran on schedule. The page was updated after that date. A searchable check of removed listings was not done.
- I did not verify whether Chrome 139 and later actually removed the policy for every enterprise configuration, only that Google's page says so.

## Selector breakage, how projects maintain selectors, and what remote selector lists are allowed

### Takeaway
Expect monthly-scale repair work across a multi-site blocker, with bursts during redesigns and failures that stay silent until a user reports them or a logged-in test catches them. Remote JSON or CSS selector lists are defensible under the wording of CWS policy (data, not code), with no primary doc naming selectors specifically. The risk rises as the "config" starts to look like logic or an interpreter. Comparable projects mostly avoid the question by shipping selectors inside the package.

### Cited Findings
**Measured churn, 2025-10-31 to 2026-10-31** (`git log`; commits include features and additions, so these are upper bounds on breakage, not break rates)
- NFE: 28 commits to `src/sitelist`, heavily concentrated in the Dec 2025 to Feb 2026 v3 rewrite (21 of 28). By file: reddit 9, facebook 6, twitter 5, instagram 5, linkedin 4, youtube 3. By my reading of commit titles, about 7 are actual repairs, e.g. "fix sidebar selector in new linkedin" (2026-01-21), "another LinkedIn news sidebar selector" (2026-04-10), and "Fix LinkedIn feed blocking for the new feed tabs" (2026-10-28) — [NFE commits](https://github.com/jordwest/news-feed-eradicator/commits/main/src/sitelist)
- RYS (YouTube only): 37 commits to `src/content-script`, peaking at 15 in Feb 2026 and 9 in Oct 2026. Feb 2026 includes "update extra rows selector for new YouTube homepage structure" — [RYS commits](https://github.com/lawrencehook/remove-youtube-suggestions/commits/main/src/content-script)
- Control Panel for Twitter: 104 commits to `script.js` in 12 months, a much larger feature surface — [commits](https://github.com/insin/control-panel-for-twitter/commits/master/script.js)
- Community filter list for Shorts: 10 commits to `list.txt` in 12 months; latest list version 2026.4.29 — [gijsdev/ublock-hide-yt-shorts](https://github.com/gijsdev/ublock-hide-yt-shorts)

**Failure pattern evidence**
- One RYS PR (2026-10-09) fixed six settings at once: a renamed class, a moved vote count, a nav link moved from `/feed/library` to `/feed/you`, a search box moved to `textarea` in `yt-searchbox`, position-based hiding that YouTube's reordering turned into hiding History and Playlists, and all six subscription filters, which "did nothing" after a move to `yt-lockup-view-model`. Failures were found by a signed-in Playwright suite: 71 passed, 5 skipped. Old selectors are kept alongside new ones — [RYS PR #242](https://github.com/lawrencehook/remove-youtube-suggestions/pull/242)
- NFE's open issues in Oct 2026 include "Facebook feed not blocked" (#606), "YouTube feed not blocked on mobile site" (#607), and "Reddit no longer blocked" (#609); "Extension stopped working" (#598) dates to Sep 14 — [NFE issues](https://github.com/jordwest/news-feed-eradicator/issues)
- Localized text selectors are a known fragility: RYS's TODO lists hardcoded English strings that break on non-English YouTube, and its "For You" setting is marked English-only — [RYS TODO.md](https://github.com/lawrencehook/remove-youtube-suggestions/blob/main/TODO.md). NFE has had to "fix Twitter/X for non-English speaking users" — [NFE commits](https://github.com/jordwest/news-feed-eradicator/commits/main/src/sitelist)

**Fix-to-user latency**
- NFE's CWS listing shows v3.0.5, updated July 16, 2026, about 200,000 users (fetched 2026-10-31); `package.json` is also still 3.0.5 while Facebook (Aug 20, 22) and LinkedIn (Oct 28) fixes have landed in the repo — [CWS listing](https://chromewebstore.google.com/detail/fjcldmjmjhkklehbacihaiopjklihlgg), [package.json](https://github.com/jordwest/news-feed-eradicator/blob/main/package.json)
- uBOL releases about every 5 days (8 releases from 2026-09-20 to 2026-10-26) — [uBOL releases](https://github.com/uBlockOrigin/uBOL-home/releases). Built-in rulesets update only when the extension updates, and uBOL makes no remote requests for them — [uBOL FAQ](https://github.com/uBlockOrigin/uBOL-home/wiki/Frequently-asked-questions-(FAQ))
- Reviews usually finish in a few days but can take up to a few weeks, and longer for broad host permissions — [CWS review process](https://developer.chrome.com/docs/webstore/review-process), updated 2021-12-10
- CWS offers expedited skip-review only when the changed files are those under `rule_resources`, all rule changes are "safe", and nothing else changed — [Skip review](https://developer.chrome.com/docs/webstore/skip-review), updated 2024-05-17

**How projects maintain selectors**
- Bundled data files updated through releases: NFE and RYS (no selector fetch appears in either project's code as read). NFE's `sitelist.json` is packaged as a web-accessible resource — [manifest.ts](https://github.com/jordwest/news-feed-eradicator/blob/main/src/manifest.ts)
- Community filter lists with subscribers: e.g. the Shorts list with a 2-week `Expires` header — [list.txt](https://github.com/gijsdev/ublock-hide-yt-shorts/blob/master/list.txt)
- uBOL explicit user subscription: since a June 2026 edit, "Custom filters and ability to subscribe to external filter lists is now available" — [uBOL FAQ](https://github.com/uBlockOrigin/uBOL-home/wiki/Frequently-asked-questions-(FAQ)). Lists are fetched only when the user subscribes and compile to dynamic DNR rules plus declaratively injected user scripts; scriptlet filters are limited to the packaged code library — [uBOL permissions justification](https://github.com/uBlockOrigin/uBOL-home/wiki/Justification-for-the-declared-permissions)

**What CWS policy says about remote selector lists**
- Remotely hosted code is "anything that is executed by the browser that is loaded from someplace other than the extension's own files"; "It does not include data or things like JSON or CSS." — [Chrome remote hosted code guide](https://developer.chrome.com/docs/extensions/develop/migrate/remote-hosted-code)
- Allowed: "The extension may reference and load data and other information sources that are external to the extension", and "Fetching a remote configuration file for A/B testing or determining enabled features", where "all logic for the functionality is contained within the extension package" — [MV3 requirements policy](https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements)
- Not allowed: remote `<script>` tags; `eval()` or similar on a fetched string; "Building an interpreter to run complex commands fetched from a remote source, even if those commands are fetched as data" — [MV3 requirements policy](https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements)
- Remote logic is allowed only through a documented API; the policy names the Debugger and User Scripts APIs — [MV3 requirements policy](https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements)
- Blue Argon is the violation code for remote code; Red Titanium for obfuscation, which covers external resources the extension fetches too — [CWS troubleshooting](https://developer.chrome.com/docs/webstore/troubleshooting), updated 2026-07-20
- Remote config has been used for malicious purposes: researcher Wladimir Palant documents extensions using JSON config for HTML injection and for DNR rules that strip security headers. He notes that "As these rules aren't code, the usual restrictions against remote code don't apply here" and hopes Google will prohibit it by policy — [Palant, Jan 20, 2025](https://palant.info/2025/01/20/malicious-extensions-circumvent-googles-remote-code-ban/)
- uBOL itself has tightened here: "[mv3] Move managed custom scriptlet filters to sandbox" (2026-09-17) and "[mv3] Scriptlet filters are no longer supported in managed custom filters" (2026-10-15) — [commit cd8b675](https://github.com/gorhill/uBlock/commit/cd8b6756345b45a181d03d2b363f9c371e100709), [commit 02322f9](https://github.com/gorhill/uBlock/commit/02322f9acf74658203252cb34f2bca1a30d20f6e)

### Inferences
Practical reading of policy for a selector list (my interpretation, not Google's wording):

| Design | Assessment |
|---|---|
| Flat JSON `{site: [CSS selectors]}` fetched and applied as a stylesheet, with all logic in package | Low risk. Data or CSS by the guide's definition |
| Remote CSS text injected via `insertCSS` | Low to moderate; literally "CSS", but can restyle any covered page, so scope to declared hosts and sanitize |
| Per-site booleans and feature flags | Low; explicit policy example |
| Remote regexes or path rules for packaged behaviors | Moderate; still data, but closer to behavior |
| JSON DSL of steps ("find X, climb to parent, click Y") | High; resembles the "interpreter" prohibition |
| Remote strings used as JS or `eval`, or remote script tags | Prohibited |
| User-supplied list via `userScripts` | Documented path, but a toggle step for users |

- Disclose the update mechanism in the listing and privacy text. Fetching a static file from a CDN from the service worker, with no user identifiers, keeps Limited Use exposure small. A signature or pinned host reduces the supply-chain risk.
- Remote selector updates are the largest leverage point for a builder: they cut the fix path from days of review to minutes. Skip-review does not help, since it covers only DNR `rule_resources`, and CSS or content-script changes are outside it. Redirects are not "safe", so they do not qualify either.
- Maintenance cost estimate (mine, not sourced): a single site, a few hours per month on average with spikes during redesigns; 5 to 6 sites, plan on a recurring weekly check. Mobile web, localization, A/B-bucketed layouts, and logged-in-only surfaces make it more expensive. A signed-in nightly Playwright smoke test is the proven way to catch silent failures, as RYS's PR shows.
- A resilient selector strategy: prefer structural tags, `href` and `aria` attributes, and `:has()` over hashed class names and position (`nth-child`); keep old selectors alongside new. NFE's own `ytd-guide-section-renderer:nth-child(4)` is the same position-based pattern that broke RYS.

### Gaps
- I found no primary statement from Google on CSS selector lists specifically, and no documented rejection or approval case either way. Enforcement practice is unobservable.
- No cross-project dataset of break frequency exists. The counts here are from four repos and overstate breaks, and YouTube-specific counts in NFE are low because its feed selector is the broad `ytd-browse`.
- I found no open-source feed blocker that fetches remote selector lists, so no precedent for that design was inspected.

## Achieving the same result without a new extension

### Takeaway
For one technical person, yes: uBOL custom filters now cover static hiding (as of mid-2026), and a userscript manager covers anything else. The limits are product features rather than hiding ability: no snooze, schedule, friction, or replacement content in filters; the "Allow User Scripts" toggle in setup; and manual repair when selectors break.

### Cited Findings
- uBOL's popup has a "Create a custom filter" picker tool that lets users click an element and fine-tune or hand-write cosmetic filters; filters are editable in the dashboard's Custom filters pane — [uBOL Quick guide](https://github.com/uBlockOrigin/uBOL-home/wiki/Quick-guide)
- Custom filters and external list subscriptions arrived per a June 2026 edit — [uBOL FAQ](https://github.com/uBlockOrigin/uBOL-home/wiki/Frequently-asked-questions-(FAQ)). This reverses uBOL's older stance, so older articles are out of date.
- uBOL's declared permissions include `userScripts`, used "To allow user to create their own user custom filters, or to explicitly subscribe to filter lists" — [permissions justification](https://github.com/uBlockOrigin/uBOL-home/wiki/Justification-for-the-declared-permissions). If a user imports a list before enabling "Allow User Scripts", it does not work — [uBOL issue #751](https://github.com/uBlockOrigin/uBOL-home/issues/751), Aug 2026.
- Reported custom-filter bugs in 2026: "Legacy `0`-prefixed selectors… nullifying all custom cosmetic filters on affected hostnames" — [#670](https://github.com/uBlockOrigin/uBOL-home/issues/670); "Custom Filters Stop Working When Switching to No Filtering" — [#784](https://github.com/uBlockOrigin/uBOL-home/issues/784); a request for generic cosmetic filters from imported lists — [#786](https://github.com/uBlockOrigin/uBOL-home/issues/786). I saw the titles and part of #786's body, not their resolution status.
- Generic cosmetic filtering in uBOL needs *Complete* mode. uBOL advises against running other content blockers alongside it — [uBOL FAQ](https://github.com/uBlockOrigin/uBOL-home/wiki/Frequently-asked-questions-(FAQ))
- uBlock filter syntax used by community lists includes procedural operators: `:upward()`, `:matches-path()`, `:has()` — [list.txt](https://github.com/gijsdev/ublock-hide-yt-shorts/blob/master/list.txt). A 2025 forum thread reports uBOL added custom procedural cosmetic filters in version 2025.804.1547 — [Wilders Security](https://www.wilderssecurity.com/goto/post?id=3246248) (forum, low confidence).
- Tampermonkey 5.3+ on Chrome requires the "Allow User Scripts" toggle (Chrome 138+) or Developer Mode — [Tampermonkey FAQ Q209](https://www.tampermonkey.net/faq.php?q=Q209)
- Violentmonkey is MIT, 9,104 stars, pushed 2026-10-26 — [repo](https://github.com/violentmonkey/violentmonkey)
- If "Allow User Scripts" is off, `chrome.userScripts` is undefined, and availability needs a try/catch check — [userScripts API reference](https://developer.chrome.com/docs/extensions/reference/api/userScripts)

### Inferences
- uBOL is the cheapest good solution if the requirement is "the feed never appears", plus community lists doing the upkeep. A rule like `www.youtube.com##ytd-browse[page-subtype="home"]` is the likely shape (illustrative, not tested).
- Userscripts add logic (schedules, redirects, snooze) but lose a store-reviewed install path and add the same toggle friction as any userscript-based extension.
- Neither is a product for non-technical users. The justifications for a new or forked extension are: curated defaults, one-click setup, friction features (lock, snooze, quotes), or multi-site curation.
- Timing: declarative registration suggests that uBOL custom filters are fast, but this is unmeasured.

### Gaps
- I did not test filters against live sites, and I did not find official documentation of uBOL's custom filter syntax subset.
- `document-start` timing for userscripts under MV3's dynamic userScripts mode: no source found.
- Stylus and similar user-CSS managers were not researched. They are an obvious third no-build option.
- Violentmonkey's Chrome MV3 status on CWS was not verified.

## Best open-source fork candidates

### Takeaway
NFE v3 is the best multi-site architecture, but AGPL-3.0 and its flash path are the costs. RYS is the best YouTube-only base, MPL-2.0 and simple, but it has paid-tier code to strip. Control Panel for Twitter is the permissive option for X only. Control Panel for YouTube has no license and cannot be forked by default. uBOL is better treated as a tool to use than a base to fork.

### Cited Findings
Stats fetched 2026-10-31 via GitHub API.

| Project | License | Stars / open issues | Last push | MV3 | Scope and architecture |
|---|---|---|---|---|---|
| [jordwest/news-feed-eradicator](https://github.com/jordwest/news-feed-eradicator) | AGPL-3.0 | 1,512 / 107 | 2026-10-28 | Yes | 12 sites; TS, SolidJS, bun; declarative per-site selector data; `storage`, `scripting`; `optional_host_permissions: *://*/*` |
| [lawrencehook/remove-youtube-suggestions](https://github.com/lawrencehook/remove-youtube-suggestions) | MPL-2.0 | 586 / 35 | 2026-10-11 | Yes | YouTube only; plain JS with no bundler; 787-line `main.js` plus 570-line CSS; `storage` and YouTube-only hosts |
| [code-charity/youtube](https://github.com/code-charity/youtube) (Improve YouTube) | Custom ("Other") | 4,660 / 1,462 | 2026-10-26 | Yes | Very broad YouTube feature set |
| [insin/control-panel-for-twitter](https://github.com/insin/control-panel-for-twitter) | MIT | 2,652 / not fetched | 2026-10-31 | `manifest.mv3.json` present | X only; 8,284-line `script.js`; MV2 and MV3 manifests, Safari |
| [insin/control-panel-for-youtube](https://github.com/insin/control-panel-for-youtube) | None detected | 425 / not fetched | 2026-10-18 | Yes | YouTube; `page.js` in MAIN world; README calls the repo the "support repository" |
| [amitbl/blocktube](https://github.com/amitbl/blocktube) | GPL-3.0 | 1,413 / not fetched | 2026-02-07 | Not verified | YouTube content filter; not inspected |
| [uBlockOrigin/uBOL-home](https://github.com/uBlockOrigin/uBOL-home) | GPL-3.0 | 3,961 / 11 | 2026-10-26 | Yes | General content blocker; source work appears as `[mv3]` commits in [gorhill/uBlock](https://github.com/gorhill/uBlock) |
| [proginosko/LeechBlockNG](https://github.com/proginosko/LeechBlockNG) | MPL-2.0 | 1,090 / not fetched | 2026-09-27 | Not verified | Site blocker, not feed hiding; relevant for schedule logic |

**Details that affect a fork decision**
- NFE v3.0.0 (Jan 2026 release) was a "Complete rewrite of the codebase" with "License change to AGPL v3 from MIT" — [CHANGELOG](https://github.com/jordwest/news-feed-eradicator/blob/main/CHANGELOG.md). The last MIT-licensed tag, v2.3.3, is `manifest_version: 2` — [v2.3.3 manifest](https://github.com/jordwest/news-feed-eradicator/blob/v2.3.3/src/manifest.json), [v2.3.3 LICENSE](https://github.com/jordwest/news-feed-eradicator/blob/v2.3.3/LICENSE).
- The NFE maintainer says of the project: "I mostly consider the project 'done'"; pull requests are mainly accepted for bug fixes, and "You are of course welcome to fork the project if you'd like to make a more complex version" — [NFE README](https://github.com/jordwest/news-feed-eradicator). Latest GitHub tag is v3.0.4 (Feb 2026) although 3.0.5 is on CWS — [NFE releases](https://github.com/jordwest/news-feed-eradicator/releases).
- RYS includes a premium server (Stripe billing, magic-link auth, license routes), a client premium config pointing to `server.lawrencehook.com`, and a bundled Mixpanel path gated on `log_enabled` — [server/README.md](https://github.com/lawrencehook/remove-youtube-suggestions/blob/main/server/README.md), [src/shared/config.js](https://github.com/lawrencehook/remove-youtube-suggestions/blob/main/src/shared/config.js), [src/shared/analytics.js](https://github.com/lawrencehook/remove-youtube-suggestions/blob/main/src/shared/analytics.js). It has CI workflows and unit tests (183 cited in [PR #242](https://github.com/lawrencehook/remove-youtube-suggestions/pull/242)); the Playwright suite is described as being in `rys-test`, which I did not find in the repo tree.
- Improve YouTube's license is a custom text: PRs "are assumed to come under a viral copyleft license, GNU AGPL-3.0" with an added "FRIENDLY-/CHARITY-License" — [LICENSE](https://github.com/code-charity/youtube/blob/master/LICENSE)
- Control Panel for YouTube has no root LICENSE file; `NOTICE` covers only an included `dedent()` function — [repo](https://github.com/insin/control-panel-for-youtube), [NOTICE](https://github.com/insin/control-panel-for-youtube/blob/main/NOTICE)

### Inferences
- Fork NFE if the product is multi-site and you can accept publishing your source under AGPL-3.0. Its `sitelist` schema is the cleanest thing here to reuse, and it also fits remote-list design. You would inherit 107 open issues. Plan to replace the service-worker hide path with early CSS. A closed-source paid product cannot be based on it. Legal review is advised; this is not legal advice.
- Fork RYS if the product is YouTube-only. MPL's file-level copyleft is easier for mixing proprietary code in new files, and there is no build step. First strip or replace the premium, analytics, and donor code.
- For a permissively licensed multi-site product, write it fresh: the core is small. A clean selector schema plus CSS injection is on the order of a few hundred lines (my estimate); NFE's value lies mostly in its accumulated site data and UI. Selector *strings* are facts-like, but copying large sets from an AGPL project is a legal question to check, not assume.
- Forks do not inherit the store listing, reviews, or user base, and they inherit the selector treadmill. A fork saves initial build effort, not maintenance. Upstreaming fixes keeps you close to the original, and a heavily modified fork loses that benefit.
- Name and branding: don't reuse the source project's name or icons in a listing.

### Gaps
- Unhook, the likely consumer benchmark, did not turn up as an open-source repo; a search found only third-party copies, unverified and not recommended as bases.
- Test coverage, dependency health, and CI status beyond what is listed were not audited. BlockTube and LeechBlock were not inspected.
- Some open-issue counts were not fetched. NoSuggest (40 stars, "Other" license, pushed 2026-10-30) was not examined.

## Chrome Web Store publishing requirements and how loading unpacked differs

### Takeaway
Publishing costs a one-time $5, a listing, a privacy disclosure, and review; scoped hosts and a narrow purpose keep it simple. For personal use, loading unpacked needs no fee or review but needs Developer mode and manual updates. On Windows, the Web Store is the only way to give normal users an extension, and the unlisted option goes through the same review.

### Cited Findings
**Fee and account**
- "One-time registration fee"; the docs page does not give the amount — [Register](https://developer.chrome.com/docs/webstore/register), updated 2024-02-13. The amount is confirmed indirectly by Chrome's Apr 30, 2026 note that invited team members work "without paying the $5 registration fee" — [What's new](https://developer.chrome.com/docs/extensions/whats-new). The agreement sets the amount at Google's discretion — [Developer Agreement](https://developer.chrome.com/docs/webstore/terms/), per a search excerpt.
- The developer email cannot be changed after account creation; registration is limited to supported countries and regions — [Register](https://developer.chrome.com/docs/webstore/register)

**Review and permissions**
- "Reviews may take longer for extensions that request broad host permissions or sensitive execution permissions." Most complete within a few days, some take a few weeks; contact support after three weeks — [Review process](https://developer.chrome.com/docs/webstore/review-process), updated 2021-12-10. New developers and new extensions also take longer.
- "Request access to the narrowest permissions necessary" — [Permissions policy](https://developer.chrome.com/docs/webstore/program-policies/permissions). Purple Potassium is the excessive-permissions code — [Troubleshooting](https://developer.chrome.com/docs/webstore/troubleshooting)
- Warnings can be expected from `host_permissions` and `content_scripts.matches`. Runtime-granted optional hosts are the documented way to reduce them — [Declare permissions](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions)
- Real examples: RYS uses `storage` plus YouTube hosts only ([manifest](https://github.com/lawrencehook/remove-youtube-suggestions/blob/main/src/chrome_manifest.json)); NFE uses `optional_host_permissions: *://*/*` and asks per site ([manifest.ts](https://github.com/jordwest/news-feed-eradicator/blob/main/src/manifest.ts)); Control Panel for YouTube declares `storage` only, with content script matches ([manifest](https://github.com/insin/control-panel-for-youtube/blob/main/manifest.mv3.json)).

**Single purpose**
- "An extension must have a single purpose that is narrow and easy to understand." — [Program Policies](https://developer.chrome.com/docs/webstore/program-policies/policies), updated 2025-05-22
- Can be a narrow "focus area or subject matter" or a narrow "browser function"; a new tab page that alters web search breaks it, and permissions must relate to the purpose — [Quality guidelines FAQ](https://developer.chrome.com/docs/webstore/program-policies/quality-guidelines-faq), updated 2024-07-10
- Red Magnesium: "The extension provides two or more purposes in the same extension" — [Troubleshooting](https://developer.chrome.com/docs/webstore/troubleshooting)

**Privacy and metadata**
- "If your Product handles any user data, then you must post an accurate and up to date privacy policy" (Purple Lithium). Limited Use restricts collection to what is needed for the single purpose — [Program Policies](https://developer.chrome.com/docs/webstore/program-policies/policies)
- Missing icon, title, screenshot, or description is Yellow Zinc — [Troubleshooting](https://developer.chrome.com/docs/webstore/troubleshooting)

**Enforcement**
- Rejections leave the listing unchanged; warnings usually give 7 to 30 days; takedowns are usually reversible once a compliant version passes; malware cases mean permanent disablement and possible account suspension — [Review process](https://developer.chrome.com/docs/webstore/review-process)
- Appeals from the Developer Dashboard, announced Apr 8, 2026 — [What's new](https://developer.chrome.com/docs/extensions/whats-new)

**Distribution**
- Public, Unlisted (URL only), and Private (trusted testers, Google Groups, or Workspace domain); "All visibility settings follow the same policy requirements and review process" — [Distribution](https://developer.chrome.com/docs/webstore/cws-dashboard-distribution), updated 2020-12-07
- "Windows and macOS users can only install self-hosted extensions through enterprise policies" — [Distribute your extension](https://developer.chrome.com/docs/extensions/how-to/distribute), updated 2023-12-12

**Loading unpacked**
- Go to `chrome://extensions`, enable Developer mode, click Load unpacked, and select the folder. Changes to manifest, service worker, or content scripts need a reload — [Chrome hello-world tutorial](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world)
- A March 2025 post reports that since Chrome 134, unpacked extensions cannot be used while Developer mode is off — [Michael Tsai blog](https://mjtsai.com/blog/2025/03/06/chrome-warning-about-manifest-v2-extensions) (secondary)
- A vendor post from June 2026 claims that Chrome can disable unpacked extensions on update or profile reload — [SuperchargeBrowser](https://www.superchargebrowser.com/library/chrome-extension-disabled-after-update.md) (vendor source, low confidence, unconfirmed)

### Inferences
| Factor | Load unpacked | CWS unlisted / public |
|---|---|---|
| Cost | Free | $5 once |
| Review | None | Same review for both visibilities |
| Updates | Manual `git pull` and reload | Automatic |
| Remote-code policy | Not reviewed, so CWS rules are not applied | Applies |
| Friction | Developer mode must stay on | One-click install |
| Others can use it | Only with same manual steps | Yes |

- A multi-site feed blocker should pass single-purpose as a "narrow focus area" (NFE is the precedent), if described as such. The risk comes from bundling: adding a new tab dashboard, a to-do list, or a general site blocker could be seen as a second purpose. Keep to "reduce distracting feeds."
- Do not request `<all_urls>`. List 3 to 6 hosts or use NFE's optional-per-site model. Listed hosts give simpler install-time wording; the optional model gives no install warning for hosts but adds a grant step in onboarding.
- If an extension stores settings only locally and sends nothing, the privacy burden is small. Remote selector fetching still needs disclosure in the listing, as a matter of good practice.
- For personal use only, unpacked (or uBOL custom filters) beats paying for review. Publishing as unlisted is worthwhile for $5 if auto-update or a second device matters.

### Gaps
- Current exact mechanics of the dashboard Privacy tab (per-permission justification text, data-use certifications) were not fetched; they are a known step but not cited here.
- Actual 2026 review durations for broad-host extensions: no measured data. The official page dates from 2021.
- Whether the 2-step-verification requirement still applies: not stated on the register page.
- Chrome 137's reported `--load-extension` flag removal, relevant to CI: not confirmed from primary sources. Test tooling should check this before relying on it.
- Whether Chrome warns on or disables Developer-mode extensions at startup in 2026 is unconfirmed.
