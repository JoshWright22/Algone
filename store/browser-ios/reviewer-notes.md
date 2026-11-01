# Reviewer notes: Algone Browser (App Store)

Purpose: replace algorithmic feeds with something you control, in a browser of its own for 12 sites.

## How to pass the default lockout

Nothing needs an account. Algone Browser has no sign-in and no server. A reviewer can test every site logged out.

1. Open the app and tap a site tile, for example YouTube. The feed is hidden.
2. Tap **Show for 10 minutes** in the app. A native pause screen opens with a 30 second countdown.
3. Wait 30 seconds, then tap **Continue**. The feed shows for 10 minutes, then hides again.

The same pause appears in Settings when you loosen a setting. **Never mind** cancels it. Button names follow the extension. Confirm them against the build you submit, since the app has not yet been tested on a device.

## What the app adds

It is not a wrapper of one site. It has a native home with search and a queue, native barrier screens, a feed builder, and share sheet receipt. Navigation is allow-listed to the 12 sites, over `https:`. There is no free address bar, no download, no background play, and no picture-in-picture feature. The ad filter is compiled out.

## Disclosures

- Remote rules: once a day the app fetches `https://joshwright22.github.io/Algone/rules/v1/rules.json`. It is JSON selector data, validated, with no code, from a fixed URL. It cannot add features.
- YouTube should be expected to work logged out, because Google blocks sign-in in embedded web views.
- Links to other hosts open in the system browser.
