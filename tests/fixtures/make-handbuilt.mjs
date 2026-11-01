// Hand-built fixtures for logged-in surfaces, written from public selector sources.
// Tests on these prove the machinery, not that the selector matches the live site.
import { mkdirSync, writeFileSync } from "node:fs";

const page = (body) => `<!doctype html><html><head><title>Fixture</title></head><body>${body}</body></html>`;
const out = (site, name, body) => {
  mkdirSync(`tests/fixtures/${site}`, { recursive: true });
  writeFileSync(`tests/fixtures/${site}/${name}.html`, `<!-- hand-built -->\n${page(body)}\n`);
};

out("x", "home", `
<a data-testid="AppTabBar_Explore_Link" href="/explore">Explore</a>
<a data-testid="AppTabBar_DirectMessage_Link" href="/messages">Messages</a>
<main><div data-testid="primaryColumn">
  <div role="tablist"><div role="tab" aria-selected="true">For you</div><div role="tab" aria-selected="false">Following</div></div>
  <div data-testid="tweetTextarea_0" contenteditable="true">What is happening</div>
  <div aria-label="Timeline: Your Home Timeline"><article data-testid="tweet"><div data-testid="tweetText">A post</div></article></div>
</div>
<div data-testid="sidebarColumn">
  <input data-testid="SearchBox_Search_Input">
  <section><div data-testid="trend">Trend</div></section>
  <aside><div data-testid="UserCell">Someone</div></aside>
</div></main>`);

out("instagram", "home", `
<a href="/explore/">Explore</a><a href="/reels/">Reels</a><a href="/direct/inbox/">Messages</a>
<main><div><article><h1>Post caption</h1></article></div></main>`);

out("facebook", "home", `
<div role="search"><input></div>
<div role="navigation"><a href="/watch/">Watch</a><a href="/groups/">Groups</a><a href="/marketplace/">Marketplace</a></div>
<div role="main"><div role="feed"><div><div role="article"><div data-ad-comet-preview="message">Post</div></div></div></div></div>`);

out("linkedin", "feed", `
<input placeholder="Search"><a href="/messaging/">Messaging</a>
<button aria-label="Start a post">Start a post</button>
<main>
<div componentkey="container-update-list_mainFeed-lazy-container"><div data-lazy-mount-id="1"><div data-view-name="feed-commentary">Post</div></div></div>
</main>
<div data-view-name="news-module">LinkedIn News</div>`);

out("threads", "home", `
<a href="/search">Search</a>
<div><div><div data-pressable-container="true"><div dir="auto">Post</div></div></div></div>`);

out("substack", "home", `
<input type="search"><a href="/explore">Explore</a>
<div class="reader2-feed"><a href="/p/x">Post</a></div>`);

console.log("hand-built fixtures written");
