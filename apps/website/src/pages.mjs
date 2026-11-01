// Page content. Links use {{base}}, which the layout turns into a relative path.
import {
  ISSUES_URL, KOFI_URL, RELEASES_URL, REPO_URL, REPORT_URL, SPONSOR_URL, STATUS_URL, STORES,
  UNINSTALL_FEEDBACK_URL,
} from "./constants.mjs";

const POLICY_DATE = "October 31, 2026";

const METHOD_LABELS = {
  "live-logged-out": "Real site, logged out",
  "live-logged-in": "Real site, logged in",
  fixture: "Saved test page only",
  unverified: "Not checked",
};

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const dateText = (iso) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric", timeZone: "UTC",
  });

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const section = (title, intro, content, cls = "", id = slug(title)) => `<section class="sec ${cls}" id="${id}">
<h2>${title}</h2>
<div class="sec-body">${intro || !cls ? `<p class="sec-intro">${intro}</p>` : ""}<div class="sec-main">${content}</div></div>
</section>`;

const terms = (rows) =>
  `<dl class="terms">${rows.map(([t, d]) => `<div><dt>${t}</dt><dd>${d}</dd></div>`).join("")}</dl>`;

const steps = (items) => `<ol class="steps">${items.map((i) => `<li>${i}</li>`).join("")}</ol>`;

const head = (title, lede, extra = "") => `<div class="page-head">
<h1>${title}</h1>
${lede ? `<p class="lede">${lede}</p>` : ""}${extra}
</div>`;

const CHROME_ZIP = "<code>algone-chrome.zip</code>";

/* Home */

function home({ sites, shots }) {
  const rows = sites.map((s) => {
    const hidden = s.elements.filter((e) => e.class === "algorithmic").map((e) => e.label);
    const shown = hidden.slice(0, 4);
    const rest = hidden.length - shown.length;
    const kept = [...new Set((s.protected ?? []).map((p) => p.label))];
    return `<tr><th scope="row">${esc(s.name)}</th>
<td data-label="Hidden"><span class="struck">${shown.map(esc).join("</span>, <span class=\"struck\">")}</span>${rest ? ` <span class="more">and ${rest} more</span>` : ""}</td>
<td data-label="Tested to stay">${kept.map(esc).join(", ")}</td></tr>`;
  }).join("\n");

  const gallery = shots.length
    ? section("What it looks like", "", `<div class="shots">${shots.map((f) =>
      `<figure><img src="{{base}}screenshots/${encodeURIComponent(f)}" alt="Algone screenshot: ${esc(f.replace(/\.png$/i, "").replace(/^\d+[-_]/, "").replace(/[-_]+/g, " "))}" width="1280" height="800" loading="lazy"></figure>`).join("")}</div>`, "full")
    : "";

  return `<div class="hero">
<h1><span class="struck">The feed</span> is gone. Search still works.</h1>
<p class="lede">Algone is a browser extension that hides recommendation feeds on ${sites.length} popular sites. Search, subscriptions, direct links, and messages stay where they are.</p>
<div class="actions">
<a class="button primary" href="{{base}}install/">Install Algone</a>
<a class="button" href="{{base}}how-it-works/">See how it works</a>
</div>
<p class="pending">Store listings are pending, so Algone is not in any store yet. Builds for testing are on <a href="${RELEASES_URL}">GitHub Releases</a>.</p>
</div>

<figure class="wall" data-wall>
<div class="wall-page">
<div class="wall-head" aria-hidden="true"><span class="wall-search">Search</span><span>Subscriptions</span></div>
<div class="wall-feed"><canvas aria-hidden="true"></canvas>
<input type="range" min="0" max="100" value="0" disabled aria-label="Share of the feed removed">
<div class="wall-strike"><span class="wall-grip">Drag to remove the feed</span></div></div>
</div>
<figcaption class="caption">Illustration of a video site's home page with default settings. The header and search stay, and the feed area is empty.</figcaption>
</figure>

${section("What is hidden on each site", "Everything classed as algorithmic is hidden from install. You can turn each item back on separately.", `<div class="table-scroll"><table class="stack">
<thead><tr><th scope="col">Site</th><th scope="col">Hidden by default</th><th scope="col">Tested to stay</th></tr></thead>
<tbody>${rows}</tbody></table></div>
<p class="table-note"><a href="{{base}}sites/">See how each site was checked</a>. Some rules have not been tested while logged in.</p>`, "full")}

${gallery}

${section("What to put there instead", "Each site has four modes.", terms([
    ["No feed", "Clean empty space. This is the default."],
    ["Random", "A quote, fact, poem, artwork, or puzzle, bundled offline."],
    ["Tuned", "The feed stays, filtered by topics, keywords, channels, and kinds of post."],
    ["Custom", "A feed you build from RSS, creators you choose, and your own subscriptions. It stays on your device."],
  ]))}

${section("What Algone cannot do", "", terms([
    ["Native apps", "Algone works in the browser. It does not change the YouTube, Instagram, or TikTok apps, so open these sites in your browser."],
    ["Stop you leaving", "You can always uninstall Algone. Its barriers are there to interrupt autopilot, not to trap you."],
    ["Stay perfect", "Sites change their pages, and a rule can break until it is repaired. <a href=\"{{base}}sites/\">Site status</a> shows what is checked and when."],
  ]))}

<div class="closing">
<h2>Keep what you came for.</h2>
<div class="actions"><a class="button primary" href="{{base}}install/">Install Algone</a></div>
</div>`;
}

