# Algone system-wide

Status: approved direction, in build. Written 2026-11-10. Sources: `docs/designs/system-wide-plan.md` (research and plan), two independent design reviews of that plan, and the maintainer's answers. Where this file and the plan disagree, this file wins.

## Goal

Algone removes the harmful parts of social media on every device a person uses: algorithmic feeds, Shorts and Reels, autoplay, outrage and clickbait, and endless scroll. Search, subscriptions, direct links and messages keep working. By default it shows a **healthy feed**: a short batch picked from what the site already offers, with outrage and depressing posts pushed out, that ends so the person can leave. Settings are changed in one place and reach every device.

**Centerpiece (2026-11-10): the Algone MCP server.** Instead of opening a site to see what it recommends, a person (or their AI agent) asks Algone: "what should I read or watch?" Algone pulls from open sources (RSS and Atom, YouTube channel feeds, Reddit, Bluesky, Hacker News), scores each item against the person's own written rules in the shared policy file, and returns a short ranked list with a reason for each pick. Never a scroll. Feedback (more, less, never) writes back to the policy file, so the agent, the extension and the app stay in step. The extension and the app remain the way to make the sites themselves safe.

Nothing can stop a person who is set on switching Algone off. The design aims for two things instead: switching off is slow and deliberate, and staying on feels worth it.

## Decisions

These replace D-26, the Non-Goals line on native apps, and the "Native-app features on phones" rejection in `algone.md`. They take effect in the README in the same commit as the first native-app feature, not before.

| ID | Decision | Why |
|---|---|---|
| S-1 | One shared **policy** file (`algone-policy/1`) holds every shared setting. Each device applies it through its own barrier: stricter changes at once, looser ones wait. | Agents and other devices can never be an easy way back to the feed. |
| S-2 | Sync is a secret GitHub Gist in the user's own account, reached by **one-click GitHub sign-in** (OAuth device flow). File export and import is the no-account path. | No Algone server, works in every browser and on phones. |
| S-3 | The settings app is the extension's options page on computers and the Algone app on phones. There is no website that holds a token. | A token on `joshwright22.github.io` would be readable by every Pages project on that origin. |
| S-4 | **Healthy** is a new mode and the default on every site that has a feed rule. | The maintainer: default to a healthy feed with no setup, based on what the user already gets and follows. |
| S-5 | Android native apps are handled by Algone's **own** Accessibility service inside the Algone app. No other app is needed. | The maintainer: users should not install anything else. Curbox is GPL; nothing is copied from it. |
| S-6 | iPhone native apps get whole-app pause and limits through Screen Time only, and the UI says so. This needs a paid Apple developer account; it waits for the maintainer. | iOS gives no access inside another app. |
| S-7 | On computers the extension does everything. A Zen filter list is an optional export for people who already use Zen; it is built on the computer after the local barrier, never synced. | Editing a synced list would loosen with no barrier. |
| S-9 | An **MCP server** (`packages/mcp`) is the main way the person and their agents use Algone. It recommends a fixed short list from open sources, scored against the policy's recommendation rules, and writes feedback back to the policy. | The maintainer: "rework Algone to be an MCP which gives you recommendations from all websites to view/read". |
| S-10 | Sources are open only: RSS and Atom, YouTube channel feeds, Reddit's public JSON, Bluesky's public API, Hacker News. X and other walled sites only through what the extension already sees on the page. No scraping behind logins, no paid APIs. | Legal, durable, open source. |
| S-8 | An opt-in **browser lock** on Windows: the CLI writes Chrome, Edge and Firefox enterprise policy so the extension is force-installed and cannot be disabled or removed from the browser UI. Removing the lock needs admin rights and the CLI. | The only real friction against one-click disable on a person's own PC. |

## Coverage

What a person gets on each surface once the build is done. Gaps are stated, not hidden.

| Surface | Route | What works | Gap |
|---|---|---|---|
| Chrome, Edge, Firefox on a computer | Extension | Everything | Another browser or profile without Algone. Private windows unless allowed (onboarding asks). |
| Firefox for Android | Extension | Everything | Untested on a device |
| Android native apps | Algone app, Accessibility service | Cover feeds, back out of Shorts and Reels, barriers, schedules | No reranking inside the app; breaks when an app changes; Android 13+ "restricted settings" step for sideloads |
| Android Chrome | Algone app, Accessibility service | Whole-app limits only | Android Chrome has no extensions |
| Safari on Mac, iPhone, iPad | Algone for Safari | Everything | Needs Apple's paid account to ship |
| iPhone native apps | Screen Time | Pause and daily limit of the whole app | Cannot remove Shorts while keeping subscriptions |
| Other iPhone browsers | None | None | Screen Time can limit them as whole apps |
| Desktop apps that show web pages | Zen export (optional) | Hide rules | Needs Zen and its certificate; pinned apps skip it |

