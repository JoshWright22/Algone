# Single-site feed-hiding Chrome extensions: fact sheet (as of 2026-10-31)

**Method and how to read the numbers**

- All Chrome Web Store (CWS) metrics were read directly from live listing pages on 2026-10-31, using the data embedded in each page: 427 live listings out of 436 candidate IDs, found through about 55 store searches plus web searches. Each extension name below links to its listing, which is the source for that row's users, rating, count, updated date, version and manifest version.
- GitHub stars, license and last default-branch commit were read through the GitHub API on the same date.
- "Users" is the CWS figure, which the store rounds at higher values. "Ratings" is the CWS rating count. The store does not expose a separate written-review count in the data I read, so treat rating count as the review-count proxy. Ratings are shown to two decimals from the exact stored value (the listing itself shows one decimal).
- "Installable" means the listing page resolves and offers "Add to Chrome". I did not install or functionally test any extension, so surface lists are what the listing claims.
- "No price on listing" means the listing text does not mention one. It does not prove the extension is free. CWS listing data does not reliably reveal in-app payments.
- Multi-site tools are out of scope and excluded: UnDistracted, SocialFocus, Hide - Social Media Distraction Blocker, News Feed Eradicator, FREE Reels Blocker, and similar.

## For each site, which extensions lead, and what surfaces do they hide?

### Takeaway
YouTube is led by Unhook and Enhancer for YouTube (both listed at 1,000,000 users), X by Control Panel for Twitter (200,000), Facebook by Fluff Busting Purity (100,000, but a filter rather than a feed hider), Instagram by Antigram (40,000), and Reddit by Distraction Free Reddit and Reddit Liberation (4,000 each). LinkedIn is led by LinkOff (3,000) and TikTok by TikTok Feed Blocker (1,000). Reach falls by two to three orders of magnitude outside YouTube and X.

### Cited Findings

Rows are ordered by relevance to feed hiding, then users. All rows are MV3 and installable on 2026-10-31.

#### YouTube