/* Install */

function install({ sites }) {
  const pending = Object.values(STORES).every((s) => !s.listed);
  const store = (key, name) =>
    STORES[key].listed ? `<a href="${STORES[key].url}">Get ${name}</a>` : "Store listing pending.";
  return `${head("Install Algone", "Algone works in the browser and does not change native apps. Uninstalling always works.")}

${pending ? `<div class="wrap"><div class="callout"><p><strong>Algone is not in any store yet.</strong> Listings are pending. Until they exist, any published builds are on <a href="${RELEASES_URL}">GitHub Releases</a>, and they are meant for testing.</p></div></div>` : ""}

${section("Computer", "Chrome, Edge, Firefox, and Safari.", `<h3>Chrome and Edge</h3>
<p>${store("chrome", "Algone for Chrome")} ${STORES.edge.listed ? store("edge", "Algone for Edge") : ""} To test a build now:</p>
${steps([
    `Download ${CHROME_ZIP} or <code>algone-edge.zip</code> from <a href="${RELEASES_URL}">GitHub Releases</a> and unzip it.`,
    "Open <code>chrome://extensions</code> or <code>edge://extensions</code> and turn on Developer mode.",
    "Choose Load unpacked and select the unzipped folder.",
    `Open one of the ${sites.length} supported sites. A build installed this way gets daily rule updates, but no new versions until you repeat these steps.`,
  ])}
<h3>Firefox</h3>
<p>${store("firefox", "Algone for Firefox")} The <code>algone-firefox.zip</code> file on GitHub Releases is unsigned, so Firefox only loads it as a temporary add-on from <code>about:debugging</code>, and removes it when Firefox restarts.</p>
<h3>Safari on Mac</h3>
<p>${store("safari", "Algone for Safari")} Safari extensions ship inside an App Store app. Until it exists, you can build one from <code>algone-safari-source.zip</code> on a Mac with Xcode.</p>`)}

${section("Phone and tablet", "Algone works in a mobile browser, not inside apps.", `<p>Algone cannot change the YouTube, Instagram, or TikTok apps. On a phone, open these sites in the browser instead. Links can still open an app if your phone sends them there.</p>
${terms([
    ["iPhone and iPad", `Safari with the Algone for Safari app, on iOS 15.4 or later. ${store("safari", "Algone for Safari")}`],
    ["Android with Firefox", `Firefox for Android runs the same extension. ${store("firefox", "Algone for Firefox")}`],
    ["Android with Chrome", `Chrome on Android has no extensions, so you need Algone Browser. ${store("browserAndroid", "Algone Browser")}`],
    ["Algone Browser", `A small app that loads the mobile sites with the same rules and settings. Apple and Google may not accept it. Android test builds, when published, are on <a href="${RELEASES_URL}">GitHub Releases</a> and do not update themselves. Expect YouTube to work logged out only, because Google blocks sign-in inside apps like this one.`],
  ])}`)}

${section("After you install", "", `<p>A welcome page explains what was hidden and how to change it. Browsers can withhold access to a site, so the welcome page also shows any site that is not active yet.</p>
<p>To remove Algone, use your browser's normal uninstall. No setting can stop it. Steps for each browser are on the <a href="{{base}}support/#uninstall">support page</a>.</p>`)}`;
}

