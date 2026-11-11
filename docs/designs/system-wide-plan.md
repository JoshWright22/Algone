# Algone system-wide: review and build plan

Written 2026-11-10 by Claude (Fable) for Josh. Review and plan only; no repo code changed. Not committed.

Labels: **[P]** primary source read this session (repo code, docs, paper page). **[R]** reused from Algone's own research notes (`docs/research/notes/*.md`) or the 2026-11-10 report `System-wide algorithm blocking.md`. **[S]** search summary, page not read in full. **[U]** could not verify. **[J]** my judgment.

Inputs read: README, CONTRIBUTING, `docs/designs/algone.md` (Goals, Non-Goals, D-26, Decision Register, "Native-app features on phones"), `docs/research/notes/*`, `packages/core/src/*`, `apps/extension/src/*`, `apps/extension/scripts/build.mjs`, `apps/mobile/*`, `packages/rules/sites/{youtube,reddit}.json`, `tests/static/compliance.test.ts`, `.github/workflows/{ci,pages}.yml`, the Zen and Curbox repos, Chrome and MDN storage docs.

Josh's goals, in his words: "supports all kinds of algorithm editing the user needs on any system easily"; "a desktop or app where I can change simple settings that changes how it functions across all platforms and should sync on my phone and laptop and desktop"; "the main problem is that you can always just disable the settings, so rewards or research into getting people off social media would be best"; "I want healthy content, but I don't want content that makes me feel bad and just keeps me watching"; plus a ranking that minimizes time in the app. Both phone OSes count equally.

---

## 1. Weaknesses today, ranked

