# Agent feed MCP: prior art and design options

Checked 2026-11-10. Question: an MCP server that lets any connected agent (ChatGPT, Claude, Gemini, Cursor, T3 Code) learn the user's preferences and recommend content like a TikTok or YouTube feed. The agent's own LLM does the ranking (no bundled LLM, no API keys in the server), and the server holds the learned preference state so it persists across sessions and agents.

Repo facts (language, stars, last push, license) come from `gh api` on 2026-11-10. Claims marked **(unverified)** come from one secondary source or from memory and were not checked against a primary source.

## Summary

- Many MCP servers fetch feeds. One product, Agentic News, learns from feedback, but it is hosted, closed and needs an API key. No open-source MCP server was found that keeps a learned preference model and returns a ranked feed for the agent to refine.
- feed-mcp (Go) and news-aggregator (Python) are not TypeScript, so neither can be forked into Algone. They are useful as designs: feed-mcp for its safety and caching, news-aggregator for its keyless Hacker News and GDELT endpoints.
- Logging in is the hard part. Projects either stay on open sources (feed-mcp, news-aggregator), run inside the user's logged-in browser (omni, Piccardi et al., BrowserMCP, Playwright MCP `--extension`), use a platform that is open by design (Bluesky), or own the user's data already (ChatGPT Pulse). Algone already has the second kind: an extension that reads what the user's logged-in pages show.
- Recommended learner: a hybrid. The server keeps an explicit profile in the policy file plus small learned weights (Beta posteriors per source, creator and topic, Thompson sampling, a fixed share of exploration picks, and optionally a local MiniLM embedding). It returns about 30 scored candidates with reasons, and the agent picks and orders the final list.
- UI: MCP Apps renders a card UI with like and skip buttons that call server tools in ChatGPT, Claude web and desktop, VS Code, Cursor, Goose and M365 Copilot. It does not render in Claude Code. Every tool must also work as plain text.
- Recommendation: build it inside Algone as `packages/mcp`. Captured items move from the extension to the server through native messaging into a local store.

## 1. feed-mcp and news-aggregator-mcp-server in depth

| | richardwooding/feed-mcp | AiAgentKarl/news-aggregator-mcp-server |
|---|---|---|
| URL | https://github.com/richardwooding/feed-mcp | https://github.com/AiAgentKarl/news-aggregator-mcp-server |
| Language | Go 1.27, official `modelcontextprotocol/go-sdk` v1.8 | Python 3.11, `mcp` FastMCP, httpx, feedparser |
| License | MIT | MIT (LICENSE added 2026-04-03) |
| Activity | 40 stars, pushed 2026-11-09, large test suite (fuzz, race, BDD) | 4 stars, 3 commits (2026-03-22 to 2026-04-03), no tests |
| Tools | `all_syndication_feeds`, `get_syndication_feed_items` (metadata by default, `includeContent`, limit and offset, images as links or embedded), `fetch_link`, `merge_feeds` (dedupe, sort), `export_feed_data` (JSON, CSV, OPML, RSS, Atom), runtime `add_feed`, `remove_feed`, `list_managed_feeds` | RSS: `fetch_feed`, `get_news_by_category`, `search_rss_feeds`, `list_feed_catalog` (16 built-in feeds in 6 categories). HN: `get_hackernews_top`, `get_hackernews_story`, `get_hackernews_trending`. GDELT: `search_global_news`, `get_news_timeline`, `get_news_by_country`, `get_trending_topics` |
| Resources and prompts | Resources `feeds://all`, `feeds://feed/{id}`, `.../items` (URI filters for dates and keywords), `.../meta`, with subscriptions. Prompts: trends, summarize, keyword monitor, compare sources, report | None |
| Architecture | `cmd` (Kong CLI) -> `store` (fetch, cache, breakers) -> `mcpserver` (tools, resources, prompts). Transports: stdio, Streamable HTTP (including stateless). Ships Docker, Homebrew and `.mcpb` bundles | One file per source, each registering tools on FastMCP. stdio only. Comments and docstrings are in German |
| Caching and limits | In-memory gocache and ristretto, 10 min default; `hostrate` per-host rate limit (2 req/s default); sony/gobreaker circuit breaker per feed; retries with backoff; connection pooling | None. A new httpx client for each call |
| Safety | `ssrfguard`: http and https only, blocks private, loopback, link-local and metadata IPs, with a DNS resolve timeout that fails closed. A second check runs at dial time. Private IPs only with `--allow-private-ips`; runtime feeds only with `--allow-runtime-feeds` | None. `fetch_feed` takes any URL and follows redirects, so it can be used for SSRF. Some catalog URLs are probably dead (`feeds.reuters.com` was retired in 2020 **(unverified)**; one AP feed goes through the public rsshub.app) |
| Context hygiene | Two-pass workflow: browse titles, then read chosen items. Content length caps. This is the best idea to copy | Returns up to 500 characters of summary per item |

