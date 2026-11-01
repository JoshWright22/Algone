# Permission justifications: Algone Browser (iOS)

Purpose: replace algorithmic feeds with something you control.

| Item | Justification |
|---|---|
| Network access | Loads the 12 sites in WKWebView and fetches daily rules. |
| `algone://` URL scheme | Receives `algone://save?url=` for the queue. Accepts `https:` URLs only and stores them as inert text until tapped. |
| Share extension | Receives a shared link for the queue. Unverified without a Mac. |

No camera, microphone, location, contacts, photos, tracking, or notification permission. Check the final `Info.plist` before submission; the app is not finished.

## Remote rules disclosure

Once a day, and at browser start, the app may download one file:

`https://joshwright22.github.io/Algone/rules/v1/rules.json`

- The file is JSON data: CSS selectors and paths for the supported sites. It holds no code.
- The URL is fixed in the source. Users and the file itself cannot change it.
- Every file is validated before use. A file over 512 KB, a file that is not JSON, an old revision, or an unknown schema is rejected whole, and the last good copy stays in use. Selectors with `{`, `}`, `<`, `@`, `url(`, a backslash, or `/*` are rejected, as are bare broad selectors.
- Fetched text is never run and never used as HTML. Remote rules cannot click, navigate, send data, or add sites.
- The request carries no identifier and no cookies (`credentials: "omit"`). GitHub Pages sees an IP address and User-Agent, as with any web request.
- Users can turn updates off in the app's settings.
- Each release bundles the latest rules, so a fresh install needs no download.

Source: `packages/core/src/rulesUpdate.ts` and `apps/mobile` in https://github.com/JoshWright22/Algone.