1. **Nobody can install it normally.** Not in any store; Chrome/Edge need "Load unpacked", Firefox builds are unsigned and die at restart, Safari is never packaged, the Expo app has never run on a device (README "Status") [P]. Every other weakness is invisible until this one is fixed.
2. **Rule fragility, and 5 of 12 sites never checked on the real site.** X, Facebook, LinkedIn, Substack and Instagram home are `unverified`; no logged-in check has run [P README]. Breakage after redesigns is the number-one complaint for NFE and Unhook (NFE #362, 39 comments; 16 of 20 Unhook low-star reviews) [R user_complaints_gaps]. Live checks can be walled by bots (Q3).
3. **Settings are trapped in one browser profile.** No export, no import, no backup, no sync. Reinstalling or switching browsers loses everything, and an agent has no way in ("Agent config: Not yet") [P background.ts, options.ts; R report §3.5]. This is the gap Josh's sync request names.
4. **Shallow settings migration will break the first schema change.** `migrateSettings` does `{...base.sites, ...saved.sites}`: a saved site object replaces the default wholesale, so any new field inside `SiteSettings` or `TunedFilters` (needed for every feature below) is `undefined` on existing installs and `shouldHide` will throw on `f.avoid.some` [P defaults.ts]. Must be fixed before any new field ships.
5. **The off-switch is one click and the product knows it.** Disable the extension, open another browser, or use a private window; README says so honestly [P]. There is no "take a break" path that keeps the install, so the sanctioned way to stop is uninstall. Section 5 is about this.
6. **Three support rows are unproven.** Firefox Android untested, Safari untested, Algone Browser never launched (README table) [P]. The README says "Built" for things that have never run where they are meant to run; a reader could take that as support.
7. **Custom mode is thin on most sites.** It only reads RSS and captured tiles; YouTube/Reddit/Substack/Bluesky have feeds, Instagram/TikTok/X/Threads/Facebook/LinkedIn do not, so Custom is near empty there [P feeds.ts, rules]. No ranking beyond newest/fair/oldestUnseen, no duration, no ratings.
8. **Options UX is one long accordion.** Schedule barrier UI allows one window "Every day" though the type supports per-day windows; `describePatch` falls back to "Change a setting" for globals; no onboarding choice of barrier; no "what changed" after a rule update; keyword fields are raw comma lists [P options.ts, commands.ts]. NFE's maintainer lists a hard-to-use options page as a mobile blocker [R].
9. **Honesty debt in the new direction.** README: "Native apps on any platform | None | Not supported, and it never will be"; spec Non-Goals forbid Screen Time, Accessibility, overlays; D-26 "No desktop binary" [P]. Going system-wide reverses these; the text must change in the same commit as the first native-app feature, not before and not after.
10. **Tests cover the happy path on Chromium fixtures.** No test for settings migration across versions, none for concurrent patches, mobile tests are five small files, Playwright runs Chromium only, Firefox is a smoke test [P ci.yml, tests/]. Compliance test pins permissions, which is good and must stay.
11. **Release pipeline is secrets-less.** Publish workflows no-op without store secrets; nightly prereleases only; no stable release [P README].
12. **Random content is a bundle, not a feature.** Fine, but it cannot grow without a release; low priority.

---

## 2. What users ask for, and what to build

### 2.1 Evidence from reviews and issues

Mostly from `user_complaints_gaps.md` (NFE, Unhook, DF Tube, BlockSite, HN) [R] plus today's searches [S]:

| Ask | Strength | Algone today |
|---|---|---|
| Keep working through redesigns, no over-blocking | Strongest (NFE #362, #323, #348, #523, #600; Unhook low-star reviews) | Daily check + overlay rules, 5 sites unverified |
| Mobile browsers | Repeated for years (NFE #495, #142, #176, #292) | Built, untested |
| Precise per-element control, keep Groups/Marketplace/Messages | Moderate (HN 2026-02-20, 2025-09-14; NFE #540, #571) | Yes, per element |
| Stories, Reels, Shorts | Moderate (NFE #509, #559, #568) | Shorts yes; Stories per site unknown |
| Schedules | Highest single request (NFE #8, 14 reactions; Oct 2026 review) | Schedule barrier, one window |
| Snooze length, warning before feed returns | NFE #281, #455, #271 | Yes |
| Keyword/channel/description filters | Unhook keyword blocking; FilterTube reviewer asks for description matching [S] | Title and channel only |
| Sync settings across browsers | BlockSite reviews ask for it; it is a paid tier there [S] | None |
| Password/strict mode that does not trap you | BlockSite master-password errors, schedule bugs [S] | Partner password with 24 h recovery |
| Uninstall protection | BlockSite 2026 review: password can't stop uninstall [S]; Regain advertises it [R] | Declined, stated plainly |
| Delay before entry (one sec style) | HN 2024-01-03; one sec reviews praise it, complain about Shortcuts setup and premium "intentional app switching" [S] | Launch pause exists |
| "Keep what I would choose to read", LLM filtering | HN 2026-08-23, 2026-09-04 | No |
| Report from the options page | NFE #517 | Popup has "Report a problem" |
| Math/typing unlock too hard (ScreenZen "Doesn't unlock like it should") [S] | Anecdotal | Typing length is user-set |

### 2.2 Option list to build, in priority order

Must have: export/import file; one sync channel; description-level keyword filters; "avoid" lexicons (outrage, clickbait, comparison); healthy ranking with daily budget and batch; replacement activities; break mode; schedules with several windows; Stories switches where a site has them; per-platform app modes.

Worth having: Zen export for desktop apps; NewPipe/OPML export for Custom creators; Curbox driver on Android; Screen Time pause on iPhone; weekly local summary; creator scores from ratings.

Bloat, do not build: to-do lists, new tab page, whole-site blocking (store single-purpose risk, spec Non-Goals), grayscale (Curbox does it), motivational quotes as a feature, streaks, pay-to-unlock, a DNS server, an Accessibility service, a mitmproxy rewriter, ReVanced integration [R report §6.2].

---

## 3. Sync without an account or a paid server

### 3.1 Constraints found

- `storage.sync`: 100 KB total, 8 KB per item, 512 items, 120 writes/min [P Chrome, MDN]. Chrome needs the user signed in to Chrome, Firefox needs a Firefox account with add-on sync on; Firefox for Android does not sync at all (bug 1625257) [P MDN]; Safari syncs only an extension's install and enabled state across devices, not its data (Apple, "Syncing Safari web extensions across devices and platforms", Safari 16+) [P Apple doc JSON], so `storage.sync` behaves as local there [S MDN compat]. It never crosses browser vendors, and never reaches the phone apps.
- `nativeMessaging`: a permission the compliance test forbids adding, plus a registry key and a native binary per machine [P Chrome docs]. Not for Safari or phones.
- Syncthing: no official iPhone client; Möbius Sync is third-party and paid above 20 MB [S]; the official Android app was deprecated in late 2024, the Catfriend1 "Syncthing-Fork" repo went 404 in Nov 2025 and the nel0x mirror was archived Dec 2025, with the Play and F-Droid builds still served [S forum.syncthing.net 2025-11-13, github.com/nel0x/syncthing-android]. An extension cannot read a synced folder without native messaging anyway.
- Cloud folders (Drive, iCloud, OneDrive): same problem for the extension; Drive API needs OAuth from the extension (`identity`, another permission) [J].
- End-to-end relay: is a server; the brief rules it out.
- CRDT libraries: solve merge, not transport; the policy is one small document with a clear tighten/loosen rule, so a CRDT is bloat [J].
- The extension already fetches `rules.json` from GitHub Pages with no host permission because Pages sends CORS headers (D-06) [P spec]. Checked today: `gist.githubusercontent.com/.../raw/` returns `Access-Control-Allow-Origin: *` and `Cache-Control: max-age=300`; `api.github.com` returns `Access-Control-Allow-Origin: *` [P curl]. So an extension, the Expo app and a web page can read and write a Gist with **no new permission**, using a token the user pastes once. Fine-grained tokens have a "Gists" permission [S docs.github.com, Enterprise pages; github.com assumed same, U].
- Sync must not be a loosening bypass: every device applies the file through its own barrier (report §6.1).

### 3.2 Recommendation: one GitHub Gist, owned by the user

**Transport:** a secret Gist in the user's own GitHub account holding `algone-policy.json` (plus generated `algone-zen.txt` and `algone-subscriptions.json`). Free, versioned (Gist revisions), readable by every Algone surface with plain `fetch`, writable with a token with only the Gists permission, no Algone server, no new extension permission. Zen subscribes to the raw URL of `algone-zen.txt` directly. Claude or any agent edits the Gist with `gh gist edit` or the `algone` CLI.

**Pairing:** the first device creates the Gist and shows a QR code and a paste string: `algone://pair?gist=<id>&token=<token>[&key=<passphrase>]`. Phones scan it; browsers paste it. Treat the string as a password.

**Privacy:** optional passphrase; when set, `algone-policy.json` is AES-GCM ciphertext (WebCrypto, exists in `password.ts` style) and only `algone-zen.txt` stays plain (it holds CSS selectors, no personal data). Default on when a partner password is set, since the policy then carries the partner hash.

**No-account fallback:** export/import of the same file (download, share sheet, QR for small policies). Ships first because it is also the backup feature (weakness 3).

**Loosening rule:** each device stores `appliedRev`. On a new revision it computes `diffSettings(local, remote) -> Patch[]` (reusing today's `Patch` ops) and runs each through `isWeakening`. Tightening patches apply at once. Weakening patches become one pending change ("Sync wants to loosen 3 settings") that waits for the local barrier, exactly like a popup change. Stricter barriers apply at once; a weaker barrier waits. So "ask Claude to turn it off" still ends at the pause screen on every device.

**Conflicts:** last writer wins per revision, with a monotonically rising `rev` and `updatedAt`; a device that is behind rebases its local patches onto the newest revision before pushing (patches are small and commute in practice; a true conflict on the same field keeps the stricter value) [J]. Snoozes, daily counters, ratings and the queue are device-local and never synced unless the user opts in (section 7).

Why not storage.sync as a second channel: two sources of truth, and it adds nothing the Gist does not; leave it out.

---

## 4. The settings app

Options weighed: Tauri/Electron desktop app (needs Rust or a 100 MB runtime, cannot run on the phone, duplicates the options page); PWA; reuse the Expo app with Expo web (RN-web plus `react-native-webview` does not run on web, store rejection risk is tied to that app, Q1); a local web UI from an `algone` CLI (fine for Josh, not for a phone).

**Recommendation: "Algone Hub", a static web app in `apps/hub`, same stack as the extension UI** (TypeScript, esbuild, no framework, the `h()` helper moved to a shared `packages/ui`), published by the existing Pages workflow at `joshwright22.github.io/Algone/hub/`, installable as a PWA on Windows, Mac, Linux, Android and iPhone. It reads and writes the Gist, shows a simple view (per-site mode, per-app mode, barrier, budget, avoid list, schedule) and an advanced JSON view with validation. Opus can build and test it on Windows with vitest and Playwright, no device, no Apple tools.

The extension options page gets a "Sync" tab (pair, status, last revision, pending loosening). The Expo app gets the same two screens in React Native using `packages/core` only, so phones have a native entry even if the Hub PWA is enough. One `algone` CLI in `packages/cli` (Node, no deps) does `pull | push | set | validate | export --zen | export --newpipe | export --opml` for agents and for Zen on the PC.

---

## 5. Staying by choice when the off-switch is one click

### 5.1 Evidence, strongest first

1. **A pause with an easy "never mind".** one sec field study: 36% of open attempts dismissed, attempts down 37%, opens down 57% over 6 weeks (no control); online N=500: the dismiss option was the strongest part (d=0.44), the message alone was not effective; 61% attrition, co-author founded one sec [R unlock_friction, which read the primary PMC page https://pmc.ncbi.nlm.nih.gov/articles/PMC9974409/; the page refused the hub fetch today, so the numbers rest on that earlier read]. Haliburton CHI 2024, N=1,039: friction reduces attempts, people take breaks and return, habituation over months [R].
2. **Replace, do not just block.** Lyngs CHI 2020 (N=58): removing the Facebook feed cut scrolling and visits; some feared missing out; participants asked for filtering controls [P https://arxiv.org/abs/2001.04180]. Purohit et al. CHI 2023 (DOI 10.1145/3544548.3581187): self-regulated feed diet cut time 39% with no more negative experience than no diet; strict cut 64% with significantly more negative experience; the unfollow intervention reached every device [P author interview https://chinederland.nl/2023/04/chi-nl-read-social-media-detox/]. SwitchTube CHI 2023 (N=46): a search-first Focus Mode raised sense of agency without cutting time [S https://faculty.washington.edu/alexisr/switchtube.pdf]. Lukoff CHI 2021 (N=120): autoplay and recommendations undermine agency, search and playlists support it [S https://arxiv.org/abs/2101.11778].
3. **Autonomy over control; reactance drives abandonment.** Lukoff, Lyngs, Alberts 2022: strong enforcement triggers psychological reactance; design for internalised goals [S https://lize-alberts.github.io/publication/preprint-work]. Schwartz CHI 2021: users react against self-imposed constraints and abandon the tool; proposes continuously variable interventions [S https://unpaywall.org/10.1145%2F3411763.3451843]. Lyngs IJHCS 2022 (334 tools): tools combining several patterns are rated higher [S].
4. **Deactivation helps a little and sticks.** Allcott et al. AER 2020 (N=2,844): four weeks off Facebook gave small but significant wellbeing gains, 90% compliance, and a large persistent drop in use afterwards [S https://www.nber.org/papers/w25514.pdf]. A sanctioned break, then, is not a failure; it is the effect.
5. **Friction beats plans and goals.** Zimmermann and Sobolev 2023 (N=112): grayscale friction cut measured time at once, self-set limits cut it slowly [R]. Brockmeier et al., Computers in Human Behavior 2025, DOI 10.1016/j.chb.2025.108624 (N=787): implementation intentions had no effect on total smartphone time; only self-efficacy mediated reductions [S repository.tudelft.nl summary; DOI confirmed via Crossref, paper not read]. Wellspent RCT JMIR 2026: a moderately enforced tool cut the worst app by about 29 min/day [R].
6. **Rewards, streaks, partner accountability, reflection prompts:** no direct outcome evidence retrieved for feed tools. Goal reminders were "often annoying" (Lyngs) and the deliberation message did nothing (one sec). Streak loss conflicts with Haliburton's break-and-return pattern [R]. Commitment devices in classrooms (Aksoy et al. 2025) exist but effect sizes were not read [S].
7. No study found measures uninstall or disable rates by mechanism [R]. **Nothing below stops a determined user, and the README must keep saying so.**

### 5.2 Features that follow, ranked by evidence

1. Keep the barrier mild by default and "Never mind" the biggest button (exists).
2. Make the good path the easy path: Custom mode with the healthy ranking (section 6) is the product, No feed is the floor. Default new installs to Custom once the user has followed three creators [J].
3. **Break mode** instead of disable: "Pause Algone until tomorrow 9:00" (max 24 h, passes the barrier once, returns by itself, shows one line on return: "Welcome back. 2 h 10 m reclaimed this week."). Gives the uninstall impulse a cheaper outlet.
4. **Replacement activities**: the user lists 3 to 5 things ("walk", "call Sam", "read the queue") shown on the No-feed and end-of-batch panels; one tap opens the queue or a chosen URL. No quotes library, their words.
5. **Rising friction within a day**: the second and later loosenings the same day add 15 s each (cap at the barrier max); resets at midnight; never a streak, never a penalty for time away.
6. **Time reclaimed**, local only: minutes feeds were hidden while the site was open, unlocks dismissed, batches finished; one line in the popup, a weekly card in the Hub. No analytics leave the device (compliance test already bans telemetry words).
7. **One-tap "worth it?"** after a snooze ends or a batch finishes: Worth it / Not worth it / Made me feel worse. No free text. The answer feeds creator and topic scores (section 6), so it is a control, not nagging. Can be turned off.
8. **Gentle re-enable**: when a site is turned off by the user, the popup shows "Off until you turn it on" and the daily rule check sends no notification; the Hub shows it as a yellow row. No nagging notifications (Lyngs).
9. **Cooling-off where the platform allows**: the extension cannot delay its own disable or uninstall (no API), say so. On Android, Curbox's "settings change delay" and anti-uninstall are the user's choice inside Curbox. On iPhone, Screen Time can lock the app's permission (one sec blog claim, [U]).
10. Partner password (exists) stays as the strongest optional barrier; no new rewards system.

---

## 6. The healthy feed: rank to minimize time, keep what nourishes

### 6.1 What the evidence says makes people feel worse or keeps them watching

- Engagement ranking amplifies anger and out-group hostility: Milli et al., PNAS Nexus 2025, DOI 10.1093/pnasnexus/pgaf062 (pre-registered, N=806 Twitter users, Feb 2023): the engagement feed showed more partisan, out-group-hostile tweets than a feed ranked by users' stated preferences, and users did not prefer those political tweets; stated-preference ranking was less angry [S https://arxiv.org/abs/2305.16941, https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11894805/; DOI confirmed via Crossref, full text not read].
- Moral-emotional words spread: Brady et al. PNAS 2017, each moral-emotional word raised diffusion about 20% within ideological groups [S https://pmc.ncbi.nlm.nih.gov/articles/PMC5514704].
- Out-group words drive sharing: Rathje, Van Bavel, van der Linden PNAS 2021 (2.7 M posts): each out-group term raised the odds of sharing by 67% in the headline model (35 to 57% in other analyses) [S https://pmc.ncbi.nlm.nih.gov/articles/8256037].
- Doomscrolling: problematic news consumption in 16.5% of a 1,100-person sample, 74% of the severe group reported mental health problems vs 8% (Health Communication, McLaughlin et al. 2022 [U authors]); a UCL pre/post browsing study of 1,000+ found people with lower mental health sought more negative content and that viewing it worsened mood [S https://www.openaccessgovernment.org/what-is-doomscrolling-and-why-is-it-bad-for-us/]. Mostly correlational.
- Autoplay and infinite feeds: Lukoff 2021 (agency), a TikTok lab study where explicit play raised agency and pagination gave a subtler sense of control [S Politecnico di Torino], gradual interventions on short-video scrolling (arXiv 2607.15818, 2026, outcomes not read) [S]. Evidence on bounded feeds and time is thin; treat "a batch that ends" as a design bet backed by the agency studies [J].
- Social comparison and clickbait/cliffhanger titles: not searched this session; widely reported, no URL here [U].
- What nourishes: content the person chose (subscriptions, search, playlists), finished-length items, stated-preference ranking, neutral or positive tone. This is the SwitchTube/Lukoff finding restated; "healthy" here means "what you said you want, in an amount you set" [J].

### 6.2 Signals Algone can use locally, nothing leaves the device

| Signal | Source | Exists |
|---|---|---|
| Stated topics (allow and block) | `tuned.allowTopics`, `blockTopics` | Yes |
| Chosen creators only | Custom sources, `blockChannels` | Yes |
| Recency | `FeedItem.time` | Yes |
| Already seen | `FeedItem.seen` | Yes |
| Finite batch size | new `ranking.batchSize` | No |
| Daily time budget | new `ranking.dailyBudgetMinutes`; minutes counted while a watch page reached from an Algone pick is foreground, local | No |
| Item length | new rule field `capture.duration` selector (YouTube tiles show it; RSS does not) | No |
| Avoid patterns | new bundled lexicons `content/avoid/{outrage,clickbait,comparison,doom}.json`, plus ALL CAPS ratio, `?!`, "you won't believe", numbers-in-title | No |
| Ratings after watching | new local `ratings` store: item -> worth / notWorth / feltWorse | No |
| Creator and topic scores | mean of ratings per source and topic, local | No |

Text rules miss some and wrongly catch some, like "Likely AI" (README). Lexicons are written by maintainers in plain English, MIT, nothing copied from other projects. An on-device model: Chrome 148 ships a Prompt API for extensions with Gemini Nano, Chrome-only, 22 GB free disk, about 4 GB model download, opposed by Mozilla, Apple and Microsoft [S developer.chrome.com, shopifreaks]. It would not reach Firefox, Safari or the phones and the download is Chrome's, not Algone's. Not feasible as a product feature now; keep text rules, revisit later.

### 6.3 The "healthy" ranking

New `Ranking` value `"healthy"` next to `newest | fair | oldestUnseen`. `rankItems(items, "healthy", ctx)` with `ctx = { scores, avoid, budgetLeftMinutes, batchSize, now }`:

1. Drop seen items and items matching hard filters (`shouldHide`).
2. Score = `2*creatorScore + 1*topicMatch + recency(0..1) - 2*avoidHits - lengthPenalty` where `lengthPenalty` is 1 if duration is known and exceeds budget left, else 0. Items with `feltWorse` creators sink below 0.
3. Interleave by source as "fair" does, then cut to `batchSize`.
4. The panel renders the batch with no infinite scroll, then "That's today's batch" plus replacement activities and time reclaimed. When the daily budget is spent, the batch is empty and says so.
5. Deterministic and pure, so it is unit-testable with fixed inputs.

Where it runs: the extension Custom panel and the mobile Custom screen (full); Tuned mode on the site's own feed applies `avoid` as hide and caps visible items at `batchSize` per page load (no reordering of the site's DOM, which is brittle) [J]; the Hub previews the batch from the synced sources; NewPipe and FreeTube receive only the creator list, no order.

Honesty line for the UI and README: "Algone ranks the items it fetches itself (your creators, RSS, captured subscriptions). It cannot rerank inside YouTube, TikTok or any native app."

---

## 7. Policy schema

```jsonc
{
  "schema": "algone-policy/1",
  "rev": 42,                         // rises by one per write; device rebases if behind
  "updatedAt": "2026-11-10T18:00:00Z",
  "updatedBy": "desktop-7f3a",       // device id, or "agent:claude"
  "settings": { /* today's Settings, schema 1, minus theme */ },
  "ranking": { "kind": "healthy", "dailyBudgetMinutes": 30, "batchSize": 10 },
  "avoid": ["outrage", "clickbait", "comparison", "doom"],   // bundled lexicon ids
  "activities": ["Walk", "Call Sam", "Read the queue"],
  "breakUntil": 0,                   // break mode end, epoch ms; 0 = none
  "apps": {                          // native apps, enforced by partners
    "android": { "youtube": { "mode": "cover", "shorts": "block", "focusGroup": "Algone" },
                 "instagram": { "mode": "cover", "reels": "block", "dms": "allow" } },
    "ios":     { "youtube": { "mode": "pause" }, "instagram": { "mode": "limit", "minutes": 20 } },
    "desktop": { "zen": true }
  },
  "overrides": {                     // partial policies, applied on top
    "platform:ios": { "settings": { "stopAtEnd": true } },
    "device:laptop-1c22": { "settings": { "sites": { "youtube": { "mode": "random" } } } }
  },
  "sync": { "creatorScores": false, "queue": false },   // opt-in extras
  "scores": { "sources": { "<sourceId>": 0.7 }, "topics": { "science": 0.9 } },  // only if sync.creatorScores
  "devices": { "desktop-7f3a": { "name": "PC", "platform": "chrome", "lastSeen": 1731260000000 } }
}
```

Mapping to today's types: `settings` is the existing `Settings` object unchanged, so `applyPatch`, `isWeakening`, `validateBarrier` and `computeView` need no change for the browser layer. New core modules: `policy.ts` (types, `validatePolicy`, `policyFromSettings`, `settingsFromPolicy(policy, platform, deviceId)` applying overrides), `diff.ts` (`diffSettings(a, b): Patch[]`), `sync.ts` (pure: `plan(local, remote) -> { applyNow: Patch[]; pending: Patch[] }`), `ranking` fields added to `Settings` via a `schema: 2` migration (deep per-site merge, weakness 4).

Tighten/loosen for new fields: a lower `dailyBudgetMinutes`, smaller `batchSize`, more `avoid` entries, a later `breakUntil` that is sooner, a stricter app mode (`allow < limit < pause < cover < block`) all tighten; the reverse waits for the barrier. `activities`, `devices`, `scores` are neutral.

Platform enforcers read the same file: the extension (everything), the Expo app (everything in its browser; `apps.android` via Curbox; `apps.ios` via Screen Time), `algone export --zen` (CSS `##` rules from `settings.sites[*]` hidden elements), `algone export --newpipe|--opml` (Custom YouTube sources).

---

## 8. Partner tools, verified today

**Zen (irbis-sh/zen-desktop, MIT, v0.29.0 released 2026-11-02)** [P]
- Config `config.json`: `filter.filterLists[] {name,type,url,enabled,trusted,locales}`, `filter.rules[]` (`myRules` deprecated), `proxy.{port,ignoredHosts,pacPort,routing{mode,appPaths}}`, `dns`, `updatePolicy`, `locale`. `url` only; no local-file field seen; no file watcher in `config.go`, so a hand-edited config needs a Zen restart [P config.go]. Filter lists are refetched on an `Expires` header (`filterliststore/parseexpires.go` exists; semantics assumed) [P tree, J]. So: publish `algone-zen.txt` with `! Expires: 1 hour` on the Gist and add it once as a list URL.
- Cosmetic rules: `##` and `#@#` are parsed by `internal/asset/cosmetic`; a rule is "extended CSS" only if its body contains `:has-text|:contains|:matches-*|:min-text-length|:others|:upward|:xpath|:nth-ancestor|:watch-attr|:remove|:style|:-abp-*` [P cosmetic.go, extendedcss.go]. **`:has()` and `::part()` are therefore treated as plain CSS and injected as a stylesheet**, which works in any Chromium/WebView page. Scriptlets exist (`internal/asset/scriptlet`). Docs say "partial compatibility" with EasyList/uBlock/AdGuard syntax [P docs.irbis.sh].
- Limits remain: pinned apps bypass it, native desktop apps mostly fetch JSON, Zen has no modes or barriers [R].

**Curbox (curbox-app/curbox-android, GPL-3.0, release 6 on 2026-10-15)** [P]
- `CURBOX_API.md` on the `kt-rewrite` branch, API version 7: a local Android Binder/AIDL service, no HTTP. Actions `neth.iecal.curbox.api.BIND` and `REQUEST_PERMISSION`; methods `apiVersion, isGranted, execute(command, Bundle), query, list, add/removeListener`. Approved apps can start/stop focus sessions on existing groups, enable/disable app-blocker/keyword/grayscale groups, toggle the reel blocker, UI hider, keyword blocker globally (`SET_REEL_BLOCKER {enable}`), read usage, and from v7 create/edit focus groups (name, websites, apps, block mode, exit rule). They **cannot** create blocker groups, pick a group's apps/schedules remotely, edit UI hider scripts, or export settings. Grants are per package and signing key; the user approves once in Curbox. Which released build carries v7 is unverified [U].
- Mapping: `apps.android.*` -> one Curbox focus group "Algone" that Algone creates (v7) with the policy's app list, plus global reel blocker and UI hider toggles. The user sets covers and schedules inside Curbox. Curbox's own settings-change delay is the loosening barrier there.
- License: Algone talks over AIDL from its own process; copy only the interface definition (the doc tells clients to copy the `.aidl` file) and credit it in `THIRD_PARTY_NOTICES.md`; open question 4.

**NewPipe** [P `app/src/test/resources/import_export_test.json` and `local/subscription/workers/SubscriptionData.kt` in TeamNewPipe/NewPipe `dev`]: subscriptions export is JSON `{ "app_version": "0.11.6", "app_version_int": 47, "subscriptions": [ { "service_id": 0, "url": "https://www.youtube.com/channel/UC...", "name": "..." } ] }`; `service_id` 0 is YouTube. Also emit OPML, which NewPipe and FreeTube both import.

**FreeTube (AGPL)**: docs list imports from YouTube Takeout CSV, Invidious/NewPipe OPML, NewPipe export, and FreeTube's own format [P docs.freetubeapp.io]. Emit NewPipe JSON and OPML only; do not read FreeTube's code or format (CONTRIBUTING rule).

**iOS Screen Time via react-native-device-activity (MIT, 0.6.1, 2026-02-19, peers expo>=52, RN>=0.76)** [P npm, README]: config plugin, `expo prebuild`, Family Controls distribution entitlement that Apple must approve per bundle id (four ids), app group, custom shields, DeviceActivity schedules and thresholds, web domain filter up to 50 domains. Needs an Apple developer account, entitlement approval, and an iOS build (EAS cloud or a Mac). Picks are opaque tokens, so the policy can only say `mode: pause|limit`, never which app; Josh taps the apps once. Nothing of this can be run or tested on Windows.

---

## 9. Build plan for Opus

Rules: one commit per step, tests in the same commit, `npm run typecheck && npm test` green, compliance test unchanged unless the step says so, push to `main` (Josh's choice). Steps marked **[device]** cannot be verified on Windows without a phone, Apple tools, or a store; ship them behind flags with unit tests only and say so in the commit.

Phase A: foundations and honesty
1. Deep per-site settings migration: `migrateSettings` fills every nested field, `schema: 2`, tests with schema-1 fixtures missing new fields.
2. Export/import of settings as a file from options and the mobile Settings screen; import runs through the sync plan (tightening now, loosening pending). Tests: round-trip, loosening import opens the barrier.
3. `packages/core/policy.ts`: policy types, `validatePolicy`, `policyFromSettings`, `settingsFromPolicy` with overrides; JSON schema file in `packages/core/schema/policy.schema.json` for agents. Tests.
4. `packages/core/diff.ts` + `sync.ts`: `diffSettings`, `plan(local, remote)`; property-style tests that every tightening diff applies at once and every loosening diff lands in `pending`.
5. README and spec: add a "Where the policy applies" table and move D-26 and the Non-Goals to "Changes During Implementation" with the new decision text; keep "cannot change feeds inside native apps" true in every sentence; store copy untouched until section D ships.

Phase B: sync and the Hub
6. Gist backend in `packages/core/sync-gist.ts` (pure fetch wrapper, injectable `fetch`), token in `storage.local`, optional AES-GCM passphrase. Tests with a fake fetch, CORS-only, no new permissions (compliance test stays identical).
7. Extension: Sync tab in options (pair by paste, status, pending loosening list), background alarm `sync` every 15 min and on `storage.onChanged` pushes with debounce. Playwright test with a mocked Gist endpoint on `localhost`.
8. `packages/ui`: move `h.ts`, `common.ts`, `theme.css` out of the extension; extension still builds.
9. `apps/hub`: static PWA, simple view + advanced JSON view, pairing QR (render with a small inline QR encoder, no dependency with network access), deployed by `pages.yml` to `/hub/`. Playwright tests on the built files.
10. `packages/cli`: `algone pull|push|set <path> <value>|validate|export --zen|--newpipe|--opml`; Node only; tests on fixtures.
11. Mobile: Sync and Policy screens in `apps/mobile` using the same core; unit tests only **[device]**.

Phase C: healthy feed and staying by choice
12. Avoid lexicons (`content/avoid/*.json`, maintainer-written), `tuned.avoid`, heuristics (caps ratio, punctuation, listicle numbers); `shouldHide` and a new `avoidHits`. Tests with sample titles including false positives documented.
13. Description-level matching: rules gain an optional `tuned.description` selector; `TunedItem.description`. Tests on fixtures.
14. Ratings store (`ratings.ts`) and one-tap "worth it?" card after snooze end and batch end; creator and topic scores; local only. Tests.
15. `rankItems(..., "healthy", ctx)` with batch and budget; `capture.duration` rule field for YouTube; budget counter in runtime. Tests with fixed clocks.
16. Panel: finite batch, "That's today's batch", replacement activities, time reclaimed line; mobile Custom screen same. Playwright on the panel.
17. Break mode (`breakUntil`, max 24 h, through the barrier, auto-return with the welcome line); rising friction within a day in `barrierStep`; weekly local summary card in the Hub and options. Tests.
18. Schedule barrier UI: several windows, per-day; `describePatch` names every global. Tests.

Phase D: other platforms
19. `algone export --zen`: compile `settings.sites[*]` hidden elements to `host##selector` lines with `! Expires: 1 hour`, publish as `algone-zen.txt` on the Gist; doc page "Zen on Windows/Mac/Linux" with the one-time list URL step and the root-certificate warning. Tests compare output to golden files. Manual check on Josh's PC.
20. `algone export --newpipe|--opml` from Custom YouTube sources (NewPipe field names verified, section 8); doc for NewPipe (Android) and FreeTube (desktop) import. Tests with golden files.
21. Android Curbox driver: Expo Module in Kotlin (`modules/curbox`) binding `neth.iecal.curbox.api.BIND`, approval flow, `apps.android` mapping to one focus group plus global toggles; THIRD_PARTY_NOTICES entry for the AIDL interface. Typecheck and Gradle build in CI only **[device]**.
22. iOS Screen Time: `react-native-device-activity` plugin, `apps.ios` mapping to pause/limit shields, UI text "Algone can only pause or limit whole apps on iPhone" **[device, Apple account, entitlement]**.
23. Stories switches on Facebook, Instagram, Snapchat-free sites where present; verify live. Store copy and README "What works where" updated only for rows that were actually run.
24. Store submissions and a signed Firefox build (secrets from Josh) **[stores]**.

---

## 10. Open questions only Josh can answer

1. **Is "bring your own GitHub account" acceptable as the one sync channel?** Recommended: yes; file export/import and QR stay as the no-account path, and nothing else is added.
2. **Encrypt the policy on the Gist with a passphrase by default?** Recommended: off by default, forced on when a partner password is set, one switch in the Hub.
3. **When does the README line "Not supported, and it never will be" change?** Recommended: in the same commit as step 21 or 22, whichever ships first, reworded to "Algone cannot edit feeds inside native apps. On Android it can drive Curbox; on iPhone it can only pause or limit whole apps."
4. **Android native apps through Curbox's AIDL API (GPL project, interface file copied as the doc instructs), or no native-app support on Android?** Recommended: Curbox via the API, with the AIDL file credited in THIRD_PARTY_NOTICES and a note asking Curbox to state the interface license; re-declare the interface from the doc if they object.
5. **Pay for an Apple developer account and request the Family Controls entitlement now?** Recommended: not yet; package Algone for Safari first (no entitlement), add Screen Time after Android ships and Safari is in review.
6. **Defaults for the healthy ranking: daily budget and batch size?** Recommended: 30 minutes and 10 items, both visible on the panel.
7. **Sync creator and topic scores (derived from your ratings) across devices?** Recommended: opt-in, off by default; per-item ratings never sync.
8. **Ship maintainer-written English avoid lexicons (outrage, clickbait, comparison, doom)?** Recommended: yes, MIT, around 100 phrases each, with the "misses some, wrongly catches some" line.
9. **Allow a Chrome-only on-device model (Prompt API, about 4 GB download) as an experiment?** Recommended: no for now; text rules on every browser beat a Chrome-only model.
10. **Break mode as a sanctioned off-switch (up to 24 h, through the barrier once)?** Recommended: yes; it replaces disable for most impulses.
11. **Default new installs to Custom with the healthy ranking once three creators are followed, instead of No feed?** Recommended: yes, No feed stays the floor and the first-run default.
12. **Which phone do you test on first?** Recommended: Android (Firefox + extension today, Curbox later) because it needs no Apple account; iPhone through Safari in parallel.
13. **Host the Hub at joshwright22.github.io/Algone/hub/?** Recommended: yes; it is already the Pages site and needs no new infrastructure.
14. **Install Zen on your PC with its local root certificate?** Recommended: yes for you, documented as optional and with the certificate risk stated for everyone else.