/* How it works */

function howItWorks({ sites }) {
  return `${head("How it works", `Algone uses rules, one file per site, to hide parts of a page with CSS. The rules are data, not code. Everything you choose stays on your device.`)}

${section("What is hidden", "", `<p>Every page element on the ${sites.length} supported sites has its own switch. Algorithmic items, such as home feeds and suggested accounts, start hidden. Other items, such as YouTube comments, start visible and can be hidden.</p>
<p>Search, subscriptions, direct links, and messages are not touched. Automated tests fail if a rule hides the search, message, or post box items listed for a site.</p>
<p>Hiding more takes effect at once. Showing more passes through a barrier, described below.</p>`)}

${section("Four modes", "Set per site.", terms([
    ["No feed", "The default. The feed area is clean empty space."],
    ["Random", "Something bundled with Algone in place of the feed: a quote, fact, short poem, public-domain art, or a puzzle. Wikipedia summaries are opt-in and ask first."],
    ["Tuned", "The feed stays, and items are hidden if they match a blocked topic, keyword, channel, or kind such as Shorts or ads. Likely AI is a text match on phrases such as “AI generated”. It will miss some and wrongly catch some."],
    ["Custom", "Your own feed, from RSS, creators you choose, and items your browser has shown on your subscriptions pages. Sites without public feeds give a partial view. Ranking is yours to pick, and it all runs on your device."],
  ]))}

${section("Six barriers", "Pick one. Every unlock is a timed snooze, 10 minutes by default, and the hidden items return without you doing anything.", `${terms([
    ["Pause and choose", "The default. Wait 30 seconds, with Never mind ready from the first second. The timer pauses if you leave the tab."],
    ["Typing challenge", "Retype random text, 60 characters by default. Pasting is off."],
    ["Daily unlock limit", "A set number of unlocks per day, then wait for midnight."],
    ["Scheduled unlock", "Unlocks work only inside weekly time windows you set."],
    ["Locked until", "No unlocks until a time you pick, up to 7 days away. Each lock has one escape, after a 2 minute wait."],
    ["Partner password", "Someone else sets a password, stored on your device as a salted hash. If it is lost, Forgot starts a 24 hour wait and then resets to Pause and choose."],
  ])}
<div class="callout"><p>Barriers interrupt autopilot. They are not security. You can always uninstall Algone. Changing your system clock, using another browser, or using a private window where Algone is not allowed also gets around them.</p></div>`)}

${section("Choosing what to watch", "All of these are optional except stop at the end, which is on by default.", terms([
    ["Search-first home", "The home page shows a search box and your queue. You can add a “What do you want to watch?” line."],
    ["Subscriptions first", "The home page opens your subscriptions, on sites that support it."],
    ["Queue", "Save things for later. Only the first five show until you ask for the rest."],
    ["Stop at the end", "When a video ends, you see the next item in your queue or Done. Nothing autoplays."],
    ["Launch pause", "A short panel when you open a site, with Leave as the main button."],
  ]))}

${section("When a site changes", "Sites rename things, and rules go stale. This is how a repair reaches you.", `${steps([
    "A check runs every day against the real sites, logged out. It cannot see logged-in pages, so those rely on the owner's weekly check and on your reports.",
    `A failed check opens an <a href="${ISSUES_URL}">issue on GitHub</a>. No model runs on its own.`,
    "The owner reads the issue and can ask Claude to draft a fix in a pull request.",
    "The owner reviews and merges it. A person approves every change, so no repair time is promised.",
    "Tests run, and the new rules are published on this website.",
    "Your extension fetches them within a day, without a store review.",
  ])}
<p>The rules file can only change what is hidden. It cannot run code, click, navigate, send data, or add new sites. Each file is validated before use, and a bad one is thrown away. You can turn rule updates off in settings.</p>`)}

${section("Known limits", "", `<ul>
<li>Rules bundled with your version do not flash on a full page load. Rules that arrive by daily update can flash until the next version bundles them.</li>
<li>Algone Browser can flash on any page. If it cannot apply rules, the site shows unfiltered and the app says so.</li>
<li>Hiding many items in a Tuned feed can leave gaps or stop a list from loading more.</li>
<li>Sites can detect that Algone is present, as they can with any tool that hides page content.</li>
<li>Algone asks for access to the ${sites.length} supported sites only, never all websites.</li>
</ul>`)}`;
}

