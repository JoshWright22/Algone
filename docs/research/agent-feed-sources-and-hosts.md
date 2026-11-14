# Agent feed: content sources, personalized access, and host UIs

Research for an open-source, free MCP server that recommends content like a TikTok or YouTube feed, drawing on many sites. The connected agent learns the user's preferences. Constraints: no paid APIs, no scraping behind logins.

Date: 2026-11-10. Live tests were run with curl from Josh's Windows PC (residential IP) on that date. Status codes are recorded as `HTTP nnn`. **[unverified]** marks claims that rest on memory or a single secondary source, not on a test or primary doc.

---

## 0. Bottom line

- **Public discovery works without keys on about 12 sources**, tested today: YouTube channel RSS, Bluesky AppView, Mastodon trends, HN (Firebase + Algolia), Lobsters, Dev.to, arXiv, PeerTube/Sepia Search, Apple podcast search and charts, Medium tag RSS, Google News RSS, and Lemmy. Reddit is unreliable: keyless `.json` is dead (`HTTP 403`) and RSS sometimes works.
- **The user's real personalized feed is the hard part.** Official APIs that act as the user are free and practical only on Bluesky and Mastodon. YouTube OAuth works, but a shipped client ID needs Google verification, or each user has to make their own Cloud project. Reddit now requires manual approval for any API use. X is pay-per-use only. Spotify dev mode needs a Premium owner and allows only 5 users. Instagram, TikTok, Facebook, Threads, and LinkedIn have no consumer feed API.
- **Recommended access strategy (layered):** (1) the user's own browser through Algone's existing MV3 extension, which reads feed items the user already sees and posts them to a localhost MCP server; (2) a one-time data-export import (Takeout and similar) for cold start; (3) keyless public endpoints for discovery and freshness; (4) optional OAuth only where it is free and open (Bluesky, Mastodon, optionally YouTube). Do not use browser-automation MCPs on logged-in profiles, or Invidious, Piped, Redlib, or Nitter.
- **UI:** MCP Apps (the 2026-01-26 standard) render in ChatGPT, Claude web and desktop, VS Code Copilot, Cursor, Goose, M365 Copilot, and T3 Code. They do not render in Claude Code. In the consumer Gemini app, support is not documented (it is documented only for Gemini Enterprise). Buttons can call server tools (`tools/call`, with `visibility: ["app"]` tools). Inline YouTube playback is unreliable: Claude ignores `frameDomains` for most custom connectors, and ChatGPT reviews third-party frames. Plan on link-out, with thumbnails, as the default.

---

## 1. Content sources (keyless public access)

Legend: **Disc.** = discovery beyond subscriptions (T = trending/popular, S = search, R = related/suggested).

