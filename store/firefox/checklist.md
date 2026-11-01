# Firefox Add-ons upload steps

## Before you start

1. Run the logged-in check first. Sign in to the supported sites in a separate browser profile on your own machine, then run `npm run check:logged-in -- --profile <dir>`. Facebook, Instagram, LinkedIn, Substack, and X rules are `unverified`, and Threads is `fixture`, so this is the only check of those signed-in pages. Fix what fails before the first store submission.
2. Open https://joshwright22.github.io/Algone/privacy/ in a private window and confirm it loads. Every store below needs that address. The website must be published first.
3. Confirm the build you upload came from a tagged release and that `npx vitest run tests/static` passes.

## Account

1. Create an account at https://addons.mozilla.org/developers/. There is no fee.
2. Turn on two-step authentication on that account. Mozilla requires it to submit.
3. Accept the developer agreement.

If the Developer Hub asks for trader status, read the note below. At the time of writing we have not confirmed that it asks.

## Non-Trader declaration (EU Digital Services Act)

Declare **Non-Trader** if the Developer Hub asks. A trader is someone acting for a trade, business, craft, or profession. Algone is a free, unpaid, open source project by one person, with optional tips that unlock nothing, so Non-Trader fits today. The store shows EU users that consumer rights against a trader do not apply. If Algone ever starts selling anything, or starts acting as a business, change this to Trader, which publishes your address, phone number, and email to EU users.

## Upload

1. Download `algone-firefox.zip` and `algone-source.zip` from the release.
2. Choose **Submit a New Add-on**, then **On this site** (listed).
3. Upload `algone-firefox.zip`. Tick Firefox for Android as well as desktop.
4. Confirm the gecko ID is `algone@joshwright22.github.io` and that the data collection field shows none. The manifest declares `data_collection_permissions: { required: ["none"] }`.
5. When asked about source code, answer **Yes** and upload `algone-source.zip`. The build output is bundled, even though it is not minified.
6. Paste `listing.md`. Set the license to MIT. Add the privacy policy URL.
7. Paste `reviewer-notes.md` into **Notes to Reviewer**, and link [docs/firefox-review.md](../../docs/firefox-review.md).
8. Submit. Listed review can take days.
9. After approval, set up `web-ext sign --channel=listed` from `docs/setup.md` for later releases.

The `algone-firefox.zip` on GitHub Releases is unsigned, so ordinary Firefox will not keep it installed. Only the AMO build, or a build signed by AMO, installs normally.