## Settings, schema 2

New fields live inside `Settings`, so `diffSettings`, `isWeakening` and `applyPatch` see them. `migrateSettings` fills them field by field.

```ts
interface Settings {
  schema: 2;
  // ...today's fields...
  healthy: { batchSize: number; dailyBudgetMinutes: number }; // 10 and 30 by default
  avoid: AvoidId[];            // "outrage" | "clickbait" | "comparison" | "doom"; all four by default
  activities: string[];        // the user's own words, shown when a batch ends
  breakUntil: number;          // epoch ms, 0 = none
}
```

`customRanking` keeps `newest | fair | oldestUnseen` and stays neutral; the healthy ranking belongs to the Healthy mode, so it cannot be dropped through a neutral setting.

Device-local, never synced: `theme`, `barrier.escapeUsed`, `barrier.recoveryAt` (a finished recovery changes the barrier on that device only), snoozes, counters, ratings, the queue, feed sources.

### New patch ops and their direction

| Op | Tightens | Loosens (waits for the barrier) |
|---|---|---|
| `setHealthy {batchSize?, dailyBudgetMinutes?}` | both not larger | either larger |
| `setAvoid {ids}` | a superset | anything else |
| `setActivities {items}` | always neutral | |
| `startBreak {until}` | | always; at most 24 h, one break per 7 days; Shorts, Reels, TikTok and autoplay stay hidden during it |
| `endBreak` | always | |
| `setApp {platform, app, config}` | stricter mode in `allow < limit < cover < pause < block`, or fewer minutes | the reverse, turning `shortVideo` off, or removing the app |

Mode order for `setMode`: `nofeed` and `random` are strictest, then `healthy` and `custom` (different, so moving between them waits), then `tuned`. Moving to a stricter mode applies at once.

Barriers: only the same type made stricter applies at once. Any change of type waits, because type says little about strength (a schedule open all day is a 10 second wait) and a new partner password chosen by the person loosening is no barrier. A lock must keep what follows it at least as strict, and a used escape stays used. Partner passwords never leave their device; the policy carries a typing-200 stand-in. Every change, from any source, passes `validatePatch`: locks at most 7 days, daily limits from 1, every number in range. Pairing and importing go through the same split, so nothing is adopted unconditionally.

## Healthy mode

The site's feed stays hidden. Algone reads the items the site already loaded into the hidden feed (its own recommendations and the user's subscriptions), using the rule's `tuned` selectors, and shows a short batch in the Algone panel in their place.

Score per item (pure, deterministic, unit-tested):

```
score = 2*creator + topic + recency - 3*avoidHits - (seen ? 10 : 0)
creator  = the user's own rating of this creator: worth 1, not worth 0, felt worse -1, unrated 0.5
topic    = 1 if the title matches an allowed topic, else 0
recency  = exp(-ageHours / 48), 0.5 when the age is unknown
avoidHits = one per avoid list whose phrase list matches, plus one each for: more than half capitals over 10+ letters; "?!", "!!" or "!?"; a title that starts with a number and a superlative
```

Items with `avoidHits > 0` and a negative score are dropped. The rest are sorted by score, then time, then id; one creator may fill at most a third of the batch. The batch is `batchSize` long. When it is used up, or the day's budget is spent, the panel says "That's today's batch", shows the user's activities and stops: no more items, no infinite scroll. Ratings are one tap after an item is opened from the panel: Worth it, Not worth it, Made me feel worse.

The avoid lists are written for Algone, in plain English, MIT. Like "Likely AI", they miss some and wrongly catch some, and the UI says so. Budget counting: a watch page opened from the panel carries `#algone-pick`; the content script sends one tick per visible minute.

Honest line, in the panel and README: "Algone ranks what the site already loaded. It cannot change the site's own ranking, and it cannot rerank inside apps."

## Staying on by choice

Ranked by evidence (plan section 5): an easy "Never mind" on every barrier (exists); the healthy feed as the default, so the good path is the easy one; **Break mode** (up to 24 h, through the barrier once on the device where it starts, ends by itself; it does not sync); rising friction for the second and later loosenings in a day (+15 s pause, +15 typed characters, capped); a local "time reclaimed" line; no streaks, rewards or penalties.

## Sync