**What can be reused.** Neither codebase can be forked into a TypeScript monorepo. Reuse is limited to design and a few constants:

- From feed-mcp: the two-pass "metadata first, content on request" tool shape; fail-closed SSRF checks (in Node, check the resolved IP at connect time, not only the hostname); per-host rate limits; circuit breakers; an opt-in flag for runtime sources; OPML import; `.mcpb` packaging for Claude Desktop. MIT, so ported logic can be attributed in `THIRD_PARTY_NOTICES.md`.
- From news-aggregator: the keyless endpoints (`hacker-news.firebaseio.com/v0/{top,new,best}stories.json`, `/item/{id}.json`, GDELT `api.gdeltproject.org/api/v2/doc/doc?mode=artlist&format=json`) and the idea of a starter catalog by category for cold start.

**What both lack for a preference-learning feed:** a user profile, feedback tools, impression and seen-item tracking ("since last check"), deduplication across sources (feed-mcp only dedupes within `merge_feeds`), scoring or ranking beyond date order, exploration, explanations, per-day caps, and persistence (both keep everything in memory). Neither has YouTube, Reddit or Bluesky adapters. feed-mcp can read YouTube channel RSS as a plain feed.

## 2. Other MCP servers

| Server | What it does | Learns preferences? | License, state |
|---|---|---|---|
| Agentic News (https://agentic-news.ai/mcp; registry `ai.agentic-news/mcp`) | Hosted news intelligence: briefings, topic "agents", semantic search, `submit_feedback`, `batch_feedback`, refinements, "since last check" | **Yes**: thumbs up and down train each topic agent; LLM-validated relevance | Hosted, needs `AGENTIC_API_KEY`; the registry's linked repo `u00dxk2/agentic-news` returns 404. Closest product to the idea, but closed |
| newsmind (registry `app.newsmind/mcp`) | Hosted RSS for ChatGPT and Claude: search, dedupe, OPML | No sign of it | Hosted |
| stablenews (registry `ai.stablenews/news`) | One daily edition "ranked by a published rule" | No | Hosted |
| hmmroger/simply-feed-mcp | TS RSS manager and query tool | No | MIT, 1 star, 2026-06 |
| veithly/rss-mcp | TS RSS fetch and parse | No | Apache-2.0, 35 stars, 2025-12 |
| imprvhub/mcp-rss-aggregator | TS RSS aggregation for Claude Desktop | No | MPL-2.0, 27 stars, 2026-10 |
| ninjackster/reddit-rss-mcp | Reddit through RSS, no OAuth | No | MIT, 17 stars, 2026-05 |
| jordanburke/reddit-mcp-server, adhikasp/mcp-reddit, Hawstein/mcp-server-reddit | Reddit API wrappers | No | Mostly need Reddit API credentials. Self-service API access is reported closed (https://bigideasdb.com/mcp-server-reddit-market-research) **(unverified)** |
| anaisbetts/mcp-youtube, kimtaeyoon83/mcp-server-youtube-transcript, jkawamoto/mcp-youtube-transcript, ZubeidHendricks/youtube-mcp-server | Transcripts, search, analytics (about 500 to 600 stars each) | No | MIT. Glama lists 977 YouTube servers (https://glama.ai/mcp/best/youtube) |
| devrelopers/hackernews-mcp (Rust), Traves-Theberge/Hackernews-MCP-Typescript | Hacker News | No | MIT |
| pipeworx-io/mcp-podcastindex | Podcast Index API | No | MIT, needs a Podcast Index key |
| gwbischof/bluesky-social-mcp, morinokami/mcp-server-bluesky | Bluesky read and post | No | MIT |
| kalinichenko88/ai-digest | Claude Code + MCP daily tech digest from RSS and GitHub releases | No (fixed prompt) | MIT, 2 stars |
| mostrecommendedbooks (registry `com.mostrecommendedbooks/books`) | Book recommendation lists | No | Read-only |

The official registry (https://registry.modelcontextprotocol.io/v0/servers?search=...) returned nothing for "preference". Searches for "recommend" and "feed" returned only unrelated servers.

**Memory MCPs that could store preferences:**

| Server | Model | Fit |
|---|---|---|
| modelcontextprotocol/servers `memory` (TS, reference) | Knowledge graph of entities, relations and observations in a JSONL file | Agent-managed free text. Not tied to items, no scores |
| mem0ai/mem0 and OpenMemory (Python, Apache-2.0, 68.8k stars) | LLM-extracted memories with vector search | Needs its own LLM and embedding keys, which breaks the "no keys" rule |
| doobidoo/mcp-memory-service (Python, Apache-2.0, 2.1k stars) | Persistent memory with a knowledge graph and REST | Same: general memory |
| LSTM-Kirigaya/usermcp (Python, MIT, 22 stars, 2025-08) | `query`, `insert` and `delete` user-profile tools plus prompts telling the agent when to call them | Closest to "explicit profile". Tiny |

A general memory MCP gives option (a) below for free, but it can't count impressions, learn weights or keep the user from being shown the same thing twice. Preference state should live in the feed server, next to the items.

## 3. Prior-art products

| Product | What it does | Open source? |
|---|---|---|
| ChatGPT Pulse (OpenAI, preview 2025-09-25 for Pro) | Overnight research over memory, chat history, feedback and optional Gmail and Calendar; next-day cards; "curate" and thumbs to steer. Sources: https://openai.com/index/introducing-chatgpt-pulse/ and https://justinmckelvey.com/blog/chatgpt-pulse. **Retired**: OpenAI's 2026-06-17 release notes say "Pulse is being sunset as proactive updates move into scheduled tasks" (quoted by justinmckelvey.com, Digit and Yellow.com; release notes not read directly) | No |
| Attie (Bluesky team, 2026-03-28) | A separate app, built on Claude, where you describe a feed in plain words and it builds an atproto custom feed; it knows your interests from open atproto data. Expanded to "build websites, games" 2026-10-15. Sources: https://techcrunch.com/2026/03/28/bluesky-leans-into-ai-with-attie-an-app-for-building-custom-feeds/ and https://techcrunch.com/2026/10/15/bluesky-expands-its-ai-powered-attie-app-to-let-anyone-build-websites-games-and-more/ | No public repo found |
| Bluesky custom feeds | A feed generator is a server returning post URIs for a user; the client renders them. Starter kit https://github.com/bluesky-social/feed-generator (TS, MIT, 2.1k stars, active). Graze (https://www.graze.social/) is a hosted visual builder. SkyFeed's generator https://github.com/skyfeed-dev/feed-generator (Dart, AGPL-3.0, last push 2023) | Starter kit yes; Graze no **(unverified)** |
| bird/omni (OmniFeed) https://github.com/bird/omni | MV3 extension patches X's fetch and XHR, maps tweets to a `CanonicalItem`, sends them to a local FastAPI server that embeds them with a 384-dim sentence-transformer and scores them against preference vectors (core, time of day, platform, author affinity, type, freshness), then reorders the DOM. Dwell, likes and replies flush every 15 s and nudge the vectors | MIT. TS and Python, 1 star, pushed 2026-03-22. README calls it an archived proof of concept, but GitHub does not mark it archived. X only |
| Piccardi et al., "Reranking partisan animosity in algorithmic social media feeds alters affective polarization" (Science, 2025-11-27) https://www.science.org/doi/10.1126/science.adu5584, preprint https://arxiv.org/abs/2411.14652 | Extension intercepts web feeds and has an LLM score each post for antidemocratic attitudes and partisan animosity, then reorders, with no platform cooperation. Field experiment showed measurable effects | Method published. Code release not checked |
| Bonsai (CHI 2026) https://doi.org/10.1145/3772318.3791855 | "Intentional and personalized social media feeds": users state intents and an LLM builds the feed | Research. Code not checked |
| Natural-language user profiles (Ramos et al., ACL 2024) https://doi.org/10.18653/v1/2024.acl-long.753; TEARS (WWW 2025) https://doi.org/10.1145/3696410.3714948 | Recommenders driven by a plain-text profile the user can read and edit, with no loss in accuracy in their setup | Research. Supports option (a) and the profile half of (c) |
| Feedly Leo / Feedly AI https://feedly.com/ai | Trained "priorities" over RSS with "less like this" feedback; aimed at threat intelligence and market intelligence | No |
| Particle https://particle.news/ | AI news app: multi-source story clustering, summaries, "opposite sides", podcast clips (TechCrunch 2026-02-23) | No |
| Huxe | Personalized daily audio from email, calendar, news and interests (Wired 2026-02-27). Shut down; Apple licensed the tech and hired the team (TechCrunch 2026-10-10) | No |
| Tournesol https://tournesol.app/ | Collaborative, open-source YouTube recommendations from human comparisons (https://doi.org/10.48550/arxiv.2107.07334) | Yes (AGPL **(unverified)**) |

"Agentic feed" searches for 2025-2026 mostly return product-catalog feeds for shopping agents (agenticfeed.ai, Comergent, Feedoptimise), which are unrelated. The consumer attempts (Pulse, Huxe) were retired or sold. The surviving pattern is a scheduled briefing plus feedback. Pulse running out of material without memory and connected apps is a reminder that the hard part is getting inputs, not ranking.

## 4. How preference learning should work when the agent ranks

### How big recommenders work, and what transfers locally

- **YouTube DNN (Covington et al., RecSys 2016)** https://dl.acm.org/doi/10.1145/2959100.2959190: two stages. Candidate generation picks hundreds of items from millions, using a user embedding learned from watch history, searches and demographics as extreme multiclass classification. A ranking network scores the hundreds using many features and is trained on **expected watch time**, not clicks, to avoid clickbait. It also feeds in "example age" to favour fresh items.
- **YouTube multitask ranking (Zhao et al., RecSys 2019)** https://dl.acm.org/doi/10.1145/3298689.3346997: one model predicts several engagement and satisfaction objectives (click, watch, like, dismiss, survey) and a shallow tower removes position bias.
- **Monolith (ByteDance, 2022)** https://arxiv.org/abs/2209.07663: TikTok-style real-time training. Collision-free embedding tables keyed by hashed IDs with expiry, and online training that syncs parameters to serving within minutes, so a few swipes change the next items.
- **TikTok's stated objective** (leaked "TikTok Algo 101", NYT 2021-12-05) **(unverified)**: roughly P(like)·V_like + P(comment)·V_comment + E(playtime)·V_playtime + P(play)·V_play. A weighted sum of predicted signals.
- **Exploration**: contextual bandits for news (LinUCB, Li et al., WWW 2010) https://arxiv.org/abs/1003.0146; Google's "Values of User Exploration in Recommender Systems" (RecSys 2021) **(unverified citation details)** found exploration raises long-term satisfaction.
- **LLMs as rankers** (Hou et al., "LLMs are zero-shot rankers", 2023) https://arxiv.org/abs/2305.08845: LLMs rank a short candidate list reasonably well. They are biased toward position and popularity, and quality drops as the list grows. Keep the candidate list to about 20 to 40 and shuffle it.

**What transfers to one user on one PC:** the two-stage split (a cheap candidate pre-rank, then an expensive re-rank, where the expensive ranker is the agent's LLM); training on "finished or worth it" rather than "opened"; weighting fresh items; fast online updates (per event, not batch); explicit exploration. **What doesn't:** collaborative filtering. With one user there are no "people like you". The substitutes are content similarity (embeddings), source and creator affinity, and the LLM's world knowledge.

### Signals available through MCP

| Signal | How it arrives | Strength |
|---|---|---|
| Impression | Server logs every item it returns | Needed to count skips |
| Opened | Agent calls `open(item)` (returns the URL or reads the content); MCP Apps card click; or the extension sees the user visit that URL | Weak positive |
| Finished, dwell | Extension measures time on page or video progress for that URL; MCP Apps UI cannot see the target page | Strong positive; only available through the extension |
| Rated | `feedback(item, more / less / never / worth_it / not_worth_it / made_me_feel_worse)`, where the last three match Algone's existing ratings | Strongest. `never` is a hard rule |
| Skipped | Impression with no open within N hours, or explicit `skip` from a card | Weak negative; discount by list position |
| Stated intent | User tells the agent "more woodworking"; agent calls `set_rule` | Explicit profile |

### Options

| | (a) Agent only | (b) Server-side learner | (c) Hybrid |
|---|---|---|---|
| State | Plain profile (want, drop, creators, block) plus history | Weights and posteriors per source, creator and topic, optional embedding vector | Both |
| Ranking | Agent ranks raw items against the profile on every call | Server ranks; agent just presents | Server pre-ranks about 30 candidates with scores and reasons; agent picks and orders N |
| Works without a strong LLM | No | Yes | Yes (it degrades to the server's order) |
| Consistency across agents | Poor: each model reads the profile differently | Good | Good: the learned part is identical, and only the final pick varies |
| Context cost | High (many raw items per call) | Low | Medium |
| Learns from implicit signals | Only if the agent remembers to summarize them | Yes, per event | Yes |
| Exploration | Up to the model, usually none | Explicit (Thompson sampling) | Explicit, and the agent is told which items are exploration picks |
| Transparency | High (profile is text) | Low unless explained | High: profile text plus "why" per item |

**Cold start.** Use the stated profile from onboarding: a few topics and creators, plus an import of OPML, YouTube subscriptions and followed accounts. Start with weak, wide priors (Beta(1,1)) and a starter catalog by category. In the first sessions, ask the agent to run a short "this or that" over 6 to 8 items. If the extension is installed, the items it captures from the user's own followed feeds act as a strong prior, because they show who the user already follows.

**Exploration vs exploitation.** Each feature (source, creator, topic tag) keeps a Beta(α, β) where α counts positive and β negative outcomes, with weights by signal (rated "worth it" = +3, finished = +2, opened = +1, skipped = +0.3 negative, "less" = +2 negative). Both counts decay toward the prior with a half-life of about 30 days, so tastes can drift. Each candidate's score = Σ sampled θ (Thompson sampling, so uncertain features win sometimes) + w_e·cos(item, liked centroid) − w_e·cos(item, disliked centroid) + freshness − already-seen penalty. Reserve about 20% of slots for exploration: items from under-sampled sources or topics, labeled `explore: true` so the agent keeps them and says so. Cap any one source or creator at 2 per list for diversity. Hard rules from the policy (`drop`, `blockCreators`, `maxPerDay`, and the avoid lists outrage, clickbait, comparison and doom) apply before scoring and can't be learned away. This also keeps engagement learning from rebuilding an outrage feed.

**Local embeddings.** `Xenova/all-MiniLM-L6-v2` through `@huggingface/transformers` (v4.3.2, Apache-2.0) runs in Node with no key. The int8 ONNX file is 23 MB (fp32 90 MB), output is 384-dim, and it embeds titles and short descriptions in milliseconds on a CPU. Store vectors in a JSON or SQLite file; a few thousand items need no vector database. Make it optional and lazy: the first run downloads 23 MB, and the server works without it, using topic tags only.

### Recommendation: (c) hybrid, in TypeScript

The server keeps the explicit profile in the Algone policy (`settings.recommend`, already designed) and device-local learned state (posteriors, impressions, seen set, optional embedding centroids) in a local SQLite or JSON store. `recommend` returns about 30 candidates, each with `score`, `explore`, `reasons[]`, source, creator, age and a short snippet, plus the profile text, and instructs the agent to pick N and give a one-line reason each. Feedback tools update posteriors at once. Reasons:

1. It meets the brief. The agent's LLM does the final ranking and the server needs no keys, yet the learning stays in the server and survives a change of agent.
2. It works with weak hosts and models. With no reordering, the user still gets the server's order.
3. Exploration and hard rules can't be skipped by an agent, which matters for Algone's anti-outrage purpose.
4. It is small: Beta updates and a dot product, roughly 300 lines, and easy to test.
5. Its profile stays readable and editable (the scrutable-profile research above), and its reasons can be explained.

Don't rely on MCP **sampling** (the server asking the client's LLM for a completion): client support is uneven, and Claude Desktop and claude.ai are believed not to support it **(unverified)**. Return candidates and let the agent rank them in its normal turn.

Suggested tools: `recommend(n, kind: read|watch|listen, mood?)`, `next(session)` (the next page of the same session, within the daily cap), `open(item)`, `feedback(item, signal)`, `explain(item)`, `get_profile`, `set_rule`, `sources_add`, `sources_remove`, `import_opml`. Resources: `algone://profile`, `algone://history/today`.

## 5. Feed UX inside agent hosts

**MCP Apps** (official extension `io.modelcontextprotocol/ui`, announced 2026-01-26: https://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps/; spec and SDK https://github.com/modelcontextprotocol/ext-apps). A tool declares `_meta.ui.resourceUri: "ui://..."`, and the host renders that HTML in a sandboxed iframe. The iframe talks JSON-RPC over `postMessage`: it receives tool input and results, and it **can call server tools** (`tools/call`), send a follow-up message (`ui/message`) and update model-visible context. So a card with Next, Like, Skip and Never buttons can call `feedback` and `next` directly, without a model turn, and can optionally post "user liked X" into the context. External images need origins listed in `_meta.ui.csp`.

**ChatGPT** implements MCP Apps as its Apps SDK foundation; `window.openai.callTool` and the other `window.openai.*` calls are compatibility aliases plus ChatGPT-only extras such as modals and widget state (https://developers.openai.com/apps-sdk/mcp-apps-in-chatgpt/). ChatGPT connects only to **remote HTTPS** MCP servers (developer mode), so a local server needs a tunnel or a hosted relay. Claude web connectors are also remote. Claude Desktop, Claude Code, Cursor and VS Code can run local stdio servers.

Host support (from the community-maintained matrix https://modelcontextprotocol.io/extensions/client-matrix, source checked 2026-11-10):

| Host | Renders MCP Apps | Local stdio server |
|---|---|---|
| ChatGPT | Yes | No (remote only) |
| Claude web | Yes | No (remote connectors) |
| Claude Desktop | Yes | Yes |
| Claude Code | **No** | Yes |
| Cursor | Yes | Yes |
| VS Code (Copilot) | Yes | Yes |
| Goose, M365 Copilot, Postman, MCPJam | Yes | Varies |
| Gemini (app) | Not listed. Consumer MCP reportedly only through "Connected Apps for Spark" **(unverified)**; Gemini Enterprise supports custom MCP servers (https://support.google.com/g/answer/17106276) | Gemini CLI: yes (https://geminicli.com/docs/tools/mcp-server/) |
| T3 Code | Not listed. T3 Code orchestrates other agents (Claude Code, Codex, Cursor and others, https://github.com/pingdotgg/t3code), so MCP support and rendering follow the underlying agent **(unverified)** | Through the underlying agent |

**Text fallback** (required; OpenAI's docs say tools must work without UI): `recommend` returns `structuredContent` (the candidates) plus a short text block. Each item has a number, title, source, age and a one-line reason. The agent shows a numbered list and the user replies "2 yes, 4 never, more". The server instructions tell the agent to map those replies to `feedback` calls. Keep the "batch that ends" behavior: after `maxPerDay`, `next` returns the user's `activities` instead of items.

Note the product tension: Algone's design (S-9) says "a fixed short list, never a feed", while the brief asks for TikTok-like flow. The UI can show one card at a time with Next, but stop at the daily cap. This keeps the UX and keeps Algone's rule.

## 6. Logged-in access: how existing projects get content

| Project | How it gets content | Credentials |
|---|---|---|
| feed-mcp, news-aggregator, RSS MCPs | Only open endpoints: RSS and Atom, HN Firebase API, GDELT | None |
| Reddit MCPs | Reddit API with app credentials (now hard to get), or public RSS and JSON (ninjackster/reddit-rss-mcp) | API key, or none |
| YouTube MCPs | YouTube Data API key, or transcript scraping | API key or none. None reads the user's home feed |
| Bluesky feed generators, Attie | atproto is open: the firehose and public APIs give every post; the user signs in with atproto OAuth | Platform-native |
| ChatGPT Pulse | Data OpenAI already holds (memory, chats) plus opt-in OAuth connectors (Gmail, Calendar) | First party |
| bird/omni | MV3 content script in the **user's logged-in browser** patches fetch and XHR to read X's own timeline JSON; sends items to a localhost server | Never leaves the browser |
| Piccardi et al. | Same pattern: extension intercepts the web feed in the user's session | Never leaves the browser |
| BrowserMCP https://github.com/BrowserMCP/mcp (TS, Apache-2.0, 7.3k stars) | Agent drives the user's real Chrome profile. MCP server -> per-user daemon on `127.0.0.1` -> extension relays through `chrome.debugger`. Pairing by a six-digit code checked in the popup; no incognito unless allowed; Stop button. Chromium only | Session stays in the browser, but the agent can act as the user |
| Playwright MCP `--extension` https://github.com/microsoft/playwright-mcp (Apache-2.0, 39k stars) | Connects to a running Edge or Chrome through its extension and drives tabs in the user's profile | Same |
| Chrome DevTools MCP https://github.com/ChromeDevTools/chrome-devtools-mcp (Apache-2.0, 55k stars) | CDP to a Chrome it launches, or to an existing one by WebSocket URL | Same |
| Claude in Chrome | Anthropic's extension; the agent acts in the user's Chrome with their sign-ins | Same |

Two patterns cover logged-in sites without handing credentials to a server. One is **passive capture** (omni, Piccardi): read what the page already shows. The other is **agent-driven browsing** (BrowserMCP, Playwright, DevTools MCP, Claude in Chrome): the agent opens pages itself. Passive capture is cheaper, needs no model turns, can't post or click as the user, and is the safer position under platform terms: the user loaded the page, and nothing is fetched automatically. Agent-driven browsing reaches pages the user hasn't opened, but X's and YouTube's terms prohibit automated access and scraping **(not legal advice)**, it is slow and costs tokens, and it can act as the user. Use it only for one-off "open this" requests, not for building the feed.

### Algone's extension as the access layer

Algone already has the passive-capture half. `packages/engine/src/healthy.ts` `collectFeed()` reads up to 60 items per page (title, channel, item URL) that the site already loaded into its hidden feed. It skips Shorts, Reels and ads, keeps only same-origin item links, and never clicks or scrolls. `capture.ts` `collectItems()` does the same for custom-mode selectors. These run on 12 sites in the user's logged-in browser. What's missing is a path from the extension to the MCP server.

| Bridge | How | Pros | Cons |
|---|---|---|---|
| **Native messaging into a local store** | Extension calls `runtime.sendNativeMessage("app.algone.host", batch)`. The browser launches a small Node host registered by the `algone` CLI (Windows registry key plus manifest JSON per browser). The host appends to the local store (SQLite or JSONL in the Algone data dir). The MCP server (stdio) reads the same store | No listening port, so no other site or process can inject items. The browser checks the extension ID (`allowed_origins`). Works in Chrome, Edge and Firefox. Works when the MCP server isn't running. The CLI already writes registry keys for the browser lock (S-8) | Install step per browser. New `nativeMessaging` permission prompt (make it optional, requested when the user turns on "send to my agent"; whether Chrome allows it as optional is **(unverified)**). Not on Android or iOS. Safari only to its containing app |
| Localhost bridge (BrowserMCP, omni, Playwright `--extension` pattern) | Daemon listens on `127.0.0.1:port`; extension `fetch`es or holds a WebSocket | Live two-way: the server can ask the extension "anything new on YouTube?" | Port must be secured: pairing token, Origin check, and DNS-rebinding defence. Daemon lifecycle. MV3 service workers stop after about 30 s idle (WebSocket activity keeps them alive in recent Chrome **(unverified)**). Needs `http://127.0.0.1/*` host permission |
| Shared file | Extension can't write files except through `downloads`, which is clunky and visible | None worth having | Not viable |
| Through the Gist | Extension writes captured items to the sync Gist | Reaches other devices | Puts browsing history in a cloud file, with rate limits and a widened privacy footprint. Use the Gist only for the policy and profile, not items |

MV3 limits that matter: no persistent background page (batch-send on capture, don't stream); content scripts can't use native messaging, so route through the service worker (Algone already passes messages that way in `apps/extension/src/messages.ts`); Firefox for Android has no native messaging, so phones contribute only through the policy. Terms: passive reading of the user's own rendered page is what ad blockers and the Science study did; sending titles and URLs to a process on the same machine doesn't change that. The riskier step would be background fetching with the user's cookies, which this design avoids.

Persistence across agents and devices: learned weights are device-local by default. The plain-text profile (`settings.recommend`) and `never` rules go through the existing policy and Gist sync, so a second PC or the phone app starts from the same stated tastes. Syncing a compact posterior summary in the policy can come later.

## 7. New project or rework Algone

**Recommendation: build it inside Algone as `packages/mcp`, with no new repo.**

1. **Access layer exists.** Logged-in content is Josh's stated blocker, and Algone's extension already reads the items the user's logged-in pages show on 12 sites without credentials leaving the browser. A new project would have to rebuild that and its 12 maintained selector sets.
2. **State and sync exist.** The policy file (`algone-policy/1`), `settings.recommend` and `sources` (already designed), the CLI that edits the policy, and Gist sync give cross-device, cross-agent persistence with tighten-now, loosen-later semantics. "Never" feedback is a tightening patch that applies at once.
3. **Same purpose and code.** The healthy feed's avoid lists, ratings ("Worth it" and the others), `maxPerDay` and the "batch that ends" are the safeguards a learning feed needs so it doesn't drift into an engagement trap. The design doc already names the MCP as the centerpiece (S-9, S-10).
4. **Reuse is design-level anyway.** feed-mcp and news-aggregator can't be forked into TypeScript, so a fresh repo gains nothing from them.
5. **One stack.** TypeScript, Node 22+, npm workspaces, vitest, esbuild. Add `@modelcontextprotocol/sdk` (1.32.x) and `@modelcontextprotocol/ext-apps` to one more workspace package.

Costs to accept: the repo grows (keep `packages/mcp` free of extension imports and depend only on `@algone/core` and `@algone/rules`); the "never a feed" rule needs the cap-bounded card flow described in section 5; and ChatGPT and Claude web need a remote endpoint (a tunnel at first, a hosted relay later), unlike local hosts.

Build order:
1. `packages/mcp` stdio server with RSS, YouTube channel RSS, HN and Reddit RSS adapters, using feed-mcp's safety (SSRF, rate limit, breaker, two-pass).
2. Local store, Beta posteriors, `recommend`, `feedback` and `next`, with tests.
3. Native-messaging host plus optional extension permission, feeding `collectFeed()` output into the store.
4. MCP Apps card UI.
5. Optional MiniLM embeddings.
6. Streamable HTTP plus tunnel guide for ChatGPT.
