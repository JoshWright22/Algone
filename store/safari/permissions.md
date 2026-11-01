# Permission justifications: Algone for Safari

Single purpose: replace algorithmic feeds with something you control.

| Permission | Justification |
|---|---|
| `storage` | Stores settings, the saved queue, and the validated rules copy on this device. |
| `alarms` | Runs the daily rule check and the hourly Custom feed refresh. |
| `scripting` | Inserts the validated rules stylesheet into supported sites through `insertCSS`. It runs no fetched code. It also injects the bundled content script into tabs open at install, and only on supported sites. |
| Host permissions for the 12 supported sites | Hides elements on those sites and shows the Random, Custom, and queue panels. `insertCSS` needs host permission. Algone never asks for access to all websites. |
| Optional `https://en.wikipedia.org/*` | Off by default. Asked for only if the user turns on the Wikipedia source for Random, after a dialog that says what is sent. |

Not requested: `<all_urls>`, `tabs`, `webRequest`, `declarativeNetRequest`, `management`, `history`.

Host list: `www.youtube.com`, `m.youtube.com`, `www.reddit.com`, `sh.reddit.com`, `new.reddit.com`, `x.com`, `twitter.com`, `mobile.x.com`, `mobile.twitter.com`, `www.instagram.com`, `www.facebook.com`, `web.facebook.com`, `m.facebook.com`, `www.linkedin.com`, `www.tiktok.com`, `www.threads.com`, `www.threads.net`, `bsky.app`, `www.twitch.tv`, `m.twitch.tv`, `www.pinterest.com`, `substack.com`.

The app that carries the extension asks for no iOS or macOS permissions.

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
