# Algone: Algorithm Control

*   **Author:** Claude (Elephant), for JoshWright22
*   **Status:** Approved (by the Elephant, under the owner's delegation; see `reviews/`)
*   **Date:** 2026-10-31
*   **Store name:** Algone: Algorithm Control
*   **Repo:** https://github.com/JoshWright22/Algone (public, MIT)

--------------------------------------------------------------------------------

## Overview

Algone replaces algorithmic feeds with empty space, or with a feed the user
builds. It hides recommendation surfaces on popular websites, and keeps search,
subscriptions, direct links, and messages working. The deliverables are: one
browser extension for Chrome, Edge, Firefox, and Safari; a website; an optional
mobile browser app; store assets; a release pipeline; and owner-triggered agent
automation.

This document describes the planned design. Nothing in it is implemented yet.

The owner was away while this was built and told the author (the "Elephant", the
long-running AI session in the Elephant-Goldfish review process) to make every
design decision and record it. The owner's instructions are in
[`owner_brief.md`](owner_brief.md). The [Decision Register](#decision-register) lists them
and marks which came from the owner. The owner may give design feedback afterward.

**Owner-mandated scope (not open to reviewer cuts).** The brief fixes these: all
popular social sites, per-element toggles, four modes, six barriers, intent
features, a browser-only mobile route including an Expo browser app, every store,
nightly plus stable releases, owner-triggered agents, and a funding ledger. The
research suggests a narrower start would carry less risk. The owner chose the
full scope, so the design instead orders the work and states support tiers.

Algone works **in the browser only**. It never changes native apps, and no text
in the product may suggest otherwise.

**Starting point.** The repository holds research notes, a placeholder README, and
a placeholder icon. All code is new. "T3 Code" below refers to a separate app that
the owner named as the reference for visual style and release style only.

Terms: **MV3** is Manifest V3, the current browser extension format. A **flash** is
feed content painting briefly before it is hidden. **NFE** is News Feed Eradicator,
the largest open-source multi-site blocker (200,000 Chrome users, October 2026). **Unhook** is the largest YouTube-only blocker (1,000,000 Chrome users). An **overlay** is rule data
published after a release, which changes what the installed copy hides until the
next store release includes it.

## The Problem

Feed blockers exist, and for hiding alone most people are already served. The
research (`docs/research/`) shows where they fall short:

*   **Silent breakage.** Selectors go stale when sites change, and fixes reach
    users slowly. News Feed Eradicator's August and October 2026 fixes were not
    in its store build on October 31. This is the strongest finding.
*   **Over-blocking.** Blockers hide Groups, Messages, or the LinkedIn post box.
*   **Fragmented coverage.** People stack tools. Few combine per-element control,
    timed unlocks, schedules, and verifiable open source.
*   **Hiding leaves nothing to do.** Removing a feed does not help someone choose
    what to watch instead.
*   **Mobile.** Requests repeat for years. No platform allows editing native
    apps, so the honest mobile answer is browser-based.

The proposed solution is a data-driven rule engine with a fast repair path, four
per-site modes, six unlock barriers, and a small set of intent features. User
data stays on the device, and no account exists.

**What is not known.** No source measures uninstall rates by mechanism, or tests
a search-first or subscriptions-first view directly. Selectors for logged-in pages
cannot be checked without logged-in accounts, which the author did not have. See
[Verification Status](#verification-status).

## Goals

*   **G1. Default protection.** From install, on all 12 supported sites, every
    element classed as algorithmic is hidden. Rules bundled in the installed
    version do not flash on a full page load in the extension. Selectors added by
    a remote overlay can flash until the next store release bundles them. The
    mobile app does not make the no-flash promise.
*   **G2. Unhook-level control.** Each page element on each site has its own
    toggle. The popup shows the current site; the settings page shows all sites.
*   **G3. Four modes per site:** No feed, Random, Tuned, Custom.
*   **G4. Six unlock barriers,** where every unlock is a timed snooze, and
    weakening any setting requires a barrier pass.
*   **G5. Non-algorithmic things keep working:** search, subscriptions, direct
    links, messages. Tests assert this per site where a test can reach the page.
    Algone Browser has a stated exception for YouTube sign-in.
*   **G6. Repair path.** Three intervals: (a) a logged-out break is detected within
    24 hours of the site change, while the daily check runs and sites do not wall
    the runner; (b) the owner's review takes as long as it takes, so no number is
    promised; (c) installed extensions receive a merged fix within 24 hours of the
    merge, without a store review. Logged-in surfaces rely on the owner's weekly
    logged-in check or on user reports.
*   **G7. Compliance.** Rules are JSON data, never code. No `eval`. No
    obfuscation. Minimal permissions. No data collection by default.
*   **G8. Help people choose:** search-first home, subscriptions-first view,
    local queue, stop at the end, launch pause.
*   **G9. Owner can ship.** Store assets, checklists, reviewer notes, and
    releases exist. Workflows no-op cleanly when secrets are missing.
*   **G10. Stated limits.** The product, website, and listings say plainly what
    it cannot do: it cannot stop uninstalling, and it cannot change native apps.

## Non-Goals

*   Screen Time shielding, Android Accessibility features, overlays over other
    apps, or anything that acts on native apps (owner decision).
*   Native desktop apps. Desktop is served by the extension (D-26).
*   Pay to unlock, physical keys, message-only prompts, irreversible locks,
    server-held cooldowns, streak penalties (owner decision).
*   Covering ads in apps, patched apps, third-party video clients, uninstall
    locks. (The extension's owner-specified Tuned `ads` filter hides labeled ad
    items on websites, like any content blocker. It is compiled out of the mobile
    app. See D-22.)
*   Claiming to stop removal. Uninstalling always works, and Algone says so.
*   Accounts, sync servers, telemetry, or analytics.
*   All-website access, at install or as an optional permission.
*   Whole-site blocking, to-do lists, or a new tab page. Each would risk the
    store single-purpose rule.
*   Autonomous agents acting on strangers' input. Every agent run is
    owner-triggered.

## Open Questions

Everything below needs evidence that cannot be obtained in this build.

*   **Q1.** Will Apple and Google accept the Algone Browser app? Precedents exist
    (ScreenZen Minimal, UNDOOMED) but their review history is unknown.
*   **Q2.** Do Universal Links pull Safari users into the YouTube app? Needs a
    device.
*   **Q3.** Do target sites serve normal pages to GitHub Actions runners? The daily
    check must handle bot walls as "inconclusive", not as failure.
*   **Q4.** Does MV3 behave on Firefox for Android in practice? Mozilla's page
    recommends MV2 for Android, and Mozilla's 2024 post says MV3 is fully
    supported from 128. See D-18.
*   **Q6.** Does the launch pause avoid US 12468828? Claim 33 was not read in full,
    and no lawyer has reviewed the design. See the patent note.
*   **Q5.** Will Apple treat fetched selector data as changing features under
    Guideline 2.5.2? It is a gray area in the research. The Safari and iOS builds
    keep a `REMOTE_RULES` build flag, so remote rules can be switched off for an
    Apple build without other changes.

## Critical User Journeys (CUJs)

### CUJ 1: Install and see no feed

*   **Given**: A user installs Algone from a store.
*   **When**: They open youtube.com.
*   **Then**: The home feed never paints. The page shows clean empty space with
    the YouTube header and search intact. A welcome tab explains what was hidden,
    that uninstalling always works, and how to change things.

### CUJ 2: A deliberate unlock

*   **Given**: Default settings, on youtube.com, feed hidden.
*   **When**: The user clicks "Show for a while" in the popup.
*   **Then**: A page opens with a 30 second wait and a prominent "Never mind".
    The timer pauses while the tab is in the background. After the wait the user
    can show the site's hidden items for 10 minutes. A notice appears one minute
    before they hide again, and they hide again with no action.

### CUJ 3: Hide more, instantly

*   **Given**: Comments are visible on YouTube.
*   **When**: The user turns on "Hide comments" in the popup.
*   **Then**: Comments disappear at once with no barrier. Turning it back off
    requires a barrier pass.

### CUJ 4: Use a site for what it is for

*   **Given**: LinkedIn with default settings.
*   **When**: The user opens messages, searches, and opens a direct post link.
*   **Then**: All work normally. Only recommendation surfaces are hidden.

### CUJ 5: Choose something to watch

*   **Given**: The user enabled the search-first home and has saved videos.
*   **When**: They open YouTube.
*   **Then**: They see a search box, an optional "What do you want to watch?"
    line, and their queue. When a video ends, they see "Next in your queue" or
    "Done", and nothing autoplays.

### CUJ 6: A site changes its markup

*   **Given**: Reddit renames its logged-out feed container. (For logged-in
    surfaces such as the LinkedIn feed, the trigger is the owner's logged-in check
    or a user report instead.)
*   **When**: The daily check fails.
*   **Then**: An issue is opened with no model used, linking a sanitized structural
    snapshot. The owner reads it and adds `claude-fix`. A Claude run uses the
    snapshot, updates fixtures and selectors, and a PR opens. The owner merges.
    Rules publish after tests pass, and extensions pick them up within a day. The
    owner is mentioned when the issue closes.

### CUJ 7: iPhone user

*   **Given**: An iPhone user installs Algone for Safari.
*   **When**: They enable it and open youtube.com in Safari.
*   **Then**: The mobile site's feed is hidden. The setup page says plainly that
    Algone works in the browser, not inside the YouTube or Instagram apps, and
    guides them to open sites in Safari.

### CUJ 8: Android user on Chrome

*   **Given**: An Android user who uses Chrome, which has no extensions.
*   **When**: They install Algone Browser and tap YouTube.
*   **Then**: The mobile site loads with the same rules and settings. Links to
    sites Algone does not cover open in their normal browser.

## Technical Plan (Architecture)

### System layout

```text
packages/rules     JSON rules per site, validator, CSS compiler
packages/core      settings, barriers, snooze, queue, feeds, filters (pure TS)
packages/engine    page logic: applies a view to a document (no browser APIs)
apps/extension     Chrome, Edge, Firefox, Safari builds
apps/website       static site, privacy policy, published rules, ledger
apps/mobile        Algone Browser (Expo + react-native-webview)
store/             icons, screenshots, promo tiles, listings, checklists
.github/workflows  CI, releases, publishing, rules, agent automation
```

`packages/*` have no platform dependency. `packages/engine` talks to its host
through a small `PageHost` interface (receive the view, apply CSS, send a hint).
The extension and the mobile app reuse the same page logic. State writes and opening
URLs are not in this interface; they happen outside page code. See "Mobile: browser
only" for how CSS arrives there.

### How hiding works

Every selector of an element compiles to one CSS rule, gated by attributes on
`<html>`, so an invalid selector loses only itself. Hidden is the state before
any JavaScript has run.

```css
/* Algorithmic: hidden unless the user chose to show it */
html:not([data-algone-show~="youtube.home"]):not([data-algone-off~="youtube.home"])
  ytd-browse[page-subtype="home"] { display: none !important; }
/* Non-algorithmic: visible unless the user chose to hide it */
html[data-algone-hide~="youtube.comments"]:not([data-algone-off~="youtube.comments"])
  ytd-comments { display: none !important; }
/* A route-limited element also applies before the route attribute exists */
html:not([data-algone-show~="x.y"]):not([data-algone-off~="x.y"]):is([data-algone-route~="shorts"], :not([data-algone-route]))
  X { display: none !important; }
```

`data-algone-off` is written only by the overlay logic, and turns off bundled CSS
for an element whose selectors have been replaced.

Tokens are `<siteId>.<elementId>`. A rule's top-level `routes` map route names to
paths (`*` as a trailing wildcard only), optionally with required query values
(`{ "path": "/", "query": { "feed": "home" } }`), since sites such as Reddit put
feed choice in the query. `content.js` writes every matching route name to
`data-algone-route`. An element's optional `routes` lists the route names
it applies to; `null` means everywhere.

The build compiles bundled rules into one CSS file per site, declared under the
manifest's `css` key. Chrome documents that these are injected before any DOM is
constructed, which is the only documented way to avoid a flash.

The `content.js` script runs at `document_start`. It sets a route attribute from
`location` synchronously, reads settings asynchronously, and writes the
`show`/`hide` attribute tokens. Until that read finishes, algorithmic items stay
hidden and extras stay visible, which is the safe direction.

Client-side navigation is caught by a `MutationObserver` that compares
`location.href` on each batch, plus a 250 ms interval while the tab is visible.

**Failure direction.** If `content.js` fails, algorithmic items stay hidden.
Route-limited selectors stay hidden everywhere, which is why route-free selectors
are preferred. The user can still uninstall. Search and direct links are kept out
of rules by the `protected` tests.

The attributes on `<html>` reveal that the extension is present and could be
changed by page scripts. A site could detect Algone or undo hiding this way. This
is accepted; any CSS-based blocker is detectable.

### Rules

One JSON file per site (`packages/rules/sites/<site>.json`), checked against a
validator shared by build, CI, and the runtime.

```jsonc
{
  "id": "youtube",
  "name": "YouTube",
  "hosts": ["www.youtube.com", "m.youtube.com"],
  "routes": { "home": ["/"], "watch": ["/watch"], "shorts": ["/shorts/*"] },
  "elements": [
    { "id": "home", "label": "Home feed", "group": "Feeds",
      "class": "algorithmic", "feed": true,
      "selectors": ["ytd-browse[page-subtype=\"home\"]"], "routes": null },
    { "id": "comments", "label": "Comments", "group": "Watch page",
      "class": "extra", "selectors": ["ytd-comments#comments"] },
    { "id": "autoplay", "label": "Autoplay", "group": "Watch page",
      "class": "algorithmic", "selectors": [".ytp-autonav-toggle"],
      "effect": "stopAutoplay",
      "effectSelector": ".ytp-autonav-toggle-button[aria-checked=\"true\"]" }
  ],
  "slot": { "selector": "ytd-browse[page-subtype=\"home\"]", "fallback": "fixed" },
  "tuned": {
    "item": "ytd-rich-item-renderer",
    "title": "#video-title",
    "channel": "ytd-channel-name a",
    "kinds": { "shorts": ":has(a[href^=\"/shorts/\"])" }
  },
  "capture": { "routes": ["subscriptions"], "item": "ytd-rich-item-renderer",
               "title": "#video-title", "link": "a#thumbnail" },
  "protected": [
    { "path": "/results?search_query=test", "selector": "ytd-searchbox",
      "label": "Search" }
  ],
  "probes": [{ "path": "/", "live": true, "expect": ["home"] }],
  "walls": ["form[action*=\"consent\"]"],
  "player": { "selector": "video.html5-main-video", "adMarker": ".ad-showing" },
  "auxHosts": ["consent.youtube.com"],
  "subscriptionsPath": "/feed/subscriptions",
  "searchUrl": "/results?search_query=",
  "verified": { "date": "2026-10-31", "method": "fixture", "notes": "" }
}
```

Which fields can change after a release:

| Field | Published file | Why |
|---|---|---|
| element `selectors`, new hide-only elements, `retired`, `slot`, `tuned` selectors | Yes | Selector data |
| `routes` used only by hide elements | Yes | Sites move pages |
| `routes` used by effects, redirects, panels, or capture | No | Would widen navigation or capture |
| `effect`, `effectSelector`, `subscriptionsPath`, `searchUrl`, `capture`, `player`, `hosts`, `auxHosts` | No | Behavior and data access |
| `walls`, `probes`, `protected` | No | Only tests read these, from the repo |

*   `class: "algorithmic"` starts hidden. `class: "extra"` starts visible.
*   `feed: true` marks the main feed, which the mode controls.
*   `effect` names a behavior **packaged in the extension**, from a fixed list:
    `stopAutoplay` (clicks an on-state autoplay toggle off), `shortsToWatch`
    (replaces a `/shorts/ID` URL with `/watch?v=ID`, so direct links still work
    without the swipe feed), and `selectTab` (clicks a non-recommended tab once,
    used for X's Following tab). A rule cannot define a new behavior.
*   `player` scopes the stop-at-end panel. Sites without it never show that panel.
*   `auxHosts` lists consent and redirect hosts that Algone Browser must allow.
*   `protected` lists search, subscription, message, and post-box UI that must stay
    visible. Tests fail if a rule hides any of it.
*   `probes` lists pages the live check opens, and which elements must exist there.
*   `walls` lists selectors that mean a login, consent, or bot page was served.
*   Rules hold selectors, paths, labels, and enum values. There are no scripts,
    no step lists, no regular expressions, and no parent-climbing instructions.
    This keeps them on the safe side of the Chrome rule against "an interpreter
    to run complex commands fetched from a remote source".

**Selector practice.** Prefer tag names, `href`, `aria-*`, and `:has()`. Avoid
hashed classes and position. Keep old selectors alongside new ones. A selector
must never match search, subscription, or message UI. Tests check this.

**Supported sites (12).** YouTube, Reddit, X, Instagram, Facebook, LinkedIn,
TikTok, Threads, Bluesky, Twitch, Pinterest, Substack. Hosts are fixed in each
manifest, so a remote rule cannot add a host.

### Rule updates

```text
PR merged to main -> CI validates, tests in Chromium -> Pages publishes
https://joshwright22.github.io/Algone/rules/v1/rules.json
(one file: { schema, rev, sites }, built from sites/*.json)
        |
extension alarm every 24h and at browser start (background context)
  fetch(credentials: "omit") -> size limit -> JSON parse -> validator
        |  invalid: discard, keep last good, record reason
        v  valid and rev is newer
storage.local "rulesOverlay"
        |
content.js sees an overlay -> background calls scripting.insertCSS({ css })
                           -> on success, content.js writes data-algone-off tokens
```

**The overlay is narrower than a bundled rule.** The table under "Rules" is the
authoritative list, and `validateOverlay` enforces it. Because effect and capture
routes are bundled, a remote file can never cause a click, a navigation, or new data
capture.

The published file always carries that allowed subset for every site, so it is
the whole current state, not a patch. `rev` is one integer for the whole file: the
commit timestamp of the `main` commit being published, so it always rises, even on
a revert, and needs no git history. The client compares each element to its bundled
copy; only differences form the overlay, so a store update shrinks the overlay
without help.

**Fixing a selector.** Manifest CSS cannot be withdrawn, but its gate can. For an
element with changed selectors, the background context first inserts overlay CSS
for the replacements, using the `show`/`hide` gates but no `off` gate, so user
toggles and snoozes still work. Only after `insertCSS` succeeds does `content.js` add the
element to `data-algone-off`, which turns the old bundled selectors off. If
insertion fails, the old rule stays on, so the failure leaves things hidden. A
`retired` element gets the `off` token with no replacement. This is how a repair
undoes over-blocking, for both classes of element.

**Clearing.** Each build embeds its own `rev`. When that is equal to or higher than
the stored overlay's `rev`, the overlay is deleted and the fast path returns.

*   **File checks** reject the whole file: over 512 KB, not JSON, `rev` not higher
    than `max(BUILD_REV, lastAcceptedRev)`, or a schema the client does not know. The file sits under
    `rules/v1/`, and a breaking change moves to `rules/v2/` with v1 left published.
*   **Entry checks** reject one site or element and keep its last good value, so
    one bad entry cannot stop updates for every site. Unknown sites, keys, and
    `kinds` are ignored, not errors, so adding a 13th site does not break older
    clients.
*   **Selector checks** reject: `{`, `}`, `<`, `@`, `url(`, a backslash, `/*`, a
    top-level comma (each selector is its own array entry), unbalanced quotes or
    brackets, over 500 characters, and bare broad selectors (`*`, `html`, `body`,
    `main`, `:root`, `div`). Paths must start with `/`.
*   The fetch URL is a constant in the code. Requests carry no identifiers.
    GitHub sees an IP address and User-Agent, as with any web request, and the
    privacy policy says so.
*   If the daily alarm did not run (iOS limits background work), `content.js` asks
    for a check when the last one is over 26 hours old.
*   `https://joshwright22.github.io` needs no host permission because Pages sends
    `Access-Control-Allow-Origin: *`.
*   **Worst case for the rules file:** an attacker who can publish it can hide parts
    of the 12 sites, or stop some hiding. They cannot run code, click, navigate,
    send data, or add hosts. A compromised **release** is much worse, since it ships
    code on those sites; see [Risks and Mitigations](#risks-and-mitigations). "Use
    bundled rules" in settings deletes the overlay and turns rule updates off. It
    needs a barrier pass like any weakening, because dropping an overlay can bring a
    feed back. The longest possible wait is a lock's 2 minute escape, and uninstalling
    always works.
*   Each release bundles the latest rules, so a fresh install needs no fetch.
*   Users can turn off rule updates. The setting is on by default and disclosed.

`scripting.insertCSS` is used for overlays instead of a `<style>` element because
page Content Security Policies can block inline styles in some browsers. It only
runs when an overlay exists. While one exists, each page load takes the slower
path through storage and the background context, which is the same kind of path
that gives NFE its flash. Overlay selectors can therefore flash until the next
release bundles them. To keep that window short, `docs/release.md` says to ship a
store release at the next opportunity after any overlay is published.

### State model

`storage.local` holds `settings`, `runtime` (snoozes, barrier counters, local
stats), `queue`, `feeds`, and `rulesOverlay`. All logic on these is pure and lives
in `packages/core`.

**One writer.** Only the background context writes these. Pages send it small
commands (patches), which it applies one at a time, so concurrent writes cannot
lose updates. A pending change is stored as a patch, so tightening made while a
barrier page is open is not overwritten.

```ts
type BarrierConfig =
  | { type: "pause"; seconds: number }
  | { type: "typing"; length: number }
  | { type: "daily"; limit: number; step: "pause" | "typing" }
  | { type: "schedule"; windows: Array<{ days: number[]; start: string; end: string }> }
  | { type: "locked"; until: number; escapeUsed: boolean; after: BarrierConfig }
  | { type: "partner"; salt: string; hash: string; iterations: number;
      recoveryAt: number | null };

interface TunedFilters {
  blockKeywords: string[]; blockChannels: string[]; blockTopics: string[];
  allowTopics: string[];  // when non-empty, only matching items show
  hideKinds: string[];    // e.g. "shorts", "ads", "likelyAi"
}

interface Settings {
  schema: 1;
  sites: Record<SiteId, {
    enabled: boolean;
    mode: "nofeed" | "random" | "tuned" | "custom";
    elements: Record<ElementId, boolean>;  // overrides; true = hidden
    tuned: TunedFilters;
    intent: { searchHome: boolean; prompt: boolean; subsFirst: boolean;
              launchPause: boolean };
  }>;
  barrier: BarrierConfig;
  snoozeMinutes: number;       // default 10, range 1 to 60
  stopAtEnd: boolean;          // default true
  ruleUpdates: boolean;        // default true
  webSources: { wikipedia: boolean };  // default false
  theme: "system" | "dark" | "light";
  queueSoftCap: number;        // default 5
  customRanking: "newest" | "fair" | "oldestUnseen";
}
```

`computeView(settings, runtime, rules, site, now)` returns
`{ show, hide, mode, panel, effects, tunedFilters }`. This one function decides
what a page shows, on every platform.

### Modes

| Mode | Feed | Mode content | Barrier to enter |
|---|---|---|---|
| No feed (default) | Hidden | None: clean empty space | None, it is the strongest |
| Random | Hidden | Quote, fact, poem, art, or puzzle | None (owner exempted it) |
| Tuned | Shown, filtered item by item | None | Yes |
| Custom | Hidden | The user's own feed | Yes |

A **feed panel** holds, top to bottom, the search box (if search-first is on) and
then the mode's content. If both are empty there is no feed panel. A launch pause,
while showing, replaces the feed panel. Two other small surfaces exist: the
end-of-video panel over the player, and the save button.

Moving from Tuned or Custom to No feed or Random is instant. Moving between Tuned
and Custom requires a barrier pass.

**Panels are extension iframes.** A panel is an `<iframe>` of the extension's
`panel.html`, placed before the rule's `slot` element, or fixed under the site
header when the slot is missing. The frame is on the extension's origin, so page
scripts cannot read the queue, Custom sources, or captured items, or click its
buttons. It loads bundled fonts and art without page CSP limits, and page CSS
cannot reach it. Its cost is a `web_accessible_resources` entry limited to the 12
hosts, which sites can probe. That is accepted because the `<html>` attributes
already reveal the extension. Panels load data from the background context by
message, and the page sees only a frame.

**Random.** Bundled offline: 100+ public-domain quotes, facts, short poems, and
public-domain art, plus generated puzzles (arithmetic, word scramble, sequence).
Original or public-domain only, with attribution. Wikipedia's random summary is
opt-in and asks for consent first, naming what it sends. It requests
`optional_host_permissions` for `https://en.wikipedia.org/*` only.

**Tuned.** The engine observes feed items using the rule's `item`, `title`, and
`channel` selectors. An item is hidden if it matches a blocked keyword, topic, or
channel, or a kind (`shorts`, `ads`, `likelyAi`), or fails an allow-list when one
is set. Topics are bundled keyword lists. "Likely AI" means text matches for
explicit disclosure phrases and tags; the UI always labels it "likely AI" and
says it will miss some and wrongly catch some. Processing is local and nothing is
sent to a model.

Sites recycle item nodes and fill titles late, so a check is keyed by the item's
current title and link, and is redone when they change. Unchecked items are kept
invisible by a CSS gate for up to one second, then shown if no title has arrived,
so filtered items do not flash and nothing stays hidden forever. Hiding many items
in a virtualized list can leave gaps or stop loading; this is an accepted limit,
and the UI notes it.

**Custom.** A local feed built from three source types:

1.  **RSS and Atom.** YouTube channel feeds, Reddit `.rss`, Bluesky profile RSS,
    Substack feeds. Fetched by the background context with `credentials: "omit"`.
    Any other feed works only if its server allows cross-origin reads. Otherwise
    the UI says so plainly, since Algone will not ask for all-sites access.
2.  **Chosen creators.** "Follow in Algone" in the popup saves the current
    profile. If the page declares a feed link, it becomes an RSS source. If not
    (Instagram, TikTok, X, LinkedIn, Facebook have no public feed), it is a direct
    link tile.
3.  **Capture.** Items visible on a subscriptions or following page the user
    opened are stored locally (title, link, source, time seen) using the rule's
    bundled-only `capture` selectors. This gives feed-less sites a real but partial view, and
    the UI says it only knows what the user's browser has shown.

Ranking is selectable: newest first (default), fair (round robin by source),
oldest unseen. All local. Items are rendered with `textContent`, and links must
be `https:`. The cache keeps 500 items. Refresh runs on a 60 minute alarm while a
site uses Custom, with at most 3 fetches at a time, a 2 MB limit per feed, and
exponential backoff for failing sources. Feeds are parsed by a small text parser in
`packages/core`, because service workers have no `DOMParser`. Custom-domain Substacks
are outside the fixed hosts, so they work only if they allow cross-origin reads.

### Unlock barriers

Every barrier produces the same result, a **pass**, which then does one thing:
applies a pending change, or starts a snooze. Barrier pages run in a full tab
(`unlock.html`), not in the popup, because popups close on blur.

| Barrier | Pass condition | Notes |
|---|---|---|
| Pause and choose (default) | Wait 30 s (range 10 to 120) | "Never mind" is the primary button from the first second. Timer pauses when the tab loses focus |
| Typing challenge | Retype random text, default 60 characters, range 20 to 200 | No paste. Shows character progress |
| Daily unlock limit | N per day (default 3), then wait for local midnight | Layered on pause or typing |
| Scheduled unlock | Current time is in a set window, plus a 10 s pause | Requires at least one weekly window. Outside a window nothing unlocks |
| Locked until | Chosen time has passed, then the `after` barrier applies (default pause) | Maximum 7 days. One rationed escape per lock, after a 2 minute wait |
| Partner password | Correct password | PBKDF2-SHA-256, 600,000 iterations (100,000 in Algone Browser, using `@noble/hashes` async, since Hermes has no WebCrypto; the count is stored with the hash), random salt, stored locally. Recovery: "Forgot" starts a 24 hour wait, then resets to pause |

**Weakening rule.** `isWeakening(before, after)` in `packages/core` decides, and
it fails closed: a change is **tightening** only if it is on this list, and any
other change requires a barrier pass. Tightening: hiding an element, enabling a site,
moving to No feed or Random from any mode, turning on an intent feature, lowering
the snooze length, turning on stop at the end, adding a Tuned block filter or kind,
starting an allow-list from empty, removing an allow-list entry, and making a
barrier strictly stricter within its type, and turning rule updates on. Adding to a
non-empty allow-list widens what shows, so it needs a pass. **Neutral and instant:**
theme, queue edits, Custom sources and ranking. A pending change is stored while the
barrier page runs and applied only on a pass.

The `autoplay` element and `stopAtEnd` are separate: the element hides the control
and applies `stopAutoplay`, and `stopAtEnd` adds the end-of-video panel.

**Snooze.** `runtime.snoozes[site] = { until }`. Content scripts set their own timer
and listen for storage changes, so expiry needs no background wake-up. Because
timers stop in frozen or sleeping pages, the state is also rechecked on
`visibilitychange`, `pageshow`, and focus. A notice appears before expiry, at 60
seconds or half the snooze length if that is shorter, and the feed fades out.

**Known limits.** Barriers are precommitment, not security. The welcome page and
settings say: "You can always uninstall Algone. These barriers are there to
interrupt autopilot, not to trap you." Changing the system clock, using another
browser, or a private window where the extension is not allowed also bypasses
them, and the settings page says so. A broken barrier page must still show a working "Never
mind", and uninstall stays available. (NFE #561 shows the cost of a stuck
unlock screen.)

**Local stats.** Unlocks started, dismissed, and completed are counted locally and
shown in settings. There is no streak or penalty.

### Intent features

*   **Search-first home** (per site, off by default, offered in onboarding). The
    default is off because the owner specified clean empty space for No feed. On
    home routes the panel shows a search box posting to `searchUrl`, plus the
    queue.
*   **Intent prompt** (optional, requires search-first). "What do you want to
    watch?" A skippable line shown once per tab session, never repeated.
*   **Subscriptions-first view.** Home routes redirect to `subscriptionsPath` on
    supported sites, off by default.
*   **Queue.** A local list. Filled by a small "Save for later" button on watch
    pages, the popup, and the mobile share sheet. A soft cap (default 5) shows only
    the first five items, with "Show all" behind one click, so that the top of the
    list is a real choice. It never blocks saving.
*   **Stop at the end.** On by default, on sites with a `player` definition. When
    the main player's video ends, and the `adMarker` does not match, a panel offers "Next
    in your queue" or "Done". Autoplay itself is handled by the separate `autoplay`
    element, hidden by default, which applies `stopAutoplay`.
*   **Launch pause** (per site, off by default). A brief panel on opening a site:
    "Leave" is one tap and is the primary action; "Search for something specific"
    and "Continue" are alternatives.

**Patent design note (US 12468828, RiedelWtf GmbH).** one sec is a mobile app with
a launch pause, and this patent covers intervening before access to a media
service. The research flagged it. Claims 1, 14, and 32 were read in full on Google
Patents on 2026-10-31. Claim 33, the fourth independent claim, could not be
extracted automatically; its opening text matches claim 14 and is assumed to share
its limits. Claims 1 and 32 require storing
timestamps of access, closing, and intervention completion, and deciding by a
time interval of up to 10 seconds and 5 minutes. Claims 14 and 33 require
OS-level intervention with a 10 second interval. To stay distinct, Algone's launch
pause:

*   stores no timestamps of access, closing, or pause completion;
*   decides with a yes/no flag held in that tab's `sessionStorage`, so it shows
    once per tab session, with no time comparison of any kind;
*   in the extension, runs inside a web page in the browser; in Algone Browser, runs
    on a screen inside the app when the user taps a site. Neither intercepts OS app
    launches.

This is an engineering reading, not legal advice, and the claims were not reviewed
by a lawyer (Q6). The owner should ask counsel before relying on it.

### Extension surfaces

*   **Popup.** Current site, mode, element toggles grouped as in the rule, "Show
    for a while", save to queue, follow creator. On an unsupported page it says
    so and links to settings.
*   **Settings page.** All sites, modes, Tuned filters, Custom sources, barrier,
    queue, stats, privacy, rules status (bundled revision, overlay revision, last
    check, last rejection reason), "Report a broken site" (opens a prefilled
    GitHub issue; the user sees and submits it themselves; nothing is sent
    automatically).
*   **Lifecycle.** Manifest scripts do not reach tabs already open at install, so
    `onInstalled` injects the content script and CSS into open tabs on supported
    hosts. After an update, an old script detects its dead context (`runtime.id`
    undefined) and stops. The new one is injected the same way.
*   **Access checks.** Safari, Firefox, and Chrome all let users withhold site
    access. The welcome page and popup check `permissions.contains` for each host,
    show which sites are not active, and give a button or steps to grant access.
*   **Welcome page** on install. **Unlock page.** Uninstall page set with
    `runtime.setUninstallURL`: a static page with no parameters, linking to a
    prefilled GitHub issue form for those willing to say why they left.
*   Tip link in Chrome, Firefox, and Edge settings only. Absent from Safari and
    Algone Browser builds (`SHOW_TIPS=false`). No feature is ever gated by tips.

### Permissions

| Permission | Why |
|---|---|
| `storage` | Settings, queue, rules overlay |
| `alarms` | Daily rule check, hourly Custom refresh |
| `scripting` | Insert the rules overlay stylesheet |
| `host_permissions` and content script matches for the 12 sites | Hide elements on them; `insertCSS` needs host permission |
| Optional `https://en.wikipedia.org/*` | Opt-in Random source |

No `<all_urls>`, no `tabs`, no `webRequest`, no `declarativeNetRequest`, no
`management`, no `history`. The popup finds the current site by messaging the
active tab's content script; no reply means an unsupported page. Firefox
declares `data_collection_permissions: { required: ["none"] }`. Opt-in Wikipedia
sends only a request for a random article, which is not user data collection, and
the consent dialog names it regardless.

### Per-browser builds

One codebase, compiled by a Node script using esbuild, no minification, so
reviewers read what ran. Output `dist/{chrome,edge,firefox,safari}`.

| Target | Background | Specifics |
|---|---|---|
| Chrome | `service_worker` | `minimum_chrome_version: 116` |
| Edge | `service_worker` | Same as Chrome |
| Firefox (desktop and Android) | `background.scripts` | `gecko.id`, `strict_min_version: 140`, `gecko_android.strict_min_version: 142`, data collection `none` |
| Safari (macOS, iOS, iPadOS) | `background.scripts`, `persistent: false` | No tip link. Packaged by `safari-web-extension-packager` or the App Store Connect web packager |

### Website

Static HTML from a small Node build, on GitHub Pages at
`https://joshwright22.github.io/Algone/`. Pages: home, install, how it works, site
status, privacy policy, support, funding ledger, uninstall survey. Also serves
`rules/v1/rules.json`. No analytics, no cookies, no third-party fonts or scripts.

### Visual direction

Dark first, with a light theme. Translucent borders `#ffffff14` (dark), 12 px
radius, violet accent `oklch(.68 .17 264)`, Inter with system fallback plus system
monospace. Inter is bundled as a font file, never fetched. The brand is original:
the mark is a rounded square containing an "A" whose crossbar is a struck-out feed
line. Not derived from T3 assets.

### Mobile: browser only

**Owner decision: on phones Algone works through the browser.** Surfaces:

| Platform | Route | Role |
|---|---|---|
| iPhone, iPad | Safari Web Extension (iOS 15.4+) | **Primary iPhone path** |
| Android | Firefox for Android extension | Small reach: about 0.75% of worldwide mobile browsing (StatCounter, August 2026) |
| Android, iOS | Algone Browser (Expo) | **Main Android path**, optional on iOS |

**Separation.** The Safari extension ships in its own small App Store app ("Algone
for Safari"), built from the extension output with the Safari packager. It has its
own bundle ID, listing, and review, and its build does not depend on the Expo app.
The two share only source packages. If Apple rejects Algone Browser, Safari users
are unaffected.

**Algone Browser.** An Expo app with `react-native-webview`. It loads mobile
websites for the 12 supported sites, using the same rules and the same barrier,
queue, and settings logic from `packages/core`, running natively in React Native.
Settings are local (AsyncStorage). Rules are bundled, plus the same validated daily
fetch. Features unique to the app: site tiles, a native home with search and queue,
and share-sheet receipt.

**Trust boundary.** Injected scripts run in the page's main world, where page
scripts can forge bridge messages. So all state and all barrier logic live on the
native side. The page script receives only the compiled CSS and the computed
view, and contains no queue, sources, or passwords. It can send only three hints:
`route`, `videoEnded`, and `injectionOk`. Native code checks the sender's URL against
the allow-list, treats each as an untrusted hint, and never writes state or opens a
URL because of one. Barrier screens, the queue, Custom feeds, and search-first are
native screens, not page panels. Random is also native. `algone://save?url=` accepts
`https:` URLs only and stores them as inert text until tapped.

**CSS in the app.** A web view has no manifest CSS or `insertCSS`. The injected
script applies the compiled CSS through `document.adoptedStyleSheets`, falling back
to a `<style>` element. This runs before page scripts but after the document
starts, so a flash is possible, and a page CSP could block the fallback. **If the
injection fails, the app fails open:** the site shows unfiltered, and a banner in
the app's native toolbar says filtering is not active. G1's no-flash promise does
not apply here.

Scoped limits, each a decision made because of store rules (researched
2026-10-31; re-read before submitting):

| Rule | Source wording | Consequence for Algone Browser |
|---|---|---|
| Apple 2.5.6 | Browsers "must use the appropriate WebKit framework" | Satisfied: WKWebView through `react-native-webview` |
| Apple 4.2 | Must go "beyond a repackaged website" | Own home, queue, barriers, feed builder. Not a wrapper of one site. Rejection risk remains |
| Apple 5.2.2 | Must be "specifically permitted" under a third party's terms; "Authorization must be provided upon request" | **Unresolved real risk.** Precedents exist; approval is not assured. This is why Safari stays primary |
| Apple 5.2.3 | No saving or downloading media | No download, no background play, no picture-in-picture feature added |
| Apple 2.5.2 | Apps may not download code that "introduces or changes features" | Rules are selector data, not code, but this is a gray area (Q5). `REMOTE_RULES=false` is available for Apple builds; the Safari review notes disclose the fetch |
| Apple 4.1(c) | No other developer's icon or brand in the app's icon or name | Site tiles use plain text labels, no logos |
| Apple age rating | "Unrestricted web access" is a 16+ trigger | Answer the questionnaire honestly. Because navigation is allow-listed the answer may differ, so the owner confirms at submission; assume 16+ |
| Play Spam | No apps whose primary purpose is to "provide a webview of a website without permission from the website owner" | **Real rejection risk.** The app's purpose is a multi-site filtered browser with its own features. Fallback: signed APK on GitHub Releases |
| Play Device and Network Abuse | Bars "a webview with added JavaScript Interface that loads untrusted web content" | `react-native-webview` adds such an interface, so the main frame is limited to `https:` on the 12 sites' hosts plus `auxHosts`. No free address bar. Other links go to the system browser. Scripts are injected in the main frame only. This reduces but does not remove the risk, since these sites carry user content |
| Play Device and Network Abuse | Bars apps that "block or interfere with another app displaying ads" and uses that breach a service's terms | **The `ads` filter is compiled out of the mobile app.** The extension keeps it as an owner-specified Tuned filter |
| Play accounts | Developer account needs government ID; new personal accounts may need a 12-tester, 14-day closed test (search snippet) | Owner action, in the checklist |
| Android developer verification | Expands globally in 2027 for sideloaded apps | APK route will need registration or the advanced flow; recorded in the checklist |

Other limits:

*   Google blocks sign-in inside embedded web views, so **YouTube in Algone Browser
    should be expected to work logged out**, and YouTube subscriptions (G5) may not
    be reachable there. Custom mode's RSS feeds give a partial substitute: YouTube's
    feeds are undocumented, hold only 10 to 15 recent items, and have been reported
    to fail at times. Other sites may also challenge embedded logins. Store text
    must not promise otherwise.
*   The app cannot affect the YouTube, Instagram, or TikTok apps. Links may open
    those apps if the OS routes them. Setup copy guides users to use the browser.
*   Android Chrome has no extensions, so Chrome users need Algone Browser.
*   Third-party sign-in pages leave the allow-list and open in the system browser, so
    social logins may not complete. Password logins on the site itself should work.
*   **APK signing.** With `ANDROID_KEYSTORE_BASE64` set, CI signs a stable release
    APK. Without it, the APK is debug-signed, labeled a testing build, and cannot
    update across releases. The app has no self-update; users install new APKs from
    GitHub Releases.
*   iOS share sheet needs a native target through `expo-share-intent`, unverified
    without a Mac. An `algone://save?url=` deep link is the fallback, with Android
    share handled by the same package.

### Store and release pipeline

**Versions.** `package.json` holds `0.1.0`. Nightly tag:
`v0.1.0-nightly.YYYYMMDD.N`, a prerelease titled `Algone Nightly 0.1.0-nightly...
(shortsha)`. Browser manifests require numeric versions, so nightlies use
`0.1.0.N` where N is a monotonic run count. Stable tag `vX.Y.Z` is the latest
release. A manual stable run promotes the commit the latest nightly shipped, so
stable only ships what nightly users ran, as T3 Code does.

**Assets per release:** `algone-chrome.zip`, `algone-edge.zip`,
`algone-firefox.zip` (unsigned; a note says Firefox needs a signed build),
`algone-safari-source.zip`, `algone-source.zip`, `algone-browser-android.apk`
(built on the runner), `rules.json`, `SHA256SUMS`.

Nightly runs daily, skipped if no commit landed since the last nightly.

**Repo protections** (applied last, through the API, with admin bypass for the
owner): a ruleset requires a PR for `main`, and a ruleset blocks creating `v*` tags
except nightlies, so an agent cannot publish. The `release` environment requires
the owner's approval.

**Who creates a stable tag.** The owner runs `release.yml` with channel `stable`. Its
tag job runs in the `release` environment, so it waits for the owner's approval, and
then creates the tag with `GITHUB_TOKEN`. The GitHub Actions app is a bypass actor on
the tag ruleset. This does not open a path for agents: the agent job has
`contents: read` and pushes with the Claude app's token, which is not a bypass actor.
A tag made with `GITHUB_TOKEN` starts no workflows, so `release.yml` starts the store
workflows with `gh workflow run`.

**Store publishing** is a separate workflow per store, run by that dispatch or
manually, in the `release` environment, limited to `main` and `v*` tags. Each checks for
its secrets first and exits successfully with a notice when they are missing.
First submissions are manual (see `store/`).

*   Chrome Web Store: API v2 at `chromewebstore.googleapis.com` (v1 ended
    2026-10-15), with service account.
*   Firefox: `web-ext sign --channel=listed`, uploading source.
*   Edge: Add-ons REST API v1.1.
*   Safari: `safari-web-extension-packager` plus fastlane on `macos-latest`. No-Mac
    route documented: App Store Connect web packager.
*   Google Play and App Store (Algone Browser): EAS or Gradle upload, gated the same
    way.

### Automation

**Decisions from the owner.** Authenticate with the owner's Claude subscription
first. Every model run is owner-triggered. Public issues never auto-run.

```text
schedule (daily, no model)   issue opened by anyone
    Playwright site check          |
          | fails                  v
          v                   owner reads it
   issue labeled site-change       |
          +----------+-------------+
                     v
       owner adds label claude-fix (gate: sender == JoshWright22)
                     v
       gate job: credential present? under the daily cap for this priority?
                     v
       Claude action (pinned SHA, env scrub, no WebFetch/WebSearch)
       reads the sanitized snapshot from the failing check
                     v
       pushes claude/ branch; PR opened with the action's app token
                     v
       owner reviews and merges -> CI -> rules publish
                     v
       issue closes -> github-actions[bot] mentions owner, optional ntfy
```

This **supersedes** the initial brief's "publish rule fixes when tests pass"
without review: the owner's later decision has them merge every PR. What remains
automatic is publishing once a rules change on `main` has passed tests.

*   **Who it serves.** `claude-fix` runs on any issue the owner labels. The labels
    `site-change`, `bug`, and others set its priority. A `site-change` issue from
    the daily check has a snapshot. A user-reported issue has none, so the agent
    works from the issue and fixtures. For logged-in breakage, the owner commits a
    logged-in snapshot to `tests/fixtures/snapshots/<site>/` first.
*   **Auth.** `claude_code_oauth_token` from `CLAUDE_CODE_OAUTH_TOKEN` by default,
    `anthropic_api_key` as the alternative. If both are present, the API key wins
    (documented precedence). With neither, the gate exits with a notice.
*   **Terms.** Subscription use is supported for owner-run CI. An always-on bot
    triggered by strangers is unverified against Anthropic's terms, so it is not
    built.
*   **Caps.** `AGENT_MAX_RUNS_PER_DAY` (default 3) with `--max-turns 20`. Priority
    is enforced by reserving slots: `site-change` can use the full cap, `bug` the
    cap minus 1, others the cap minus 2. A run over its limit comments and stops.
*   **Hardening.** Action pinned to `d535f5172dec02b204866b393d6b20b9b2aaf98d`
    (v1.0.266). `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB: "1"`.
    `include_comments_by_actor: JoshWright22`. Tools limited; `WebFetch` and
    `WebSearch` denied. No `pull_request_target`. Store secrets exist only in
    environments, and no agent job uses those environments.
*   **Important gap.** The label check covers who started the run, not whose text
    Claude reads. The owner must read the issue first. Because a stranger can edit an
    issue after that, the gate refuses to run if anyone but the owner has edited the
    body or title since creation. The owner can repost the text in a new issue. Page content from a failed
    site check is untrusted too, so it is summarized in the issue by selector and
    site name only, not as raw HTML.
*   **Daily check.** Cron plus Playwright on live sites, logged out. Three outcomes
    per site, for each probe: **inconclusive** if the page failed to load or a `walls`
    selector matches; **broken** if a normal page loaded and an expected element
    matches nothing, or a `protected` selector is hidden with the extension active;
    otherwise **pass**. An expected element is checked in two browser contexts: it
    must exist without the extension, and be invisible with it, so the check proves
    hiding works. Probes run at desktop and mobile viewports (with a mobile User-Agent,
    since `m.` sites are the Safari and Algone Browser paths). `broken` opens an
    issue, deduplicated by the `site-change` label and bot author, so a stranger's
    same-titled issue cannot suppress it. Seven `inconclusive` days in a row mark the
    site **walled** on the status page, and open one `site-walled` issue on that
    transition only, so a wall is not silent and does not repeat. A walled site
    relies on the logged-in check until a probe passes. All 12 sites run daily. Actions schedules stop after 60 days without repo
    activity, and runners may be blocked. Each run writes `status.json` to the
    `site-status` branch, which no ruleset protects and which holds no code. The site
    status page reads that file in the visitor's browser, so a stopped schedule
    shows as an old date without a redeploy. `docs/setup.md` explains how to
    re-enable it.
*   **Sanitized snapshot.** A selector repair needs the current page structure, and
    the agent has no web tools. On a `broken` result the check saves an artifact
    holding tag names and allow-listed attributes (`id`, `class`, `role`,
    `data-testid`, `page-subtype`, `aria-*` names, and `href` paths). All text and
    `aria-*` values are dropped. Values are limited to `[A-Za-z0-9_-]`, and any value
    with four or more digits or over 40 characters becomes `<id>`, including `href`
    segments. The `claude-fix` workflow downloads it into the checkout. This narrows
    the injection channel, which is mainly page text, but does not close it.
    Logged-in snapshots are stricter, since they show other people's names: `id` is
    dropped and `href` keeps only its first path segment.
*   **Logged-in check.** `npm run check:logged-in` runs the same assertions in a
    browser profile the owner signs in to, on the owner's machine, and never in CI.
    It is the only automated detector for logged-in feeds. It writes snapshots to a
    local folder, applying the same sanitizing, then `npm run snapshot:scan -- <your
    handles>` fails if a handle or email remains. Only then does the owner commit
    them into `tests/fixtures`. `docs/setup.md` asks for it weekly. Agents cannot
    run it.
*   **Publishing guard.** `pages.yml` always deploys the website. For rules, it
    fetches the currently published file and runs logged-out probes only for sites
    this publish changes. A changed site that regresses to `broken` keeps its
    previous entry, and a notice is posted. Other sites publish normally, so a site
    that is already broken cannot block a repair or a revert. There is no staged
    rollout, and a rollback takes up to 24 hours to reach clients (see Risks).
*   **Alerts.** The daily check job itself writes `@JoshWright22` into any issue it
    opens, because events caused by `GITHUB_TOKEN` do not start other workflows.
    When any issue closes, `notify-owner.yml` comments the same mention from
    `github-actions[bot]`. Both call the ntfy push service if `NTFY_TOPIC` exists. Delivery has not
    been tested, and `docs/setup.md` says so.

### Funding

*   Tips through GitHub Sponsors or Ko-fi help pay for maintenance, mainly the
    Claude usage behind rule repairs. Features are never gated.
*   `ledger/entries.json` is a public ledger of aggregate donations and costs,
    edited by the owner, validated in CI, shown on the website. No donor names.
*   No documented route moves donations to Anthropic automatically. A person pays
    and the ledger records it. The product must not claim otherwise.
*   Auto-reload stays off. Donors are not sold Claude access or priority.
*   `docs/funding.md` is the step-by-step tutorial.

## Alternatives Considered

### Fork News Feed Eradicator

*   **Pros**: Existing site data and a clean per-site schema.
*   **Cons**: AGPL-3.0 conflicts with the owner's MIT choice. Its flash path needs
    replacing.
*   **Reason for Rejection**: License. The owner chose MIT. No selectors are copied
    from AGPL or unlicensed projects. Selectors come from live inspection where the
    page is reachable, and from MIT projects or site knowledge otherwise, labeled
    in `verified`.

### Fork or build on an MIT project

*   **Pros**: Escape the Algorithm, Hushdoom, LinkOff (LinkedIn), and Control Panel
    for Twitter are MIT and cover logged-in surfaces this build cannot inspect.
*   **Cons**: None has per-element toggles across 12 sites, modes, or barriers.
    Forking inherits a different data model, and each is a much smaller base than
    the work here.
*   **Reason for Rejection**: As a fork, data model mismatch. **They are used as
    sources instead:** D-29 allows reading their selectors for logged-in surfaces,
    with credit in `THIRD_PARTY_NOTICES.md`.

### Use or contribute to an existing blocker

*   **Pros**: Research's cheapest test: run nightly checks on existing tools, or
    contribute to NFE, before building.
*   **Cons**: NFE's maintainer takes few features, and its AGPL license conflicts with
    MIT. Checks on other tools would not produce the barriers, modes, or queue the
    brief requires.
*   **Reason for Rejection**: Neither route can deliver the required scope.

### Signed rules file

*   **Pros**: Protects against a compromised Pages deployment.
*   **Cons**: The signing key must live somewhere CI can use it, and anyone who can
    compromise the repo can likely use that key. It adds key rotation and a
    bricking risk if a key is lost.
*   **Reason for Rejection**: A signature adds little beyond the fixed host while the
    narrowed schema limits damage. Revisit if user count passes 100,000, or if rules
    ever gain fields beyond selectors.

### Other mobile routes (Capacitor, native Swift and Kotlin)

*   **Pros**: Capacitor shares web code. Native gives full control of web views.
*   **Cons**: Native doubles the code for one maintainer. Capacitor has no advantage
    here, since the trust boundary requires native screens regardless.
*   **Reason for Rejection**: The owner chose Expo and React Native.

### WXT or another extension framework

*   **Pros**: Handles per-browser manifests, hot reload.
*   **Cons**: Generated output is harder to review, and adds a dependency to a
    project whose reviewers must rebuild it.
*   **Reason for Rejection**: A small esbuild script gives readable, reproducible
    output, which suits Firefox source review.

### declarativeNetRequest redirects for feeds

*   **Pros**: Acts before the page loads.
*   **Cons**: Cannot catch client-side navigation; needs extra permission.
*   **Reason for Rejection**: CSS covers it. Research found no feed blocker using it.

### Inject all rules from JS only (as NFE does)

*   **Pros**: One code path; rule updates apply at once.
*   **Cons**: Depends on an async storage read before hiding, which is the cause of
    NFE's open flash bug.
*   **Reason for Rejection**: Manifest CSS is the documented way to avoid a flash.

### Native-app features on phones

*   **Pros**: Reaches where most mobile use happens.
*   **Cons**: Entitlement delays, Play Accessibility policy risk, breakage with each
    app update, and a separate codebase in Swift and Kotlin.
*   **Reason for Rejection**: The owner chose browser only, for these reasons.

### Single App Store app for Safari extension and browser

*   **Pros**: One listing.
*   **Cons**: Rejection of the browser blocks the Safari extension.
*   **Reason for Rejection**: Safari must survive a browser-app rejection.

### Agents that publish rule fixes unattended

*   **Pros**: Fastest repair.
*   **Cons**: Prompt injection from pages or issues could reach every user within a
    day, with no person in the path.
*   **Reason for Rejection**: Injection risk. The owner merges every PR.

--------------------------------------------------------------------------------

## Changes During Implementation

Recorded after the spec was approved.

*   `apps/mobile` is outside the npm workspaces, with its own lockfile, so React Native
    does not hoist into the extension's dependency tree.
*   `pages.yml` deploys only after CI succeeds on `main`.
*   The action's `github_token` output is revoked before later steps run, so
    `open-agent-pr.mjs` falls back as `docs/setup.md` describes. A PR opened by the
    last fallback, `GITHUB_TOKEN`, starts no CI until it is closed and reopened.
*   A "Show for 10 minutes" button also exists on each site in Settings.
*   The privacy policy discloses that RSS servers see the user's IP address, since
    Custom feeds fetch from them.
*   On Android, `react-native-webview` always installs a download listener. Algone
    Browser blocks the legacy storage permissions, but an allow-listed page can
    still start a download on Android 10+. Closing this needs a native patch.

--------------------------------------------------------------------------------

## Risks and Mitigations

| Risk | Likelihood | Effect | Mitigation | Remaining exposure |
|---|---|---|---|---|
| Malicious release (account or token theft) | Low | Code runs on 12 logged-in sites | 2FA on all accounts, owner approval on `release`, tag ruleset, secrets only in environments, first submissions by hand | Owner's GitHub account is a single point of failure |
| Bad rules file | Medium | Parts of sites hidden, or feeds return, for all users | Validation, live probes before publishing, entry-level checks, "Use bundled rules" | No staged rollout; up to 24 h to roll back |
| GitHub Pages outage | Low | No rule updates | Last good file kept; bundled rules | Fixes wait |
| Selector churn outpaces one maintainer | High | Silent breakage, on Tier 2 especially | Tiers, status page, reports, agent repair | Depends on the owner's time; research estimates a recurring weekly check for 5 to 6 sites |
| Logged-in rules wrong at launch | High | Feed shows through, or over-blocking, on Tier 1 sites | Owner's logged-in check before the first store submission, recorded in the checklist | Until then those rules are `unverified` |
| Apple 5.2.2 or 4.2 rejection of Algone Browser | Medium | No iPhone app beyond Safari | Safari extension is primary and separate | Accepted |
| Play rejection of Algone Browser | Medium | Android reach falls to sideloaded APK and Firefox | APK on GitHub Releases | 2027 developer verification adds friction |
| Site terms of service or a legal demand | Low to medium | Takedown or demand letter | No logos, no automation of accounts, descriptive naming, daily checks are logged out at one visit per probe | Unresolved in law; counsel recommended |
| Bot or wall blocks the daily check | High | Inconclusive results | Tri-state results, seven-day alert | Coverage of walled sites depends on the owner's logged-in check |
| Actions schedule stops after 60 inactive days | Medium | No detection | Status page date, docs | Cannot alert itself |
| Prompt injection through issues or snapshots | Medium | Bad PR | Owner reads and merges, no web tools, no secrets, sanitized snapshots, edit check | The owner's review is the last control |
| Hidden video keeps playing | Medium | Audio from an invisible feed | `pauseHiddenMedia` | Sites may restart playback |
| Rules file bandwidth | Low | Pages soft limit of 100 GB a month | File under 512 KB, one fetch a day, HTTP caching. At 1 MB a user-month, supports about 100,000 users | Move hosts beyond that |
| Patent claim | Low | Legal letter | Distinct design, recorded | Needs counsel (Q6) |

--------------------------------------------------------------------------------

## Non-Functional Requirements

**Security and privacy.** No data leaves the device by default, other than the
fixed rules fetch. Fetched text is never used as HTML. No `eval`, `new Function`,
or `innerHTML`; a CI test searches the built output for these.
Extension CSP stays the MV3 default. Password hashes never leave storage.

**Media.** `display: none` does not stop a video. The engine pauses and mutes any
`<video>` inside an element Algone is hiding. This is packaged logic, named
`pauseHiddenMedia`, and not rule data. Other videos are left alone.

**Performance.** The content script does no work on idle pages beyond the `href`
comparison. Tuned filtering batches through
`requestAnimationFrame` and only inspects new items. Target: under 2 ms per batch
on a 200-item page, checked by a Chromium test.

**Support tiers.** Twelve sites across desktop and mobile layouts is more upkeep
than one person can treat equally. **Tier 1** (YouTube, Reddit, X, LinkedIn,
Facebook, Instagram): daily logged-out check plus the owner's weekly logged-in
check; repairs first. **Tier 2** (TikTok, Threads, Bluesky, Twitch, Pinterest,
Substack): daily logged-out check only, so their logged-in surfaces depend on user
reports; best-effort repair. The site status page, built from each rule's
`verified` field and the last check result, shows each site's tier and status.

**Accessibility.** All UI is keyboard reachable, with visible focus and labels.
Reduced motion is respected. Barrier countdowns announce through a polite live
region.

**Rollout and rollback.** Rule changes revert with a PR. A bad overlay can be
replaced by a higher `rev`, and users can pick "Use bundled rules".

**Legal.** YouTube's terms bar interfering with the service, and whether a personal
display tool breaches them is untested. No platform logos appear in branding.
Listings use names descriptively. The owner should get counsel before a public
launch, especially for Algone Browser.

## Verification Status

Each rule records `verified.method`:

*   `live-logged-out`: checked against the real site, logged out.
*   `live-logged-in`: checked by the owner's logged-in run.
*   `fixture`: checked against a saved or hand-built fixture only.
*   `unverified`: written from knowledge of the site, or read from an MIT project,
    and not checked.

Logged-in surfaces (X, Instagram, Facebook, LinkedIn, TikTok feeds) start as
`fixture` or `unverified`, because the author had no accounts. The site status page
publishes these labels. The report to the owner at the end of the work lists them.

## Decision Register

`O` marks a decision made by the owner. `E` marks one made by the Elephant.

| ID | By | Decision | Reason |
|---|---|---|---|
| D-01 | E | npm workspaces monorepo | pnpm and bun are unavailable on the default path; simplest for CI |
| D-02 | E | esbuild, unminified, no framework in extension UI | Reviewable; small |
| D-03 | E | Manifest CSS with attribute gating | Only documented flash-free route |
| D-04 | O/E | 12 sites | Owner named the first seven and "others as sensible"; the author chose the rest from research on coverage gaps |
| D-05 | E | Single rules JSON per site; no regex or step lists | Stays on the safe side of the interpreter ban |
| D-06 | O/E | Rules on GitHub Pages, 24 h check | Owner: served from GitHub. Pages sends a CORS header, so no host permission |
| D-07 | E | `scripting.insertCSS` for overlays | Avoids page CSP issues |
| D-08 | E | No signing of rules | Fixed host plus validation; damage is limited to changing what is hidden. Revisit above 100,000 users or if rules gain non-selector fields |
| D-09 | E | Panels are extension iframes | Page scripts cannot read user data; fonts and art load; page CSS cannot reach them |
| D-10 | O | No feed panel empty; search-first off by default | Owner: clean empty space |
| D-11 | O/E | Snooze 10 min, wait 30 s (owner); typing 60 characters, limit 3 a day (author) | Owner suggestions and research |
| D-12 | E | Lock maximum 7 days; escape after 2 minutes, once per lock | Research; no irreversible locks |
| D-13 | E | PBKDF2 600,000 iterations; 24 h recovery | Available in WebCrypto, and partners may reuse a real password; the delay means reinstalling is not the only recovery |
| D-14 | E | Barrier runs in a tab | Popups close on blur |
| D-15 | E | Snooze reveals everything hidden on that site | One clear meaning; per-feed scope was considered and rejected for simplicity |
| D-16 | E | Custom limited to feeds that allow reading, plus tiles and capture | No all-sites access |
| D-17 | E | "Likely AI" is local text matching | No model, no data leaves; labeled honestly |
| D-18 | O | One Firefox MV3 build with event page for Android too, despite Mozilla's MV2 suggestion | Owner: MV3, one codebase. Event pages avoid the unsupported service worker. Untested on a device |
| D-19 | E | Chrome 116+, Firefox 140+/142+, Safari 15.4+ | `:has()`, `data_collection_permissions`, MV3 |
| D-20 | E | Safari extension in its own App Store app | Survives browser-app rejection |
| D-21 | E | Algone Browser allow-lists hosts; no address bar | Play JS-interface rule, and age rating scope |
| D-22 | O | `ads` filter removed from mobile app | Play Device and Network Abuse; owner's no ad covering |
| D-23 | O | Rule fixes need owner merge, then auto-publish | Owner's later decision supersedes the brief |
| D-24 | E | Launch pause uses a tab-session flag with no timestamps | Designed to avoid the timing limits in US 12468828's claims; not a legal conclusion |
| D-25 | O | The product name in the research note's open item 9 is not cited as a precedent | The note could not identify it |
| D-26 | E | No desktop binary; "desktop" is the extension | Research: native desktop has little to filter; Expo gives no value there |
| D-27 | E | Nightly daily, skip if unchanged; stable promotes nightly commit | Owner named T3 Code's release style; daily rather than half-hourly |
| D-28 | O | Daily cap 3 runs, 20 turns, priority by reserved slots | Owner: cap runs and turns; repairs, bugs, features |
| D-29 | E | No selectors copied from AGPL or unlicensed projects. MIT sources may inform logged-in selectors, credited in `THIRD_PARTY_NOTICES.md` | License; the author could not inspect logged-in pages |
| D-30 | E | Bundled Random content is original or public domain | Licensing |
| D-31 | E | Overlay schema is narrower than bundled rules, and can retire elements | Fixes over-blocking remotely; no remote clicks or redirects |
| D-32 | E | Agent receives a sanitized structural snapshot; logged-in checks run only on the owner's machine | Repair needs structure; text is the injection channel; accounts must not enter CI |
| D-33 | E | Two support tiers | One maintainer cannot treat 12 sites equally |
| D-34 | E | `isWeakening` fails closed | Unlisted settings must not be a bypass |
| D-35 | E | `REMOTE_RULES` flag for Apple builds | Apple 2.5.2 gray area |
| D-36 | E | Mobile: all state and barrier logic native; page script gets a view and sends three hints | Main-world scripts can be forged by the page |
| D-37 | E | Entry-level rule validation; unknown fields ignored; versioned path | One new site must not stop updates for old clients |
| D-38 | E | Background context is the single writer; pending changes are patches | Prevents lost updates |
| D-39 | E | `rev` is the commit timestamp | Always rises, needs no history |
| D-40 | E | Repo rulesets plus required approval on `release` | A code release is the worst-case path; the merge gate needs enforcing |
| D-41 | O | Anything in `owner_brief.md` not listed here is an owner decision | Traceability |
| D-42 | E | Identifiers and tip handles as listed under Toolchain | Permanent once submitted |
| D-43 | E | EAS for store mobile builds; Gradle on the runner for the release APK | Store upload is solved by EAS; APK needs no account |
| D-44 | E | Firefox smoke test uses a `firefox-test` build on `youtube.localhost` | No real-host mapping exists; no live dependence in CI |

--------------------------------------------------------------------------------

## Detailed Implementation Plan

Work runs in phases, in dependency order. Every phase has an exit gate. Paths are
**created** unless marked Modify.

### Toolchain

Node 24, npm workspaces, TypeScript, esbuild, vitest, Playwright, Selenium
(`selenium-webdriver` with `geckodriver`), `web-ext`. Packages are consumed as
TypeScript source: esbuild bundles them directly, and Metro uses `watchFolders`.
Dependencies are pinned by `package-lock.json`.

Permanent identifiers (D-42): Firefox `algone@joshwright22.github.io`; Algone for
Safari `io.github.joshwright22.algone.safari`; Algone Browser iOS bundle and Android
package `io.github.joshwright22.algone`. Tip links: GitHub Sponsors
`JoshWright22`; a Ko-fi handle is an empty constant in `packages/core/src/links.ts`
until the owner has one, and an empty link is not shown.

### Phase 0: Spec and scaffold

1.  Commit this spec, `owner_brief.md`, `docs/research/`, and
    `docs/designs/reviews/` to `main` before any code.
2.  Root: `package.json` (workspaces and scripts: `build`, `test`, `test:e2e`,
    `test:firefox`, `test:live`, `check:logged-in`, `snapshot:scan`, `assets`),
    `tsconfig.base.json`, `vitest.config.ts`, `playwright.config.ts`
    (`globalTimeout` set), `LICENSE` (MIT), `.gitignore`, `.editorconfig`,
    `SECURITY.md`, `CONTRIBUTING.md`, `THIRD_PARTY_NOTICES.md`. Modify `README.md`.
3.  Modify `assets/icon.svg`: the Algone mark.

Gate: `npm install` and an empty `npm test` succeed.

### Phase 1: `packages/rules`

1.  `src/schema.ts`: types, `validateRules`, `validateOverlay` (returns accepted
    entries and per-entry rejections, and enforces the field table), `checkSelector`.
2.  `src/compile.ts`: `compileSiteCss`, `compileOverlayCss` (no `off` gate),
    `tunedPendingCss` (the one-second gate on `[data-algone-tuned]`, unchecked items
    invisible until `data-algone-seen` is set).
3.  `src/publish.ts` and `scripts/publish-rules.mjs`: strips each site to the allowed
    fields and stamps `rev` from `git log -1 --format=%ct`, into
    `dist/rules/v1/rules.json`. `build.mjs` embeds the same `rev` as `BUILD_REV`.
4.  `sites/*.json`: see the inventory below.
5.  `test/`: all sites valid; each forbidden construct rejected; unknown fields
    ignored; one bad entry leaves the rest; field table enforced; every element has a
    non-empty label.

**Site inventory.** `A` is algorithmic, `E` is extra. Elements marked `*` are the
feed element for the mode. Every site gets `walls` and logged-out `probes` where a
public page exists.

| Site | Hosts | Elements | Protected | Optional fields |
|---|---|---|---|---|
| youtube | www, m | A: home*, sidebar recommendations, end screens, Shorts shelf, Shorts nav, Explore nav, Trending, autoplay, Up Next, mini guide items; E: comments, live chat, Subscriptions shorts, notifications badge, video metrics | search box, Subscriptions link, player | `tuned`, `capture`, `player`, `subscriptionsPath`, `searchUrl`, `shortsToWatch` |
| reddit | www, sh, new | A: home feed*, r/popular, r/all, trending search, recommended posts, Answers promos, related communities; E: comments, sidebar, vote counts | search, subreddit posts, chat link | `tuned`, `capture`, `searchUrl`, `subscriptionsPath: "/?feed=home"` |
| x | x.com, twitter.com | A: For You timeline*, Explore nav, Trends, Who to follow, Premium upsell, Grok nav; E: replies, view counts, notifications badge | search, Following tab, DMs, compose | `tuned`, `capture`, `selectTab`, `searchUrl` |
| instagram | www | A: home feed*, Explore grid, Reels nav, Reels page, suggested posts, suggested users; E: Stories, like counts | search, DMs, profile, direct post | `tuned`, `capture` |
| facebook | www, web, m | A: News Feed*, Reels, Stories, Watch nav, People You May Know, Sponsored rail; E: comments, Marketplace nav, Gaming nav | search, Messenger, Groups nav, Marketplace pages | `tuned` |
| linkedin | www | A: main feed*, news sidebar, Add to your feed, Puzzles, Premium upsell; E: reaction counts, notifications badge | search, messaging, post box, Jobs, profile | `tuned` |
| tiktok | www | A: For You*, Explore, Live, suggested accounts; E: comments | search, profile, direct video, messages | `tuned`, `searchUrl` |
| threads | www.threads.com, www.threads.net | A: For You feed*, suggested users; E: reply counts | search, profile, direct post | `tuned` |
| bluesky | bsky.app | A: Discover feed*, trending sidebar, suggested follows; E: reply counts | search, Following feed, chat, profile | `tuned`, `selectTab` |
| twitch | www | A: home carousel*, recommended channels, recommended categories, Browse; E: chat, viewer counts | search, Following, channel page, player | `tuned`, `player`, `searchUrl` |
| pinterest | www | A: home feed*, Related pins, Explore; E: comments | search, boards, profile, direct pin | `tuned`, `searchUrl` |
| substack | substack.com | A: Home feed*, Notes feed, Explore, recommended publications; E: comments | search, subscriptions Inbox, direct post | `tuned` |

Minimum `verified.method` at exit: `unverified`. Phase 5 raises each to the method it
actually reached, and the final report lists them.

Gate: `vitest packages/rules` passes.

### Phase 2: `packages/core`

| File | Contents | Tests must cover |
|---|---|---|
| `defaults.ts` | `defaultSettings(rules)` | Algorithmic hidden, extras visible |
| `view.ts` | `computeView` | Each mode, snooze, disabled site, panel contents |
| `commands.ts` | Patch application, pending changes | Tightening during a pending change survives |
| `weakening.ts` | `isWeakening` | Every listed tightening, its reverse, an unlisted change failing closed, allow-list asymmetry |
| `barriers.ts` | State machine per barrier | Windows across midnight, DST, lock expiry to `after`, one escape only, daily reset, schedule's pause |
| `password.ts` | PBKDF2 through an injected `kdf`, iterations stored | Round trip, wrong password, recovery delay |
| `snooze.ts` | Start, expire, warn time | Boundaries, 1 minute snooze |
| `queue.ts` | Add, dedupe, reorder, soft cap, `https:` only | Cap never blocks saving |
| `feeds.ts` | RSS and Atom text parser, three rankings, backoff | Malformed XML, non-https links, entity decoding, size limit |
| `tuned.ts` | Filter matching incl. kinds, topics, likely AI | Keywords, topics, channels, allow-list, kinds |
| `rulesUpdate.ts` | Fetch result handling, overlay diff | Accept only if `rev > max(BUILD_REV, lastAcceptedRev)`; `lastAcceptedRev` stored apart from the overlay; last good kept per entry; clearing on update; "Use bundled rules" |
| `stats.ts` | Local counters | No streak fields exist |
| `puzzles.ts` | Arithmetic, scramble, sequence | Seeded determinism |
| `links.ts` | Website, privacy, sponsor links | |
| `content/random.json` | Quotes, facts, poems, art metadata with attribution | Attribution present |
| `content/topics.json`, `content/ai-phrases.json` | Tuned lists | Valid shape |

Art files live in `apps/extension/assets/art/`.

Gate: `vitest packages/core` passes.

### Phase 3: `packages/engine`

Interface, the whole contract between page code and any host:

```ts
interface PageSite {              // bundled rule subset, built by core
  id: string; routes: Routes; tuned?: Tuned; player?: Player; slot?: Slot;
  effects: Array<{ effect: EffectName; selector?: string; token: string }>;
  subscriptionsPath?: string; capture?: Capture;
}
interface PagePayload { site: PageSite; view: View }
type Hint = { type: "route"; path: string } | { type: "videoEnded" }
          | { type: "injectionOk" };
interface PageHost {
  payload(): Promise<PagePayload>;
  onPayload(cb: (p: PagePayload) => void): void;
  applyCss(css: string): Promise<boolean>;
  hint(h: Hint): void;
  /** Extension only. Absent on mobile, so those modules do nothing there. */
  extension?: {
    panelUrl(kind: PanelKind): string;
    capture(items: CapturedItem[]): void;
  };
}
```

Modules: `index.ts` (`start(host)`), `routes.ts`, `attrs.ts`, `nav.ts`, `tuned.ts`,
`effects.ts` (including `shortsToWatch`, `selectTab`, and the subscriptions-first
redirect; same-site redirects run here using bundled paths), `media.ts`,
`player.ts` (ended detection, emits `videoEnded`), `snooze.ts` (timers, rechecks,
notice), `overlay.ts` (`off` tokens after `applyCss` succeeds), and extension-only
`panels.ts` (feed, launch pause, end-of-video, and save button, all as iframes,
so a page script cannot press them), `capture.ts`, `launch.ts`.

The launch-pause flag lives in `sessionStorage` under one key holding `"1"`.

Gate: `tsc --noEmit`. Behavior is tested in Phase 5.

### Phase 4: `apps/extension`

1.  `scripts/build.mjs`: compiles TS, per-site CSS, per-browser manifests, copies
    assets. Flags: `--target`, `--channel`, `--version` (nightly `0.1.0.N`, N is
    `github.run_number`). Defines: `SHOW_TIPS`, `REMOTE_RULES`, `TEST_HOOKS`,
    `BUILD_REV`.
2.  `src/background.ts` (single state writer, commands, alarms, rule fetch, feed
    fetch, lifecycle injection, opt-in Wikipedia), `src/content.ts` (the extension's
    `PageHost`), `src/ui/{popup,options,welcome,unlock,panel}/`.
3.  `src/ui/h.ts`: tiny DOM helper using `textContent` only.
4.  `src/ui/theme.css`: tokens from Visual Direction, plus a bundled Inter file.
5.  `TEST_HOOKS` builds only: a settable clock, and a `firefox-test` target adding
    `youtube.localhost` to the YouTube hosts.

Gate: all four targets build and `tsc --noEmit` passes.

### Phase 5: Tests

1.  `tests/fixtures/<site>/`: for sites reachable logged out, saved from the live
    page and reduced by `scripts/save-fixture.mjs`, kept with date and URL, so a
    fixture is real markup and not written from the selector. For logged-in surfaces,
    hand-built from the MIT sources and marked `hand-built`. Tests on those prove the
    machinery, not the selector, and `verified` says so.
2.  `tests/e2e`: Playwright persistent context, `channel: "chromium"`, using
    `context.route` to serve fixtures from real hostnames.
    *   No flash: an init script records, on every animation frame and every
        mutation, whether a feed element has a non-`none` computed display. The log
        must be empty on full load and on `pushState` navigation.
    *   `protected` visible on every site, CSS compiled and parsed in Chromium.
    *   Toggles for every element, modes, each barrier with the test clock, snooze
        expiry and notice, launch pause, queue, search-first, stop at the end.
    *   Overlay: fetch from a routed URL; bad file keeps last good; `off` written only
        after CSS applies; failure leaves old rule on; `retired`; clearing.
    *   `pauseHiddenMedia`, effects, Tuned rechecks, one-second reveal, panel fallback,
        capture, batch timing under 2 ms on a 200-item fixture (reported, not a hard
        failure in CI).
3.  `tests/firefox`: `web-ext lint`, plus a Selenium smoke test of the `firefox-test`
    build on `http://youtube.localhost:<port>`, with host permission granted through
    a preference set in the test profile. No live fallback.
4.  `tests/live`: `probes`, `walls`, `protected`, desktop and mobile viewports,
    results in `status.json` shape. `tests/live/snapshot.mjs` is the sanitizer.
    `check:logged-in` sets `ALGONE_PROFILE=<dir>`, read by a custom runner.
5.  `tests/static`: search built output for `eval`, `new Function`, `innerHTML`,
    `all_urls`, remote scripts. Manifest permission snapshot. Copy test for required
    and banned strings. Ledger validator.

Gate: all of the above pass, except `tests/live`, which reports.

### Phase 6: `apps/website` and ledger

1.  `ledger/entries.json`: `[{ date, kind: "donation" | "cost", amount, currency, note }]`.
2.  `build.mjs` renders templates to `dist/`, copying rules to `rules/v1/`. Privacy
    policy at `/privacy/`. The status page reads `status.json` from
    `raw.githubusercontent.com/JoshWright22/Algone/site-status/status.json`.
3.  Test: links resolve, policy exists, no external scripts.

Gate: the test passes.

### Phase 7: `apps/mobile`

1.  Expo SDK 58, `react-native-webview`, `expo-share-intent`, AsyncStorage,
    `@noble/hashes`.
2.  `scripts/build-page-script.mjs`: esbuild bundles the mobile engine modules to an
    IIFE, written as a string to `src/generated/pageScript.ts` before Metro runs.
3.  `src/store.ts`: single state writer, using `packages/core` commands.
4.  `src/rules.ts`: bundled rules plus the daily fetch, using `rulesUpdate.ts`.
    `REMOTE_RULES` comes from `app.config.ts`.
5.  `src/pageSite.ts`: builds the page payload and **removes the `ads` kind**, after
    any overlay, so remote data cannot restore it. A test asserts it.
6.  Screens: Home (search, tiles, queue), Site (WebView, toolbar, banner shown if
    `injectionOk` does not arrive in 3 seconds), Queue, Custom feed, Random, Settings,
    Barrier.
7.  `src/navigationPolicy.ts`: allow-list from `hosts` plus `auxHosts`.
8.  Tests: `tsc`, vitest on navigation policy, hint handling, `ads` removal, deep link
    validation; `expo export` for iOS and Android; `expo-doctor`.

Mobile publishing uses EAS (`EXPO_TOKEN`). The release APK uses `expo prebuild` plus
Gradle on the runner, which needs no account. No tip link in this app.

Gate: tests and both exports pass.

### Phase 8: `store/` and docs

1.  `scripts/make-assets.mjs`: icons (128 px with 96 px art and 16 px transparent
    padding, plus 16, 32, 48), 1280x800 screenshots from the real extension, 440x280
    promo tile, Edge tile, App Store 1024 px icon, Play 512 px icon and 1024x500
    feature graphic. Phone screenshots are an owner task, as they need devices.
2.  `store/<store>/`: listing text, checklist, reviewer notes, permission
    justifications, Non-Trader note (a seller declaration under EU consumer law), for
    Chrome, Firefox, Edge, Algone for Safari, Algone Browser on the App Store, and
    Google Play.
3.  `docs/setup.md`, `docs/funding.md`, `docs/rules.md`, `docs/release.md`.

Gate: asset dimensions test passes.

### Phase 9: Workflows

All actions pinned by full SHA. All set `timeout-minutes`. Logic beyond a few lines
lives in `scripts/ci/*.mjs`, with unit tests.

| Workflow | Trigger | Permissions | Notes |
|---|---|---|---|
| `ci.yml` | PR, push to main | read | Unit, e2e, Firefox, static, mobile tests |
| `pages.yml` | `workflow_run` of CI on main success, dispatch | pages, id-token | Guard in `scripts/ci/guard-rules.mjs` |
| `release.yml` | Cron daily, dispatch (`channel`, `version`) | contents: write in publish job | Skips if no commits since last nightly. Stable version defaults to the next patch after the latest stable tag |
| `publish-{chrome,firefox,edge,safari,mobile}.yml` | Dispatch only | read; `release` environment | Secret check first |
| `site-check.yml` | Cron daily, dispatch (`simulate_break`) | issues: write, contents: write | `scripts/ci/site-status.mjs` writes `status.json` to `site-status`, counts the streak, dedupes. `simulate_break` runs the path with a deliberately wrong selector |
| `claude-fix.yml` | `issues: labeled` | gate: read; agent: contents read, issues and PRs write, id-token write | `scripts/ci/agent-gate.mjs` |
| `notify-owner.yml` | `issues: closed` | issues: write | Mention, optional ntfy |

`agent-gate.mjs` checks: sender; credential presence; today's runs of the agent job
through the jobs API, against the priority's slots; and edits, using the GraphQL
`userContentEdits` for the body and `RenamedTitleEvent` for the title. It writes the
snapshot's run ID from the issue body's fixed marker, and the agent job downloads
that artifact with `gh run download`.

The agent's tools are `Edit,Read,Write,Glob,Grep,Bash(npm test:*),Bash(npm run *)`.
After the action, a workflow step runs `gh pr create` using the action's
`github_token` output, so CI runs on the PR. If the Claude app is not installed, the
gate exits with a notice.

Also `.github/ISSUE_TEMPLATE/*`, `.github/FUNDING.yml`, `.github/release.yml`.

Gate: `actionlint` passes if available, and unit tests of `scripts/ci/*` pass.

### Phase 10: Verify and report

1.  Push. Repo setup by API: Pages source, labels (`claude-fix`, `site-change`,
    `site-walled`, `bug`, `feature`), `release` environment with required reviewer and
    `main`/`v*` limit, `site-status` branch.
2.  Watch CI, and fix until green.
3.  Run a nightly. Confirm a release exists and Pages serves rules. Run
    `site-check.yml` with `simulate_break`.
4.  Load the built extension in a real browser and let it fetch from the live URL.
5.  Apply rulesets last, as they block direct pushes for anyone without bypass.
6.  Final report to the owner.

### Verification Plan

| Goal | How verified |
|---|---|
| G1 | E2E no-flash test; live YouTube in Chromium |
| G2 | Test that every element renders a toggle |
| G3 | E2E per mode |
| G4 | Unit plus E2E per barrier |
| G5 | `protected` selectors in fixtures and logged-out live checks. Logged-in surfaces such as messages need the owner's logged-in check |
| G6 | Interval (c): a real rules publish, fetched by the built extension. Interval (a): the daily check runs, and `simulate_break` exercises the path; a real break is unproven until one occurs |
| G7 | Static tests, `web-ext lint`, permission snapshot |
| G8 | E2E on fixtures |
| G9 | Workflows run on GitHub with no secrets and pass |
| G10 | Copy tests: required strings present, banned claims absent |

CUJs 1 to 5 are covered by Phase 5 end-to-end tests on fixtures. CUJ 6 is exercised by
`simulate_break` up to the issue; the agent step needs the owner's token, so it stays
unverified until the owner adds one. CUJs 7 and 8 need devices and are not verified
by the author.
