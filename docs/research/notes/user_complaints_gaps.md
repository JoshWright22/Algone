# User complaints about, and unmet needs in, feed-blocking browser extensions

Research date: 2026-10-31. All review, issue, and comment text below was read through a summarizing fetch tool, so treat wording as close paraphrase unless it is in quotation marks. Every individual review, issue, or comment is an anecdote, one person's report. Issue and review counts are the only quantitative evidence.

## What do low-star Chrome Web Store reviews say about News Feed Eradicator, Unhook, and similar extensions?

### Takeaway
Chrome Web Store low-star text could not be read in bulk, so the best low-star evidence comes from Firefox Add-ons (AMO), where the two products are also listed. Both have very high ratings and few low ratings; what low-star text exists is mainly about breakage. For Unhook on Firefox, it is overwhelmingly about breakage and perceived abandonment.

### Cited Findings
**Headline numbers (as of Oct 2026)**
- News Feed Eradicator (NFE), Chrome: 200,000 users, 4.5 stars, 2.4K ratings — [Chrome Web Store](https://chromewebstore.google.com/detail/news-feed-eradicator/fjcldmjmjhkklehbacihaiopjklihlgg/reviews)
- NFE, Chrome: a tracker shows 50 one-star and 23 two-star ratings out of 2,353, version 3.0.5, Manifest V3, and zero net user growth over 7 days — [ExtScope](https://extscope.org/extension/fjcldmjmjhkklehbacihaiopjklihlgg)
- Unhook, Chrome: 1,000,000 users, 4.9 stars, 4.6K ratings. The visible reviews, dated Oct 24-30, 2026, were all positive — [Chrome Web Store](https://chromewebstore.google.com/detail/unhook-remove-youtube-rec/khncfooichmfjbepaaaebmommgaepoid/reviews)
- Unhook, Firefox: about 171,847 daily users, 4.63 stars from 1,199 ratings, version 1.6.9, last updated 2026-04-09 — [AMO API](https://addons.mozilla.org/api/v5/addons/addon/youtube-recommended-videos/)
- Unhook, Firefox: 77 one- and two-star reviews, about 6% of 1,199 ratings — [AMO ratings API](https://addons.mozilla.org/api/v5/ratings/rating/?addon=youtube-recommended-videos&score=1,2&page_size=25)
- NFE, Firefox: only 11 one- and two-star reviews in total, dating back to 2018 — [AMO ratings API](https://addons.mozilla.org/api/v5/ratings/rating/?addon=news-feed-eradicator&score=1,2&page_size=25)

**NFE, Chrome, anecdotes**
- 3 stars, 2026-10-05: "It block some but not all still have some on facebook" — [ExtScope](https://extscope.org/extension/fjcldmjmjhkklehbacihaiopjklihlgg)
- 2026-10-04, star rating not shown: "Greate, would like if you could add a schedule." — [Chrome Web Store](https://chromewebstore.google.com/detail/news-feed-eradicator/fjcldmjmjhkklehbacihaiopjklihlgg/reviews)

**NFE, Firefox low-star reviews, anecdotes** ([AMO ratings API](https://addons.mozilla.org/api/v5/ratings/rating/?addon=news-feed-eradicator&score=1,2&page_size=25))
- 1 star, 2026-02-08: the quote appeared over YouTube recommendations and nothing was removed. The developer replied that v3.0.3 fixes it.
- 2 stars, 2026-02-01: disliked the v3.0.0 UI and missed the simpler design. The developer replied that a transparent-background option was added and a simpler UI is planned.
- 1 star, 2025-04-30: blocks Facebook but stops the browser from remembering scroll position, including on other sites.
- 1 star, 2025-01-02: no effect on LinkedIn.
- 2 stars, dated 2024-10-07 by the API: v2.2.7 worked on mobile, but v3.0.0 broke it. The developer replied on 2026-02-01 that mobile was never well tested and is planned for v3.1. Note the date mismatch: the review date precedes the developer's early-2026 v3.0 discussion, so the review may have been edited, or the date may be unreliable.

**Unhook, Firefox low-star reviews, anecdotes** ([AMO ratings API, first 25 of 77, dated 2025-07-27 to 2026-10-08](https://addons.mozilla.org/api/v5/ratings/rating/?addon=youtube-recommended-videos&score=1,2&page_size=25))
- My tally of the 25 shown: 5 had no text. Of the 20 with text, 16 concern breakage or no maintenance, 2 concern closed source, 1 concerns mobile, and 1 concerns recommendations leaking through. This is a sample of low-star reviews only, not of users.
- 2026-10-01: videos would not play properly, and fullscreen, pause, and captions failed in Firefox and Edge.
- 2026-07-02: broke playback and froze the browser.
- 2026-04-16: recommendations still reachable by pressing V on laptop and by swiping up in mobile fullscreen.
- 2026-03-02: not updated in two years and likely abandoned.
- 2026-02-10: partly stopped working in November 2025; recommends UnTrap instead.
- 2026-01-29: embedded videos failed for months, and flickering was raised as a risk for people with epilepsy.
- 2025-11-25: after a YouTube change, "Hide Explore" hides the You section (history, playlists, Watch Later).
- 2025-10-16 to 2025-11-09: several reviews say end-of-video recommendations returned after YouTube's new UI.
- 2026-04-12 and 2025-11-03: complaints that it is not open source, so permissions or fixes cannot be checked.

**Unhook, Chrome, undated anecdotes**
- Reviewers report a blocked "Show Transcript" and no option to remove YouTube posts or members-only videos from the home feed; another reports moving to Unhook because UnTrap stopped working — [Extpose](https://extpose.com/ext/khncfooichmfjbepaaaebmommgaepoid/en)

**Similar extensions**
- BlockSite, Firefox: 3.7 stars from about 1,270 reviewers — [AMO](https://addons.mozilla.org/en-US/firefox/addon/blocksite/)
- UnTrap: a Russian Notebookcheck review notes some users report YouTube slowdowns — [Notebookcheck](https://www.notebookcheck-ru.com/EHto-rasshirenie-dlja-brauzera-sdelalo-YouTube-snova-dostupnym-dlja-menja.1014890.0.html)

### Inferences
- Low-star ratings are a small share: about 3% for NFE on Chrome (73 of 2,353), about 6% for Unhook on Firefox. The incumbents are well liked overall, and complaints come from a small but consistent minority.
- Unhook's maintenance story differs by moment. The "abandoned" reviews before April 2026 fit a long update gap, and the AMO record shows an update on 2026-04-09, yet reviews of broken playback continue through October 2026. "Abandoned" is the users' word; the store record shows it is not literally true.
- Firefox low-star reviews may not represent Chrome users, because YouTube and extension behavior differ by browser.

### Gaps
- Chrome Web Store did not expose star ratings per review on the fetched page, and third-party trackers paywall the review text. I could not obtain a real sample of Chrome one-star reviews for either product. Claims about Chrome reviews rest on very few visible items.
- Unhook's Chrome star distribution is locked behind [ExtScope's paid tier](https://extscope.org/extension/khncfooichmfjbepaaaebmommgaepoid).
- Only 25 of Unhook's 77 Firefox low-star reviews were read.

## What are the most common complaints: breakage after site redesigns, flashing of feed content before it is hidden, easy bypass, paywalls, ownership changes, data collection, lack of mobile support?

### Takeaway
Ranked by volume of evidence: breakage after site changes is clearly first, then mobile, then over-blocking, which was not on the prompt's list. Flashing, bypass, and paywalls appear but thinly. Ownership and data collection are mostly absent from complaints about these two products, though closed-source distrust does appear for Unhook.

### Cited Findings
**Breakage (strongest, recurring since at least 2020)**
- NFE has 372 issues in total and 87 open — [GitHub search API](https://api.github.com/search/issues?q=repo:jordwest/news-feed-eradicator+is:issue&sort=comments&order=desc&per_page=30); [GitHub issues](https://github.com/jordwest/news-feed-eradicator/issues)
- Most-commented NFE issue: the LinkedIn feed not being eradicated, 39 comments, 9 reactions, Oct 2025 — [#362](https://github.com/jordwest/news-feed-eradicator/issues/362)
- Other high-comment breakage issues: [#323](https://github.com/jordwest/news-feed-eradicator/issues/323) (LinkedIn, Dec 2024, 18 comments), [#348](https://github.com/jordwest/news-feed-eradicator/issues/348) (LinkedIn, Aug 2025, 14), [#523](https://github.com/jordwest/news-feed-eradicator/issues/523) (Facebook, Feb 2026, 10), [#600](https://github.com/jordwest/news-feed-eradicator/issues/600) (LinkedIn, Sep 2026, 7)
- Specific cause examples: LinkedIn moved home to /feed/foryou/ ([#596](https://github.com/jordwest/news-feed-eradicator/issues/596), Sep 2026, 7 reactions), and Reddit changed ?feed=news to /news/ ([#554](https://github.com/jordwest/news-feed-eradicator/issues/554), Apr 2026)
- This is an old problem. The maintainer asked for help adapting to Facebook's React UI in 2020 — [#82](https://github.com/jordwest/news-feed-eradicator/issues/82)
- Of the 29 most recent NFE issues listed (Mar-Oct 2026), by my tally 7 involve LinkedIn and 7 involve Facebook, and most report a feed that shows through — [GitHub search API](https://api.github.com/search/issues?q=repo:jordwest/news-feed-eradicator+is:issue&sort=reactions-+1&order=desc&per_page=30)
- HN anecdote, 2026-02-14: "Some of the Unhook options are broken nowadays I think," and needing about ten YouTube extensions — [HN](https://news.ycombinator.com/item?id=47018301)

**Mobile (second strongest; see also the requests section)**
- By my tally, at least 5 of those same 29 recent NFE issues are mobile: [#607](https://github.com/jordwest/news-feed-eradicator/issues/607), [#606](https://github.com/jordwest/news-feed-eradicator/issues/606), [#593](https://github.com/jordwest/news-feed-eradicator/issues/593), [#557](https://github.com/jordwest/news-feed-eradicator/issues/557), [#539](https://github.com/jordwest/news-feed-eradicator/issues/539)

**Over-blocking and collateral damage (not on the prompt's list, but recurrent)**
- LinkedIn create-post box hidden: [#540](https://github.com/jordwest/news-feed-eradicator/issues/540) (Mar 2026), [#571](https://github.com/jordwest/news-feed-eradicator/issues/571) (Jun 2026, "again", also blocks notifications navigation)
- Instagram stories hidden with the feed: [#544](https://github.com/jordwest/news-feed-eradicator/issues/544). Facebook Groups blocked when set unblocked: [#566](https://github.com/jordwest/news-feed-eradicator/issues/566). Marketplace and Groups pages blocked: [#212](https://github.com/jordwest/news-feed-eradicator/issues/212). LinkedIn scheduled posts unseen: [#321](https://github.com/jordwest/news-feed-eradicator/issues/321)
- Unhook: broken video playback appears repeatedly in Firefox low-star reviews (see above), and "Hide Explore" hides the You section — [AMO ratings API](https://addons.mozilla.org/api/v5/ratings/rating/?addon=youtube-recommended-videos&score=1,2&page_size=25)

**Flashing (real but thin)**
- YouTube feed flashes on opening Subscriptions or You pages, Aug 2026, 2 reactions — [#588](https://github.com/jordwest/news-feed-eradicator/issues/588)
- History navigation reveals the YouTube home feed, Feb 2026, 8 comments — [#507](https://github.com/jordwest/news-feed-eradicator/issues/507)
- LinkedIn feed reappears on returning from Messages, Apr 2026 — [#555](https://github.com/jordwest/news-feed-eradicator/issues/555)

**Easy bypass (thin as a complaint, with a known counter-tension)**
- User said snoozing takes one click and asked for more friction. The maintainer answered that hold-to-snooze and Lock Settings exist, and that more friction is being considered with no immediate plans — [#546](https://github.com/jordwest/news-feed-eradicator/issues/546), Mar 2026
- HN anecdote, 2025-01-22: blockers work to varying degrees, "often ending up in me just disabling the feature whenever I want to get my fix." — [HN](https://news.ycombinator.com/item?id=42794583)
- Counter-tension: one user's unlock screen froze, leaving them locked out ([#561](https://github.com/jordwest/news-feed-eradicator/issues/561), May 2026), and another wanted an "off until turned back on" option ([#526](https://github.com/jordwest/news-feed-eradicator/issues/526), Feb 2026)
- Removing per-site snoozing drew a complaint, 2 reactions — [#511](https://github.com/jordwest/news-feed-eradicator/issues/511), Feb 2026

**Paywalls (not a complaint for these two extensions)**
- NFE: no paid features detected; only an optional donation link — [ExtScope](https://extscope.org/extension/fjcldmjmjhkklehbacihaiopjklihlgg)
- Unhook browser extension: no paid features detected, though the tracker's payment detail is locked — [ExtScope](https://extscope.org/extension/khncfooichmfjbepaaaebmommgaepoid)
- The Google Play app named "Unhook", a separate product from the extension, draws paywall complaints — [Google Play](https://play.google.com/store/apps/details?id=com.unhook&hl=en_US)
- BlockSite allegedly charges to block more than 6 sites. This is a competitor's claim — [Eyeshade listing](https://chrome.google.com/webstore/detail/eyeshade/kmkhcgnembefhpmiaaghelhiljmojpng?hl=en)

**Ownership and data collection (mostly absent)**
- See the next-but-one section. The only related user complaints found are the two Unhook closed-source reviews above.

### Inferences
- Breakage is structural. Selectors and URLs change, and users feel it as "it silently stopped," so a repeated outage on one site (LinkedIn in Dec 2024, Aug, Sep, and Oct 2025, Mar and Sep 2026) matters more to a builder than any single bug.
- LinkedIn is a notable hot spot: people must keep using it for work, so they cannot just delete it, and that may be why its issues attract the most comments. This is my reading, partly supported by HN comments in the requests section.
- Over-blocking is underrated. It stems from the same fragile page-matching as under-blocking, and it damages tasks people came to the site to do.

### Gaps
- No source gives a true share of users hit by each complaint; GitHub issue filers are a small, technical, self-selected group.
- I found little flashing evidence for Unhook on Chrome, and could not tell whether flashing is rare or just rarely reported. Users may also not file a brief flash.
- The relative rank of bypass is especially uncertain, since people who bypass a blocker may blame themselves rather than file an issue.

## Which features are repeatedly requested in GitHub issues, Reddit, and Hacker News threads?

### Takeaway
Recurring asks are schedules, working mobile support, per-element control, keeping useful parts of a site, and stronger friction or time limits. Engagement on each is low in absolute terms, and the highest reaction count seen is 14. Reddit could not be accessed, so this rests on GitHub, HN, and reviews.

### Cited Findings
- **Schedules:** Working Hours request, 14 reactions, the highest seen, 8 comments, 2015, closed as completed — [#8](https://github.com/jordwest/news-feed-eradicator/issues/8). A Chrome reviewer still asked for a schedule in Oct 2026 — [Chrome Web Store](https://chromewebstore.google.com/detail/news-feed-eradicator/fjcldmjmjhkklehbacihaiopjklihlgg/reviews)
- **Mobile:** the maintainer's own issue lists four blockers: a hard-to-use options page, different selectors and permissions per site, hold-to-snooze ignoring touch, and separate mobile domains. It is milestoned v3.1 — [#495](https://github.com/jordwest/news-feed-eradicator/issues/495), Jan 2026, 4 reactions
- Also: Firefox Android support, 10 reactions, 2021 ([#142](https://github.com/jordwest/news-feed-eradicator/issues/142)); iOS Safari ([#176](https://github.com/jordwest/news-feed-eradicator/issues/176)); macOS Safari ([#292](https://github.com/jordwest/news-feed-eradicator/issues/292)). HN anecdote, 2025-03-09: nearly a decade of NFE on desktop, wants the same for mobile browsers — [HN](https://news.ycombinator.com/item?id=43306024)
- **Blocking Stories and short video:** Facebook Stories [#509](https://github.com/jordwest/news-feed-eradicator/issues/509) (Feb 2026, 7 reactions, 10 comments), and an older Stories request [#40](https://github.com/jordwest/news-feed-eradicator/issues/40) (2017, 16 comments). Shorts [#568](https://github.com/jordwest/news-feed-eradicator/issues/568), Reels [#559](https://github.com/jordwest/news-feed-eradicator/issues/559)
- **Keep the useful parts:** HN anecdotes value keeping Facebook Groups and Marketplace ([2026-02-20](https://news.ycombinator.com/item?id=47091984)) and LinkedIn messaging ([2025-09-14](https://news.ycombinator.com/item?id=45238692), [2025-12-07](https://news.ycombinator.com/item?id=46182078)), and per-site control of what is removed ([2026-04-02](https://news.ycombinator.com/item?id=47612848))
- **Time-based limits and progressive friction:** snooze length ([#281](https://github.com/jordwest/news-feed-eradicator/issues/281), 2024), a warning and fade before the feed returns ([#455](https://github.com/jordwest/news-feed-eradicator/issues/455), by the Dec 2025 issue; [#271](https://github.com/jordwest/news-feed-eradicator/issues/271), 2023). HN anecdote, 2024-01-01: wants scrolling that gets progressively harder the longer one uses it — [HN](https://news.ycombinator.com/item?id=38834100)
- **Delay before entry:** HN anecdote, 2024-01-03: NFE on desktop plus One Sec's configurable delay on mobile — [HN](https://news.ycombinator.com/item?id=38849480)
- **Content filtering rather than removal:** HN anecdotes want an LLM that keeps what they would still choose to read ([2026-08-23](https://news.ycombinator.com/item?id=49408076), [2026-09-04](https://news.ycombinator.com/item?id=49563654))
- **Better issue reporting:** a way to report site issues from the options page — [#517](https://github.com/jordwest/news-feed-eradicator/issues/517), Feb 2026
- **Newer sites:** Bluesky coverage — [#531](https://github.com/jordwest/news-feed-eradicator/issues/531), [#567](https://github.com/jordwest/news-feed-eradicator/issues/567)
- **Stacking tools is common:** HN users combine NFE with LeechBlock, Cold Turkey, StayFocusd, One Sec, or uBlock rules ([2025-09-01](https://news.ycombinator.com/item?id=45090170), [2025-04-09](https://news.ycombinator.com/item?id=43634499), [2025-04-30](https://news.ycombinator.com/item?id=43848082))
- **Praise for what exists:** "has changed my life!" (NFE, 2026-08-08) — [HN](https://news.ycombinator.com/item?id=49225474). Of 26 relevant HN comments from Jan 2024 on that mention NFE, most are recommendations or workarounds, not complaints — [HN Algolia](https://hn.algolia.com/api/v1/search?query=news%20feed%20eradicator&tags=comment&numericFilters=created_at_i%3E1704067200&hitsPerPage=30)
- YouTube also added a Shorts time limit that can be set to zero, per an April 2026 HN thread title — [HN](https://news.ycombinator.com/item?id=47787303). I did not verify this against a YouTube source.

### Inferences
- The stacking pattern suggests no single tool covers feed removal, site blocking, scheduling, and mobile together. That is suggestive, not proof users want one tool: they may be satisfied with stacking.
- HN sentiment toward NFE and Unhook is largely positive, so "people hate the incumbents" would overstate it. The pitch that fits the evidence is reliability and coverage, not rescue from a hated product.
- Issue #8 being closed while a user requests schedules in 2026 suggests either the feature did not fully ship or users cannot find it. I did not confirm which.

### Gaps
- Reddit (r/nosurf, r/digitalminimalism, r/productivity) was not reachable: direct fetch was refused and searches returned no threads. There is no Reddit evidence in these notes, and the prompt's Reddit question remains unanswered.
- The fetch's reaction-sorted query appeared to return issues in date order, so I may have missed some highly reacted issues. The comment-sorted list is reliable; the "highest reaction count seen" means only among issues I saw.
- HN evidence came from search-result metadata; individual threads were not opened, so context around each comment is limited.

## Have popular extensions been sold, gone paid, or been caught tracking users?

### Takeaway
I found no evidence that NFE or Unhook were sold, gated behind a paywall, or caught tracking. The relevant risk is category-level, and it is well documented for neighboring extensions rather than for these two. Unhook's publisher is opaque, which some users dislike.

### Cited Findings
- NFE: publisher is listed as Jordan West, an independent publisher, with no ownership change history shown, and no paid features — [ExtScope](https://extscope.org/extension/fjcldmjmjhkklehbacihaiopjklihlgg). The maintainer was still active in 2026 — [#546](https://github.com/jordwest/news-feed-eradicator/issues/546)
- Searches found no report of an NFE sale. This is absence of evidence, not proof — [TechRadar how-to, among results](https://www.techradar.com/how-to/how-to-hide-your-facebook-news-feed)
- Lookalike risk: "Newsfeed Eradicator 2.0" is a separate listing that a reviewer called a poorly executed clone — [ExtScope](https://www.extscope.org/extension/clfonknljamomadgkcciofnhfegjinhd)
- **BeTimeful uses the NFE name:** its blog says "BeTimeful aka the News feed eradicator for Safari is Finally Here" (Dec 8, 2023) and promotes an app called Unhook. The page does not mention Jordan West — [BeTimeful](https://www.betimeful.com/blogs/news-feed-eradicator-for-safari-is-here). A search summary called BeTimeful "the maker" of NFE and Unhook, but I found no support for that. It should not be repeated, and the Chrome publisher record says otherwise for NFE.
- Unhook: listed publisher is "Unhook", with an anonymous AMO account and obfuscated contact. Ownership history is not available — [AMO API](https://addons.mozilla.org/api/v5/addons/addon/youtube-recommended-videos/); [ExtScope](https://extscope.org/extension/khncfooichmfjbepaaaebmommgaepoid)
- Unhook's Firefox permissions are narrow: storage, webRequest, and YouTube domains only — [AMO API](https://addons.mozilla.org/api/v5/addons/addon/youtube-recommended-videos/)
- UnTrap has paid tiers: $3.99 with in-app purchases on the App Store, and paid features detected on Chrome — [App Store](https://apps.apple.com/app/id1637438059); [ExtScope](https://extscope.org/extension/enboaomnljigfhfjfoalacienlhjlfil)
- BlockSite's listing says it analyzes visited URLs, IP address, OS, browser, and timestamps, says this does not identify individuals, and warns that opting out loses some services. The linked policy was last modified Aug 6, 2018 — [AMO privacy page](https://addons.mozilla.org/firefox/addon/blocksite/privacy/)
- Category risk: a LayerX analysis, read via a secondary summary, reviewed privacy policies of Chrome extensions and found disclosed data sales. Poper Blocker, with 2M users, is an example. These are ad and popup blockers, not feed blockers — [PPC Land](https://ppc.land/your-ad-blocker-is-selling-your-browsing-data-and-its-legal/)
- 2019 precedent: at least 8 extensions sold sensitive browsing data to a broker — [Axios](https://www.axios.com/2019/07/19/broker-sells-near-real-time-browsing-info-unsuspecting-victims)
- Older sale precedent: two Chrome extensions began serving invasive ads after being sold — [NBC News](https://www.nbcnews.com/technolog/google-yanks-two-chrome-extensions-invasive-ads-2d11960552)
- Platform side: BleepingComputer found LinkedIn checks for 6,236 extensions, and LinkedIn says this protects the platform and users — [BleepingComputer](https://www.bleepingcomputer.com/news/security/linkedin-secretely-scans-for-6-000-plus-chrome-extensions-collects-data). An HN thread title said 6,278 — [HN](https://news.ycombinator.com/item?id=47968691). Two proposed class actions followed — [Captain Compliance](https://captaincompliance.com/?p=11968). No source I found names feed blockers on the list.

### Inferences
- Trust is a possible differentiator, but as a precaution rather than a response to a live scandal. A claim like "open source, narrow permissions, no data leaves the device" answers the two Unhook closed-source reviews. NFE already fills this role as open source, so it offers limited differentiation against NFE.
- A paid feed blocker runs into a free, highly rated default. Evidence for willingness to pay exists only in UnTrap's and BeTimeful's existence, not their revenue.

### Gaps
- I could not confirm Unhook's real operator, nor whether the mobile Unhook apps and the browser extension are related. They should be treated as separate.
- I could not confirm whether NFE appears on LinkedIn's scan list. Nor did I find evidence that LinkedIn has acted against feed blockers.
- I found no reliable UnTrap or BeTimeful revenue or conversion figures.
- The LayerX original was not read.

## Which needs remain unserved, and is there evidence they matter to many users or only a few?

### Takeaway
The best-supported gap is reliability: staying working through site changes, with little over-blocking. Mobile is the second, and is partly being addressed. Other gaps are real but evidenced by only a handful of people. Overall evidence supports a modest opening, not widespread dissatisfaction.

### Cited Findings
| Need | Evidence strength | Key evidence |
|---|---|---|
| Stay working through redesigns | Strong for a persistent problem; moderate on reach | [#362](https://github.com/jordwest/news-feed-eradicator/issues/362) with 39 comments, repeated LinkedIn outages Dec 2024 to Sep 2026, and 16 of 20 written Unhook low-star Firefox reviews sampled ([AMO](https://addons.mozilla.org/api/v5/ratings/rating/?addon=youtube-recommended-videos&score=1,2&page_size=25)) |
| Mobile browsers | Moderate; repeated for years, low counts | [#495](https://github.com/jordwest/news-feed-eradicator/issues/495), [#142](https://github.com/jordwest/news-feed-eradicator/issues/142), 5 recent bug reports, [HN](https://news.ycombinator.com/item?id=43306024) |
| Precise blocking that keeps useful features | Moderate; many small reports | [#540](https://github.com/jordwest/news-feed-eradicator/issues/540), [#571](https://github.com/jordwest/news-feed-eradicator/issues/571), [#544](https://github.com/jordwest/news-feed-eradicator/issues/544), [#566](https://github.com/jordwest/news-feed-eradicator/issues/566) |
| Blocking without damaging the video player | Moderate; Unhook on Firefox only | [AMO ratings API](https://addons.mozilla.org/api/v5/ratings/rating/?addon=youtube-recommended-videos&score=1,2&page_size=25), reviews dated 2026-01-29, 2026-07-02, 2026-10-01 |
| Stories, Reels, and Shorts coverage | Moderate | [#509](https://github.com/jordwest/news-feed-eradicator/issues/509), [#559](https://github.com/jordwest/news-feed-eradicator/issues/559), [#568](https://github.com/jordwest/news-feed-eradicator/issues/568) |
| Schedules | Weak to moderate; the highest-reacted request, but only 14 reactions | [#8](https://github.com/jordwest/news-feed-eradicator/issues/8), [Oct 2026 review](https://chromewebstore.google.com/detail/news-feed-eradicator/fjcldmjmjhkklehbacihaiopjklihlgg/reviews) |
| No flash at all | Weak; a few reports | [#588](https://github.com/jordwest/news-feed-eradicator/issues/588), [#507](https://github.com/jordwest/news-feed-eradicator/issues/507) |
| Stronger friction | Weak; a few reports, and pull in the other direction exists | [#546](https://github.com/jordwest/news-feed-eradicator/issues/546), [#526](https://github.com/jordwest/news-feed-eradicator/issues/526) |
| Progressive friction | Weak; single anecdote | [HN](https://news.ycombinator.com/item?id=38834100) |
| LLM content filtering | Weak; two anecdotes | [HN](https://news.ycombinator.com/item?id=49408076), [HN](https://news.ycombinator.com/item?id=49563654) |

- Partial responses already exist. NFE's maintainer has a mobile milestone ([#495](https://github.com/jordwest/news-feed-eradicator/issues/495)), and NFE shipped fixes for reported problems quickly in at least one case, within 5 days of a Feb 2026 review ([AMO](https://addons.mozilla.org/api/v5/ratings/rating/?addon=news-feed-eradicator&score=1,2&page_size=25)).
- New entrants are arriving: Feed Holiday adds a confirmation code before showing a feed, updated 2026 ([AMO](https://addons.mozilla.org/de/firefox/addon/feed-holiday/)); No Distractions, last updated Aug 2025 ([listing mirror](https://firefox.marketplace.browsertotal.com/en-US/firefox/addon/no-distractions/)); and UnTrap, which an anecdotal user prefers for more features and updates ([LessWrong](https://www.lesswrong.com/posts/seyteSHFMAxiaWt7r/vivek-s-s-shortform)).

### Inferences
- A new extension's justification would rest on being more reliable and more precise across several sites, with a fast-fix process, not on a new feature. This is hard because it is ongoing maintenance, and a single new tool would face the same site changes. Reliability is a commitment, not a launch feature.
- Reach cuts against a large gap: 200K and 1M users at 4.5 and 4.9 stars show that most users seem satisfied. Evidence for a much larger hidden population rests on inference only: people who uninstall silently leave no reviews.
- Single-site specialists show the demand is fragmented; a multi-site tool that does LinkedIn and YouTube well could serve the two sites generating the sharpest pain in this evidence.
- Mobile may be the largest need by potential audience, because at least one HN user says they do not scroll mindlessly on desktop and others manage their phone with separate tools ([HN](https://news.ycombinator.com/item?id=45586536), [HN](https://news.ycombinator.com/item?id=38849480)), but it is the hardest to serve: Chrome on Android and iOS native apps fall outside a Chrome extension's reach. That reach limit is background knowledge rather than a sourced finding here, so verify it before relying on it.

### Gaps
- No source measures how many users stop using a blocker because of breakage. Uninstall and churn data are unavailable.
- User counts for Chrome listings are rounded, and growth trends across 2024-2026 were not obtained.
- Nothing here measures willingness to pay.
- Without Reddit data, less technical users are underrepresented: GitHub and HN skew technical, so priorities such as simple setup may be understated.
