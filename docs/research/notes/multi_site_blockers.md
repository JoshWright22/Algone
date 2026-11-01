# Multi-Site Feed-Blocking Chrome Extensions: Fact Sheet (as of 2026-10-31)

Method, applies to every section:
- Store metrics were scraped directly from the English Chrome Web Store (CWS) listing pages on 2026-10-31. User counts on CWS are rounded.
- About 40 CWS search queries produced 201 listings. About 90 passed a keyword filter for two or more social sites, then were hand-pruned (wallpapers, downloaders, post schedulers removed).
- Manifest versions were read from each CRX package served by Google's update endpoint (`clients2.google.com/service/update2/crx`). Packages were inspected in memory and never executed.
- GitHub metrics came from the GitHub API on 2026-10-31. The API's `open_issues_count` includes open PRs.
- "Hosts" below means sites in the package manifest. It proves targeting, not that the feature currently works.

## Which sites and surfaces does each extension cover?

### Takeaway
Only about 10 multi-site tools have 1,000+ users. News Feed Eradicator (200K) and UnDistracted (70K) dominate, then SocialFocus (30K) and Hide (8K). The long tail of 2025-2026 entrants is large but tiny (mostly under 100 users), and it has shifted focus from "home feed" to Shorts/Reels/Explore.

### Cited Findings

**Tier 1: established (1,000+ users), hide feeds within the site**