- **Sign-in.** "Sign in with GitHub" starts GitHub's device flow (`github.com/login/device/code`, scope `gist`). github.com sends no CORS headers, so the extension asks for the optional host permission `https://github.com/*` at that click only; `api.github.com` sends CORS headers and needs nothing. The maintainer registers one GitHub OAuth app with device flow on and puts its client id in `packages/core/src/links.ts`. Until then the Sync tab offers token paste.
- **Files.** `algone-policy.json` in one secret Gist, plus `device-<id>.json` per device (applied version, declined version, platform, written only when they change). The Gist is unlisted, not private; the UI says so. An optional passphrase encrypts the policy (AES-GCM, PBKDF2 with the iteration count stored in the envelope); mobile uses `@noble/ciphers`.
- **Versions.** The Gist's own `history[0].version` is the revision. Each device keeps the policy at its applied version as a base.
- **Push.** Local changes are kept as patches in an outbox. A push reads the Gist, applies the outbox to the remote settings, writes, then reads again and checks that its write is `history[0]`; on a race it retries (three times). A device never pushes its whole state, so it cannot undo another device's change by accident.
- **Pull.** `planSync(local, remote)`: the stricter patches apply now; the looser ones become one `syncPending` (separate from the popup's pending). "Never mind" records the declined version; the device asks again only when a newer version arrives.
- **Errors.** A missing, deleted or invalid Gist, a revoked token, or an unknown schema keeps the last applied settings and shows a warning. Nothing resets to defaults.
- **Clock.** Each device keeps the latest time it has seen and never uses an earlier one; with sync on, GitHub's `Date` header bounds forward jumps for barrier timers.
- **Agents.** The `algone` CLI edits the policy (`set`, `validate`). An agent edit is as safe as any other device's edit: loosening still waits on each device. An agent with shell access to a device can still tamper with that device; the browser lock (S-8) is the defence there.

## Recommendation rules (in the policy)

The policy's `settings.recommend` holds the person's rules in plain words, read by the MCP's scorer and shown in the extension and app:

```ts
recommend: {
  want: string[];          // topics and kinds of things wanted, e.g. "long-form science", "woodworking"
  drop: string[];          // topics and infohazards to keep out, e.g. "true crime", "election polls"
  creators: string[];      // creators to favor
  blockCreators: string[]; // creators never to show
  maxPerDay: number;       // hard cap on items recommended per day, 1 to 50
}
sources: Array<{ kind: "rss" | "youtube" | "reddit" | "bluesky" | "hn"; url: string; title: string }>
```

Direction: removing from `drop` or `blockCreators`, or raising `maxPerDay`, loosens and waits for the barrier. Adding to them, or lowering the cap, applies at once. `want`, `creators` and `sources` are neutral, since the cap bounds what can come through. Feedback "never" adds to `blockCreators` or `drop` (stricter, at once); "more" and "less" adjust scores.

## The Algone MCP server

Stub. Waiting for research on existing open-source MCP servers for RSS, news, Reddit, YouTube and feeds that could be reused or forked. Planned tools, at minimum: `recommend(n, kind = read | watch)`, `explain(item)`, `feedback(item, more | less | never)`, `get_policy`, `set_rule`, `sources_add`, `sources_remove`. Returns a fixed short list, never a feed.

## Android Accessibility service

Native-app rules are data, like site rules: `packages/rules/apps/<app>.json` lists the package name, the view ids that mark a feed or a short-video screen, and the action (`back` or `cover`). The TypeScript validator checks them. The Kotlin service in `apps/mobile/modules/algone-a11y` only reads the active window's view ids and applies the matched action; it never reads text off the screen, never sends anything anywhere. Play policy: prominent disclosure, no blocking of uninstall, fixed rules only. Not testable without a device.

## Build order

Done: 1 field-by-field migration; 2 policy file and sync plan; 3 Zen list generator; healthy mode, sync, CLI, app blocking (see git log).

Next, by the maintainer's order (2026-11-10): recommendation rules and sources in the policy; then the MCP server with RSS, YouTube, Reddit and Hacker News first, with tests (after the reuse research); then Zen and Android.

4. Settings schema 2: the fields and ops above, weakening rules, `computeView` honors `breakUntil`.
5. Healthy core: avoid lists, scoring, batch, budget; tests with fixed clocks.
6. Healthy mode in the extension: default mode, panel batch, ratings, end screen; e2e on fixtures.
7. Break mode, rising friction, time reclaimed.
8. Policy export and import in options and the app.
9. Sync core: Gist client with injected fetch, outbox merge, device flow; tests.
10. Sync in the extension: Sync tab, alarms, pending; e2e with `context.route`.
11. CLI (`packages/cli`, esbuild bundle): `validate`, `set`, `export --zen` behind a terminal barrier, `export --newpipe|--opml`, `lock-browsers` / `unlock-browsers`.
12. App: sync, healthy mode, policy screens.
13. Android Accessibility service and app rules. [device]
14. README, store copy, compliance test and Firefox data declaration for sync.
15. iPhone Screen Time. [Apple account; maintainer decision]
