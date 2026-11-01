# Project brief for Algone

A maintainer's instructions for this build, condensed from the session on 2026-10-31.
Later instructions override earlier ones where they conflict.

## Initial brief

Build Algone from scratch and push to `JoshWright22/Algone`. Make every design
decision needed, record each one, and do not stop to ask. Commit the approved spec
before code. Follow the Elephant-Goldfish Model.

**Product.** "Algorithm gone", store name "Algone: Algorithm Control". Disable and
modify algorithms across websites and apps on computer, browser, and phone, and
make it easier to pick what to watch. Non-algorithmic things keep working: search,
subscriptions, direct links, messages.

**Deliverables.** Browser extension for Chrome, Firefox, Edge, Safari (one codebase,
per-browser manifests, MV3). Website. Mobile/desktop app using Expo and React
Native, scoped honestly. Release assets and store checklists. GitHub Releases with
automated nightly prereleases plus stable versions, in the style of
`pingdotgg/t3code`. Issue bot and daily agent automation. Funding tutorial at
`docs/funding.md`.

**Extension.** Curated per-site rules for every popular social site. Never request
all-website access. Individual toggle per element. Popup shows the current site;
settings shows all sites. Everything algorithmic blocked from install. Non-algorithmic
items such as comments start visible and can be hidden. Hiding more is instant;
showing more passes the barrier. Four modes: No feed (default, clean empty space);
Random (offline quotes, facts, poems, art, puzzles; Wikipedia or web sources
opt-in); Tuned (filter by topics, keywords, channels, Shorts, ads, likely AI,
labeled honestly); Custom (own feed from subscriptions, RSS, chosen creators across
every supported site including Reddit, own ranking, local only). Switching out of No
feed to Tuned or Custom passes the barrier; Random is exempt. Six barriers: pause
and choose (default, 30 s, prominent "never mind"), typing challenge, daily unlock
limit, scheduled unlock, locked until (one rationed escape), partner password (local
hash, recovery path). Every unlock is a timed snooze, suggested 10 minutes.
Weakening settings passes the same barrier. Say plainly that uninstalling always
works. Excluded: pay to unlock, physical keys, message-only prompts, irreversible
locks, server-held cooldowns, streak penalties.

**Compliance.** Rules are JSON data only. Validate each fetched file and keep the
last good one. Bundle latest rules in each release. No eval, no obfuscation; Firefox
source and build steps. Minimal permissions. No data collection by default. Firefox
`data_collection_permissions` none. Opt-in web sources disclosed with consent.
Privacy policy on GitHub Pages, linked in the product. Single purpose: "replace
algorithmic feeds with something you control." Icon 128x128 with 96x96 art and 16 px
transparent padding. Screenshots 1280x800. Promo tile 440x280. Reviewer notes on
passing the default lockout. Permission justifications. Declare Non-Trader. Tip link
stays out of the Safari app for now. Features never gated by tips.

**Visual.** T3 Code nightly: dark first, minimal, translucent borders `#ffffff14`,
12 px radius, violet accent `oklch(.68 .17 264)`, Inter plus system monospace.
Original branding, not a copy of T3. Include a light theme.

**License and money.** MIT. Tips through GitHub Sponsors or Ko-fi. No secrets or
billing setup; workflows no-op cleanly without secrets, each listed in
`docs/setup.md`.

**Finish.** Tests passing, real verification in a browser, and an honest report of
what works, what was not tested, and what a maintainer must do.

## Later decisions

**Mobile: browser only.** Safari Web Extension on iPhone/iPad, Firefox for Android
extension, and an Expo app that is Algone's own browser loading mobile websites with
the same rules and settings. No Screen Time shielding or Android Accessibility
features. Do not claim Algone changes native apps. Say plainly that it works in the
browser, and guide users to open sites there. Check App Store and Play rules for
browser apps and record limits.

**Mobile research applied.** Safari is the primary iPhone path. The Expo app must be
rejectable without affecting the rest. Android browser reach is limited, so the Expo
app matters there. No ad covering, patched apps, third-party video clients, or
uninstall locks. Build: search-first home with optional intent prompt,
subscriptions-first view, local queue filled by a save button and mobile share
sheet, stop at the end, launch pause with one-tap exit. Check US patent 12468828
before copying a one sec-style prompt; if unclear, make the design distinct and
record it. Do not name "Reset" as a precedent.

**Automation.**
*   Auth: Claude subscription through `CLAUDE_CODE_OAUTH_TOKEN`, with
    `ANTHROPIC_API_KEY` as an optional alternative in the same workflow. Keep every
    run maintainer-triggered.
*   Issue bot: public issues never auto-run. A maintainer applies `claude-fix` after
    reading, gated on sender MAINTAINERS. Claude pushes a `claude/` branch and opens
    a PR; a maintainer merges. Pin the action SHA, set
    `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB: "1"`, keep store secrets in main-limited
    environments.
*   Alerts: GitHub mention from `github-actions[bot]` when an issue is addressed,
    optional ntfy. Note that delivery is untested.
*   Daily check: Actions cron runs Playwright with no model and opens an issue only
    on failure. A maintainer labels it to spend agent usage.
*   Funding ledger: public ledger of donations and costs. Cap runs per day and turns
    per run, prioritizing rule repairs, then bugs, then features. A person pays; no
    automatic route exists, and nothing may claim otherwise. No auto-reload. Do not
    sell donors Claude access.
*   Testing: Chromium through a Playwright persistent context; Firefox through
    `web-ext lint` plus a small Selenium or BiDi smoke test.
*   Repo setup: Pages source GitHub Actions. Chrome API v2, Firefox `web-ext sign`,
    Edge v1.1, and Safari packaging workflows, each no-oping without secrets.
