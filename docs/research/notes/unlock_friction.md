# Unlock and lockout mechanisms for a feed-blocking extension

Research date: 2026-10-31. Extends `user_complaints_gaps.md` and does not repeat it; references like "#546" are NFE GitHub issues cited there.

How to read this:
- Each HN comment is an anecdote. HN comments were read through a filtered search API result, not in their threads. Some may refer to a different tool than the one searched for. I say so where the tool is unclear.
- "Search summary" means I saw a search tool's digest, not the source itself.
- "Background" means my own knowledge, not checked in this session.
- Reddit was not tried, as instructed, so less technical users are underrepresented.

## Bottom line

Recommended v1 set, ranked. Every mode ends in a time-limited snooze, and weakening any setting must pass the same barrier.

| Rank | Mode | Role | Evidence strength |
|---|---|---|---|
| 1 | Pause and choose: wait timer with a prominent "never mind" button | **Default** | Strongest; the only mechanism with experimental support |
| 2 | Typing challenge: random text, adjustable length | Selectable | Moderate; shipped by Cold Turkey, new entrant uses a code |
| 3 | Daily unlock limit: N per day, then none until tomorrow | Add-on to 1 or 2 | Moderate; independently shipped by several tools |
| 4 | Scheduled unlock: feed can be unlocked only in set windows | Selectable | Moderate; highest-reacted NFE request |
| 5 | Locked until: no unlock until a chosen time | Selectable, with a length cap | Moderate on demand; no evidence on outcomes |
| 6 | Password held by someone else | Selectable | Weak to moderate; few but specific anecdotes |

**Leave out of v1:** paying to unlock, physical keys, message-only prompts as a barrier, irreversible locks, server-held cooldowns, a native companion app, and any claim that the extension "can't be removed."

Main caveat: **no source I found measures uninstalls by mechanism.** The ranking rests on what reduces use and what tools ship and users report, not on retention data.

## Which mechanisms are popular, praised, requested, complained about, or bypassed?

### Takeaway
The market has converged on a ladder: a soft pause, then an effortful unlock, then capped escapes, then hard locks. Hard modes nearly always come with a limited escape hatch. No tool found relies on a single mechanism, and users combine a delay with a cap.

### Cited Findings