/* Sites */

function sitesPage({ sites }) {
  const live = sites.filter((s) => s.verified.method.startsWith("live-")).length;
  const loggedIn = sites.filter((s) => s.verified.method === "live-logged-in").length;
  const rows = sites.map((s) => `<tr>
<th scope="row">${esc(s.name)}<span class="note">Tier ${s.tier}</span></th>
<td data-label="Rules checked">${METHOD_LABELS[s.verified.method] ?? esc(s.verified.method)}<span class="note">${s.verified.method === "unverified" ? "Rule written" : "On"} ${dateText(s.verified.date)}</span></td>
<td data-label="Notes">${esc(s.verified.notes)}</td>
<td data-label="Last daily check" data-site="${esc(s.id)}">Needs JavaScript</td>
</tr>`).join("\n");

  return `${head("Site status", `What Algone covers, how each set of rules was checked, and what the latest daily check found.`)}
<div class="wrap"><div class="callout"><p><strong>Logged-in pages may be unverified.</strong> ${live} of ${sites.length} sites have rules checked against the real site, and ${loggedIn === 0 ? "none has been checked while logged in yet" : `${loggedIn} while logged in`}. Most feeds you see are the logged-in ones, and the daily check cannot reach them, so a rule marked as checked logged out can still miss your home feed. If you see a feed that should be hidden, <a href="${REPORT_URL}">report it</a>.</p></div></div>

<section class="wrap status-block" id="all-sites" aria-labelledby="sites-heading">
<h2 id="sites-heading">All ${sites.length} sites</h2>
<p class="table-note" id="status-summary" role="status">Daily check results need JavaScript. They load from <code>raw.githubusercontent.com</code> when you view this page.</p>
<div class="table-scroll"><table class="stack" id="site-table" data-status-url="${STATUS_URL}">
<thead><tr><th scope="col">Site</th><th scope="col">Rules checked</th><th scope="col">Notes</th><th scope="col">Last daily check</th></tr></thead>
<tbody>${rows}</tbody>
</table></div>
</section>
${section("Support tiers", "One person maintains twelve sites, so they are not treated equally.", terms([
    ["Tier 1", "Daily logged-out check, plus the owner's weekly logged-in check. Repaired first."],
    ["Tier 2", "Daily logged-out check only, so logged-in pages depend on your reports. Repaired when time allows."],
  ]))}

${section("Rules checked", "How the rules were last confirmed by hand.", terms([
    [METHOD_LABELS["live-logged-out"], "Checked against the real site without an account. Logged-in pages can differ."],
    [METHOD_LABELS["live-logged-in"], "Checked by the owner, signed in to a real account."],
    [METHOD_LABELS.fixture, "Checked against a saved or hand-built copy of a page, not the live site."],
    [METHOD_LABELS.unverified, "Written from knowledge of the site or read from an MIT-licensed project, and not tested on the site yet. It may not work."],
  ]))}

${section("Last daily check", "The result of the newest automatic run, logged out.", terms([
    ["Pass", "A normal page loaded and hiding worked, with nothing broken."],
    ["Broken", "A normal page loaded, but an expected item was missing or something that must stay was hidden. An issue is opened."],
    ["Inconclusive", "The check could not tell, usually because the site showed a login, consent, or bot page."],
    ["Walled", "Inconclusive seven days in a row. The site relies on the logged-in check for now."],
    ["No data", "The results file has nothing for this site, or could not be loaded."],
  ]))}`;
}

