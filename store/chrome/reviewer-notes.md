# Reviewer notes: Chrome Web Store

Single purpose: replace algorithmic feeds with something you control.

## How to pass the default lockout

Nothing needs an account. Algone has no sign-in and no server.

By default the feed on each supported site is hidden, and showing it again passes a 30 second pause. To pass it:

1. Open a supported site, for example https://www.youtube.com/. The home feed area is empty.
2. Open the Algone popup from the toolbar and press **Show for 10 minutes**. A new tab opens with a 30 second countdown.
3. Stay on that tab. The countdown runs only while the tab has focus.
4. When it reaches zero, press **Continue**. The tab closes and the feed shows for 10 minutes, then hides again by itself.

From the Settings page, the same pause starts when you loosen any setting. Open Settings, choose **Sites**, open a site, and switch off any switch under Feeds. Then wait 30 seconds and press **Continue**. The Settings page has no separate "Show for 10 minutes" button; that button is in the popup.

**Never mind** is the large button on that page and cancels the request. Press **Continue**, not Never mind, to pass.


## What to check

- Mode switch: No feed, Random, Tuned, Custom, in the popup. Random applies at once. Tuned and Custom pass the pause.
- Search, subscriptions, direct links, and messages keep working with the feed hidden.
- A page that is not a supported site: the popup says Algone is not active there.
- Site names in the interface are plain text, with no logos. Algone has no link with any of the sites it supports.

## Remote rules disclosure

Once a day, and at browser start, the background script may download one file:

`https://joshwright22.github.io/Algone/rules/v1/rules.json`

- The file is JSON data: CSS selectors and paths for the supported sites. It holds no code.
- The URL is fixed in the source. Users and the file itself cannot change it.
- Every file is validated before use. A file over 512 KB, a file that is not JSON, an old revision, or an unknown schema is rejected whole, and the last good copy stays in use. Selectors with `{`, `}`, `<`, `@`, `url(`, a backslash, or `/*` are rejected, as are bare broad selectors.
- Fetched text is never run and never used as HTML. Remote rules cannot click, navigate, send data, or add sites.
- The request carries no identifier and no cookies (`credentials: "omit"`). GitHub Pages sees an IP address and User-Agent, as with any web request.
- Users can turn updates off in Settings, About. "Use bundled rules" drops the downloaded copy.
- Each release bundles the latest rules, so a fresh install needs no download.

Source: `packages/core/src/rulesUpdate.ts` and `apps/extension/src/background.ts` in https://github.com/JoshWright22/Algone.
