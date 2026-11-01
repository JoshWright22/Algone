# Funding

How to take tips, pay for Claude usage, and show where the money went. Tips help pay for maintenance, mainly the Claude usage behind rule repairs. Features are never gated by tips.

**No automatic route exists from donations to Anthropic.** GitHub Sponsors and Ko-fi pay you. You then pay Anthropic yourself and record it in the ledger. The product and the docs must never claim otherwise.

## 1. GitHub Sponsors

1. Go to <https://github.com/sponsors> and choose **Get sponsored**.
2. Fill in your profile, and connect a Stripe account for payouts.
3. Add tiers. Say plainly what the money does, for example "Helps pay for maintenance and the AI tooling behind rule repairs". GitHub's terms ban misrepresenting why you raise funds.
4. Do not offer Claude access, priority fixes, or faster repairs as a tier.
5. Submit for review, and wait for approval.

`.github/FUNDING.yml` already names `JoshWright22`, so the Sponsor button appears on the repo. The first payout comes about 60 days after the first sponsorship, and then monthly, around the 22nd. Check the current schedule in your Sponsors dashboard.

## 2. Ko-fi

1. Create a page at <https://ko-fi.com>.
2. Connect PayPal or Stripe. Ko-fi sends tips directly to that account.
3. Check the current fees on Ko-fi's site. They were not confirmed from an official page when this was written.
4. Add your handle in two places:
   - `.github/FUNDING.yml`: uncomment the `ko_fi` line.
   - `KOFI_URL` in `packages/core/src/links.ts`. While it is empty, no link is shown.

The tip link stays out of the Safari app and Algone Browser.

## 3. Pay for Claude with your subscription

This is the default.

1. Subscribe at <https://claude.ai>. Any plan that includes Claude Code works.
2. **Know that it renews automatically.** It charges your stored card at the end of each term until you cancel, whether or not donations came in. Cancel at least 24 hours before the term ends to avoid the next charge. You keep access until the paid period ends.
3. Install Claude Code, and run this on your machine:

   ```sh
   claude setup-token
   ```

4. Copy the token. It lasts one year, so set a reminder.
5. On GitHub, go to **Settings > Secrets and variables > Actions > New repository secret**. Name it `CLAUDE_CODE_OAUTH_TOKEN`, and paste the token.
6. Install the Claude GitHub app, as described in `docs/setup.md`.

Agent runs share your plan's limits with your own chat and Claude Code use. A busy day of repairs can leave you waiting.

## 4. Or pay with an API key

Choose this if you want spending tied to money you put in. It costs nothing when idle.

1. Create an organization at <https://platform.claude.com>, and add a card.
2. Buy a small credit balance. Purchased credits are non-refundable and reportedly expire after one year, so check the current terms before buying a lot.
3. **Leave auto-reload off.** See the next section.
4. Create a workspace named `algone-bot`.
5. Set a monthly spend limit on that workspace, and an alert. The Default workspace cannot have a limit. Spend can take a while to show, so usage can pass the limit slightly before requests start failing.
6. Create an API key in that workspace.
7. Save it as the `ANTHROPIC_API_KEY` repository secret.

If both secrets exist, the API key is used.

## 5. Auto-reload stays off

Auto-reload charges your card when the balance gets low, whether or not any donations came in. It is off by default. Leave it off. With it off, API calls stop when the balance runs out, and that is the hardest cap you have.

Never give an agent a way to buy credits. Payment stays a human action.

## 6. The public ledger

`ledger/entries.json` is a public record of total donations and costs. You edit it by hand, CI validates it, and the website shows it. Each entry looks like this:

```json
{ "date": "2026-11-30", "kind": "donation", "amount": 25.0, "currency": "USD", "note": "GitHub Sponsors, November total" }
```

`kind` is `donation` or `cost`. **Never put donor names, handles, emails, or messages in it.** Use monthly totals.

Each month:

1. Add up what Sponsors and Ko-fi paid out.
2. Decide how much to spend, keeping tax in mind.
3. Pay Anthropic, or note the month's subscription charge.
4. Add one `donation` entry and one `cost` entry per source.
5. Open a PR, and merge it. The website updates after CI passes.

## 7. Caps and priorities

Each run is limited to 20 turns. `AGENT_MAX_RUNS_PER_DAY` limits runs per day, 3 by default. Slots are reserved so repairs come first:

| Issue label | Can use |
|---|---|
| `site-change` | The whole cap |
| `bug` | The cap minus 1 |
| Anything else | The cap minus 2 |

With the default, a feature request runs only if no agent run happened today, and the last slot of the day is kept for a rule repair. A run over its limit comments on the issue and stops. Days are counted in UTC. Runs start only when you add the `claude-fix` label.

To change the cap, go to **Settings > Secrets and variables > Actions > Variables**, and set `AGENT_MAX_RUNS_PER_DAY`.

## 8. What you must not do

**Do not sell donors Claude access.** That means no paid tier that gets someone agent runs, no priority repairs for sponsors, and no reselling. Anthropic's terms bar reselling usage to others. Using donated money to pay your own bill, for your own tooling on your own repo, is different. If you are unsure where a line falls, ask Anthropic.

## 9. Tax

Donations may count as taxable income. This was not researched for your situation. Ask a tax professional, and keep your payout records.

## 10. Claude for Open Source

Anthropic runs a program that gives qualifying open source maintainers free Claude access for a period, six months of a top plan when this was written. Eligibility was based on measures such as many dependent repos or a record of merged PRs elsewhere. A new repo probably will not qualify on its own, though your wider contribution history might. Details and the application are at <https://claude.com/contact-sales/claude-for-oss>. It is worth applying once Algone has users. If you are accepted, update your ledger note to say so.
