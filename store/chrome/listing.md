# Chrome Web Store listing

Status: draft. This listing is not published. Do not say Algone is in a store until the store has approved it.

- **Name:** Algone: Algorithm Control
- **Single purpose:** replace algorithmic feeds with something you control
- **Category:** Productivity (Workflow and Planning)
- **Language:** English (US)
- **Website:** https://joshwright22.github.io/Algone/
- **Support:** https://github.com/JoshWright22/Algone/issues
- **Privacy policy:** https://joshwright22.github.io/Algone/privacy/

## Short description

Replace algorithmic feeds with something you control. Works in your browser, stored on your device.

## Full description

Algone hides the algorithmic parts of popular websites and gives you something you chose in their place. Search, subscriptions, direct links, and messages keep working.

Works in the browser only. Algone does not change native apps, so open these sites in Chrome on a computer. Uninstalling always works.

Sites: YouTube, Reddit, X, Instagram, Facebook, LinkedIn, TikTok, Threads, Bluesky, Twitch, Pinterest, and Substack.

Four modes for each site:
- No feed: clean empty space where the feed was. This is the default.
- Random: quotes, facts, poems, generated art, and puzzles, all bundled and offline. A Wikipedia source is opt-in.
- Tuned: the site's own feed, filtered by your topics, keywords, channels, Shorts, ads, and likely AI. Likely AI is a text match, so it will miss some and wrongly catch some.
- Custom: your own feed from RSS and creators you pick, with your own ranking, stored on this device.

Every element has its own switch. Hiding more is instant. Showing more passes a barrier you pick: a 30 second pause by default, or a typing challenge, a daily limit, a schedule, a timed lock, or a partner password. Each unlock is a timed snooze of 10 minutes, then the feed hides again. These barriers interrupt autopilot. They are not a trap, and changing your clock or using another browser also gets around them.

Your settings stay on your device. Algone has no account and collects no data. Once a day it downloads updated site rules, which are data and not code, and you can turn that off.

Sites change their pages, so a rule can stop working until it is repaired. Algone is open source under the MIT license: https://github.com/JoshWright22/Algone

Algone has no link with the sites it works on. All names belong to their owners.

## Limits to state plainly

- Works in the browser only.
- Does not change native apps. The YouTube, Instagram, and TikTok apps stay as they are.
- Uninstalling always works.
- Sites change their pages, so a rule can stop working until it is repaired.
- Some signed-in pages are not checked yet. The site status page lists each one.

## Images

- Store icon: `store/assets/chrome/icon-128.png` (128x128, 96x96 art, 16 px transparent padding)
- Small promo tile: `store/assets/chrome/promo-tile-440x280.png`
- Marquee: `store/assets/chrome/marquee-1400x560.png`
- Screenshots: Chrome takes at most 5. Use `01-settings-sites`, `02-unlock-pause`, `03-popup`, `04-random-panel`, `05-tuned-filters`.

Screenshots come from `npm run assets`, in `store/screenshots/`. All are 1280x800 from the real test build. `03-popup.png` places the real popup on a plain backdrop with a caption. `04-random-panel.png` shows the real panel on a blank placeholder page.
