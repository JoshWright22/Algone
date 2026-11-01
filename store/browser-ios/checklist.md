# Algone Browser App Store upload steps

## Before you start

1. Run the logged-in check first. Sign in to the supported sites in a separate browser profile on your own machine, then run `npm run check:logged-in -- --profile <dir>`. Facebook, Instagram, LinkedIn, Substack, and X rules are `unverified`, and Threads is `fixture`, so this is the only check of those signed-in pages. Fix what fails before the first store submission.
2. Open https://joshwright22.github.io/Algone/privacy/ in a private window and confirm it loads. Every store below needs that address. The website must be published first.
3. Confirm the build you upload came from a tagged release and that `npx vitest run tests/static` passes.
4. **Re-read the live App Store Review Guidelines before submission:** 2.5.2, 2.5.6, 4.1(c), 4.2, 5.2.2, 5.2.3, and the age rating questions. The table below was researched on 2026-10-31.

This submission can be rejected. That is planned for. Do not hold Algone for Safari for it.

## Account

1. Turn on two-factor authentication on your Apple Account.
2. Join the Apple Developer Program ($99 a year). The Safari app uses the same membership.
3. Create a new app with its own bundle ID, separate from Algone for Safari.

## Non-Trader declaration (EU Digital Services Act)

Declare **Non-Trader** in App Store Connect, under Business, Trader Status, for EU distribution. A trader is someone acting for a trade, business, craft, or profession. Algone is a free, unpaid, open source project by one person, with optional tips that unlock nothing, so Non-Trader fits today. The store shows EU users that consumer rights against a trader do not apply. If Algone ever starts selling anything, or starts acting as a business, change this to Trader, which publishes your address, phone number, and email to EU users.

## Submit

1. Build with EAS or on a Mac from `apps/mobile`. Without a Mac, the share extension is unverified; test the `algone://save?url=` deep link instead.
2. Test on a real iPhone through TestFlight. Check that sites load, filtering applies, and the failure banner appears when injection fails.
3. Paste `listing.md`. Upload the icon and your own screenshots.
4. Complete App Privacy from `privacy.md`.
5. **Age rating:** answer honestly. Assume **16+**, since "Unrestricted web access" is a 16+ trigger. Navigation is allow-listed, so the answer may differ; confirm it on the questionnaire at submission.
6. Paste `reviewer-notes.md` into App Review notes.
7. Submit. Have any permission from site owners to hand; guideline 5.2.2 says authorization "must be provided upon request", and today none exists.

## Rejection risks

- **5.2.2 Third-party sites:** the largest risk, and unresolved. Algone has no permission from these sites. Precedents exist; approval is not assured.
- **4.2 Minimum functionality:** the app must go "beyond a repackaged website". The native home, queue, and barriers are the answer. The risk remains.

If rejected on either, do not rework the product to get around the rule. Record the reason, keep Safari as the iPhone route, and stop.

## Limits

| Rule | Source wording | Consequence for Algone Browser |
|---|---|---|
| Apple 2.5.6 | Browsers "must use the appropriate WebKit framework" | Satisfied: WKWebView through `react-native-webview` |
| Apple 4.2 | Must go "beyond a repackaged website" | Own home, queue, barriers, feed builder. Not a wrapper of one site. Rejection risk remains |
| Apple 5.2.2 | Must be "specifically permitted" under a third party's terms; "Authorization must be provided upon request" | **Unresolved real risk.** Precedents exist; approval is not assured. This is why Safari stays primary |
| Apple 5.2.3 | No saving or downloading media | No download, no background play, no picture-in-picture feature added |
| Apple 2.5.2 | Apps may not download code that "introduces or changes features" | Rules are selector data, not code, but this is a gray area. `REMOTE_RULES=false` is available for Apple builds; the Safari review notes disclose the fetch |
| Apple 4.1(c) | No other developer's icon or brand in the app's icon or name | Site tiles use plain text labels, no logos |
| Apple age rating | "Unrestricted web access" is a 16+ trigger | Answer the questionnaire honestly. Because navigation is allow-listed the answer may differ, so a maintainer confirms at submission; assume 16+ |
| Play Spam | No apps whose primary purpose is to "provide a webview of a website without permission from the website maintainer" | **Real rejection risk.** The app's purpose is a multi-site filtered browser with its own features. Fallback: signed APK on GitHub Releases |
| Play Device and Network Abuse | Bars "a webview with added JavaScript Interface that loads untrusted web content" | `react-native-webview` adds such an interface, so the main frame is limited to `https:` on the 12 sites' hosts plus `auxHosts`. No free address bar. Other links go to the system browser. Scripts are injected in the main frame only. This reduces but does not remove the risk, since these sites carry user content |
| Play Device and Network Abuse | Bars apps that "block or interfere with another app displaying ads" and uses that breach a service's terms | **The `ads` filter is compiled out of the mobile app.** The extension keeps it as an maintainer-specified Tuned filter |
| Play accounts | Developer account needs government ID; new personal accounts may need a 12-tester, 14-day closed test (search snippet) | Maintainer action, in the checklist |
| Android developer verification | Expands globally in 2027 for sideloaded apps | APK route will need registration or the advanced flow; recorded in the checklist |

## Other limits

- Google blocks sign-in inside embedded web views, so expect YouTube to work logged out here. YouTube subscriptions may not be reachable. RSS feeds in Custom are a partial substitute: they are undocumented, hold only 10 to 15 recent items, and have been reported to fail at times.
- Other sites may also challenge embedded logins. Third-party sign-in pages leave the allow-list and open in the system browser, so social logins may not complete. Password logins on the site itself should work.
- The app cannot affect the YouTube, Instagram, or TikTok apps. Links may open those apps if the OS routes them.
- Android Chrome has no extensions, so Chrome users need this app.
- If the app cannot inject its styles, it fails open: the site shows unfiltered and a banner in the app's toolbar says filtering is not active. A brief flash of hidden content is possible.

The ad filter is removed: the `ads` filter is compiled out of this app, and nothing here blocks or covers ads.

The Safari extension is separate: Algone for Safari is its own app, with its own listing and review. A rejection of Algone Browser does not affect it.

Fallback if rejected: a signed APK on GitHub Releases for Android. With `ANDROID_KEYSTORE_BASE64` set, CI signs a stable APK. Without it the APK is debug-signed, labeled a testing build, and cannot update across releases. The app has no self-update. There is no iOS fallback; iPhone users have Algone for Safari.

**Re-read the live policies before submission.** The wording here was researched on 2026-10-31 and store rules change.