| Platform | Keyless endpoint (tested) | Status today | Metadata | Disc. | Limits / ToS notes |
|---|---|---|---|---|---|
| YouTube | `youtube.com/feeds/videos.xml?channel_id=UC…` | `HTTP 200` (Fireship). `?user=`, `UULF…`/`UUSH…` playlist IDs, and one stale channel ID returned `HTTP 404` | title, channel, published, `hqdefault.jpg` thumbnail, description, **views** and **likes** (`media:statistics`, `starRating count`). **No duration**, no Shorts flag | None keyless (Trending page removed July 2025, replaced by music/trailer/podcast Charts [support.google.com/youtube/answer/9014376](https://support.google.com/youtube/answer/9014376)) | Last 15 uploads per channel. oEmbed `youtube.com/oembed?url=…` `HTTP 200` (title, author, thumbnail). Data API v3 needs a key: `videos.list chart=mostPopular` without a key = `HTTP 403` |
| YouTube Data API v3 (key) | `googleapis.com/youtube/v3/...` | needs free key | full: duration, stats, topics | T (`chart=mostPopular`), S, channel search | 10,000 units/day. **`search.list` now has its own bucket of 100 calls/day at 1 unit each** (this replaces the older "100 units per search" rule) [developers.google.com/youtube/v3/determine_quota_cost](https://developers.google.com/youtube/v3/determine_quota_cost). `videos.list`, `subscriptions.list`, `playlistItems.list` = 1 unit. The API policies require refreshing or deleting stored API data within 30 days [developer-policies](https://developers.google.com/youtube/terms/developer-policies) |
| Reddit | `reddit.com/r/<sub>/.rss`, `/r/popular/.rss` | first call `HTTP 200`; repeats `HTTP 429` and then `HTTP 403` "blocked due to a network policy". `.json` and `api.reddit.com` = `HTTP 403` | Atom: title, author, link, HTML body with thumbnail. No score | T (`/r/popular`) in RSS only, unreliable | Keyless `.json` has been dead since about May 2026 [prowlo.com/blog/reddit-data-api](https://prowlo.com/blog/reddit-data-api) **[secondary]**. The OAuth free tier is 100 QPM per client, non-commercial, and **requires manual approval under the Responsible Builder Policy** [support.reddithelp.com/…/Responsible-Builder-Policy](https://support.reddithelp.com/hc/en-us/articles/42728983564564-Responsible-Builder-Policy) |
| Bluesky | `public.api.bsky.app/xrpc/app.bsky.feed.getFeed?feed=…whats-hot`, `getAuthorFeed`, `unspecced.getTrendingTopics`, `getSuggestedFeeds`, `getPopularFeedGenerators`, `actor.searchActors`; profile RSS `bsky.app/profile/<h>/rss` | all `HTTP 200`. `feed.searchPosts` on `public.api.bsky.app` = `HTTP 403`, but on `api.bsky.app` = `HTTP 200` | text, author, avatar, embeds (images, external link cards, video), like/repost/reply counts | T, S, R (feed generators are custom algorithms) | Open protocol; reading public data is intended. Public AppView limit is about 3000 req/5 min per IP **[unverified]** |
| Mastodon / fediverse | `/api/v1/trends/statuses`, `/trends/links`, `/trends/tags`, `/timelines/tag/<tag>`, `/@user.rss`, `/api/v1/directory`, `/api/v2/search?type=accounts` | all `HTTP 200` on mastodon.social. `/timelines/public` = `HTTP 422` "requires an authenticated user" on mastodon.social, `HTTP 200` on fosstodon.org. Status search without auth returns empty results | text, author, media attachments, link cards, boost/fav counts | T (per instance), S (accounts and tags only without auth), R (directory) | Header `x-ratelimit-limit: 300` (per 5 min, per IP). Instance-dependent; respect each instance's policy |
| Lemmy (bonus) | `lemmy.world/api/v3/post/list?sort=Hot` | `HTTP 200` | title, url, thumbnail, score, comments | T, S | open API |
| Hacker News | Firebase `hacker-news.firebaseio.com/v0/topstories.json`; Algolia `hn.algolia.com/api/v1/search?tags=front_page`, `?query=` | `HTTP 200` | title, url, author, points, comments | T, S | Algolia about 10k req/hour per IP **[unverified]** |
| Lobsters | `lobste.rs/hottest.json`, `/t/<tag>.rss` | `HTTP 200` | title, url, tags, score, comments | T, tag feeds; search is HTML only | small site, poll gently |
| Podcasts | Apple `itunes.apple.com/search?media=podcast`, `/lookup?id=…&entity=podcastEpisode`, charts `rss.applemarketingtools.com/api/v2/us/podcasts/top/…` and `itunes.apple.com/us/rss/toppodcasts/genre=…/json`; gpodder `toplist/10.json`; each show's own RSS | all `HTTP 200`. Podcast Index without a key = `HTTP 401` (free key on signup) | title, artwork, episode duration, enclosure audio URL, description | T (charts), S, genre | Apple search about 20 calls/min **[unverified]**. The audio enclosure can play in an `<audio>` element |
| Blogs / news RSS | any `/feed`; Google News `news.google.com/rss/search?q=` | `HTTP 200` (platformer, stratechery, Google News) | title, summary, author, date, sometimes image | S (Google News) | Google News RSS is for personal use **[unverified]** |
| Substack | `<pub>.substack.com/feed`; undocumented `substack.com/api/v1/category/public/<id>/all` | feed `HTTP 200`; category API `HTTP 200` (573 KB) | full or truncated text, cover image | T by category (undocumented) | Paid posts are truncated in RSS. The category API is undocumented and could break or be disallowed |
| Medium | `medium.com/feed/tag/<tag>` | `HTTP 200` | title, snippet, author | tag feeds | |
| arXiv | `export.arxiv.org/api/query`, `rss.arxiv.org/rss/<cat>` | `HTTP 200` | title, authors, abstract | S, category | arXiv asks for about 1 request per 3 s |
| Dev.to | `dev.to/api/articles?top=7`, `?tag=`, `/feed/tag/<t>` | `HTTP 200` | title, cover image, tags, reactions, reading time | T, tag | public Forem API |
| PeerTube | `<instance>/api/v1/videos?sort=-trending`; `sepiasearch.org/api/v1/search/videos`, `/video-channels` | `HTTP 200` | title, channel, thumbnail, **duration**, views, likes, embed path | T, S across instances | Open source, embeddable, HLS/MP4 playable |
| Twitch | `api.twitch.tv/helix/*` | `HTTP 401` without a token | (with token) streams, viewers, thumbnails, games | T, S | Needs a free Client ID + app token (client credentials, no user login). Embeds require `parent=<embedding domain>` |
| TikTok | oEmbed `tiktok.com/oembed?url=` | `HTTP 200` per known URL; `/api/recommend/item_list` returns `{"status_code":0}` with no items; `/@user/rss` is just HTML | per-URL title, author, thumbnail | none keyless | Research API is academic only; Display API returns only the user's own videos **[unverified]** |
| Instagram | none | `?__a=1` returns error JSON; `web_profile_info` = `HTTP 404` | — | none | Basic Display API ended Dec 2024; Graph API covers only business/creator accounts' own media |
| X | oEmbed `publish.twitter.com/oembed` | `HTTP 200` per known URL. Profile page HTML `HTTP 200` but content is JS-only | per-URL HTML embed | none keyless | API is pay-per-use only since Feb 2026; no free tier [docs.x.com/x-api/getting-started/pricing](https://docs.x.com/x-api/getting-started/pricing). ToS bans scraping |
| Threads | none keyless | `threads.com/@zuck/rss` = `HTTP 404` | — | none | Threads API: own posts plus keyword search after app review **[unverified]** |
| Facebook | none | page `HTTP 400` | — | none | Graph API only for Pages you manage |
| LinkedIn | none | HTML login wall | — | none | No consumer feed API; ToS aggressively anti-scraping |
| Spotify | oEmbed `open.spotify.com/oembed` | oEmbed `HTTP 200`; Web API `HTTP 401` | per-URL title and thumbnail | via Apple/RSS for the same shows | Web API dev mode (since Feb/Mar 2026): owner must have Premium, 1 client ID, **max 5 users**, reduced endpoints [developer.spotify.com/…/february-2026-migration-guide](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide). Most podcasts on Spotify have an open RSS feed, found through Apple lookup (`feedUrl`) |

---

## 2. Getting the user's REAL personalized content (central question)

Josh's framing: the main blocker is logging the user in to get their actual content, and mapping or searching content on sites the server doesn't own.

### 2.1 The six access methods

| # | Method | What it gets | Legality / ToS | Reliability | Setup for a normal user | Privacy |
|---|---|---|---|---|---|---|
| 1 | Official OAuth API as the user | Subscriptions, follows, likes, sometimes home timeline | Clean where offered | High while terms hold; vendors change terms often (Reddit 2023/2026, X 2023/2026, Spotify 2026) | Low to high, depending on the vendor | Tokens are stored locally; data goes vendor → local |
| 2 | User's own logged-in browser plus an extension that reads the page and posts to a localhost MCP server | Exactly what the user sees: home feed, recommendations, subscriptions page, history page | Grey but lowest-risk of the unofficial options: no automated requests, no credentials leave the browser, personal use. ToS "no automated collection" clauses could be argued to apply to storing page data **[legal opinion, not verified]** | Medium: breaks when the DOM changes (Algone already maintains selectors) | Low: install the extension, done | Best: nothing leaves the machine |
| 3 | Data exports (Takeout etc.) | Full history: subscriptions, watch history, likes | Clean (GDPR/DMA portability) | One-time snapshot; takes hours to days | Medium: request, wait, upload a file | Good if parsed locally |
| 4 | Public keyless endpoints | Public posts of chosen creators, trending, search | Mostly clean (RSS and open APIs are offered for this) | Medium; Reddit is breaking | None | Good (no identity sent) |
| 5 | Browser-automation MCP driving the user's profile (Playwright MCP, Chrome DevTools MCP, Claude in Chrome) | Anything visible | **Violates** YouTube, X, Meta, TikTok, and LinkedIn ToS bans on automated access; risk of account flags or bans | Low: CAPTCHAs, slow, token-heavy | Medium | Poor: the agent sees the whole logged-in session |
| 6 | Third-party frontends (Invidious, Piped, Redlib, Nitter) | Public data via a proxy | Against the upstream ToS; YouTube actively blocks them | **Low**, tested today: `yewtu.be` search returned a captcha page; `inv.nadeko.net` `HTTP 403`; `pipedapi.kavin.rocks` `HTTP 403`; Piped instance list unreachable; `redlib.catsarch.com` `HTTP 429`; `xcancel.com` RSS `HTTP 451`; `nitter.net` `HTTP 200` HTML (content not checked). The Invidious instance list still works (`HTTP 200`) | None | Mixed |

### 2.2 Per-platform comparison (personalized access)

Ranked best-first within each row. Cost and quota are as of today.

| Platform | Best way to get the user's own feed / subs / history | OAuth reality | Export for cold start | Search for new items without owning the site |
|---|---|---|---|---|
| **YouTube** | (a) Extension reads `/`, `/feed/subscriptions`, `/feed/history` in the user's browser; (b) Takeout `subscriptions.csv`, then poll each channel's RSS keyless; (c) OAuth `subscriptions.list` (1 unit) | Scope `youtube.readonly` is a **sensitive** scope **[unverified classification]**. A shipped client ID without verification shows an "unverified app" screen and has a user cap (100) [support.google.com/cloud/answer/7454865](https://support.google.com/cloud/answer/7454865). In testing mode, refresh tokens expire after 7 days **[unverified]**. Verification needs a homepage, privacy policy, and demo video [sensitive-scope-verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification). A desktop/installed-app client ID with loopback redirect is a public client; shipping it in open source is normal [installed-apps](https://developers.google.com/youtube/v3/guides/auth/installed-apps). Alternative: each user creates their own Cloud project (too hard for normal users). The API exposes **no** home feed and **no** watch history | Takeout: `subscriptions.csv`, watch history (JSON/HTML), likes playlist **[format unverified]** | Data API `search.list`: **100 calls/day** per project. With a key shared by every user of an open-source app, that pool is too small, so each user brings their own key. InnerTube `youtubei/v1/search` POST works keyless (`HTTP 200`, 834 KB) but is undocumented and against the ToS (used by yt-dlp and NewPipe). Better: let the agent search the web, or use the extension to read the user's own YouTube search results page |
| **Reddit** | (a) Extension reads home and `/r/` pages; (b) data request export (subscribed subreddits, votes); (c) private RSS feed URLs from Reddit prefs (front page with feed token) **[unverified that this still exists in 2026]** | OAuth "installed app": free 100 QPM but **manual approval required for all access since 2025–26 (RBP)**; reports of multi-week waits and denials [redditapis.com](https://www.redditapis.com/answers/how-to-get-reddit-api-access) **[secondary]**. A shipped client ID would need approval for all users, so assume no | GDPR data request: CSVs of subscriptions, votes, saved items **[unverified]** | Keyless `search.json` is blocked; `search.rss` = `HTTP 429` today. Practical choices: extension, or per-subreddit RSS at low frequency |
| **X** | Extension only | Pay-per-use; "Owned Reads" cost $0.001/resource, but this is not free and not keyless | X archive (following, likes) | None free |
| **Instagram** | Extension only | No consumer API | "Download your information": following, liked posts, "your topics" **[unverified]** | None |
| **TikTok** | Extension only | Login Kit / Display API gives the user's own videos, not the feed **[unverified]** | Data export: watch history, likes, following (JSON) **[unverified]** | oEmbed per URL only |
| **Bluesky** | **OAuth or app password**: `getTimeline`, follows, likes, custom feeds. Free, no approval | ATproto OAuth needs no vendor approval; app passwords are simpler | CAR repo export | `searchPosts` (`api.bsky.app` `HTTP 200`), `searchActors`, feed generators |
| **Mastodon** | **OAuth**: the app registers itself dynamically per instance (`POST /api/v1/apps`); home timeline, follows, favourites. Free, no approval | Easy; user picks their instance | CSV export of follows | Status search needs auth (empty when anonymous); tag timelines and trends are keyless |
| **Spotify / podcasts** | Map the user's shows to open RSS (Apple lookup `feedUrl`); OPML import from any podcast app | Web API dev mode: Premium owner, 5 users max, so not shippable to the public | Spotify account data export (followed shows, streaming history) **[unverified contents]** | Apple search, Podcast Index (free key), charts |
| **Substack** | Per-publication RSS. The list of subscriptions comes from the extension (reading `substack.com/inbox`) or from the user pasting a list | No public API | No subscription export found **[unverified]** | Undocumented category/trending endpoints; Google News site search |

### 2.3 Extension → local MCP bridge (method 2) in detail

Algone already has the pieces. `packages/engine/src/healthy.ts` (`collectFeed`) reads up to 60 items (title, channel, URL) that the site already loaded, with no clicking or scrolling, and skips Shorts, Reels, and ads. `packages/engine/src/capture.ts` (`collectItems`) reads items using bundled selectors.

| Transport | How | Notes |
|---|---|---|
| localhost HTTP | Extension `fetch("http://127.0.0.1:<port>/ingest")` with a shared secret | Simplest. Needs `host_permissions` for localhost. The MCP server can be the same process (Streamable HTTP) |
| Native messaging | `chrome.runtime.connectNative` to a registered host binary | No open port, but installing it means a registry entry or manifest per browser, so more setup |
| Remote (for ChatGPT / Claude web) | Cloud hosts can't reach localhost; they need a tunnel or relay | Privacy cost; keep local-first and use Claude Desktop, VS Code, Cursor, and T3 Code for the local MCP |

ToS position: reading what the user's own browser rendered, for that user's private use, without extra requests, sits closest to "user agent" behavior and is the same pattern ad blockers and accessibility tools use. Still, avoid making the extension issue its own background requests to the site (that becomes automated access), avoid redistributing the content, and store only titles, URLs, and channels **[legal opinion]**.

### 2.4 Mapping interests to new creators

1. Seed: a topic and creator list from the export and extension captures (channels watched or liked most).
2. Expand: Bluesky `searchActors` and feed generators; Mastodon `directory` and tag timelines; Sepia Search channels; Apple podcast search by topic; HN/Lobsters/Dev.to tags; YouTube channel IDs found in Bluesky/Mastodon/HN links and in Google News results.
3. Let the agent do it: the connected agent has web search. Expose an `add_source(url)` tool so that when it finds a creator, the server resolves the feed (YouTube `@handle` page → `channel_id` → RSS; `@handle/rss` returned `HTTP 200`).
4. Validate: fetch 15 recent items and score them against the profile before adding.
5. "Related" signals come from the user's own browser: the extension reads YouTube's watch-page sidebar, which is the platform's own recommender, already personalized.

---

## 3. Discovery without subscriptions (keyless)

| Source | Endpoint | Kind |
|---|---|---|
| Bluesky | `getFeed` "whats-hot", `getTrendingTopics`, `getSuggestedFeeds`, `getPopularFeedGenerators`, `searchPosts` (api.bsky.app) | trending, search, algorithmic feeds |
| Mastodon | `/api/v1/trends/{statuses,links,tags}`, `/timelines/tag/x`, `/directory` | trending, tag, creators |
| HN / Lobsters / Dev.to / Lemmy | front page, hottest, top, Hot | popular |
| Reddit | `/r/popular/.rss` (unreliable) | popular |
| Podcasts | Apple charts by genre, gpodder toplist, Apple search | charts, search |
| PeerTube | `sort=-trending`, Sepia Search | trending, search |
| News/blogs | Google News RSS search, Medium tag RSS, Substack categories | search, topic |
| YouTube | **no keyless trending** (page removed 2025). Options: user's own key with `chart=mostPopular` (1 unit) and `search.list` (100/day); links to YouTube found on other platforms; extension reading the home feed | — |

---

## 4. Video playback inside agent hosts

| Option | ChatGPT | Claude (web/desktop) | VS Code / Cursor / T3 Code | Notes |
|---|---|---|---|---|
| YouTube iframe (`youtube-nocookie.com/embed`) | Nested frames are off by default and need `frameDomains`; "Plugins can embed pages from their MCP server's own registrable domain", and third-party frames get stricter review [security-privacy](https://developers.openai.com/apps-sdk/guides/security-privacy). Likely fine in developer mode, uncertain for public apps **[unverified]** | Custom connectors: "embedded sites are available to a limited set of organizations, and not in every conversation"; otherwise blocked silently [claude.com/docs/…/embedded-sites](https://claude.com/docs/connectors/building/mcp-apps/embedded-sites). A YouTube repro failed in [claude-code#59351](https://github.com/anthropics/claude-code/issues/59351) (closed for inactivity) | Untested; depends on host CSP | YouTube also needs a usable Referer, or it shows **Error 153**. Set `referrerpolicy="strict-origin-when-cross-origin"`. A sandboxed host frame may still fail **[unverified]** |
| `<video>`/`<audio>` direct media (PeerTube MP4/HLS, podcast MP3) | Works if the media origin is in `resourceDomains` (`media-src`) | Same | Same | The most reliable in-host playback path |
| Twitch embed | Needs `parent=` equal to the embedding domain; the host sandbox origin is host-generated, so likely broken **[unverified]** | Same | Same | Link out |
| Link out | `ui/open-link` (MCP Apps) or `openExternal` | `ui/open-link` | `ui/open-link` | **Default.** Host may ask the user to confirm |

Conclusion: plan for thumbnail + link-out. Play podcasts and PeerTube inline. Try YouTube embeds opportunistically with a fallback card.

---

## 5. Host UI support

Source: the official Extension Support Matrix [modelcontextprotocol.io/extensions/client-matrix](https://modelcontextprotocol.io/extensions/client-matrix) (community-maintained), plus vendor docs.

| Host | Renders MCP Apps | Buttons → server tools | Notes |
|---|---|---|---|
| ChatGPT | Yes (also the Apps SDK `window.openai.callTool`) | Yes | Remote servers only; custom apps in developer mode. Data passed to a widget is visible to the model |
| Claude web / desktop | Yes | Yes | Remote connectors; desktop also runs local stdio servers |
| Claude Code | **No** (matrix lists only Tasks) | — | Text/markdown only |
| VS Code GitHub Copilot | Yes | Yes | |
| Cursor | Yes | Yes | |
| Goose, M365 Copilot, Postman, MCPJam | Yes | Yes | |
| Gemini | Consumer app: custom MCP servers for US adults; MCP Apps documented only for **Gemini Enterprise** [cloud.google.com blog](https://cloud.google.com/blog/topics/developers-practitioners/devs-guide-to-mcp-apps-in-gemini). Gemini CLI: text | — | Treat as text-only |
| T3 Code | **Yes**: the code declares `io.modelcontextprotocol/ui` (`packages/shared/src/mcpApp.ts`, `apps/server/src/mcpApps/`) | Partly: open issues on buttons failing or needing extra confirmations (#29266), blank cards (#33302), image results stuck (#31329) | Not in the official matrix |

Spec details (from `ext-apps/specification/2026-01-26/apps.mdx`):
- A view calls server tools with `tools/call`. Tools with `_meta.ui.visibility: ["app"]` are hidden from the model and callable only by the view, which suits `like`, `skip`, and `next`.
- `ui/update-model-context` tells the agent what the user did, so it can learn. `ui/message` posts a follow-up message.
- Default CSP when `ui.csp` is omitted: `img-src 'self' data:`, `media-src 'self' data:`, `connect-src 'none'`, no frames. Hosts "MUST NOT allow undeclared domains". Thumbnails therefore need `resourceDomains` (e.g. `i.ytimg.com`, `cdn.bsky.app`) **or** the server inlines them as small `data:` URIs. The data URI route works in every host without CSP negotiation; see section 6 on caching.
- Claude gives each server a stable origin of `<sha256(url)[:32]>.claudemcpcontent.com` (`_meta.ui.domain`), which matters for CORS.

### Text/markdown fallback (Claude Code, Gemini, any non-UI host)

Every tool result should carry a `content` text block (the spec says it is for "model context and text-only hosts") as well as `structuredContent`. A suggested format:

```
1. [Title](https://url) — Channel · YouTube · 12:34 · 2 d ago
   why: matches "rust compilers" (liked 3 similar)
2. ...
Reply "like 1", "skip 2", "more like 1", or "next".
```

Use numbered items with stable IDs, so the agent can map short replies onto `like`, `skip`, and `next` tool calls. Avoid inline images: terminals drop them, and some hosts strip remote images.

---

## 6. Legal and privacy notes

| Topic | Note |
|---|---|
| Local preference profile | Storing your own likes and skips locally raises no platform issue. YouTube API policy: data obtained **through the API** must be refreshed or deleted within 30 days, and users must be able to delete it [developer-policies](https://developers.google.com/youtube/terms/developer-policies). Store derived preferences (topic weights, channel scores) rather than raw API payloads. Offer `forget_me`/export tools |
| Caching thumbnails | Do not persist platform thumbnails. Hotlink from the CDN (declared in `resourceDomains`), or proxy them transiently in memory as `data:` URIs. YouTube policies restrict storing or modifying API data **[detail unverified]** |
| Caching items | Keep only title, URL, author, and timestamps, with a TTL. Reddit's terms require deleting content the user deleted (reported 48-hour rule **[secondary]**) |
| robots.txt / ToS | Use documented feeds and APIs; send a descriptive User-Agent; back off on 429. Reddit's blocks responded differently to UA strings (`Mozilla/5.0` alone = `HTTP 403`) |
| Prohibited for this project | Browser automation on logged-in profiles; Invidious/Piped/Redlib/Nitter proxies; InnerTube/private APIs; credential collection. All are against the ToS, and most are being blocked today |
| Commercial use | Reddit free tier is non-commercial only. Spotify dev mode is non-commercial and capped at 5 users. Keep the project non-commercial and open source |
| Cloud hosts | ChatGPT and Claude web reach only remote servers, so the preference profile would leave the machine. Local-first hosts (Claude Desktop, VS Code, Cursor, T3 Code) keep it local |

---

## 7. Recommended access strategy (one choice)

**Local-first, layered:**

1. **Primary personalized signal:** Algone's MV3 extension (already on 12 sites) sends `collectFeed` items to a localhost MCP server. The items are what the user's YouTube, Reddit, X, Instagram, TikTok, and other feeds already show, with no credentials leaving the browser.
2. **Cold start:** an import tool for Google Takeout (YouTube subscriptions and history), Reddit/Instagram/TikTok/X exports, podcast OPML, and a Bluesky/Mastodon follow list.
3. **Fresh items and discovery (keyless):** YouTube channel RSS, Bluesky AppView, Mastodon trends and tags, HN, Lobsters, Dev.to, arXiv, PeerTube, Apple podcasts, blog/Substack RSS, Google News RSS.
4. **Optional OAuth:** Bluesky (app password or OAuth) and Mastodon OAuth: free, no approval. YouTube OAuth and API key only as "bring your own Google Cloud project" for power users.
5. **UI:** an MCP App feed card (thumbnail via `data:` URI, link-out, like/skip/next as app-only tools, `ui/update-model-context` for learning), with numbered markdown fallback.

**Realistically out of reach without the extension:** Instagram, TikTok, X, Facebook, Threads, and LinkedIn personalized feeds; YouTube home feed and watch history (no API); Reddit beyond best-effort RSS. Spotify personalization through its API is also out (5-user cap), but its podcasts are reachable through open RSS.
