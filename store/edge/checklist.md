# Microsoft Edge Add-ons upload steps

## Before you start

1. Run the logged-in check first. Sign in to the supported sites in a separate browser profile on your own machine, then run `npm run check:logged-in -- --profile <dir>`. Facebook, Instagram, LinkedIn, Substack, and X rules are `unverified`, and Threads is `fixture`, so this is the only check of those signed-in pages. Fix what fails before the first store submission.
2. Open https://joshwright22.github.io/Algone/privacy/ in a private window and confirm it loads. Every store below needs that address. The website must be published first.
3. Confirm the build you upload came from a tagged release and that `npx vitest run tests/static` passes.

## Account

1. Turn on two-step verification on your Microsoft account.
2. Register at https://partner.microsoft.com/dashboard/microsoftedge/ as an individual. There is no fee for Edge add-ons at the time of writing.
3. Complete the account verification Microsoft asks for.

## Non-Trader declaration (EU Digital Services Act)

Declare **Non-Trader** in Partner Center if it asks for your trader status. A trader is someone acting for a trade, business, craft, or profession. Algone is a free, unpaid, open source project by one person, with optional tips that unlock nothing, so Non-Trader fits today. The store shows EU users that consumer rights against a trader do not apply. If Algone ever starts selling anything, or starts acting as a business, change this to Trader, which publishes your address, phone number, and email to EU users.

## Upload

1. Download `algone-edge.zip` from the release.
2. Press **Create new extension** and upload the zip.
3. **Availability:** Public, all markets.
4. **Properties:** category Productivity, privacy policy URL, website, and support address. Answer that the extension does not collect personal information.
5. **Store listing (English, United States):** paste `listing.md`. Upload the logo, both tiles, and the screenshots.
6. **Submit:** paste `reviewer-notes.md` into the notes for certification.
7. Submit. After approval, set up Add-ons REST API v1.1 from `docs/setup.md`.
