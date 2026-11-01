# Chrome Web Store upload steps

## Before you start

1. Run the logged-in check first. Sign in to the supported sites in a separate browser profile on your own machine, then run `npm run check:logged-in -- --profile <dir>`. Facebook, Instagram, LinkedIn, Substack, and X rules are `unverified`, and Threads is `fixture`, so this is the only check of those signed-in pages. Fix what fails before the first store submission.
2. Open https://joshwright22.github.io/Algone/privacy/ in a private window and confirm it loads. Every store below needs that address. The website must be published first.
3. Confirm the build you upload came from a tagged release and that `npx vitest run tests/static` passes.

## Account

1. Turn on 2-Step Verification on the Google account you will publish from. Chrome requires it before you can publish.
2. Go to https://chrome.google.com/webstore/devconsole and sign in.
3. Accept the developer agreement and pay the one-time $5 registration fee.
4. In Account, set the contact email and verify it.

## Non-Trader declaration (EU Digital Services Act)

Declare **Non-Trader** in the Developer Dashboard, under Account, when it asks for your trader status. A trader is someone acting for a trade, business, craft, or profession. Algone is a free, unpaid, open source project by one person, with optional tips that unlock nothing, so Non-Trader fits today. The store shows EU users that consumer rights against a trader do not apply. If Algone ever starts selling anything, or starts acting as a business, change this to Trader, which publishes your address, phone number, and email to EU users.

## Upload

1. Download `algone-chrome.zip` from the release you are shipping. Do not upload a test build.
2. Press **New item** and upload the zip.
3. **Store listing:** paste from `listing.md`. Upload the icon, promo tile, marquee, and five screenshots.
4. **Privacy:** paste the single purpose, each line of `permissions.md`, and the answers in `privacy.md`. For remote code, answer **No**. Add the privacy policy URL.
5. **Distribution:** Free, all regions, Public.
6. **Test instructions:** paste `reviewer-notes.md`.
7. Submit for review. Host permissions usually mean a longer review.
8. After approval, set up the API v2 service account from `docs/setup.md` for later releases.
