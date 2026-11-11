# Contributing

## Rule fixes come first

Sites change their pages, and a broken rule is the bug users feel most. Rule fixes are reviewed before bugs, and bugs before features.

To fix a rule:

1. Edit the site's file in `packages/rules/sites/`.
2. Update `verified` honestly. Use `live-logged-out` or `live-logged-in` only if you checked the real site that way. Otherwise use `fixture` or `unverified`.
3. Do not make a rule hide search, subscriptions, direct links, messages, or a post box.
4. Run the commands below.

Rules are JSON data. A rule never contains code.

## Where selectors may come from

Write selectors from your own look at the site, or from a project with a license that allows it.

- **Never take selectors from AGPL projects or projects with no license.** This includes reading them and rewriting them. If you have seen one, say so in the PR.
- MIT, BSD, and Apache 2.0 sources are fine. Credit the source in the rule's `verified.notes`, and add it to `THIRD_PARTY_NOTICES.md` if it is new.

## AI policy

You may use AI tools. You are responsible for everything in your PR.

- Say in the PR that you used one.
- Check each change yourself. For rules, check it on the real site, and do not claim a check that did not run.
- Do not paste in generated reports or long summaries.
- Automated agents in this repo work on `claude/` branches and open PRs. A person reviews and merges every one.

## Other rules

- No `eval`, `new Function`, or HTML strings. No remote code. No analytics.
- Do not add permissions. Algone never asks for access to all websites.
- No claims that Algone defeats any site's algorithm. On native apps, claim only what the Android app rules actually do (go back or go home), and only for checks that ran.
- Never gate a feature behind a tip.

## Before you open a PR

```sh
npm ci
npm run typecheck
npm test
node apps/extension/scripts/build.mjs --target chrome --test --out-dir apps/extension/dist-test
npm run test:e2e
```

Report security problems through [SECURITY.md](SECURITY.md), not an issue.

By contributing you agree your work is released under the MIT license.