/* Privacy */

function privacy() {
  const parts = [
    ["summary", "Summary", `<p>Algone has no account and collects no data by default. Your settings stay on your device. There are no analytics, no cookies, and no ads.</p>
<p>The one automatic network request is a daily download of a rules file from GitHub Pages. It carries no identifier. The other requests below happen only if you choose them.</p>
<p>This policy covers the Algone browser extension, the Algone Browser app, and this website.</p>`],
    ["device", "What stays on your device", `<p>The extension keeps these in your browser's local storage, and they are not sent to us or anyone else:</p>
<ul>
<li>your settings, including modes, filters, and which items are hidden</li>
<li>barrier state, snoozes, and counts of unlocks, shown only to you</li>
<li>a partner password, if you set one, stored only as a salted hash</li>
<li>your queue and Custom feed sources</li>
<li>Custom feed items, including the title, link, source, and time seen of items your browser showed on a subscriptions or following page</li>
</ul>
<p>Tuned filtering runs on your device, and nothing is sent to an AI model. Uninstalling removes this data along with the extension.</p>`],
    ["network", "What leaves your device", `<h3>Daily rules update</h3>
<p>Once a day, Algone downloads a fixed JSON file from <code>joshwright22.github.io</code>, hosted on GitHub Pages. The request has no identifier, no cookies, and no information about you or your settings. GitHub sees your IP address and browser User-Agent, as with any web request. You can turn rule updates off in settings.</p>
<h3>Wikipedia, only if you opt in</h3>
<p>Random mode can show Wikipedia summaries. This is off by default, and Algone asks for your consent first. If you turn it on, Algone requests a random article summary from <code>en.wikipedia.org</code>. Wikipedia sees your IP address, and nothing else is sent.</p>
<h3>Feeds you add to Custom mode</h3>
<p>If you add an RSS or Atom feed, Algone fetches that address to read it, without cookies. The server hosting the feed sees your IP address, as with any web request.</p>
<h3>Report a problem</h3>
<p>The optional Report a problem link opens a GitHub issue form in your browser, prefilled with the site name, the page's path, and your Algone version. Nothing is sent unless you review the form and submit it yourself. Submitted issues are public and fall under GitHub's own terms.</p>`],
    ["none", "What Algone does not do", `<ul>
<li>No analytics, telemetry, or crash reporting</li>
<li>No cookies</li>
<li>No accounts or sync servers</li>
<li>No selling or sharing of data, because Algone does not have any</li>
<li>No access to sites beyond the 12 supported ones, plus Wikipedia if you opt in</li>
</ul>
<p>Algone does not change what you send to the sites you visit. They handle your data under their own terms, and they can detect that Algone is present.</p>`],
    ["browser", "Algone Browser", `<p>Algone Browser stores your settings, queue, and feeds locally on your device, and makes the same daily rules fetch. It has no account of its own. Sites you log in to in the app handle your data under their own terms.</p>`],
    ["website", "This website", `<p>This website is hosted on GitHub Pages, so GitHub sees your IP address and User-Agent when you visit. It has no analytics, no cookies, and no third-party fonts or scripts.</p>
<p>If you choose a theme, the choice is saved in your browser's local storage and never sent anywhere. The site status page loads a status file from <code>raw.githubusercontent.com</code> in your browser, and GitHub sees that request too. The page shown after uninstalling receives no parameters and does no tracking. Its feedback link opens a GitHub issue form that you fill in and submit yourself.</p>
<p>If you tip through GitHub Sponsors or Ko-fi, that service handles your payment under its own terms. The <a href="{{base}}ledger/">public ledger</a> shows totals and carries no donor names.</p>`],
    ["changes", "Changes and contact", `<p>Changes to this policy are published on this page with a new date, and past versions are in the <a href="${REPO_URL}">public repository</a>.</p>
<p>For questions, open a <a href="${ISSUES_URL}">GitHub issue</a>. Issues are public, so do not include anything private.</p>`],
  ];
  return `${head("Privacy policy", "", `<p class="dated">Effective ${POLICY_DATE}</p>`)}
<div class="prose">${parts.map(([id, title, html]) => `<section id="${id}"><h2>${title}</h2>${html}</section>`).join("\n")}</div>`;
}

