# Rules

Each supported site has one JSON file at `packages/rules/sites/<site>.json`. Rules are data: selectors, paths, labels, and names from fixed lists. They hold no scripts, step lists, or regular expressions.

The validator in `packages/rules/src/schema.ts` runs in the build, in CI, and on every fetched file in the extension.

## Format

```jsonc
{
  "id": "youtube",
  "name": "YouTube",
  "hosts": ["www.youtube.com", "m.youtube.com"],
  "routes": { "home": ["/"], "watch": ["/watch"] },
  "elements": [
    { "id": "home", "label": "Home feed", "group": "Feeds",
      "class": "algorithmic", "feed": true,
      "selectors": ["ytd-browse[page-subtype=\"home\"]"], "routes": null }
  ],
  "protected": [
    { "path": "/results?search_query=test", "selector": "ytd-searchbox", "label": "Search" }
  ],
  "probes": [{ "path": "/", "live": true, "expect": ["home"] }],
  "walls": ["form[action*=\"consent\"]"],
  "verified": { "date": "2026-10-31", "method": "fixture", "notes": "" }
}
```

## Fields

"Published" means the field can change after a release through `rules.json` on the website. Everything else reaches users only in a store release.

| Field | Meaning | Published |
|---|---|---|
| `id`, `name` | Site ID and display name | No |
| `hosts` | Hosts in the manifest. A rule file cannot add one | No |
| `auxHosts` | Consent and redirect hosts that Algone Browser must allow | No |
| `routes` | Named paths on the site | Only routes used just by hide elements. Routes used by effects, redirects, panels, or capture are not |
| `elements[].id`, `label`, `group` | The toggle shown to the user | Yes |
| `elements[].class` | `algorithmic` starts hidden. `extra` starts visible | Yes |
| `elements[].selectors` | What to hide. Each selector is its own array entry | Yes |
| `elements[].feed` | Marks the main feed, which the mode controls | No |
| `retired` | A list of element IDs. Turns off bundled elements with no replacement | Yes |
| `elements[].effect`, `effectSelector` | A behavior built into the extension: `stopAutoplay`, `shortsToWatch`, or `selectTab` | No |
| `slot` | Where a mode draws its content | Yes |
| `tuned` | Item, title, channel, and kind selectors for Tuned mode | Yes |
| `capture` | What the save button may read | No |
| `player` | Scopes the stop-at-end panel | No |
| `subscriptionsPath`, `searchUrl` | Links Algone offers | No |
| `protected` | UI that must stay visible. Tests fail if a rule hides it | No (tests only) |
| `probes` | Pages the live check opens, and which elements must exist | No (tests only) |
| `walls` | Selectors meaning a login, consent, or bot page was served | No (tests only) |
| `verified` | How the rule was last checked. See below | No |

A published selector is rejected if it contains `{`, `}`, `<`, `@`, `url(`, a backslash, `/*`, or a top-level comma. It is also rejected if its quotes or brackets are unbalanced, if it is over 500 characters, or if it is a bare broad selector such as `*`, `html`, `body`, `main`, `:root`, or `div`.

## Selector practice

- Prefer tag names, `href`, `aria-*`, and `:has()`.
- Avoid hashed class names and position.
- When a site changes, keep the old selector next to the new one for a while.
- A selector must never match search, subscription, or message UI.

## How to fix a site

1. Find out what changed. The site-check issue lists the failed probe. The workflow run's `site-snapshots` artifact holds `<site>-desktop.json`, a sanitized copy of the page structure.
2. Add the new selector to the element's `selectors` in `packages/rules/sites/<site>.json`.
3. Add or update a fixture (below).
4. Build and run the tests:

   ```sh
   node apps/extension/scripts/build.mjs --target chrome,firefox --test --out-dir apps/extension/dist-test
   npx vitest run
   npx playwright test --project=e2e
   ```

5. Check the real site:

   ```sh
   node tests/live/run.mjs --site <site>
   ```

   Each line says `pass`, `broken`, or `inconclusive`. Inconclusive means a login, bot, or error page was served, so it says nothing about your change.
6. Update `verified` to match what you actually ran.
7. Open a PR. After it merges and CI passes, `pages.yml` publishes the rules.

Adding `claude-fix` to a `site-change` issue runs steps 1 to 4 and opens the PR for you. You still review and merge it.

**Publishing guard.** `pages.yml` compares the new file with the live one and probes only the sites that changed. A changed site that comes back `broken` keeps its previous entry, and the run shows a notice. Other sites publish normally. A rollback can take up to 24 hours to reach users.

After publishing an overlay, plan a store release: see `docs/release.md`.

## Fixtures

Fixtures are saved pages in `tests/fixtures/<site>/`, used by the browser tests. There are three kinds.

| Kind | Where it comes from | What it proves |
|---|---|---|
| Reduced live copy | `tests/fixtures/save-live.mjs`, public pages with text and scripts removed | The selector matched the real page when it was saved |
| Hand-built | `tests/fixtures/make-handbuilt.mjs`, written from public selector sources, marked `<!-- hand-built -->` | Only that the machinery works, not that the selector matches the site |
| Logged-in snapshot | The weekly check in `docs/setup.md`, committed to `tests/fixtures/snapshots/<site>/` after `snapshot:scan` passes | The selector matched your logged-in page when it was saved |

To add a public page, add a line to `PAGES` in `save-live.mjs`, and run it. Never commit a logged-in page that has not passed the scan.

## What `verified.method` means

It records the best check this rule has actually had. Never raise it beyond what you ran. The website shows it to users.

| Value | Shown as | Meaning |
|---|---|---|
| `live-logged-in` | Real site, logged in | Passed the logged-in check on the real site |
| `live-logged-out` | Real site, logged out | Passed `tests/live` on the real site with no account |
| `fixture` | Saved test page only | Passed against a saved page only. Hand-built fixtures say nothing about the real site, so use the notes to say so |
| `unverified` | Not checked | Written but not checked, usually because a login or bot wall stopped the check |

`verified.date` is the date of that check. `verified.notes` holds anything a reader needs, such as which surfaces were not reached.