**Wait timers and pauses**
- one sec is a pause rather than a hard block, and ScreenZen shows a delay with a question and a count of opens left, per a competitor's comparison — [Habit Doom](https://habitdoom.com/blog/opal-vs-screenzen-jomo-one-sec). ScreenZen's own site returned HTTP 429, so its wait lengths and limits are unverified.
- HN anecdotes: LeechBlock with a 60s delay, with escalating waits proposed for posting ([2025-09-17](https://news.ycombinator.com/item?id=45280270)). A 5-second timer that fails if the window loses focus: "it really helps slow you down" ([2025-12-17](https://news.ycombinator.com/item?id=46302563), tool unclear).
- Rising delay exists: Opal's Timeout level adds a rising delay before a break ([Habit Doom](https://habitdoom.com/blog/opal-vs-screenzen-jomo-one-sec), search summary, competitor source). An older Android changelog lists Standard and Increasing "Resistance" modes, which may be out of date ([APKMirror](https://www.apkmirror.com/apk/opal-the-focus-company/opal-screen-time-limit-timer/opal-screen-time-limit-timer-4-5-0-release/)).

**Typing challenges**
- Cold Turkey's Random Text lock requires a randomized string of 1 to 999 characters — [user guide](https://getcoldturkey.com/support/user-guide/).
- HN anecdote: turning it off "would require uninstalling it or typing in something really long" ([2025-10-10](https://news.ycombinator.com/item?id=45535279), tool unclear).
- Feed Holiday shows a confirmation code before a feed, per the prior notes.
- No complaint or praise data specific to typing was found. Searches for it in Cold Turkey comments returned nothing.

**Cooldowns and scheduled unlock**
- Cold Turkey's Time Range lock prevents, or allows only, changes during set times of day, and its Schedule lock prevents schedule changes while a block is active — [user guide](https://getcoldturkey.com/support/user-guide/).
- HN anecdote proposes a "cooldown" on blacklist changes ([2026-07-15](https://news.ycombinator.com/item?id=48920097)).
- Schedules are NFE's highest-reacted request, per the prior notes (#8, 14 reactions).

**Time-limited snooze**
- It is the standard unlock result: NFE has snooze, and the requests are about length and warnings (#281, #455, #271 in the prior notes). Freedom also has session breaks — [Freedom support](https://support.freedom.to/en/articles/15170482-how-to-use-session-breaks).
- Cold Turkey offers break types: Pomodoro and Allowance, where Allowance gives a total minutes budget — [user guide](https://getcoldturkey.com/support/user-guide/).

**Password held by someone else**
- Cold Turkey makes it Pro-only and pitches it for parents and accountability partners — [user guide](https://getcoldturkey.com/support/user-guide/).
- HN anecdotes: "My wife keeps the passwords" ([2023-05-09](https://news.ycombinator.com/item?id=35877112)); "My wife's got the password" ([2023-01-14](https://news.ycombinator.com/item?id=34385050)); advice to ask a relative or friend to set one ([2025-09-08](https://news.ycombinator.com/item?id=45172558)).
- Failure mode: LeechBlock's FAQ has a forgotten-password entry — [FAQ index](https://www.proginosko.com/leechblock/faq/).
- Sponsor approval exists as a product idea: Pawl's listing — [AppGoblin](https://appgoblin.info/apps/6783119309). Vendor description only.

**Daily unlock limits and capped escapes**
- HN anecdote: capped overrides plus a 15-second delay; "That combo keeps me from disabling it while still annoying enough to curb mindless browsing" ([2025-11-02](https://news.ycombinator.com/item?id=45793868), from a LeechBlock search).
- Brick: five lifetime emergency unbricks per device, reset through support — [The AU Review](https://www.theaureview.com/technology/brick-review/), search summary.
- Freedom: End Session credit in Locked Mode, once every 7 days, replenishing after 7 days. An older Freedom article says 10 uses total, and I could not confirm which is current — [Locked Mode](https://support.freedom.to/en/articles/1802927-locked-mode), [Ending a session](https://support.freedom.to/en/articles/1776713-ending-a-block-session).

**Strict and locked modes**
- Freedom Locked Mode can't be disabled during a session, and End Session stays visible for about the first minute. It must be enabled per device. An optional setting removes End Session permanently — [Freedom](https://support.freedom.to/en/articles/1802927-locked-mode).
- Opal: Normal can be cancelled, Timeout delays, and Deep Focus can't be cancelled — [MakerStack](https://makerstack.co/reviews/opal-review/), [Habit Doom](https://habitdoom.com/blog/opal-vs-screenzen-jomo-one-sec), search summary.
- Brick Strict Mode removes the emergency option and blocks app deletion — [The AU Review](https://www.theaureview.com/technology/brick-review/), search summary.
- Cold Turkey: Timer lock, which can be extended during a lock, and a Restart lock that requires rebooting — [user guide](https://getcoldturkey.com/support/user-guide/).
- HN anecdote: LeechBlock lockdown mode in use ([2026-04-04](https://news.ycombinator.com/item?id=47637929)).

**Complaints and bypasses**
- Extension removal is the plain route: "i just press right click and remove extension. Bypassing everything." ([2025-09-09](https://news.ycombinator.com/item?id=45179755), from a LeechBlock search).
- Cold Turkey reports conflict: "because it's literally impossible to bypass you never try" ([2026-09-02](https://news.ycombinator.com/item?id=49540270)) versus "Very easily bypassed at least on MacOS unfortunately." ([2026-09-02](https://news.ycombinator.com/item?id=49540394)). The second may refer to something else, since threads were not opened.
- Hardware-style failure: a Brick user reported the app froze and would not unbrick, and that apps stayed bricked outside the schedule — search summary of review pages, [Thingtesting](https://thingtesting.com/brands/brick/reviews), not independent.
- Being locked out by a stuck unlock screen, and wanting "off until turned back on", both appear for NFE (#561, #526 in the prior notes).

### Inferences
- Tools repeatedly pair a hard lock with a rationed escape (Brick five, Freedom weekly). That suggests vendors see absolute locks as a support and trust risk, though none says so in what I read.
- Stacking a delay with a cap is the one user-described recipe with a stated reason, so a cap should layer on a mode rather than stand alone.

### Gaps
- I found no counts comparing mechanism popularity. No store or vendor publishes which modes people choose.
- LeechBlock's full option list was not read; its Support page only links out, and evidence comes from FAQ titles and comments.
- **Forest:** nothing retrieved; its complaints are unverified.
- **Unhook:** no unlock evidence retrieved. Background: plain toggles with no friction.
- **Paying to unlock:** no independent user reviews found, including for Forfeit, Blockin, and Beeminder.

## What does research say reduces use without driving uninstalls?

### Takeaway
The best evidence supports a short pause with an easy way out. Nothing answers the uninstall half directly: the leading field study lost 61% of its participants and did not attribute why.

### Cited Findings
- **Grüning, Riedel, Lorenz-Spreen, PNAS 2023** ([paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC9974409)):
  - Field: 719 new iOS users recruited, 280 in the 6-week analysis, no control group. Dismissed 36% of open attempts on average, falling from 43% in week 1 to about 33% from week 3. Attempts fell 37%, from 166 to 105 per user per week. Combined, actual opens fell 57% (a pre/post comparison).
  - Controlled online experiment, n=500, preregistered, using viral videos in one session: the option to dismiss beat friction alone (d=0.44, p_Holm=.004). Option alone and the full package did not differ significantly. The message alone was not effective. The paper calls friction also effective, but I did not get a friction-vs-control statistic.
  - 439 of 719 (61%) did not finish, defined as deleting the app or ending participation early. No separate uninstall count. Dropouts rated their use as less problematic, which suggests some left from low motivation rather than from annoyance, but the paper does not establish that.
  - Conflict of interest: co-author Riedel created one sec.
- **Haliburton et al., CHI 2024** ([paper](https://www.medien.ifi.lmu.de/pubdb/publications/pub/haliburton2024chi/haliburton2024chi.pdf)): n=1,039 existing users over 13.4 weeks on average, plus 249 surveyed.
  - Social media is the main target. Friction reduced attempts, and users continued through it a larger share of the time as opens became more intentional.
  - Users take periodic breaks from the interventions and quickly rebound from overuse on return.
  - The authors state dropout and attrition cannot be captured. Riedel and Grüning are co-authors.
  - Anecdote (P162): after months, "it doesn't stop me as much as it did at the start."
- **Lyngs et al., CHI 2020** ([arXiv](https://arxiv.org/abs/2001.04180v2)), n=58 students, 6 weeks, Facebook on desktop: removing the feed and goal reminders both helped. Goal reminders were often annoying, and feed removal made some fear missing out.
- **Zimmermann and Sobolev, 2023** ([PubMed](https://pubmed.ncbi.nlm.nih.gov/36577008/)), n=112, preregistered, search summary: grayscale friction cut measured screen time immediately. Unenforced time limits had a smaller, gradual effect. No immediate effect on wellbeing or academic performance.
- **Wellspent RCT, JMIR 2026** ([paper](https://mhealth.jmir.org/2026/1/e56824/)), search summary: moderately enforced tool cut daily use of the most problematic app by about 29 minutes, with no significant change in problematic use.
- **Overcommitment** ([EconBiz record](https://www.econbiz.de/Record/pessimism-and-overcommitment/10012389346)), search summary, lab: many participants overstated their demand for a device removing tempting websites relative to the cost the temptation imposed.
- **Commitment in a MOOC** (quoted at [Beeminder forum](https://forum.beeminder.com/t/mooc-minder/406), secondary): pre-set time limits on distracting sites raised course time and completion, while a plain blocking tool had no significant effect. The original was not read.
- **Low take-up** ([Prague thesis](https://vskp.vse.cz/english/78330)): about 15% of incentivized students installed blockers. Weak source.

### Inferences
- The dismiss option is the most reusable finding. The unlock screen should make leaving the easiest action. A delay alone misses the best-supported part, and adding copy on top may not help.
- Habituation shows in the falling dismissal rate and the P162 quote, which supports an optional rising delay or a change of mode. This is an inference; rising delay itself was not tested.
- The evidence favors friction that people accept over the hardest possible barrier, partly because the hardest barrier here is voluntary. Hard locks may suit a motivated minority, which fits the overcommitment finding.
- Haliburton's break-and-return pattern suggests time away should not be punished, so avoid streak-loss mechanics.
- All one sec evidence is mobile. It covers apps, not desktop feeds, and transfer to a browser is assumed.

### Gaps
- No study found compares delay, typing, password, or strict locks head to head.
- No study found reports uninstall or disable rates by mechanism.
- Typing challenges, partner passwords, and pay-to-unlock have no direct outcome evidence here.
- HabitLab, Pause, MyTime, GoldenTime, and the Giné, Karlan and Zinman stickK study were searched for but not retrieved. They may be relevant, and nothing is claimed from them.

## How do tools deal with uninstall and disable, and what can an extension enforce?

### Takeaway
An extension cannot stop its own removal or disabling. Tools that enforce anything do it from outside the browser. A browser-only tool should describe its locks as precommitment, not as security.

### Cited Findings
- LeechBlock states a Firefox extension "cannot prevent the user from uninstalling it", so it offers no lock option — [FAQ](https://www.proginosko.com/leechblock/faq/remove-extension-firefox/). The same applies on Chrome — [FAQ](https://www.proginosko.com/leechblock/faq/remove-extension-chrome/).
- LeechBlock's workaround is browser policy: ExtensionInstallForcelist on Chrome and a Firefox policy "Locked" list, both set through the Windows Registry on Windows. Google documents that users can't remove a force_installed extension — [Google](https://support.google.com/chrome/a/answer/9867568).
- Cold Turkey uses a native app. It checks extensions about every 10 seconds and blocks the browser after a 60-second default grace period if the extension is off. The uninstaller fails during a locked block, and it tries to block unsupported browsers, Brave Tor windows, and guest browsing — [user guide](https://getcoldturkey.com/support/user-guide/).
- Freedom publishes separate guides on preventing uninstallation of its app — [Freedom](https://support.freedom.to/en/articles/6116638-how-to-prevent-uninstallation-of-the-freedom-app). Brick's Strict Mode uses phone-level control. I did not read Freedom's guide.
- `chrome.management` has no documented way to stop removal. `mayDisable` only reports whether the user can. `onDisabled` and `onUninstalled` exist, and the docs do not say whether they fire for the extension itself — [Chrome docs](https://developer.chrome.com/docs/extensions/reference/api/management).
- `runtime.setUninstallURL` opens a page on uninstall, up to 1023 characters, http or https — [Chrome docs](https://developer.chrome.com/docs/extensions/reference/api/runtime).
- LeechBlock's FAQ lists separate entries for Firefox safe mode, private browsing, and system clock changes, so all are known bypass routes — [FAQ index](https://www.proginosko.com/leechblock/faq/).

### What a browser extension can and cannot enforce

| Can do | Cannot do |
|---|---|
| Hide feeds and gate them behind any in-page challenge | Stop uninstall or disable |
| Time-box snoozes and enforce wait timers while running | Stop another browser or profile being used |
| Gate its own settings behind the same challenge | Reach native mobile apps |
| Store a password hash locally, so a partner's secret isn't readable in the UI | Keep a secret from a determined user: source is public, and removal skips it |
| Open an uninstall survey page | Run after removal, or undo a reset |

Background, unverified this session:
- Incognito needs user permission on Chrome, and Cold Turkey's guide asks users to grant it.
- Uninstall and reinstall wipes local state, resetting counters and locks.
- Local timers trust the system clock, which is why LeechBlock has a clock FAQ.
- Force-install on unmanaged personal Windows machines may be restricted to store-hosted extensions; I could not confirm this. Registry policy needs admin rights.

### Inferences
- The realistic bar is that bypassing costs more than waiting. That is good enough for a tool with a dismiss-first design, since the goal is interrupting autopilot.
- A browser-only password or lock can be dodged in seconds by removal, so it works mainly as social commitment. Partner mode should be sold that way.
- A watchdog second extension would need the `management` permission, adds a warning, and can also be removed. It is not worth it in v1.

## Recommended v1 design

Rules for all modes:
1. Every unlock is a time-limited snooze. Suggested default 10 minutes, with a warning before the feed returns (#455, #271). The number is my judgment.
2. Changing settings in a weaker direction passes the same barrier as an unlock. Tightening is instant. This closes the bypass in #546-style complaints and copies Cold Turkey's lock protection.
3. Scope is per feed, keeping the rest of the site usable. Per-site control matters to users (#511).
4. Failure must be open and fixable: a broken unlock screen must not trap the user (#561).
5. Explain plainly at setup that removal always works, and offer optional docs for policy locking.

Modes:
1. **Pause and choose (default).** Wait timer with "Never mind, close" as the primary button from the first second. Suggested 30 seconds, range 10 to 120. Pause the countdown if the tab loses focus. Optional rising delay within a day. Research tested 10 seconds; HN users report 15 and 60; 30 is my judgment.
2. **Typing challenge.** Random text of selectable length, no paste. Good for people who wait through timers. Line length should be set by the user at setup.
3. **Daily unlock limit.** N unlocks per day, layered on mode 1 or 2. Offer it during onboarding. Resets at local midnight.
4. **Scheduled unlock.** Unlocks work only in set windows, such as after 7 pm. Doubles as the schedules request.
5. **Locked until.** No unlock until a chosen time, capped at perhaps 7 days. Include one rationed escape, in the manner of Freedom and Brick.
6. **Partner password.** Partner types a password stored only as a local hash. Include a recovery path such as a long delay, otherwise forgotten passwords force reinstalling.

Leave out:

| Mechanism | Why |
|---|---|
| Pay to unlock | Needs a payment backend and account handling, which conflicts with a free local-only tool. Refund and store-policy burden. No independent user evidence. Giving users a way to pay also turns distress into revenue |
| Physical keys (Brick, USB) | Brick works through phone-level control. An extension has no equivalent enforcement, and removal defeats it |
| Reminders or messages alone | Message alone was not effective in PNAS, and goal reminders were often annoying in Lyngs |
| Irreversible locks | Freedom's permanent setting shows they exist. Pair with #561 for risk; the benefit is small while removal is one click |
| Server-held cooldowns | Adds infrastructure and privacy cost, while removal still defeats them |
| Native companion app | The only real anti-uninstall route, as with Cold Turkey, but a separate product. Revisit after v1 |
| Streaks and gamified penalties | Forest-style evidence was not retrieved, and Haliburton's break pattern argues against punishing lapses |

## Measuring it after launch

With no telemetry, use a voluntary uninstall survey page through `setUninstallURL` asking which mode was active and why they left, plus a local-only stats view of unlocks started, dismissed, and completed. This would fill the gap no source covers.
