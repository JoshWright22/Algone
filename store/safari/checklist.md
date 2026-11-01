# Algone for Safari upload steps

## Before you start

1. Run the logged-in check first. Sign in to the supported sites in a separate browser profile on your own machine, then run `npm run check:logged-in -- --profile <dir>`. Facebook, Instagram, LinkedIn, Substack, and X rules are `unverified`, and Threads is `fixture`, so this is the only check of those signed-in pages. Fix what fails before the first store submission.
2. Open https://joshwright22.github.io/Algone/privacy/ in a private window and confirm it loads. Every store below needs that address. The website must be published first.
3. Confirm the build you upload came from a tagged release and that `npx vitest run tests/static` passes.

This app is separate from Algone Browser: its own bundle ID, listing, and review. A rejection of one does not touch the other. No tip link anywhere: not in the app, the listing, or the review notes.

## Account

1. Turn on two-factor authentication on your Apple Account. Apple requires it.
2. Join the Apple Developer Program at https://developer.apple.com/programs/ ($99 a year).
3. Create the app in App Store Connect with its own bundle ID, for example `io.github.joshwright22.algone.safari`.

## Non-Trader declaration (EU Digital Services Act)

Declare **Non-Trader** in App Store Connect, under Business, Trader Status, for EU distribution. A trader is someone acting for a trade, business, craft, or profession. Algone is a free, unpaid, open source project by one person, with optional tips that unlock nothing, so Non-Trader fits today. The store shows EU users that consumer rights against a trader do not apply. If Algone ever starts selling anything, or starts acting as a business, change this to Trader, which publishes your address, phone number, and email to EU users.

## Build: choose one route

**Mac route.**

1. Download `algone-safari-source.zip` from the release and unzip it, or run `node apps/extension/scripts/build.mjs --target safari`.
2. Run `xcrun safari-web-extension-packager apps/extension/dist/safari --bundle-identifier io.github.joshwright22.algone.safari --app-name "Algone for Safari"`.
3. Open the Xcode project, set your team, archive, and upload to App Store Connect.

**No-Mac route.**

1. Download `algone-safari-source.zip` from the release. Confirm `manifest.json` is at the top level of the zip.
2. In App Store Connect, open the app, then use the Safari web extension packager there to upload the zip. Apple packages and signs it on its side.
3. Install from TestFlight on an iPhone and test there.

## Per-site access step

Safari gives each site separate access. Test this before submitting, and keep it in the app's onboarding.

- **iPhone and iPad:** Settings, Apps, Safari, Extensions, Algone. Turn it on, then set each supported site to Allow, or use the aA menu in Safari. On older iOS the path is Settings, Safari, Extensions.
- **Mac:** Safari, Settings, Extensions. Tick Algone, then press Edit Websites and allow the supported sites.

Algone's welcome page and popup show which sites are not active.

## Submit

1. Paste `listing.md`. Upload icon and screenshots.
2. Complete App Privacy from `privacy.md`.
3. Answer the age rating questionnaire honestly. This app has no web view of its own, since the extension runs in Safari.
4. Paste `reviewer-notes.md` into App Review notes, including the remote rules disclosure.
5. Submit. If Apple objects to the rules download under guideline 2.5.2, the build has a `REMOTE_RULES` flag. Today `build.mjs` sets it to `true` for every target, so a `false` build needs a change there.