/* Support */

function support() {
  return `${head("Support", "Support happens in public on GitHub. A person reads every report, and no reply time is promised.")}

${section("A feed is showing", "", `${steps([
    "Check that you are in a browser, not the site's app. Algone cannot change apps.",
    "Open the Algone popup on that page. If it says the site is not active, grant access there.",
    `Check <a href="{{base}}sites/">site status</a>. The rule may be unverified or already known to be broken.`,
    `Choose Report a problem in the popup, or <a href="${REPORT_URL}">open a report</a> yourself.`,
  ])}`)}

${section("Algone hid something it should not", "", `<p>Turn on that item's switch in the popup, then <a href="${REPORT_URL}">report it</a>. Search, subscriptions, direct links, and messages are meant to keep working, so this is a bug.</p>`)}

${section("Reports and questions", "", `<p>A GitHub account is needed to open an issue. Issues are public, so leave out names, account details, and anything private.</p>
<div class="actions"><a class="button" href="${REPORT_URL}">Report a broken site</a><a class="button" href="${ISSUES_URL}">See all issues</a></div>`)}

${section("Uninstall Algone", "This always works, even during a lock. No barrier applies.", `${terms([
    ["Chrome", "Open <code>chrome://extensions</code>, find Algone, and choose Remove."],
    ["Edge", "Open <code>edge://extensions</code>, find Algone, and choose Remove."],
    ["Firefox", "Open <code>about:addons</code>, find Algone, and choose Remove."],
    ["Safari on Mac", "In Safari Settings, turn off Algone under Extensions, then delete the Algone for Safari app."],
    ["iPhone and iPad", "Delete the Algone for Safari app."],
    ["Algone Browser", "Delete the app."],
  ])}
<p>Your settings, queue, and feeds are removed with it.</p>`, "", "uninstall")}`;
}

/* Ledger */

function ledgerPage({ ledger }) {
  const money = (amount, currency) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  const sorted = [...ledger].sort((a, b) => b.date.localeCompare(a.date));

  const totals = {};
  for (const e of ledger) {
    const key = `${e.kind === "donation" ? "Donations received" : "Costs paid"} (${e.currency})`;
    totals[key] ??= { total: 0, currency: e.currency };
    totals[key].total += e.amount;
  }

  const table = sorted.length
    ? `<dl class="totals">${Object.entries(totals).sort().map(([k, v]) =>
      `<div><dt>${esc(k)}</dt><dd>${money(v.total, v.currency)}</dd></div>`).join("")}</dl>
<div class="table-scroll"><table class="stack">
<thead><tr><th scope="col">Date</th><th scope="col">Type</th><th scope="col">Note</th><th scope="col" class="num">Amount</th></tr></thead>
<tbody>${sorted.map((e) => `<tr><td data-label="Date">${dateText(e.date)}</td><td data-label="Type">${e.kind === "donation" ? "Donation" : "Cost"}</td><td data-label="Note">${esc(e.note ?? "")}</td><td class="num" data-label="Amount">${money(e.amount, e.currency)}</td></tr>`).join("\n")}</tbody>
</table></div>`
    : `<p>No donations or costs have been recorded yet. The first one will appear here.</p>`;

  const tips = [
    SPONSOR_URL && `<a href="${SPONSOR_URL}">GitHub Sponsors</a>`,
    KOFI_URL && `<a href="${KOFI_URL}">Ko-fi</a>`,
  ].filter(Boolean).join(" or ");

  return `${head("Funding ledger", "Every donation total and maintenance cost, in public. Entries are added by hand and carry no donor names.")}

${section("Entries", "", table, "full")}

${section("How the money moves", "", `<ul>
<li>A person pays for Claude usage by hand, and records the cost here.</li>
<li>Nothing moves donations to Anthropic automatically. There is no such route, and auto-reload stays off.</li>
<li>Donors do not buy Claude access, priority, or features. Every feature is free for everyone.</li>
<li>Agent runs start only when the owner asks, and are capped each day. Rule repairs come first, then bugs, then features.</li>
</ul>`)}

${section("Support the work", "", `<p>Tips help pay for maintenance, mainly the Claude usage behind rule repairs. You can tip through ${tips}.</p>`)}`;
}

/* Uninstalled */

function uninstalled() {
  return `${head("Algone is uninstalled", "Your settings, queue, and feeds were removed with it. Algone sent this page nothing about you, and the page tracks nothing.")}

${section("Want to say why you left?", "This is optional.", `<p>The form opens on GitHub, where you read it, fill it in, and submit it yourself. It needs a GitHub account, and answers are public.</p>
<div class="actions"><a class="button primary" href="${UNINSTALL_FEEDBACK_URL}">Open the feedback form</a></div>`)}

${section("Changed your mind?", "", `<p>You can <a href="{{base}}install/">install Algone again</a> at any time. It starts with default settings.</p>`)}`;
}

export function buildPages(ctx) {
  const count = ctx.sites.length;
  return [
    { slug: "", title: "Algone: Algorithm Control", description: `Algone is a browser extension that hides recommendation feeds on ${count} popular sites and keeps search, subscriptions, direct links, and messages working.`, body: home(ctx) },
    { slug: "install", title: "Install: Algone", description: "How to install Algone. It works in the browser, does not change native apps, and store listings are pending.", body: install(ctx) },
    { slug: "how-it-works", title: "How it works: Algone", description: "What Algone hides, its four modes and six barriers, and how rule repairs reach you.", body: howItWorks(ctx) },
    { slug: "sites", title: "Site status: Algone", description: `Support tier, verification, and the latest daily check for all ${count} sites.`, body: sitesPage(ctx), script: "status.js" },
    { slug: "privacy", title: "Privacy policy: Algone", description: "Algone has no account and collects no data by default. Read exactly what stays on your device and what leaves it.", body: privacy() },
    { slug: "support", title: "Support: Algone", description: "Fix a showing feed, report a broken site, or uninstall Algone.", body: support() },
    { slug: "ledger", title: "Funding ledger: Algone", description: "The public ledger of Algone donations and costs.", body: ledgerPage(ctx) },
    { slug: "uninstalled", title: "Uninstalled: Algone", description: "Algone has been removed. Optional feedback form.", body: uninstalled() },
  ];
}