| Extension | Sites | Surfaces |
|---|---|---|
| [News Feed Eradicator](https://chromewebstore.google.com/detail/news-feed-eradicator/fjcldmjmjhkklehbacihaiopjklihlgg) (Jordan West) | [Repo site list](https://github.com/jordwest/news-feed-eradicator/tree/master/src/sitelist): Facebook, Instagram, LinkedIn, Reddit, X, YouTube, Threads, Bluesky, GitHub, Hacker News, Substack, ABC News AU | From source files: FB main feed, Stories, Groups feed. IG main feed, Stories, Suggested, Explore suggestions. LinkedIn main feed, news sidebar. X main feed, Explore "Posts For You", Today's News, Trending. YouTube main feed, Shorts button, Explore nav, end-screen suggestions, sidebar suggestions, comments, live chat, notifications, subscriptions. Reddit feed, subreddit feed, sidebars, games. Threads and Bluesky home feeds |
| [UnDistracted](https://chromewebstore.google.com/detail/undistracted-hide-faceboo/pjjgklgkfeoeiebjogplpnibpfnffkng) | Listing: Instagram, Facebook, YouTube, Twitter, LinkedIn. Package also has Netflix, Pinterest and Reddit scripts/hosts. Instagram, X and Pinterest are requested as optional permissions at runtime (seen in package code) | "Selective hiding of these sections or full blocking of the websites". Listing has no per-surface list. [gHacks](https://www.ghacks.net/?p=149583) (old review) lists FB News Feed, YouTube main feed, Twitter trends |
| [SocialFocus](https://chromewebstore.google.com/detail/abocjojdmemdpiffeadpdnicnlhcndcg) | Hosts: Bluesky, Facebook, Google, Instagram, LinkedIn, Netflix, Pinterest, Reddit, TikTok, Twitch, X, YouTube, Hacker News (plus others; 16 total) | YouTube Home, recommended, Shorts, comments, sidebars. FB/IG feeds, promoted, stories, reels, suggestions. X Home timeline (For You/Following), trends, promoted. Reddit Home, related, trending, comments |
| [Hide - Social Media Distraction Blocker](https://chromewebstore.google.com/detail/jnbhalknaohaiodbcokhhnljkabffnpn) (formerly "Hide Shorts, Stories, Reels & Video") | Listing: YouTube, Facebook, Instagram, X, Reddit. Required hosts show only FB/IG/YouTube | Shorts, Reels, Stories, Sponsored, Explore. "100+ more controls" (comments, recommendations, side panels, counts). Start on Subscriptions/Following instead of home |
| [Escape the Algorithm](https://chromewebstore.google.com/detail/escape-the-algorithm-soci/ichpbppanfcipepejbhffpcbdghfbggl) | Hosts: Facebook, Instagram, LinkedIn, Pinterest, TikTok, X, YouTube | Main feed and suggested content hidden by default; autoplay stopped. Search, messages, profiles, posting stay |
| [Focus Mode](https://chromewebstore.google.com/detail/fcajcgfjhilkdnbnmighhcbogikibkmh) | YouTube, X, LinkedIn, Reddit | Mainly a browser-chrome hider (tabs, address bar). Reddit: Home/Popular/All feeds, trending, recommendations, ads. Social hiding is in Pro |
| [NoReels](https://chromewebstore.google.com/detail/hkfmoiiekflhhnkaoboalifligaehben) | YouTube, Instagram, Facebook on listing; manifest also LinkedIn, X | Shorts shelf, Shorts sidebar tab, Shorts in search, IG Reels, FB Reels/Stories |
| [Focus - Remove Shorts & Reels](https://chromewebstore.google.com/detail/bbobcnmcegmkheaimcepkmcmnaaomagn) | YouTube, Instagram, Facebook | Shorts, Shorts page and search results; Reels, Reels page, IG Explore, blur Reels in DMs/Messenger. Short-form only |
| [Shorts & Reels Blocker](https://chromewebstore.google.com/detail/hddclpebfglijbmapdjminkkcafchkmb) | YouTube, Instagram | Short-form only (description not reviewed in detail) |
| [Stop Social Media Scrolling](https://chromewebstore.google.com/detail/fkkobjnbhpbmjgfcloffmkfkdmflecpd) | Hosts: X, Facebook, Instagram, LinkedIn, Reddit, TikTok, YouTube ("7 popular sites") | Does not hide the feed. Blocks wheel, trackpad, touch and keyboard scrolling on it |
| [FocusCat](https://chromewebstore.google.com/detail/lcfdinimeopncgnfieehdndfbokjbobo) | X, YouTube, TikTok, Reddit named; runs on all URLs | Interrupts scrolling with cat videos; not a hider |

**Tier 2: under 1,000 users, still updated in 2026 (most relevant)**

| Extension | Sites | Surfaces |
|---|---|---|
| [Distraktless](https://chromewebstore.google.com/detail/block-hide-feeds-for-xtwi/nhkcijlojemjhflgcnnicmlpbbopjlbn) | X, YouTube, Instagram | X home and "all feeds"; YouTube home and suggested; IG home and stories. Listing says it is most optimized for X |
| [No Distractions](https://chromewebstore.google.com/detail/looidefpafaogockjglamdijbaocichg) | YouTube, Instagram, Facebook, Reddit | Suggested posts, Reels, Explore, Recommended, Shorts, Trending, end screens, Reddit Popular. Redirects to subscriptions/following feeds, keeping followed accounts |
| [FocusRamp](https://chromewebstore.google.com/detail/pjeddidcdnhkgioednidaafafgnblikm) | YouTube, Facebook, Instagram, X, Reddit | Home feed, Shorts, Reels, Explore; 41 controls. Hybrid with a whole-site blocker |
| [Unscroll](https://chromewebstore.google.com/detail/begpmlcdkgmkkdnnhdfmhdcgjgnopodf) | Facebook, Instagram, X, LinkedIn, YouTube Shorts | Blocks infinite scroll rather than hiding; Shorts player hidden |
| [Social Feeds Blocker](https://chromewebstore.google.com/detail/social-feeds-blocker/mnfedbnelejmlpfgcdhplggpclkkllha) | Hosts: Facebook, Instagram, LinkedIn, Reddit, X, YouTube | Feeds (listing gives no detail) |
| [ZenFeed](https://chromewebstore.google.com/detail/cpamdbkgjacecpfcmcclkaefpfnekoal) | Instagram, YouTube, Facebook | Reels, Explore, Stories, Posts, Suggested Followers, Shorts, Home Feed, Subscriptions; redirects |
| [NoNoise](https://chromewebstore.google.com/detail/didbpbpmbnbmenjgkbcglghijldljoei) | YouTube, Facebook, Instagram, X, LinkedIn | Shorts, Home, recommended, comments, Reels, Stories, Feed, Explore, Timeline, Trending, LinkedIn Home and News |
| [Hushdoom](https://chromewebstore.google.com/detail/hushdoom-feeds-blocker/mnpljnkeflkmmadgemagjlocjipefcii) | [13+ platforms](https://github.com/ixismail/hushdoom), hosts include Bluesky, Facebook, GitHub, Instagram, LinkedIn, Pinterest, Reddit, Snapchat, Threads, TikTok | Main feeds |
| [Feedbreak](https://chromewebstore.google.com/detail/dmikafhgbdpldcaheeodninahbalekjh) | YouTube, Instagram, others per filter match (only first portion read) | YouTube Home grid, Shorts shelf and tab, recommended, end screens, comments; keeps search and Subscriptions |
| [Focusii](https://chromewebstore.google.com/detail/ikmjckehjgajdkaningmcbmdpefbiogb) | YouTube, X, Instagram; manifest also Reddit | Comments, recommended videos, homepage feed; one-tap global mode |
| [WallHabit](https://chromewebstore.google.com/detail/bekakclnikebgdlldpedgmcbklanhfjo) | Instagram, YouTube, Facebook | Reels, Shorts, feeds, autoplay; Hold-to-Unlock blocker for other sites |
| [Refocus](https://chromewebstore.google.com/detail/dhhbpdpdalnpibihcaidhlbmeijfnjkg) | LinkedIn, YouTube Shorts, Reddit r/all, plus any site | Feed-only blocking inside a site blocker. Same v1.18.7 also appears as [two](https://chromewebstore.google.com/detail/pioekcnglcjeohjcgildofonneajelkf) [more](https://chromewebstore.google.com/detail/nefjbfecabiihkgmimlebmjiokpamndd) listings with keyword-variant names |
| [Feed Free](https://chromewebstore.google.com/detail/fmmfdjmmjmkedafmhhdmoafbioakeefp) | YouTube, Instagram | Recommendations, Shorts, Reels, suggested content, comments ([README](https://github.com/anishcreations/feed-free-ext)) |

**Tier 3: stale or legacy**

| Extension | Notes |
|---|---|
| [Feedider](https://chromewebstore.google.com/detail/ljfikgipfnfppelplmgdpmooaoehaljb) | YouTube, FB, IG, LinkedIn, Twitter, Reddit, with a very granular listed surface list. Last updated 2022 |
| [Focus](https://chromewebstore.google.com/detail/mapbhjcejbjaldfnhbcffdjifefhnjak) | Twitter, YouTube, Reddit, IG, FB, Messenger; replaces feed with search page. Last updated 2021 |
| [Dopamine Detox (BeTimeFul)](https://chromewebstore.google.com/detail/cdjncbceanblcefebknhkmhgkhfoofmm) | Description still says "BeTimeFul" and names YouTube, IG, FB, LinkedIn, Twitter feeds. This appears to be the BeTimeFul in a [July 2025 roundup](https://juliety.com/social-feed-blockers) |
| [News Feed Replacer](https://chromewebstore.google.com/detail/pckaeegmnpnnaihphgembiinmopgdnap) | NFE-inspired; hosts X, FB, IG, LinkedIn, YouTube. Last updated 2022 |
| [Newsfeed Eradicator 2.0](https://chromewebstore.google.com/detail/clfonknljamomadgkcciofnhfegjinhd), [NewsFeed Eradicator](https://chromewebstore.google.com/detail/efiablloepgfoffbbldnlgfjlgjahcgj) | Similarly named separate listings, not Jordan West's. The first has a 2.4 rating; the second has 48 users. Risk of confusion |

- [Social media blocker](https://chromewebstore.google.com/detail/social-media-blocker/bncdebfejhgcdicndlgalckjkmmhlikp), despite appearing in feed-blocker searches, blocks "social media websites" outright, so it is a site blocker and is excluded.

### Inferences
- NFE has the broadest maintained site list among high-install tools, though its surface list is narrower than SocialFocus's or Hide's claimed 100+ toggles.
- TikTok does not appear in NFE's site list files, so TikTok coverage is a differentiator for SocialFocus, Escape the Algorithm and others.
- Hide's X and Reddit controls are probably optional runtime permissions, since they are absent from required hosts. Not confirmed.

### Gaps
- Live functioning of each surface was not tested; everything above comes from listings and packages.
- Full surface lists for UnDistracted (not on listing) and Social Feeds Blocker were not verified.

## What are the store metrics, and are they installable and MV3?

### Takeaway
Every listing with a readable package is Manifest V3, including extensions untouched since 2021-2022. None of the shortlist shows as removed, so MV2 deprecation has not separated the field; staleness and selector breakage are the real risks.

### Cited Findings

All metrics dated 2026-10-31, from the listings linked above. Rating is the store average; "MV" comes from the package manifest.

| Extension | Users | Rating | Ratings count | Updated | Version | MV |
|---|---|---|---|---|---|---|
| News Feed Eradicator | 200,000 | 4.5 | 2.4K | 2026-07-16 | 3.0.5 | 3 |
| UnDistracted | 70,000 | 4.8 | 632 | 2026-10-28 | 3.7.5 | 3 |
| SocialFocus | 30,000 | 4.3 | 209 | 2026-08-10 | 8.2 | 3 |
| Hide | 8,000 | 4.6 | 117 | 2026-10-21 | 4.0.1 | 3 |
| Focus Mode | 2,000 | 4.0 | 25 | 2026-10-06 | 7.1 | 3 |
| Focus - Remove Shorts & Reels | 2,000 | 3.6 | 14 | 2025-10-13 | 2.1.4 | 3 |
| Escape the Algorithm | 1,000 | 5.0 | 32 | 2026-10-27 | 1.0.35 | 3 |
| NoReels | 1,000 | 4.7 | 13 | 2026-10-27 | 1.2.15 | 3 |
| Stop Social Media Scrolling | 1,000 | 4.4 | 7 | 2026-10-22 | 3.0 | 3 |
| FocusCat | 1,000 | 4.0 | 2 | 2026-05-10 | 1.0 | 3 |
| Shorts & Reels Blocker | 1,000 | 3.8 | 15 | 2025-07-07 | 1.4.0 | 3 |
| Distraktless | 923 | 4.8 | 6 | 2026-09-10 | 0.5.0 | 3 |
| No Distractions | 677 | 4.4 | 29 | 2026-10-25 | 1.1 | 3 |
| Dopamine Detox (BeTimeFul) | 613 | 3.0 | 7 | 2025-04-02 | 5.1.93 | 3 |
| WallHabit | 369 | none | 0 | 2026-05-26 | 0.1.1 | 3 |
| News Feed Replacer | 301 | 4.7 | 7 | 2022-08-15 | 1.0.3 | 3 |
| Feedider | 106 | 5 | 1 | 2022-04-21 | 2.0.0 | 3 |
| FocusRamp | 90 | 5 | 6 | 2026-08-24 | 0.14.0 | 3 |
| Unscroll | 89 | 5 | 9 | 2026-10-23 | 3.4.0 | 3 |
| ZenFeed | 83 | 5 | 6 | 2026-08-24 | 1.2.2 | 3 |
| Social Feeds Blocker | 75 | 5 | 11 | 2026-05-21 | 0.0.12 | 3 |
| Focusii | 68 | 5 | 2 | 2026-02-11 | 1.5 | 3 |
| Focus | 53 | 5 | 3 | 2021-10-22 | 0.0.7 | 3 |
| Refocus | 47 | 5 | 1 | 2026-08-13 | 1.18.7 | 3 |
| NoNoise | 39 | 5 | 5 | 2026-09-27 | 3.0.7 | 3 |
| Feed Free | 14 | 5 | 2 | 2026-10-30 | 1.8.1 | 3 |
| Hushdoom | 8 | 5 | 13 | 2026-02-24 | 1.0.2 | 3 |
| Feedbreak | 4 | none | 0 | 2026-10-13 | 1.0.0 | Not verified (package fetch failed) |

- Conflict on SocialFocus: a third-party snapshot showed [v7.6.1, 4.6/5 from 172 reviews, dated 2026-03-15](https://extensionauditor.com/scan/socialfocus-hide-feeds-shorts-distractions-abocjojdmemdpiffeadpdnicnlhcndcg), against 4.3 from 209 on the live listing. The live listing is used. If both are right, recent ratings skew low.
- False-positive warning: a search summary described Distraktless as "flagged for a concern". "Flag concern" is the standard report link on every CWS listing ([NFE's listing has it too](https://chromewebstore.google.com/detail/news-feed-eradicator/fjcldmjmjhkklehbacihaiopjklihlgg)), so it is not a warning.
- [Feed Hider](https://chromewebstore.google.com/detail/mjjfoeoenhnmgbeanapemeicnbemkfdg), surfaced by [a scanner site](https://extensionauditor.com/scan/feed-hider-mjjfoeoenhnmgbeanapemeicnbemkfdg), returned an empty CWS shell and no package, which suggests it is no longer available.

### Inferences
- Most 5.0 ratings in the table rest on fewer than 15 ratings, so they say little about quality.
- NFE was on v2.2.7 in 2024 and shipped its rewrite as v3.0.0 in 2026, so the MV3-era product is young even though the brand is old.

### Gaps
- Removed extensions leave little trace, so a dead listing could be missed. No named shortlist tool was found removed.
- I searched listing text for "no longer" and "Manifest V2" style warnings, but the page HTML may not include browser-side "unsupported" banners. The MV3 package evidence is the stronger signal.
- I did not capture the "Featured" badge reliably, so it is omitted.

## What is the pricing, and which are open source?

### Takeaway
Monetization is shifting to one-time or low-cost Pro tiers. NFE and Escape the Algorithm are the only credible active open-source options with real user bases; NFE is the only one with a meaningful community (1,512 stars).

### Cited Findings

**Pricing**
- NFE: no paid tier on the [listing](https://chromewebstore.google.com/detail/news-feed-eradicator/fjcldmjmjhkklehbacihaiopjklihlgg); called free in [a roundup](https://juliety.com/social-feed-blockers).
- UnDistracted: listing shows "Offers in-app purchases", but a string search of the v3.7.5 package found no premium, upgrade or checkout terms. Paid tier is unverified. The [site](https://undistracted.app) returned only a title to the fetcher.
- SocialFocus: listing shows in-app purchases. [AlternativeTo](https://alternativeto.net/software/socialfocus/about) says about $3-4/month plus a limited free version (secondary, unverified). Separately, the [iOS app is listed as paid](https://apps.apple.com/ch/app/socialfocus-hide-distractions/id1661093205?l=en-GB).
- Hide: [freemium](https://chromewebstore.google.com/detail/jnbhalknaohaiodbcokhhnljkabffnpn). Free has core filters, unlimited changes for 7 days, then 3 filter changes per day, plus a small popup ad and up to two sponsor placements. Pro price is not on the listing.
- Focus Mode: [free focus window; Pro is $8.99 one-time](https://chromewebstore.google.com/detail/fcajcgfjhilkdnbnmighhcbogikibkmh).
- FocusRamp: [free tier with 29 of 41 controls; Pro $19.99 one-time](https://chromewebstore.google.com/detail/pjeddidcdnhkgioednidaafafgnblikm).
- Refocus: [$1 a month](https://chromewebstore.google.com/detail/dhhbpdpdalnpibihcaidhlbmeijfnjkg).
- Free per listing: [Escape the Algorithm](https://github.com/nestolobo/escapethealgorithm), [NoNoise](https://chromewebstore.google.com/detail/didbpbpmbnbmenjgkbcglghijldljoei), [ZenFeed](https://chromewebstore.google.com/detail/cpamdbkgjacecpfcmcclkaefpfnekoal), [Feedbreak](https://chromewebstore.google.com/detail/dmikafhgbdpldcaheeodninahbalekjh), [Social Feeds Blocker](https://chromewebstore.google.com/detail/social-feeds-blocker/mnfedbnelejmlpfgcdhplggpclkkllha). [Unscroll](https://chromewebstore.google.com/detail/begpmlcdkgmkkdnnhdfmhdcgjgnopodf) says "No subscription".

**Open source** (GitHub API, 2026-10-31)

| Project | License | Stars | Open issues + PRs | Last commit | Notes |
|---|---|---|---|---|---|
| [jordwest/news-feed-eradicator](https://github.com/jordwest/news-feed-eradicator) | AGPL-3.0 (MIT before v3.0.0, per [changelog](https://github.com/jordwest/news-feed-eradicator/blob/master/CHANGELOG.md)) | 1,512 | 107 (87 issues, 20 PRs) | 2026-10-28 | 349 forks |
| [nestolobo/escapethealgorithm](https://github.com/nestolobo/escapethealgorithm) | MIT | 4 | 9 | 2026-08-31 (pushed 2026-10-26) | |
| [daniyxlkhan/ZenFeed-extension](https://github.com/daniyxlkhan/ZenFeed-extension) | MIT | 2 | 0 | 2026-08-24 | Repo matched by name and listing date |
| [anishcreations/feed-free-ext](https://github.com/anishcreations/feed-free-ext) | Apache-2.0 | 4 | 0 | 2026-10-05 | |
| [ixismail/hushdoom](https://github.com/ixismail/hushdoom) | MIT | 5 | 0 | 2026-02-23 | |
| [ganganimaulik/social-feed-blocker](https://github.com/ganganimaulik/social-feed-blocker) | None detected | 1 | 0 | 2026-06-17 | Listing says open source, but no license means reuse is not granted by default |
| [rmst/focus](https://github.com/rmst/focus) | MIT | 1 | 0 | 2021-10-22 | Dormant |
| [asquilatan/Nil](https://github.com/asquilatan/Nil) | GPL-3.0 | 0 | 0 | 2026-01-01 | No CWS listing found |
| [dsteeley/feed-free](https://github.com/dsteeley/feed-free) | MIT | 0 | 90 | 2026-03-06 | Different project from Feed Free above |

- NFE issue state: [#609 "Reddit no longer blocked"](https://github.com/jordwest/news-feed-eradicator/issues/609) (opened 2026-10-14), [#606 "Facebook feed not blocked"](https://github.com/jordwest/news-feed-eradicator/issues/606), [#598 "Extension stopped working"](https://github.com/jordwest/news-feed-eradicator/issues/598) (LinkedIn, 2026-09-14), [#588 feed flashes briefly on navigation](https://github.com/jordwest/news-feed-eradicator/issues/588), [#561 "Unlock Settings not working"](https://github.com/jordwest/news-feed-eradicator/issues/561).
- NFE's maintainer [mostly considers the project "done"](https://github.com/jordwest/news-feed-eradicator) and accepts PRs only for bug fixes and docs. The repo's latest [commits](https://github.com/jordwest/news-feed-eradicator/commits/master) include Facebook (August) and LinkedIn (2026-10-28) fixes.
- [No Distractions](https://chromewebstore.google.com/detail/looidefpafaogockjglamdijbaocichg) claims "100% Open Source", but no repo was found on the listing or by GitHub search.
- [UnDistracted](https://chromewebstore.google.com/detail/undistracted-hide-faceboo/pjjgklgkfeoeiebjogplpnibpfnffkng) and [SocialFocus](https://chromewebstore.google.com/detail/abocjojdmemdpiffeadpdnicnlhcndcg) link no source repo, and GitHub search found none.

### Inferences
- NFE's post-3.0.5 fixes (August-October 2026) postdate the 2026-07-16 store release, so store users likely lack them. This fits the recent breakage reports and is the main weakness of the market leader.
- With NFE's maintainer limiting scope, feature-rich competition is open to others, and its AGPL license constrains closed forks.

### Gaps
- Hide's Pro price, UnDistracted's actual in-app purchase, and SocialFocus's first-party pricing are all unverified.
- UnDistracted and SocialFocus closed-source status is "no repo found", not confirmed by the developers.

## What distinguishing features does each have?

### Takeaway
The key axes are replacement content (NFE quotes), friction (Escape's hardcore mode, Stop Scrolling's strict mode), granularity (Hide, SocialFocus, Feedider), and hybrid blocking (FocusRamp, UnDistracted). Mechanisms other than hiding, such as scroll blocking and interrupts, are an emerging niche.

### Cited Findings
- **NFE**: replaces feeds with [an inspirational quote](https://chromewebstore.google.com/detail/news-feed-eradicator/fjcldmjmjhkklehbacihaiopjklihlgg); quotes [can be turned off or customized](https://juliety.com/social-feed-blockers) (2025 secondary). Has "Unlock Settings" friction per [issue #561](https://github.com/jordwest/news-feed-eradicator/issues/561).
- **UnDistracted**: [settings sync via Google account](https://chromewebstore.google.com/detail/undistracted-hide-faceboo/pjjgklgkfeoeiebjogplpnibpfnffkng); hide or full-site block. A [2025 roundup](https://juliety.com/social-feed-blockers) reports redirects, 5-minute pause, and timed off periods.
- **SocialFocus**: [password-protected settings, import/export, optional daily limits per site, works on mobile versions of sites](https://chromewebstore.google.com/detail/abocjojdmemdpiffeadpdnicnlhcndcg). Safari, Firefox and Edge versions [exist](https://www.warp2search.net/story/socialfocus-hide-distractions-for-chrome-firefox-edge-opera-and-safari-77-released/). Firefox's page [warns of sensitive permissions](https://addons.mozilla.org/addon/socialfocus/) (via search summary).
- **Hide**: [presets ("Just the video", "No numbers"), stop autoplay, blur thumbnails, grayscale a site, export/import, hidden videos paused, link redirects](https://chromewebstore.google.com/detail/jnbhalknaohaiodbcokhhnljkabffnpn). Free accounts send a random installation ID to a server.
- **Escape the Algorithm**: [per-page peek toggle, 10-minute auto re-hide timer, Hardcore mode removes toggles, autoplay off, local only](https://chromewebstore.google.com/detail/escape-the-algorithm-soci/ichpbppanfcipepejbhffpcbdghfbggl).
- **Stop Social Media Scrolling**: [allow 5 minutes, 15 minutes or rest of day; Strict Mode; blocked-attempt counts; Chrome profile sync](https://chromewebstore.google.com/detail/fkkobjnbhpbmjgfcloffmkfkdmflecpd).
- **No Distractions**: [redirect instead of emptying the page; "2FA style" confirmation on turning off; toggle-off auto-reverts after 1 hour](https://chromewebstore.google.com/detail/looidefpafaogockjglamdijbaocichg).
- **FocusRamp**: [site blocking, schedules, self-enforcing Pomodoro, daily limits, keyword blocking (Pro), Chrome sync, no analytics](https://chromewebstore.google.com/detail/pjeddidcdnhkgioednidaafafgnblikm). Its [top ranking in a roundup](https://websitegeek.net/best-site-blocker-chrome-extensions-2026/) comes from its own publisher (disclosed), and that article's "only blocker with per-platform feed hiding" claim is contradicted by the tools above. The listing shows 90 users.
- **Unscroll**: [sound alert and pop-up on scroll attempt; preference sync](https://chromewebstore.google.com/detail/begpmlcdkgmkkdnnhdfmhdcgjgnopodf).
- **NoNoise**: [per-site grayscale and image/video blocking, video speed control, volume boost, Pomodoro, mindful nudge after long scrolling, blocklist](https://chromewebstore.google.com/detail/didbpbpmbnbmenjgkbcglghijldljoei).
- **Focus Mode**: [hides tabs, address bar and bookmarks; Pomodoro in Pro](https://chromewebstore.google.com/detail/fcajcgfjhilkdnbnmighhcbogikibkmh).
- **Hushdoom**: [custom quotes with CSV import, snooze 15 min to 3 hours, storage permission only](https://github.com/ixismail/hushdoom).
- **WallHabit**: [Hold-to-Unlock friction](https://chromewebstore.google.com/detail/bekakclnikebgdlldpedgmcbklanhfjo).
- **FocusCat**: [cat video interrupts, upload your own cat](https://chromewebstore.google.com/detail/lcfdinimeopncgnfieehdndfbokjbobo).
- **Distraktless**: [solo developer who adds features as needed](https://chromewebstore.google.com/detail/block-hide-feeds-for-xtwi/nhkcijlojemjhflgcnnicmlpbbopjlbn).

**Adjacent whole-site blockers (not feed hiders), listings checked 2026-10-31, all MV3**
- [BlockSite](https://chromewebstore.google.com/detail/eiimnmioipafcokbfikbljfdeojpcgbh): 1,000,000 users, 4.5, 32.5K ratings, updated 2026-07-26. Blocklists, schedules, password. [About $39.99 lifetime](https://websitegeek.net/best-site-blocker-chrome-extensions-2026/) (secondary).
- [StayFocusd](https://chromewebstore.google.com/detail/laankejkbhbdhmipfmgcngdelahlfoji): 700,000 users, 4.4, 8.8K ratings, updated 2026-10-26. Time limits, by Sensor Tower. Its title now also claims "Shorts Blocker".
- [LeechBlock NG](https://chromewebstore.google.com/detail/blaaajhemilngeeffpbfkdjjoefldkok): 100,000 users, 4.9, 1.6K ratings, updated 2026-10-12. Free, up to 30 block sets.
- Also adjacent: [StayFree](https://chromewebstore.google.com/detail/elfaihghhjjoknimpccccmkioofjjfkf) (200,000 users, 4.5, 2.7K, updated 2026-10-30) and [one sec](https://chromewebstore.google.com/detail/femnahohginddofgekknfmaklcbpinkn) (30,000 users, 4.9, 1.2K, updated 2026-09-24).
- Single-site tools are out of scope. [Unhook](https://websitegeek.net/best-site-blocker-chrome-extensions-2026/) (YouTube; 1M+ installs per that roundup, not verified) is the largest example.

### Inferences
- Few tools combine all of per-surface control, temporary unblock with auto re-hide, schedules, and verifiable open source. Escape the Algorithm has the friction model but few controls; NFE has reach but no schedules were found.
- Hide's free-tier cap on filter changes and sponsor placements is an aggressive model compared with free alternatives.

### Gaps
- Features were taken from listings, not tested. Schedule support in NFE, Hide and Escape was simply not found on listings.
- Firefox/Edge availability was noted only where it surfaced: NFE, UnDistracted, SocialFocus and Escape the Algorithm have Firefox add-ons. [Hide Feed by DK](https://addons.mozilla.org/firefox/addon/hide-feed/) was found on Firefox only; no Chrome listing was verified.
