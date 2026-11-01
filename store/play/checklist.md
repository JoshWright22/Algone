# Algone Browser Google Play upload steps

## Before you start

1. Run the logged-in check first. Sign in to the supported sites in a separate browser profile on your own machine, then run `npm run check:logged-in -- --profile <dir>`. Facebook, Instagram, LinkedIn, Substack, and X rules are `unverified`, and Threads is `fixture`, so this is the only check of those signed-in pages. Fix what fails before the first store submission.
2. Open https://joshwright22.github.io/Algone/privacy/ in a private window and confirm it loads. Every store below needs that address. The website must be published first.
3. Confirm the build you upload came from a tagged release and that `npx vitest run tests/static` passes.
4. **Re-read the live Google Play policies before submission:** Spam (webview), Device and Network Abuse, Deceptive Behavior, and the developer account rules. The table below was researched on 2026-10-31.

This submission can be rejected. That is planned for. The APK fallback stays in place either way.

## Account

1. Turn on 2-Step Verification on the Google account.
2. Register at https://play.google.com/console/. The fee is a one-time $25.
3. **Government ID:** Google requires identity verification with a government ID. Have it ready. A personal account's legal name can show on the listing, so read the prompt.
4. **Closed test:** new personal accounts may need a closed test with 12 testers for 14 days before production access. This came from a search snippet, so confirm it in the Console. Find testers before you plan a date.
5. **Android developer verification** expands globally in 2027 for sideloaded apps. The APK route will then need registration or the advanced flow.

## Non-Trader declaration (EU Digital Services Act)

Declare **Non-Trader** in Play Console, under Account details, when it asks for your trader status. A trader is someone acting for a trade, business, craft, or profession. Algone is a free, unpaid, open source project by one person, with optional tips that unlock nothing, so Non-Trader fits today. The store shows EU users that consumer rights against a trader do not apply. If Algone ever starts selling anything, or starts acting as a business, change this to Trader, which publishes your address, phone number, and email to EU users.

## Upload

1. Build a release AAB from `apps/mobile` with EAS or Gradle, signed with Play App Signing.
2. Create the app: name Algone Browser, App, Free.
3. Complete App content: privacy policy, no ads, app access (all functions available without an account), content rating, target audience, data safety from `privacy.md`.
4. Paste `listing.md`. Upload the icon, feature graphic, and your own phone screenshots.
5. Paste `reviewer-notes.md` under App access, in the instructions field.
6. Release to the closed test track first, then production once allowed.

## Rejection risks

- **Spam, webview policy:** Play bars apps whose primary purpose is to "provide a webview of a website without permission from the website maintainer". This is a real risk. The app's purpose is a multi-site filtered browser with its own features, and it has no permission from those sites.
- **Device and Network Abuse, JavaScript interface:** Play bars "a webview with added JavaScript Interface that loads untrusted web content". `react-native-webview` adds one, and the allow-list reduces the risk without removing it, since these sites carry user content.
- **Device and Network Abuse, ads:** Play bars apps that "block or interfere with another app displaying ads". The `ads` filter is compiled out, but hiding feed parts on sites could still be read as a breach of a service's terms.

If rejected, use the APK fallback. Do not rework the app to get around a policy.

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