| Extension | Users | Rating (ratings) | Updated | Version | Surfaces claimed | Pricing | Source code |
|---|---|---|---|---|---|---|---|
| [Unhook](https://chromewebstore.google.com/detail/khncfooichmfjbepaaaebmommgaepoid) | 1,000,000 | 4.86 (4,613) | 2026-03-21 | 1.6.9 | Homepage feed, related sidebar, Shorts, end-screen suggestions, comments, trending tab, subscriptions hide or redirect, autoplay, annotations | Free; donation via PayPal ([Edge listing](https://microsoftedge.microsoft.com/addons/detail/unhook-remove-youtube-r/hebpjnnclppdnfghdnmhgdljmjpfhggk)) | No official repo found; Firefox reviewers object that its license prevents inspection ([AMO review](https://addons.mozilla.org/en-US/firefox/addon/youtube-recommended-videos/reviews/2229996/)) |
| [Enhancer for YouTube](https://chromewebstore.google.com/detail/ponfpcnoihfmfllpaingbgckeeldkhle) | 1,000,000 | 4.47 (17,570) | 2026-07-15 | 3.0.19 | Mainly a playback tool; also hides end screens, info cards, recommendations, related videos, chat, comments, Shorts | No price on listing | No repo found |
| [Control Panel for YouTube](https://chromewebstore.google.com/detail/lodcanccmfbpjjpnngindkkmiehimile) | 100,000 | 4.49 (301) | 2026-10-16 | 1.38.0 | Disable Home feed, hide Related, hide Shorts or redirect to normal player, Home categories, Premium upsells, sponsored videos; also ad blocking | No price on listing | [insin/control-panel-for-youtube](https://github.com/insin/control-panel-for-youtube): 425 stars, no license detected, last commit 2026-10-18 |
| [UnTrap for YouTube](https://chromewebstore.google.com/detail/enboaomnljigfhfjfoalacienlhjlfil) | 100,000 | 2.55 (849) | 2026-10-26 | 12.4 | Shorts, recommendations, comments, UI elements; claims 250+ features | Freemium; Pro includes full controls, presets, filters, summaries, schedules, sync; price not published on [site](https://untrap.app/) | No repo found |
| [BlockTube](https://chromewebstore.google.com/detail/bbeaicapbccfllodepmimpkgecanonai) | 100,000 | 3.89 (825) | 2026-02-09 | 0.4.8 | Rule-based: videos and channels by name, comments, runtime, Shorts, Movies, Explore page. A content filter, not a homepage hider | No price on listing | [amitbl/blocktube](https://github.com/amitbl/blocktube): 1,413 stars, GPL-3.0, last commit 2026-02-07 |
| [YTBlock](https://chromewebstore.google.com/detail/nedcanggplmbbgmlpcjiafgjcpdimpea) | 70,000 | 3.85 (351) | 2026-10-28 | 6.2.0 | Rule-based blocking of videos, channels, comments, posts, playlists, Shorts, live; password protection. Some criteria are asterisked on the listing; I did not confirm whether that means paid | Not verified | No repo found |
| [Tweaks for YouTube](https://chromewebstore.google.com/detail/ogkoifddpkoabehfemkolflcjhklmkge) | 60,000 | 4.27 (642) | 2026-10-21 | 3.94.0 | 100+ features, mainly controls; feed hiding not confirmed from the portion read | No price on listing | Not checked |
| [Clean YouTube](https://chromewebstore.google.com/detail/kalhfjomailhflienkfajocjodgjipie) | 30,000 | 4.85 (472) | 2026-10-30 | 1.9.9 | Recommendations, Shorts, comments, end-screen suggestions, home feed, thumbnails; "Clean Mode" player-only view | No price on listing | No repo found |
| [Block YouTube Feed](https://chromewebstore.google.com/detail/lcpclaffcdiihapebmfgcmmplphbkjmd) (by Unhook's publisher site) | 30,000 | 4.76 (118) | 2023-01-02 | 1.0.3 | Homepage feed, sidebar, end-screen feed only | No price on listing | No repo found |
| [DF Tube New](https://chromewebstore.google.com/detail/kchgllkpfcggmdaoopkhlkbcokngahlg) (focusapps.app; unrelated ID to original DF Tube) | 20,000 | 4.47 (251) | 2026-05-21 | 1.21.2 | Homepage grid, recommendations, related videos, Shorts, autoplay, optional comments and playlists | No price on listing | No repo found |
| [RYS, Remove YouTube Suggestions](https://chromewebstore.google.com/detail/cdhdichomdnlaadbndgmagohccgpejae) | 10,000 | 3.39 (155) | 2026-10-11 | 4.5.2 | Free: homepage, Shorts, sidebar, end-of-video, comments, search suggestions. 80+ options with scheduling | Freemium: sign in to enable 2 premium features free; Premium unlocks 60+ settings; price not captured | [lawrencehook/remove-youtube-suggestions](https://github.com/lawrencehook/remove-youtube-suggestions): 586 stars, MPL-2.0, last commit 2026-10-11 |
| [DF Tube fork](https://chromewebstore.google.com/detail/mcigjliffjfjceioeeiolliiimglknji) (same original name, self-described open-source MV3 update) | 741 | 5.00 (4) | 2025-07-15 | 1.0.0 | As original DF Tube | No price on listing | Repo not located |
| [DF UTube](https://chromewebstore.google.com/detail/pdghefcfhalghbefjcplkcmadcjgnnai) (self-described DF Tube replacement) | 1,000 | 4.09 (11) | 2024-10-04 | 1.1 | As original DF Tube | No price on listing | No repo found |

**DF Tube original:** the [original listing](https://chromewebstore.google.com/detail/mjdepdfccjgcndkmemponafgioodelna) (ID `mjdepdfccjgcndkmemponafgioodelna`) no longer resolves. It redirects to the store's `empty-title` page, the same page returned by a made-up control ID. An older indexed snippet showed about 400,000 users and 997 ratings ([cached listing](https://chrome.google.com/webstore/detail/df-tube-distraction-free/mjdepdfccjgcndkmemponafgioodelna?hl=en-US)), undated. DF UTube's listing says the original by "calkuta" is "no more compatible with recent Chrome Manifest version" ([listing](https://chromewebstore.google.com/detail/pdghefcfhalghbefjcplkcmadcjgnnai)).

#### X/Twitter

| Extension | Users | Rating (ratings) | Updated | Version | Surfaces claimed | Pricing | Source code |
|---|---|---|---|---|---|---|---|
| [Control Panel for Twitter](https://chromewebstore.google.com/detail/kpmjjdhbcfebfjgdnpjagcndoelnidfj) | 200,000 | 4.62 (954) | 2026-10-12 | 4.25.1 | Hides "For you" and forces Following by default; retweets, "Who to follow", sidebar, Explore contents, Grok, Premium upsells and replies | No price on listing | [insin/control-panel-for-twitter](https://github.com/insin/control-panel-for-twitter): 2,652 stars, MIT, last commit 2026-10-18 |
| [Minimal Theme for Twitter / X](https://chromewebstore.google.com/detail/pobhoodpcipjmedfenaigbeloiidbflp) (by Typefully) | 30,000 | 4.59 (264) | 2026-08-19 | 6.5.0 | Timeline tabs, promoted posts, trends sidebar, nav items, view and vanity counts. Declutter tool | No price on listing | Not checked |
| [Remove X For You Tab](https://chromewebstore.google.com/detail/dokjpibnnijhngancgplopcbealjlegb) | 4,000 | 4.23 (60) | 2026-02-01 | 2.0.1 | "For You" tab only; no settings; English X only | No price on listing | No repo found |
| [Hide X Twitter Elements](https://chromewebstore.google.com/detail/bkjfgbniifclpfjdpbjcebndlimfkkeg) | 2,000 | 3.54 (35) | 2026-10-30 | 2.14.7 | Sidebar, Who to follow, Topics carousel, counts, Focus Mode | No price on listing | Not checked |
| [Clean Twitter](https://chromewebstore.google.com/detail/lbbfmkbgembfbohdadeggdcgdkmfdmpb) | 2,000 | 5.00 (8) | 2026-10-23 | 0.19.5 | Right sidebar, left-nav items, ads | No price on listing | [rxliuli/clean-twitter](https://github.com/rxliuli/clean-twitter): 18 stars, GPL-3.0, last commit 2026-10-24 |
| [Bye For You](https://chromewebstore.google.com/detail/fjliicemokgekhghidligclkcapijldf) | 497 | 5.00 (9) | 2026-07-24 | 0.2.2 | "For You" tab, multi-language | No price on listing | No repo found |
| [Twitter/X Feed Blocker](https://chromewebstore.google.com/detail/iofjnhbihgjfhdldcnlmjbfmighljfob) | 387 | 4.75 (4) | 2024-11-24 | 1.0 | Entire main feed | No price on listing | [akhileshthite/x-feed-blocker](https://github.com/akhileshthite/x-feed-blocker): 1 star, MIT, last commit 2024-11-24 |
| [X (Twitter) Cleaner](https://chromewebstore.google.com/detail/nejdcgfebfamlgpggncmbpkcnefaiemk) | 279 | 5.00 (9) | 2026-03-23 | 2.0.0 | Entire timeline, trends, premium promos, live content | No price on listing | [BaskLash/X-Feed-Cleaner](https://github.com/BaskLash/X-Feed-Cleaner): 0 stars, MIT, last commit 2026-09-12 |
| [Birdfeed](https://chromewebstore.google.com/detail/njobnbaideimpbcekljdgecnbpkmoplm) | 18 | none | 2026-08-14 | 4.24.1 | Fork of Control Panel for Twitter | No price on listing | Repo not located |

Birdfeed's listing says Control Panel for Twitter "is only getting sporadic updates", but GitHub shows [v4.25.0 and v4.25.1 released in October 2026](https://github.com/insin/control-panel-for-twitter/releases). A separate item, "twitter for you feed remover", is flagged "Could be malicious" and shown as removed by [ExtensionAuditor](https://extensionauditor.com/scan/twitter-for-you-feed-remover-kdhgfmpcjmpjbppjmnblghmlkogjnflc), a third party I did not corroborate.

#### Facebook

| Extension | Users | Rating (ratings) | Updated | Version | Surfaces claimed | Pricing | Source code |
|---|---|---|---|---|---|---|---|
| [Fluff Busting Purity (F.B. Purity)](https://chromewebstore.google.com/detail/nmkinhboiljjkhaknpaeaicmdjhagpep) | 100,000 | 3.97 (3,110) | 2026-01-17 | 38.4.0.0 | Ads, sponsored posts, game spam; developer site adds Reels, Stories and feed filtering. A filter, not a full feed hider per listing | Free, donations ([install page](https://www.fbpurity.com/install.htm)) | No repo found |
| [F.Block Sponsored](https://chromewebstore.google.com/detail/njcnnfelhkehnacoabhefefkbmloakkf) | 10,000 | 4.31 (605) | 2026-10-17 | 4.6.0 | Sponsored and suggested posts, banner ads, any language. Does not claim to hide the feed | Listing solicits support; no price seen | No repo found |
| [Facebook Reels Blocker](https://chromewebstore.google.com/detail/ilebchhcbmejmeakfnmmmhjneobllhpn) | 6,000 | 3.15 (66) | 2025-08-27 | 2.4.0 | Blurs Reels and Shorts | No price on listing | No repo found |
| [Hide Reels, Feeds, and Stories on Facebook](https://chromewebstore.google.com/detail/amlhflamnmllpgpcpicpbcfpoggidfjn) | 159 | 5.00 (3) | 2026-06-01 | 1.0.0 | Home feed, Stories, Reels, plus blocking of Reels URLs; keeps Marketplace, Groups, Messages | Listing says no subscriptions | No repo found |
| [Facebook Reset & Feed Control](https://chromewebstore.google.com/detail/aedbhppfjmagggfkhpbpfeahebjkdenk) | 140 | 3.67 (3) | 2026-10-28 | 0.11.2 | Ads, suggestions, People You May Know, Reels, keyword muting | Free tier; no subscription; manifest references Gumroad, so a paid unlock is likely | No repo found |
| [FB Feed Filter](https://chromewebstore.google.com/detail/npmpppkiopdofkkhlfkjbogigbpcefoj) | 67 | none | 2026-10-22 | 1.2.0 | Reels, Sponsored, suggested | Free plus one-time Pro; price not captured | No repo found |
| [cleanbook](https://chromewebstore.google.com/detail/onpenpogbepamnaobmbbjiehbcmheccd) | 8 | none | 2022-06-23 | 0.0.5 | Suggested, sponsored, Reels | Free | [prashsaka/cleanbook](https://github.com/prashsaka/cleanbook): 0 stars, MIT, last commit 2022-06-21 |

F.B. Purity's developer news shows the last post as [v38.4.0, 2026-01-15, fixing broken Newsfeed filtering](https://www.fbpurity.com/news/), after fixes on 2025-11-19 and 2025-10-12. Its older store removal is historical, not current: the developer reported [Google removing it from the store](https://www.fbpurity.com/news/google-have-removed-fb-purity-from-the-chrome-webstore/) after a Facebook trademark complaint, and reported reinstatement dated 2019-05-23 (developer-only account, found via [search of fbpurity.com](https://www.fbpurity.com/news/tag/google/)). The current [install page](https://www.fbpurity.com/install.htm) sends Chrome users to the Web Store, and the live listing names fbpurity.com as its site.
Social Fixer: the [developer's site](https://socialfixer.com/) shows current version 31.1.0 dated 2023-09-08. No Social Fixer item appeared in my store harvest, including a direct "social fixer" store search.

#### Instagram

| Extension | Users | Rating (ratings) | Updated | Version | Surfaces claimed | Pricing | Source code |
|---|---|---|---|---|---|---|---|
| [Antigram](https://chromewebstore.google.com/detail/igbheapdmolhhmmklmkfjjjncmhihfjh) | 40,000 | 4.75 (296) | 2025-05-25 | 2.1.0 | Reels page, Explore page, Stories, entire Posts feed, suggested followers, Threads links; redirect to Following | Free per listing | [aymyo/antigram-extension](https://github.com/aymyo/antigram-extension): 78 stars, no license detected, last commit 2026-10-27 |
| [GramControl](https://chromewebstore.google.com/detail/opfbphbmpekblencogampchiepebfmnm) | 727 | 4.40 (5) | 2026-08-02 | 4.0.5.0 | Explore and Reels links, suggested posts, comments, suggested friends | No price on listing | [Thinkorswim/gram-control](https://github.com/Thinkorswim/gram-control): 5 stars, GPL-3.0, last commit 2026-08-02 |
| [Instagram Feed Blocker](https://chromewebstore.google.com/detail/ciacgjalpjpjknlcolalnloijhloapjo) | 529 | 4.20 (5) | 2026-10-03 | 1.1.2 | Main feed, Explore, Reels; keeps DMs | No price on listing | No repo found |
| [Distraction-Less IG](https://chromewebstore.google.com/detail/ecpebopfgbphjkhcdkbilmeeilakfndm) | 507 | 4.00 (4) | 2025-03-04 | 1.1.1 | Suggested posts and profiles, Explore, Reels, Stories | No price on listing | No repo found |
| [InstaBlocker](https://chromewebstore.google.com/detail/hdpncmeafjdhdakcmhgfekddpnkehpdg) | 387 | 5.00 (3) | 2026-04-19 | 3.0.4 | Feed, posts, Stories, Reels, chats, Explore; password lock | No price on listing | No repo found |
| [Untrap Insta](https://chromewebstore.google.com/detail/fbkdkpeadbfdkokobbjinbnlimpdhleo) | 134 | 5.00 (1) | 2025-12-09 | 1.0.0 | Reels and Explore buttons | Free | [matiso23/untrap-insta](https://github.com/matiso23/untrap-insta): 2 stars, license NOASSERTION, last commit 2025-12-08 |

Antigram's repo has commits as recent as 2026-10-27 while its store build is dated 2025-05-25.

[Feed Sorter for TikTok & Instagram](https://chromewebstore.google.com/detail/bmljpagafjlkebnopbdncpnifkknlobk) (100,000 users) appears high in host-based results but is a feed sorter, not a blocker.

#### Reddit

| Extension | Users | Rating (ratings) | Updated | Version | Surfaces claimed | Pricing | Source code |
|---|---|---|---|---|---|---|---|
| [Distraction Free Reddit](https://chromewebstore.google.com/detail/dgllcfdfcgnocdmmglnpbpoalhpdfckg) | 4,000 | 4.29 (31) | 2026-08-30 | 1.4.0 | Main feed, r/all and popular, profiles, full-page search, sidebar, comments; whitelist or blacklist mode | No price on listing | No repo found |
| [Reddit Liberation: Feed Blocker](https://chromewebstore.google.com/detail/fllfmdjhnhhjokhdifhcdbpbfajfnhon) | 4,000 | 4.49 (86) | 2025-03-11 | 1.0.4 | Feeds; keeps comment threads from external links; subreddit whitelist and blacklist | No price on listing | No repo found |
| [Unhook for Reddit](https://chromewebstore.google.com/detail/mbihiifgeodcdgdlklkbmoinbgffdbeb) | 579 | 4.71 (14) | 2026-04-02 | 1.2.3 | Home feed, galleries, subreddit feeds, trending searches; settings lock | No price on listing | No repo found |
| [FrontFilter](https://chromewebstore.google.com/detail/ekjnpdhgghniefiljlfopdjgoegneiie) | 21 | none | 2026-10-17 | 2.4.0 | Home, Popular, Explore, News, subreddit front pages; scroll limits; filters | Free | [fabiomolignoni/FrontFilter](https://github.com/fabiomolignoni/FrontFilter): 1 star, MPL-2.0, last commit 2026-10-12 |
| [Reddit Enhancer](https://chromewebstore.google.com/detail/onglbklimdjicpdadjieknodkkmjldoa) | 10,000 | 4.44 (122) | 2026-08-14 | 3.5.1 | Promoted and recommended posts, UI elements. Customizer, not a feed hider | No price on listing | No repo found |
| [Reddit Enhancement Suite](https://chromewebstore.google.com/detail/kbmfpngjjgdllneeigpgjifpgocmfgmb) | 1,000,000 | 4.10 (4,239) | 2026-10-28 | 5.24.14 | General suite, not a feed hider per listing. Listing says it targets old Reddit and "most functionality will not work on the redesign" | No price on listing | [honestbleeps/Reddit-Enhancement-Suite](https://github.com/honestbleeps/Reddit-Enhancement-Suite): 4,544 stars, GPL-3.0, last commit 2026-10-31 |

RES announced [maintenance mode in January 2022](https://alternativeto.net/news/2022/2/reddit-enhancement-suite-will-go-on-life-support-maintenance-mode--no-new-features-implemented/); I found no announcement reversing it.

#### LinkedIn

| Extension | Users | Rating (ratings) | Updated | Version | Surfaces claimed | Pricing | Source code |
|---|---|---|---|---|---|---|---|
| [LinkOff](https://chromewebstore.google.com/detail/maanaljajdhhnllllmhmiiboodmoffon) | 3,000 | 3.93 (59) | 2026-06-26 | 1.15.0 | Whole feed or filter by type or keyword, company posts, Premium upsells | Free, no ads per listing | [njelich/LinkOff](https://github.com/njelich/LinkOff): 227 stars, MIT, last commit 2026-06-25 |
| [LinkedIn Feed Blocker](https://chromewebstore.google.com/detail/dijpdmknlincdehpemajfobhfcmjkhof) (fumi-nozawa.space) | 1,000 | 4.72 (18) | 2026-10-23 | 1.3.1 | linkedin.com/feed only | No price on listing | No repo found |
| [Distraction Free for LinkedIn](https://chromewebstore.google.com/detail/kigfnbfbpfpgphbocdkmeablbgdbpfke) | 1,000 | 4.44 (18) | 2026-06-21 | 3.5 | Newsfeed, suggested news, ads, suggested people; toggle | Free per listing | [mthurmond/distraction-free-for-linkedin](https://github.com/mthurmond/distraction-free-for-linkedin): 11 stars, MIT, last commit 2026-06-20 |
| [LinkedIn Feed Blocker Extension](https://chromewebstore.google.com/detail/ndihnjghgamcibkommlhbfcimaajgjdp) | 573 | 2.09 (11) | 2024-07-09 | 1.0 | Feed | No price on listing | No repo found |
| [News Feed Eradicator for LinkedIn](https://chromewebstore.google.com/detail/fidhapljfpiokcokoijomjmgjfnaccec) | 284 | 4.80 (5) | 2022-11-03 | 1.4 | News feed | No price on listing | No repo found |
| [LinkedIn Feed Cleaner](https://chromewebstore.google.com/detail/pbndhpnajpcnaijjacmknamlpjmfgpkh) | 227 | 4.25 (8) | 2026-10-22 | 3.3.0 | Sponsored, suggested, activity posts; keyword mute. Does not hide the whole feed | Free up to a 500-post limit, then Premium; price not captured | No repo found |
| [LinkedIn Feed Hider](https://chromewebstore.google.com/detail/cnlacdcphogkgibckgbkfkpghldbklhk) | 194 | 3.57 (7) | 2025-10-17 | 2.1.0 | Main feed, company feeds, profile activity | No price on listing | No repo found |

#### TikTok

| Extension | Users | Rating (ratings) | Updated | Version | Surfaces claimed | Pricing | Source code |
|---|---|---|---|---|---|---|---|
| [TikTok Feed Blocker](https://chromewebstore.google.com/detail/hjagmapcdgdffjbbedipfoocmkmhbjeh) | 1,000 | 4.83 (12) | 2026-09-15 | 1.4.2 | Home, Explore, Live pages individually; mutes audio there | No price on listing | No repo found |
| [TikTok Web Helper](https://chromewebstore.google.com/detail/hipaaaliocmodmchddpkjbehjpbejghi) | 157 | 5.00 (1) | 2026-04-05 | 0.4.2 | Clean modes, keyword hide, sponsored skip. Not a feed blocker | No price on listing | No repo found |
| [TikTok Unhook](https://chromewebstore.google.com/detail/kdalbbipemjjagcgjkmbgkimkcbialia) | 47 | none | 2026-09-29 | 1.3.5 | For You feed, Explore, comments, vanity metrics; lands on profile | No price on listing | Claims open source; repo not located |
| [TikBlock](https://chromewebstore.google.com/detail/mahohalbnbjnbecgahnjjipkjpmhnhka) | 12 | 5.00 (2) | 2026-08-22 | 1.2.1 | Blocks all of TikTok except whitelisted videos, creators and pages | No price on listing | No repo found |

#### Other sites of note

| Extension | Site | Users | Rating (ratings) | Updated | Surfaces claimed |
|---|---|---|---|---|---|
| [Unwanted Twitch](https://chromewebstore.google.com/detail/egbpddkgpjmliolmpjenjomflclekjld) | Twitch | 20,000 | 3.19 (336) | 2025-11-07 | Hides streams, games, categories, channels, tags you choose; listing calls itself best-effort |
| [Twitch Hide Recommended](https://chromewebstore.google.com/detail/ljimojeoadeiidhochpjmkpaccmkboei) | Twitch | 676 | 3.75 (20) | 2026-04-17 | Sidebar Recommended Categories, Live Channels, Viewers Also Watch, Offline. Manifest includes a third-party analytics worker host |
| [Pinterest Feed Blocker](https://chromewebstore.google.com/detail/jnoicogkmhaflcjdifmmlkpikcllanlm) | Pinterest | 461 | 5.00 (10) | 2025-08-04 | Main feed, recommendations, related images |
| [BlockedStack](https://chromewebstore.google.com/detail/djnfpfgbiimojakglbbhgoimdepgmcok) | Substack | 443 | 5.00 (3) | 2026-02-22 | Keyword filter for Notes, not a feed hider |
| [Substack Zen](https://chromewebstore.google.com/detail/mmnonjdcjfjhklcjgkobogimcmohofah) | Substack | 135 | 5.00 (2) | 2024-10-31 | Function not reviewed |

### Inferences
- The market splits into three kinds of tool: true feed removers (Unhook, Antigram, LinkOff), algorithm filters that keep the feed (Control Panel for Twitter's Following default, F.B. Purity, F.Block Sponsored), and rule-based blockers (BlockTube, YTBlock). Only the first group truly competes on "hide the feed".
- Unhook's combination of reach, rating and minimal permissions (`storage`, `webRequest`, YouTube hosts only) makes it the benchmark. Its 7-month gap since the last update is modest but worth monitoring.
- UnTrap's 2.55 rating at 100,000 users is the lowest among the large YouTube tools. Its Pro model may be a factor, but I did not analyze review text.

### Gaps
- Written review counts separate from rating counts could not be read from the listing data.
- Which surfaces actually work today was not tested. All surface lists are listing claims.
- Several "No repo found" entries mean the listing named no repo and my search found none, not that a repo definitely does not exist. GitHub keyword search returned little, so this is a weak negative.

## What are each extension's Chrome Web Store user count, rating, review count, and last updated date?

### Takeaway
Exact figures for every leading extension are in the tables above, all read from live listings on 2026-10-31. A separate written-review count was not available, so ratings counts are used.

### Cited Findings
- Largest single-site listings relevant to feed hiding: [Unhook](https://chromewebstore.google.com/detail/khncfooichmfjbepaaaebmommgaepoid) 1,000,000 users, 4.86 from 4,613 ratings, updated 2026-03-21; [Enhancer for YouTube](https://chromewebstore.google.com/detail/ponfpcnoihfmfllpaingbgckeeldkhle) 1,000,000 users, 4.47 from 17,570 ratings, updated 2026-07-15.
- Unhook's own [site](https://unhook.app/) claims 1,000,000+ active users and 5,000+ reviews, while the store shows 4,613 ratings. The site figure may span several browser stores.
- Stale among notable listings: [Block YouTube Feed](https://chromewebstore.google.com/detail/lcpclaffcdiihapebmfgcmmplphbkjmd) (2023-01-02), [News Feed Eradicator for LinkedIn](https://chromewebstore.google.com/detail/fidhapljfpiokcokoijomjmgjfnaccec) (2022-11-03), [Twitter/X Feed Blocker](https://chromewebstore.google.com/detail/iofjnhbihgjfhdldcnlmjbfmighljfob) (2024-11-24), [Reddit Liberation](https://chromewebstore.google.com/detail/fllfmdjhnhhjokhdifhcdbpbfajfnhon) (2025-03-11), [Antigram](https://chromewebstore.google.com/detail/igbheapdmolhhmmklmkfjjjncmhihfjh) (2025-05-25).

### Inferences
- User counts under 1,000 appear exact, while larger values are visibly rounded, so comparisons near round numbers (for example two "4,000" Reddit tools) are not meaningful.
- Selector-based extensions depend on site markup, so an update date over a year old is a real functional risk for them, even where the rating remains high.

### Gaps
- No historical user counts were collected, so growth or decline trends are unavailable.

## Is it Manifest V3 compatible and currently installable?

### Takeaway
Every live listing retrieved was MV3 (427 of 427), which matches Google's removal of remaining MV2 items from the store. Nine previously known items no longer resolve, including the original DF Tube, once a roughly 400,000-user listing.

### Cited Findings
- All 427 retrievable listings declared `manifest_version: 3` in their embedded manifest. This is a harvest of feed, distraction and site-related items, not the entire store — [example listing](https://chromewebstore.google.com/detail/khncfooichmfjbepaaaebmommgaepoid).
- Google's final MV2 phase ended 2026-08-31, with remaining MV2 extensions removed from the store; MV2 installs on Chrome 138 or earlier can remain but no longer receive updates — [GIGAZINE](https://gigazine.net/gsc_news/en/20260901-manifest-v2-extensions); [AlternativeTo](https://alternativeto.net/news/2026/9/google-has-removed-manifest-v2-extensions-from-chrome-web-store-including-ublock-origin/).
- These nine IDs returned the store's `empty-title` page, identical to a made-up control ID, on 2026-10-31:
  - [DF Tube original](https://chromewebstore.google.com/detail/mjdepdfccjgcndkmemponafgioodelna) (YouTube)
  - [Mindful Instagram](https://chromewebstore.google.com/detail/dnaalclphknocpmpjbllahpidpnoimgi) (Instagram)
  - [No Feed LinkedIn](https://chromewebstore.google.com/detail/fhjdnnefemijiadjmmafafonjoicedhd) (LinkedIn)
  - [No Feed For LinkedIn](https://chromewebstore.google.com/detail/mdiameigbpopeikepdojagjaicekkkgm) (LinkedIn)
  - [Feed Blocker for LinkedIn](https://chromewebstore.google.com/detail/eikaafmldiioljlilngpogcepiedpenf) (LinkedIn)
  - [RemoveIt](https://chromewebstore.google.com/detail/gebhiknccbloijochhholhohglfdmahi) (Reddit)
  - [Less Distracting Reddit](https://chromewebstore.google.com/detail/ililagkodjpoopfjphagpamfhfbamppa) (Reddit)
  - [Redirect from Reddit newsfeed](https://chromewebstore.google.com/detail/knngnffeaifdcfgomlldchhmmgdlicdm) (Reddit)
  - [TikTok Eradicator](https://chromewebstore.google.com/detail/dfenmdjldedloklnjjkdaaomifnggiio) (TikTok)
- Enhancer for YouTube is live on Chrome as MV3 ([listing](https://chromewebstore.google.com/detail/ponfpcnoihfmfllpaingbgckeeldkhle)), though it was reported removed from Mozilla's add-on site ([Mozilla Discourse](https://discourse.mozilla.org/t/enhancer-for-youtube-is-gone/123749)).

### Inferences
- The MV2 purge is the likely cause for at least some of the nine disappearances, especially DF Tube, but no source gives a removal reason for any specific item.
- MV3 compliance is no longer a differentiator. Every option a user can install today clears it, so maintenance recency is the better quality signal.

### Gaps
- The store does not say why or when a listing disappeared, and whether existing installs still work could not be verified.
- The nine items were removed or unlisted; I could not distinguish between developer delisting, policy takedown and MV2 removal.

## What is the pricing, and is it open source (repo URL, license, last commit date, stars)?

### Takeaway
Most leading single-site tools are free or donation-funded; paid tiers appear mostly at the newer end, such as UnTrap, RYS, LinkedIn Feed Cleaner and FB Feed Filter. Open-source leaders are Reddit Enhancement Suite, Control Panel for Twitter, BlockTube, RYS and LinkOff. Unhook, Enhancer and F.B. Purity show no public repo.

### Cited Findings
- Repo URL, license, stars and last commit for each are in the per-site tables above. Ranked by stars: [Reddit Enhancement Suite](https://github.com/honestbleeps/Reddit-Enhancement-Suite) 4,544; [Control Panel for Twitter](https://github.com/insin/control-panel-for-twitter) 2,652; [BlockTube](https://github.com/amitbl/blocktube) 1,413; [RYS](https://github.com/lawrencehook/remove-youtube-suggestions) 586; [Control Panel for YouTube](https://github.com/insin/control-panel-for-youtube) 425; [LinkOff](https://github.com/njelich/LinkOff) 227; [Antigram](https://github.com/aymyo/antigram-extension) 78.
- Two public repos have no detected license through the GitHub API, so "open source" is not established for them: [Control Panel for YouTube](https://github.com/insin/control-panel-for-youtube) and [Antigram](https://github.com/aymyo/antigram-extension). A LICENSE file was not listed in the Control Panel for YouTube repo root in my check.
- Freemium confirmed: [UnTrap](https://untrap.app/); [RYS](https://chromewebstore.google.com/detail/cdhdichomdnlaadbndgmagohccgpejae); [LinkedIn Feed Cleaner](https://chromewebstore.google.com/detail/pbndhpnajpcnaijjacmknamlpjmfgpkh); [FB Feed Filter](https://chromewebstore.google.com/detail/npmpppkiopdofkkhlfkjbogigbpcefoj). [F-B Hide Recommendations and Reels](https://extscope.org/extension/bjcnfmeblkookbojbligodgcbninihmc) is labeled as having paid features by a third party.
- Donation-funded: [F.B. Purity](https://www.fbpurity.com/install.htm); [Unhook](https://microsoftedge.microsoft.com/addons/detail/unhook-remove-youtube-r/hebpjnnclppdnfghdnmhgdljmjpfhggk). One search found no premium tier for Unhook, and its [site](https://unhook.app/) lists no pricing, but this is not conclusive.
- An open-source Unhook alternative, [Unhook NG](https://addons.mozilla.org/firefox/addon/unhook-ng/), exists on Firefox under GPL-3.0; a Chrome listing was not confirmed.

### Inferences
- Pure feed hiding is effectively commoditized at $0, since the leaders in nearly every site are free. Paid tiers rely on add-ons like scheduling, sync, summaries and filtering rather than on hiding itself.

### Gaps
- Actual prices for UnTrap Pro, RYS Premium, FB Feed Filter Pro and LinkedIn Feed Cleaner Premium were not published on the pages read, so none are stated.
- Pricing for Enhancer for YouTube could not be confirmed. The old domain `enhancer-for-youtube.com` did not resolve, and the listing now names [mrfdev.com](https://www.mrfdev.com/), which I did not fetch.
- Any row marked "No price on listing" could still have in-extension payments.

## Which sites are well served, and which have only abandoned or weak options?

### Takeaway
YouTube is very well served and X is well served through one strong project. Instagram, Reddit and LinkedIn each have usable but small or partly stale options. Facebook lacks a credible full-feed hider, and TikTok has only very small tools.

### Cited Findings
- **YouTube, very strong:** at least eight listings at 30,000+ users with hiding features, several updated in October 2026 — see [Clean YouTube](https://chromewebstore.google.com/detail/kalhfjomailhflienkfajocjodgjipie) and [Control Panel for YouTube](https://chromewebstore.google.com/detail/lodcanccmfbpjjpnngindkkmiehimile).
- **X, strong but concentrated:** one 200,000-user open-source leader, then a steep drop; whole-feed removal is available only in tiny tools such as [X (Twitter) Cleaner](https://chromewebstore.google.com/detail/nejdcgfebfamlgpggncmbpkcnefaiemk) (279 users) and [Twitter/X Feed Blocker](https://chromewebstore.google.com/detail/iofjnhbihgjfhdldcnlmjbfmighljfob) (387, last updated 2024).
- **Facebook, weak for feed hiding:** the leader is a filter last updated 2026-01-17 ([listing](https://chromewebstore.google.com/detail/nmkinhboiljjkhaknpaeaicmdjhagpep)), its developer reports Facebook continually breaking filters ([news](https://www.fbpurity.com/news/)), F.Block Sponsored warns of the same arms race ([listing](https://chromewebstore.google.com/detail/njcnnfelhkehnacoabhefefkbmloakkf)), and the tool explicitly hiding the Home Feed has 159 users ([listing](https://chromewebstore.google.com/detail/amlhflamnmllpgpcpicpbcfpoggidfjn)). Social Fixer's site shows no version newer than 2023 ([site](https://socialfixer.com/)).
- **Instagram, adequate with a risk:** Antigram is the only tool above 1,000 users that is a true blocker, and its store build dates from 2025-05-25 ([listing](https://chromewebstore.google.com/detail/igbheapdmolhhmmklmkfjjjncmhihfjh)).
- **Reddit, adequate but thin:** two 4,000-user tools ([Distraction Free Reddit](https://chromewebstore.google.com/detail/dgllcfdfcgnocdmmglnpbpoalhpdfckg) is maintained; [Reddit Liberation](https://chromewebstore.google.com/detail/fllfmdjhnhhjokhdifhcdbpbfajfnhon) was last updated in March 2025). RES's 1,000,000 users do not translate, as it targets old Reddit ([listing](https://chromewebstore.google.com/detail/kbmfpngjjgdllneeigpgjifpgocmfgmb)). Less Distracting Reddit and RemoveIt no longer resolve.
- **LinkedIn, adequate but small:** maintained options exist ([LinkOff](https://chromewebstore.google.com/detail/maanaljajdhhnllllmhmiiboodmoffon), [Distraction Free for LinkedIn](https://chromewebstore.google.com/detail/kigfnbfbpfpgphbocdkmeablbgdbpfke)), but the leader has 3,000 users and rates 3.93. Three older LinkedIn listings no longer resolve.
- **TikTok, weakest major site:** the top true blocker has 1,000 users ([listing](https://chromewebstore.google.com/detail/hjagmapcdgdffjbbedipfoocmkmhbjeh)) and TikTok Eradicator no longer resolves.
- **Long tail:** Twitch has moderate coverage ([Unwanted Twitch](https://chromewebstore.google.com/detail/egbpddkgpjmliolmpjenjomflclekjld)), and Pinterest has one small but rated tool ([listing](https://chromewebstore.google.com/detail/jnoicogkmhaflcjdifmmlkpikcllanlm)). Store searches for Threads, Bluesky, Hacker News, Netflix and Snapchat surfaced no single-site feed hider of note.

### Inferences
- The largest openings for a new single-site entrant by supply gap are TikTok, Facebook full-feed hiding, and whole-feed removal on X. Demand for these on desktop was not measured, and TikTok and Instagram use is likely mobile-heavy, which may explain their small desktop tool base.
- Multi-site tools, covered by the other researcher, may already fill some of these gaps, so the single-site view alone overstates the openings.

### Gaps
- No usage demand data per site was collected.
- Roundup articles from 2025-2026 were not used. Search returned low-quality or content-farm roundups, so primary listings carry the analysis.
- The harvest depends on store search returning about 10 results per query, so a small-but-notable extension with unusual naming could be missing.
