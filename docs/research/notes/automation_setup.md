# Automation setup for JoshWright22/Algone

Researched 2026-10-31 from primary docs. Snippets were assembled from those docs and have not been run.

Evidence labels:
- **[doc]** stated in a primary doc I read.
- **[source]** read in code, or checked by a live API call.
- **[inference]** my reasoning from the docs.
- **[unverified]** could not confirm, or came only from a search snippet or secondary source.

## Current repo state [source]

- `JoshWright22/Algone` is public, empty, default branch `main`, no license, Pages not configured, no workflows.
- GitHub Pages and environments work on the Free plan only for public repos, so keep it public.
- Add a license before inviting contributions. Without one, others have no default right to reuse the code.

## Recommended setup

1. **Pay with a Console API key on prepaid credits, with auto-reload off,** in a dedicated workspace with a monthly spend limit. Prepaid balance is the hardest cap available.
2. **Do not auto-run Claude on public issues at first.** The owner reads the issue and applies a `claude-fix` label. Claude pushes a `claude/` branch. The owner opens and merges the PR.
3. **Keep store secrets in GitHub environments** restricted to `main`, with a required reviewer. No repo-level publish secrets, and none in any job that runs Claude.
4. **Daily site check runs Playwright without any model.** Claude is called only when a check fails.
5. **Notify by GitHub @mention first,** then ntfy or a Discord webhook if push to the phone is wanted.
6. **Money stays human.** Donations reach a bank account, and a person buys credits and updates the budget variable.

Latest tags checked by API on 2026-10-31 [source]:

| Item | Version |
|---|---|
| `anthropics/claude-code-action` | `v1` = `v1.0.266` = `d535f5172dec02b204866b393d6b20b9b2aaf98d` |
| `actions/checkout` | v7.0.1 (Anthropic and GitHub docs still show v6) |
| `actions/setup-node` | v7.1.0 |
| `actions/configure-pages` | v6.0.0 |
| `actions/upload-pages-artifact` | v5.0.0 |
| `actions/deploy-pages` | v5.0.1 |
| Playwright | 1.64.1 |
| web-ext | 10.8.0 (needs Node >= 20) |
| fastlane | 2.241.2 |

The GitHub "latest release" endpoint for claude-code-action returns an old `v1` release from 2025. Use the tags list instead.

---

## 1. Claude Code in GitHub Actions on issues

### Setup [doc]

- Quick: run `/install-github-app` in Claude Code (needs admin rights and `gh`).
- Manual: install https://github.com/apps/claude, add a secret, copy `examples/claude.yml`.
- Modes: no `prompt` input means interactive (waits for `@claude`, label or assignee trigger). With `prompt`, it runs in automation mode on any event.

### Inputs (action.yml, main branch) [doc]

- Triggers: `trigger_phrase` (`@claude`), `assignee_trigger`, `label_trigger` (`claude`).
- Task: `prompt`, `settings`, `claude_args`.
- Auth: `anthropic_api_key`, `claude_code_oauth_token`, `github_token`, and WIF inputs `anthropic_federation_rule_id`, `anthropic_organization_id`, `anthropic_service_account_id`, `anthropic_workspace_id`, `anthropic_oidc_audience`.
- Providers: `use_bedrock`, `use_vertex`, `use_foundry`.
- Access: `allowed_bots`, `allowed_non_write_users`, `include_comments_by_actor`, `exclude_comments_by_actor`, `additional_permissions`.
- Git: `base_branch`, `branch_prefix` (`claude/`), `branch_name_template`, `use_commit_signing`, `ssh_signing_key`, `bot_id`, `bot_name`.
- Output: `use_sticky_comment`, `classify_inline_comments`, `track_progress`, `include_fix_links`, `display_report`, `show_full_output`.
- Other: `plugins`, `plugin_marketplaces`, `path_to_claude_code_executable`, `path_to_bun_executable`.
- Outputs: `conclusion`, `execution_file`, `branch_name`, `github_token`, `structured_output`, `session_id`.

### Triggers and permissions [doc]

- Events: `issues` (`opened`, `assigned`, `labeled`), `issue_comment`, `pull_request_review_comment`, `schedule`.
- Workflow permissions in the official example: `contents: write`, `pull-requests: write`, `issues: write`, `id-token: write`, `actions: read`. `id-token: write` is needed for default GitHub App auth.
- The docs' Claude App table lists Workflows read and write, and security.md says that permission is requested for future features. The FAQ says Claude has no workflow write access. Source resolves this: the action requests a token with only `contents`, `pull_requests` and `issues` set to write, and its prompt forbids editing `.github/workflows` [source].
- Claude does not create PRs by default. It pushes a branch and posts a pre-filled PR link. It never force-pushes. The Bash tool is off by default [doc].
- Commits from the default `GITHUB_TOKEN` do not trigger CI. Leave `github_token` unset to authenticate as the Claude App [doc].

### API key vs subscription token

| | `ANTHROPIC_API_KEY` | `CLAUDE_CODE_OAUTH_TOKEN` |
|---|---|---|
| Source | Claude Console | `claude setup-token`, Pro, Max, Ultra, Team or Enterprise |
| Lifetime | Until deleted | One year |
| Scope | Workspace | Model requests only |
| Billing | Per token | Plan usage, shared with chat and the owner's own Claude Code |
| Legal base | Commercial Terms | Consumer Terms for Pro, Max, Ultra |

Credential precedence: `ANTHROPIC_API_KEY` beats `CLAUDE_CODE_OAUTH_TOKEN`. In print mode the key is always used when present [doc].

**Is the subscription token permitted?**

- Consumer Terms section 3 bars automated access, except with an API key "or where we otherwise explicitly permit it" [doc].
- Anthropic's docs explicitly offer `claude setup-token` for CI and a `claude_code_oauth_token` input, so owner-run CI on your own repo is permitted [inference, strong].
- Limits are five-hour and weekly windows shared with chat. Advertised limits "assume ordinary, individual usage" [doc].
- Third-party developers may not route requests through Free, Pro, Max or Ultra credentials "on behalf of their users" [doc].

Whether a bot that reacts to strangers' issues around the clock counts as "ordinary, individual usage" or "on behalf of users" is **[unverified]**. No doc addresses it. Treat it as a poor fit: use an API key for anything a non-owner can start. Anthropic points such questions to https://www.anthropic.com/contact-sales.

### Hardening a public repo bot

Defaults that help [doc]:
- Only users with write access trigger runs on issue, comment and PR events.
- Bots are rejected unless listed.
- Hidden text is stripped, but Anthropic warns that new bypasses may appear.

Critical gap: **write-access checks cover who triggers a run, not whose text is in the issue.** An owner label on a stranger's issue still feeds the stranger's text to Claude [inference]. The owner must read it first.

Rules:

1. Keep the write-access check. Avoid `allowed_non_write_users: "*"`. Docs call it high risk, for very limited workflows such as label-only ones. It requires `github_token` and must never use a PAT [doc].
2. Filter comments with `include_comments_by_actor: "JoshWright22"`. Exclusion wins if both lists match [doc].
3. Add a job `if:` on sender. `github.event.issue.author_association` can additionally gate on `OWNER`, `MEMBER` or `COLLABORATOR`.
4. Keep the tool list minimal, and deny `WebFetch` and `WebSearch` so injected text has less way to send data out [inference].
5. Set `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB: "1"` yourself. The action turns it on automatically only when `allowed_non_write_users` is set [source].
6. Keep `show_full_output` and `ACTIONS_STEP_DEBUG` off. On public repos they can expose credentials in logs [doc].
7. Do not use `pull_request_target` to run agent code from forks. Fork PRs get no secrets on `pull_request`, and that is the safe default [doc].
8. Store publish secrets only in environments, and block `claude/**` from those environments [doc for the feature, inference for the design]. Reason: Claude can change `package.json`, so anything CI runs on its branch is attacker-influenced. Those CI jobs must hold no secrets.
9. Protect `main` with required PR review. Never auto-merge bot branches [inference].
10. Pin third-party actions to full SHAs. GitHub recommends this in its secure-use guide (URL below, not re-read today) [unverified today].
11. Pass untrusted fields through `env:`, never directly in `run:` with `${{ }}`. This is GitHub's script injection guidance [unverified today].
12. Set `timeout-minutes`, `--max-turns` and `--max-budget-usd` on every agent job [doc].

Owner-approved fix workflow:

```yaml
name: Claude fix (owner approved)
on:
  issues:
    types: [labeled]
jobs:
  fix:
    if: github.event.label.name == 'claude-fix' && github.event.sender.login == 'JoshWright22'
    runs-on: ubuntu-latest
    timeout-minutes: 20
    permissions:
      contents: write
      pull-requests: write
      issues: write
      id-token: write
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 1
      - uses: anthropics/claude-code-action@d535f5172dec02b204866b393d6b20b9b2aaf98d # v1.0.266
        env:
          CLAUDE_CODE_SUBPROCESS_ENV_SCRUB: "1"
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          label_trigger: claude-fix
          include_comments_by_actor: JoshWright22
          claude_args: |
            --model claude-sonnet-5-5
            --max-turns 20
            --max-budget-usd 1.00
            --allowedTools "Edit,Read,Write,Glob,Grep,Bash(npm test),Bash(npm run lint)"
            --disallowedTools "WebFetch,WebSearch"
```

Optional public triage, added only after the above works. Follows `examples/issue-triage.yml`. Its label script and command files must exist in the repo. The worst case from injection is wrong labels, plus model spend on every issue opened, so a tight budget is required.

```yaml
name: Claude issue triage
on:
  issues:
    types: [opened]
jobs:
  triage:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    permissions:
      contents: read
      issues: write
    steps:
      - uses: actions/checkout@v7
      - uses: anthropics/claude-code-action@d535f5172dec02b204866b393d6b20b9b2aaf98d # v1.0.266
        env:
          CLAUDE_CODE_SCRIPT_CAPS: '{"edit-issue-labels.sh":2}'
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          github_token: ${{ secrets.GITHUB_TOKEN }}
          allowed_non_write_users: "*"
          prompt: "/label-issue REPO: ${{ github.repository }} ISSUE_NUMBER: ${{ github.event.issue.number }}"
          claude_args: |
            --model claude-haiku-5-5
            --max-turns 4
            --max-budget-usd 0.05
            --disallowedTools "WebFetch,WebSearch,Edit,Write"
```

Keep a daily issue limit, since anyone can open issues and cost money [inference]. The budget gate in section 8 can front this job too.

---

## 2. Scheduled agent runs: daily site-change check

| | GitHub Actions cron | Claude Code scheduled tasks ("routines") |
|---|---|---|
| Status | Stable | Research preview [doc] |
| Plans | Any | Pro, Max, Ultra, Team, Enterprise [doc] |
| Billing | Free Linux runner on public repo [doc], plus API or plan | Subscription usage [doc] |
| Minimum interval | 5 minutes [doc] | Hourly, faster cron rejected [doc] |
| Network | Open | Default allowlist, sites outside it get 403 until you add them via Custom access [doc] |
| Identity | Bot or App | Appears as you, including commits and connector actions [doc] |
| Reliability | Can be delayed or dropped at high load, worst at top of hour [doc] | 100 scheduled runs per hour per account [doc] |
| Gotcha | Disabled after 60 days without repo activity on public repos, default branch only [doc] | Runs as your GitHub identity, so branch rules that identity can bypass do not block pushes [doc] |

Routines: create at https://claude.ai/code/routines or `/schedule`, `/routines` alias [doc]. Triggers: schedule, API, GitHub event [doc].

Recommendation: Actions, because Playwright with real browsers and an open network fits it, and the check costs nothing unless something changes.

The scheduled run also passes the human-actor check, so if the last editor of the cron was a bot, list it in `allowed_bots` [doc].

```yaml
name: Daily site check
on:
  schedule:
    - cron: "17 6 * * *"
  workflow_dispatch:
permissions:
  contents: read
  issues: write
jobs:
  check:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: lts/*
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - id: smoke
        run: npx playwright test tests/site-selectors
      - if: failure() && steps.smoke.conclusion == 'failure'
        env:
          GH_TOKEN: ${{ github.token }}
        run: gh issue create --title "Site check failed on $(date -u +%F)" --label site-change --body "Run $GITHUB_SERVER_URL/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID"
```

Create the `site-change` label first, or `gh issue create` fails. The owner then labels that issue `claude-fix`, which reuses the section 1 workflow. Fetched page content is untrusted too, so do not hand it to a Claude job with write access unattended [inference].

**[unverified]** Whether target sites (YouTube, Instagram and so on) serve normal pages to datacenter runner IPs or logged-out sessions. Expect bot walls, and test before relying on this. Check each site's terms too.

---

## 3. Billing

**Subscription.** Renews automatically at the end of each term and charges the stored payment method until cancelled. Cancel at least 24 hours before the term ends to avoid the next charge. Cancellation takes effect at the end of the paid period [doc]. Subscriptions from the iOS or Android stores are managed there [search result, unverified].

**Console auto-reload exists** [doc]:
- platform.claude.com/settings/billing, Credit balance, **Set up auto-reload**, enter trigger and target balances, **Turn on**.
- Needs an Admin or Billing role.
- It charges immediately if the balance is already at or below the trigger.
- It is based on purchased balance only, and fires even while included credits remain.

**Credit behavior:**
- With no credits left, API calls stop. Failed requests are not charged, though requests that disconnect or time out while on track to succeed still are [doc].
- Purchased credits expire one year after purchase and are non-refundable [search snippet of support article, treat as unverified wording].

**Should an agent configure payments? No.**
- Billing pages are login-gated.
- Setting spend limits through an API is early access, and the Spend Limits API is Enterprise-only and not for Console organizations [doc].
- No documented endpoint buys credits [not found in docs].
- Autonomous purchasing is a financial action on the owner's card, and a prompt-injected agent must never hold that power [inference]. The agent's only input is a budget variable set by a human.

**Human checklist, money and accounts:**

1. Create a Console organization, add a card, buy a small first balance.
2. Leave auto-reload off.
3. Create workspace `algone-bot`, set a monthly spend limit and alert. The Default workspace cannot have a limit [doc].
4. Create an API key in that workspace and save it as `ANTHROPIC_API_KEY`.
5. Create and pay for store accounts, and do first submissions by hand.
6. Enable 2-step verification on every account.

---

## 4. Notifying the owner when an issue is addressed

Trigger on `issues: closed`. A human merge closing the issue fires this. Events caused by `GITHUB_TOKEN` generally do not start workflows [doc], so a bot-close path would not.

| Option | Account needed | Setup | Delivery | Secret |
|---|---|---|---|---|
| GitHub @mention | None beyond GitHub | One workflow step | Web inbox, GitHub Mobile, email [doc] | None |
| ntfy.sh | None to publish or subscribe | One curl, ntfy app | Phone push | Topic name, "essentially a password" [doc] |
| Discord webhook | Discord | Private server, channel webhook | Discord push | Webhook URL |
| Discord DM bot | Discord app with bot | Bot token, Create DM call | True DM | Bot token |
| Slack webhook | Slack workspace, Slack app | App, webhook | Channel post | Webhook URL [doc] |
| Email (SMTP) | Mail provider | Third-party action or script | Inbox | SMTP credentials |
| SMS | Paid gateway such as Twilio | Most effort | Text | API key |

**No third-party account:** the GitHub notification is the only option with no new service at all. ntfy needs no sign-up but is still a third-party service. On ntfy.sh all topics are public, so a long random topic name is your only protection unless you pay or self-host [doc].

**[unverified]:**
- GitHub's own docs page did not state that you get no notification for your own actions. In practice a mention posted from the owner's own PAT may not notify, so post as `github-actions[bot]`.
- Discord: docs do not clearly state that a bot must share a server with the user to DM them. Assume yes and create a private server. Plain webhooks post to a channel, not a DM.
- Slack: webhooks post to a chosen channel, and DM behavior is not stated.
- SMS and email providers were not researched in depth.

```yaml
name: Notify owner
on:
  issues:
    types: [closed]
permissions:
  issues: write
jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - name: GitHub mention
        env:
          GH_TOKEN: ${{ github.token }}
          NUMBER: ${{ github.event.issue.number }}
        run: gh issue comment "$NUMBER" --repo "$GITHUB_REPOSITORY" --body "@JoshWright22 issue #$NUMBER was closed."
      - name: ntfy push
        env:
          TOPIC: ${{ secrets.NTFY_TOPIC }}
          URL: ${{ github.event.issue.html_url }}
          NUMBER: ${{ github.event.issue.number }}
        run: |
          curl -fsS -H "Title: Algone issue closed" -H "Click: $URL" -d "Issue #$NUMBER closed" "https://ntfy.sh/$TOPIC"
      - name: Discord webhook
        env:
          WEBHOOK: ${{ secrets.DISCORD_WEBHOOK_URL }}
          URL: ${{ github.event.issue.html_url }}
        run: |
          jq -n --arg c "Issue closed: $URL" '{content:$c, allowed_mentions:{parse:[]}}' \
            | curl -fsS -H 'Content-Type: application/json' -d @- "$WEBHOOK"
```

Discord recommends `allowed_mentions` when text is user-generated [doc]. Keep issue titles out of messages or sanitize them.

---

## 5. Automated publishing

Run every publish job under a GitHub environment, not repo-level secrets. Environment secrets stay unavailable until protection rules pass [doc].

| Store | Secrets | First release by hand? | Key limits |
|---|---|---|---|
| Chrome Web Store | `CWS_SA_KEY_JSON`, `CWS_PUBLISHER_ID`, `CWS_EXTENSION_ID` | Yes, listing and privacy tabs | One service account per publisher |
| Firefox AMO | `AMO_JWT_ISSUER`, `AMO_JWT_SECRET` | No, but metadata is required | Listed versions go through review |
| Edge Add-ons | `EDGE_CLIENT_ID`, `EDGE_API_KEY`, `EDGE_PRODUCT_ID` | Yes, Partner Center | No API for new products or metadata |
| App Store Connect | `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8`, plus `BUILD_CERTIFICATE_BASE64`, `P12_PASSWORD`, `BUILD_PROVISION_PROFILE_BASE64`, `KEYCHAIN_PASSWORD` | Yes, app record | Paid membership |
| Google Play | `PLAY_SA_JSON` | Yes | Only for an actual Android app |
| GitHub Releases | `GITHUB_TOKEN` only | No | None |

### Chrome Web Store API v2 [doc]

- Base: `https://chromewebstore.googleapis.com`. Scope: `https://www.googleapis.com/auth/chromewebstore`.
- `POST /upload/v2/publishers/PUBLISHER_ID/items/EXTENSION_ID:upload`
- `GET /v2/publishers/PUBLISHER_ID/items/EXTENSION_ID:fetchStatus`
- `POST /v2/publishers/PUBLISHER_ID/items/EXTENSION_ID:publish`, body options `publishType` (`DEFAULT_PUBLISH` or `STAGED_PUBLISH`), `deployInfos`, `skipReview`.
- Also `:setPublishedDeployPercentage` (needs over 10,000 seven-day active users) and `:cancelSubmission`.
- The manifest version must increase, or upload fails.
- 2-step verification is required on the Google account.
- V1 was supported only until 2026-10-15. Do not use it. **[unverified]** whether V1 calls already fail.

Service account [doc]: enable the Chrome Web Store API in Google Cloud, create a service account with no project roles, add its email in the Developer Dashboard Account section. Tokens come from `gcloud` impersonation or a JSON key plus JWT. Google warns that key files are risky.

Prefer the service account over OAuth. With an External consent screen in Testing status, refresh tokens expire in 7 days [doc], which breaks CI silently.

```yaml
      - uses: google-github-actions/auth@v3
        id: gauth
        with:
          credentials_json: ${{ secrets.CWS_SA_KEY_JSON }}
          token_format: access_token
          access_token_scopes: https://www.googleapis.com/auth/chromewebstore
      - name: Upload and publish
        env:
          TOKEN: ${{ steps.gauth.outputs.access_token }}
          PUB: ${{ secrets.CWS_PUBLISHER_ID }}
          EXT: ${{ secrets.CWS_EXTENSION_ID }}
        run: |
          curl -fsS -H "Authorization: Bearer $TOKEN" -X POST -T dist/chrome.zip \
            "https://chromewebstore.googleapis.com/upload/v2/publishers/$PUB/items/$EXT:upload"
          curl -fsS -H "Authorization: Bearer $TOKEN" -H "Content-Length: 0" -X POST \
            "https://chromewebstore.googleapis.com/v2/publishers/$PUB/items/$EXT:publish"
```

**[unverified]** This auth action path with the Chrome Web Store scope is untested. Keyless GitHub OIDC impersonation may also work and would avoid a stored key, but no Chrome doc confirms it. Upload may also need polling `fetchStatus` before publishing.

### Firefox [doc]

```bash
web-ext sign --channel=listed --amo-metadata=amo-metadata.json \
  --api-key="$AMO_JWT_ISSUER" --api-secret="$AMO_JWT_SECRET" --approval-timeout=0 \
  --source-dir=dist/firefox --upload-source-code=source.zip
```

- `--channel` is required. `unlisted` returns a signed XPI for self-distribution.
- First listed version needs `categories`, `summary` and the version `license` in metadata.
- Env vars: `WEB_EXT_API_KEY`, `WEB_EXT_API_SECRET`, `WEB_EXT_CHANNEL`, `WEB_EXT_AMO_METADATA`, `WEB_EXT_APPROVAL_TIMEOUT`, `WEB_EXT_UPLOAD_SOURCE_CODE`.
- `--approval-timeout` default is 15 minutes. `0` disables the wait, which suits listed review.
- Manifest needs `browser_specific_settings.gecko.id`.
- Since 2025-11-03 new extensions must declare `browser_specific_settings.gecko.data_collection_permissions`, for example `"required": ["none"]`. Needs Firefox 140 or later, 142 on Android.
- Keys come from https://addons.mozilla.org/developers/addon/api/key/. That page is login-gated, so I could not read it.
- `--source-dir` is a standard web-ext option, not re-read in the sign section today. Upload source only if builds are minified or bundled, per Mozilla policy [unverified today].

### Edge Add-ons REST API v1.1 [doc]

Partner Center, Microsoft Edge, **Publish API**, enable the new experience, **Create API credentials**. Keys show an expiry date, so set a renewal reminder. The doc date on v1 support is stale: v1 was said to end 2024-12-31, so use v1.1.

```bash
curl -H "Authorization: ApiKey $EDGE_API_KEY" -H "X-ClientID: $EDGE_CLIENT_ID" \
  -H "Content-Type: application/zip" -X POST -T dist/edge.zip -i \
  "https://api.addons.microsoftedge.microsoft.com/v1/products/$EDGE_PRODUCT_ID/submissions/draft/package"
# 202 with Location: operationID. Poll .../draft/package/operations/$OP until done, then:
curl -H "Authorization: ApiKey $EDGE_API_KEY" -H "X-ClientID: $EDGE_CLIENT_ID" -X POST \
  -d '{"notes":"Automated release"}' -i \
  "https://api.addons.microsoftedge.microsoft.com/v1/products/$EDGE_PRODUCT_ID/submissions"
```

Microsoft's sample body shows `{ "notes"="text value" }`, which is not valid JSON. My snippet uses JSON. Test it.

### Safari: App Store Connect API and fastlane

- Package on a Mac: `xcrun safari-web-extension-packager dist/safari --project-location build/safari --app-name Algone --bundle-identifier com.example.algone --swift --copy-resources --no-open --no-prompt --force`. Previously named `safari-web-extension-converter` [doc].
- **No-Mac route:** App Store Connect has a web packager. Create the app record, then Users and Access, Xcode Cloud tab, Safari Web Extension Packager, Upload the zip, then TestFlight and Submit. Packaging time draws on the 25 Xcode Cloud hours included each month [doc]. **[unverified]** whether this can be driven by API.
- Team API key: Users and Access, Integrations, App Store Connect API, Team Keys. Needs an Admin. The `.p8` downloads once. Do not use individual keys, as they cannot use Provisioning endpoints [doc].
- fastlane `app_store_connect_api_key` params: `key_id`, `issuer_id`, `key_content`, `is_key_content_base64`, `in_house` [doc]. Env var names were not listed.
- Signing on `macos-latest`: secrets `BUILD_CERTIFICATE_BASE64`, `P12_PASSWORD`, `BUILD_PROVISION_PROFILE_BASE64`, `KEYCHAIN_PASSWORD`. macOS profiles use `.provisionprofile` [doc].

```ruby
lane :release do
  api_key = app_store_connect_api_key(
    key_id: ENV["ASC_KEY_ID"],
    issuer_id: ENV["ASC_ISSUER_ID"],
    key_content: ENV["ASC_KEY_P8"]
  )
  build_app(scheme: "Algone")
  upload_to_app_store(api_key: api_key, submit_for_review: false)
end
```

Lane is assembled from docs and untested. An extension target needs its own bundle ID and profile, so expect two profiles [inference].

### Google Play Developer API [doc]

- Service account: create in Cloud, enable the API, invite its email in Play Console Users and Permissions. Linking the developer account to a Cloud project is no longer needed.
- Scope `https://www.googleapis.com/auth/androidpublisher`.
- Flow: `edits.insert`, `edits.bundles.upload` (`POST https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/{packageName}/edits/{editId}/bundles`), `edits.tracks.update`, `edits.commit`.
- The API works only on an existing app.
- New personal accounts created after 2023-11-13 need a closed test with 12 testers opted in for 14 continuous days before production [search snippet of Google help, treat as unverified wording].

Relevance: a Chromium extension does not ship through Play. Skip this unless Algone adds an Android app [inference]. Firefox for Android distribution goes through AMO.

### GitHub Releases

Build and sign in one job, publish in another. Uses no marketplace action.

```yaml
name: Release
on:
  push:
    tags: ["v*.*.*"]
jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: lts/*
      - run: npm ci && npm test && npm run build
      - uses: actions/upload-artifact@v7
        with:
          name: dist
          path: dist/*.zip
  github-release:
    needs: build
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/download-artifact@v8
        with:
          name: dist
          path: dist
      - env:
          GH_TOKEN: ${{ github.token }}
        run: gh release create "$GITHUB_REF_NAME" dist/*.zip --repo "$GITHUB_REPOSITORY" --generate-notes --verify-tag
  publish-stores:
    needs: github-release
    runs-on: ubuntu-latest
    environment: release
    permissions:
      contents: read
    steps:
      - run: echo "Add store steps here. Secrets exist only in the release environment."
```

Create environment `release` with a required reviewer and deployment restricted to `main` and `v*` tags. Patterns for branches and tags are set separately [doc]. `.github/release.yml` controls note categories [doc]. Artifact action tags are the latest majors by API (upload v7.0.2, download v8.0.2), but their input changes were not reviewed.

---

## 6. GitHub Pages via Actions [doc]

Settings, Pages, Source: **GitHub Actions**. Based on `actions/starter-workflows/pages/static.yml` with current tags. Artifact must be under 10 GB with no symbolic or hard links. `upload-pages-artifact` has an `include-hidden-files` input in recent versions [source].

```yaml
name: Deploy site
on:
  push:
    branches: [main]
    paths: ["website/**"]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: false
jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/configure-pages@v6
      - uses: actions/upload-pages-artifact@v5
        with:
          path: website
      - id: deployment
        uses: actions/deploy-pages@v5
```

The official starter still shows older tags. **[unverified]** whether the new majors change required inputs.

---

## 7. Playwright testing of an MV3 extension

**Chromium** [doc]:
- Use a persistent context and `channel: 'chromium'`, which allows headless extension runs.
- Chrome and Edge removed the side-load flags (Chrome 137 for `--load-extension`), so use Playwright's bundled Chromium.
- Chrome's own docs say old headless cannot load extensions.
- The MV3 service worker suspends after about 30 seconds idle, and Playwright keeps the handle working across restarts.
- A fixed ID through the manifest `key` simplifies tests.
- Open popups as tabs at `chrome-extension://<id>/popup.html`.

```ts
import { test as base, chromium, type BrowserContext } from '@playwright/test';
import path from 'path';

export const test = base.extend<{ context: BrowserContext; extensionId: string }>({
  context: async ({}, use) => {
    const ext = path.join(__dirname, '../dist/chrome');
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
    });
    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    let [worker] = context.serviceWorkers();
    if (!worker) worker = await context.waitForEvent('serviceworker');
    await use(worker.url().split('/')[2]);
  },
});
export const expect = test.expect;
```

This is an equivalent written from the docs, since the page text could not be quoted in full. Compare with https://playwright.dev/docs/chrome-extensions.

CI: `npx playwright install --with-deps chromium`, then `npx playwright test`. Use `xvfb-run` only for headed runs. Set `globalTimeout` in config [doc].

**Firefox limits:**
- Playwright's page says extensions work in Chromium with a persistent context, and does not cover Firefox [doc].
- Issue #7297 is closed as completed (2024-12-03), yet the docs still document no Firefox extension API [source]. I did not determine what closure delivered.
- Community notes report no supported loader, and `backgroundPages()` returning nothing for Firefox [unverified].
- Workarounds seen: enterprise `policies.json` with a signed XPI, `playwright-webextext` using `installTemporaryAddon` [third-party, untested].
- A sturdier path: `web-ext lint` on every PR, plus Selenium with geckodriver or WebDriver BiDi `webExtension.install`, which Mozilla documents [doc for BiDi, untested here]. Keep a small Firefox smoke suite, and share DOM-blocking assertions by testing built content scripts on fixture pages.

---

## 8. Turning donations into Claude usage

### Bottom line

No route lets GitHub Sponsors or Ko-fi pay Anthropic directly [inference, none documented]. **A person moves the money.** Best legitimate setup: Console API credits with auto-reload off, a workspace limit, and a budget variable the owner updates after each top-up.

### Subscription vs Console credits

| | Pro/Max token | Console API credits |
|---|---|---|
| Unattended public bot | Unclear fit, see section 1 | Designed for this. Commercial Terms permit powering your products [doc] |
| Cost model | Flat fee | Per token, $0 when idle |
| Cap | Plan windows, can block the owner's own work [doc] | Prepaid balance, workspace limit, org limit |
| Overrun | Usage credits only if turned on | With auto-reload off, stops near zero [doc]. Workspace limit can lag, see below |
| Spending low donations | Pays even with $0 donated | Only spends what was funded |
| GitHub Action | Plan usage | Billed to API balance |
| Auto top-up | Renews from card | Auto-reload, not recommended here |

Other points:

- Model prices per MTok [doc]: Haiku 5.5 $0.10 in, $0.50 out (prompts up to 100k tokens). Sonnet 5.5 $2 in, $10 out. Opus 5.5 $4 in, $20 out. Illustrative only: 20k input plus 1k output on Haiku is about $0.0025. 200k uncached input plus 10k output on Sonnet is about $0.50.
- Org spend caps: Start $500, Build $1,000, Scale $200,000 a month. Your own limit can be lower [doc]. New orgs may begin in a lower Evaluation tier [doc].
- Over a limit you set, requests return HTTP 400. Over the tier cap, 429 with no `retry-after`, so do not retry [doc].
- Spend can take about 2 hours to show, so usage can pass a limit before requests fail [search snippet of API reference, unverified wording].
- Max and Ultra include monthly API credits ($100 and $200), expiring each cycle. **They do not apply to Claude Code GitHub Action runs**, even with `-p` [doc]. They do cover direct Messages API calls and Agent SDK use with a key from the linked org [doc]. A plain `claude -p` in a workflow outside the action may or may not qualify: docs are not fully consistent [unverified]. Test a small run.
- Anthropic's Claude for Open Source program offers six months of free Ultra to qualifying maintainers (for example, 500+ dependent repos, or 100+ merged PRs elsewhere in 12 months), and invites others to apply [doc]. A new repo will likely not qualify on its own. Personal contribution history might. It is worth applying later.

### Do the terms allow it?

- Using donated money to pay your own Anthropic bill: GitHub Sponsors Additional Terms place no restriction on how funds are spent [doc]. They do ban misrepresenting why you raise funds, so say plainly that donations fund maintenance and AI tooling.
- Do not sell donors Claude access or priority runs. Commercial Terms D.4 bar resale, and Claude Code terms say customers may not "pay for, resell, or intermediate" usage for end users [doc]. A maintainer's own tooling on its own repo should be outside this [inference, unverified]. Ask Anthropic if unsure.
- Donation tax treatment was not researched. Treat donations as likely taxable income and ask a tax professional [unverified].

### Money flow

| Platform | Reaches owner how | Timing | Fees |
|---|---|---|---|
| GitHub Sponsors | Stripe to bank, GitHub does not transmit funds [doc] | Stripe Connect on the 22nd, first payment after 60 days. ACH or wire needs $100 balance [doc] | None for personal sponsors, up to 6% for orgs [doc] |
| Ko-fi | Direct to your PayPal or Stripe, Ko-fi holds no balance [search snippets of help center, unverified as current] | PayPal immediate, Stripe on its payout schedule | 0% on Free plan one-time tips, 5% otherwise, plus processor fees [unverified as current] |
| Open Collective | Held by fiscal host, paid out via expenses | Host-dependent [unverified] | Host-dependent [unverified] |

The closest thing to automation: put the payout account's card on the Console and use auto-reload. That is not donation-linked. It would charge the card whether or not donations came in, so it is not recommended [inference].

### Reading donation data by API

**GitHub Sponsors GraphQL** [source, schema introspection today]:

```graphql
query {
  viewer {
    monthlyEstimatedSponsorsIncomeInCents
    estimatedNextSponsorsPayoutInCents
    sponsorshipsAsMaintainer(first: 100, activeOnly: true) {
      totalRecurringMonthlyPriceInCents
    }
    sponsorsActivities(first: 50, period: MONTH) {
      nodes { action timestamp sponsorsTier { monthlyPriceInCents isOneTime } }
    }
  }
}
```

- These fields are viewer-private. Querying another maintainer with 181 sponsors returned 0 for income, so a token of the maintainer is required [source]. The query fields, `activeOnly`, `period: MONTH`, `monthlyPriceInCents` and `isOneTime` exist in the schema [source], but exact PAT scopes and real data were not tested, since this account has no listing [unverified].
- `totalRecurringMonthlyPriceInCents` excludes one-time sponsorships [doc].
- No field returns "available balance". Income is an estimate.
- The `sponsorship` webhook is only configurable from the Sponsors listing, with actions `created`, `edited`, `pending_cancellation`, `pending_tier_change`, `tier_changed`, `cancelled` [doc].

**Ko-fi:** webhook only, and I found no balance or read API.
- It POSTs a form field `data` holding JSON with `verification_token`, `type`, `amount`, `currency`, `kofi_transaction_id`, and personal data such as `from_name`, `email`, `message` [third-party sources only, official page returned 403, unverified].
- GitHub cannot receive this directly. `repository_dispatch` needs an auth header that Ko-fi does not send, so a small relay is needed, such as a serverless function [inference]. It must verify the token, dedupe by transaction ID and strip personal data.
- Never commit donor names, emails or messages to a public repo or a prompt. Donor messages are also prompt injection input.

**Open Collective** is the only one with a real balance [source, live query]:

```bash
curl -s https://api.opencollective.com/graphql/v2 -H 'content-type: application/json' \
  -d '{"query":"{account(slug:\"algone\"){stats{balance{valueInCents currency}}}}"}'
```

Public read needs no token. It needs a fiscal host and adds its own fees, so it is more setup than this project needs today.

**Anthropic side:**
- I found no documented API for remaining credit balance. It shows on the Billing page [doc].
- Cost APIs report historical spend (`/v1/organizations/analytics/cost`, or legacy `cost_report`) and require Admin credentials. Admin API is unavailable to individual accounts, so create an organization first [doc].
- Legacy data typically appears within 5 minutes. The analytics API can lag 4 to 24 hours [doc, second from a search snippet].
- Do not give an Admin key to agent jobs.

### Scaling run budget to funds

Recommended formula:

```
monthly_allowance = min(HARD_CAP, FUNDED_THIS_MONTH)
remaining         = monthly_allowance - month_spend_from_ledger
per_run_budget    = min(PER_RUN_MAX, remaining)
skip the run if remaining < MIN_RUN
```

Three stacked limits, weakest to strongest:

1. `--max-budget-usd` and `--max-turns`, per run. Print mode only. `--max-budget-usd` uses a client-side estimate, spend can pass it, so leave headroom [doc]. The action passes `claude_args` through to the CLI [source], but I did not run this flag in the action. **[unverified]** how it behaves on subscription auth.
2. Workflow ledger, per month. Records `total_cost_usd` from the action's `execution_file` [source for the field, array format unverified].
3. Workspace limit and prepaid balance, enforced by Anthropic. This is the true hard cap.

`vars.AGENT_FUNDED_USD` is set by the owner after buying credits, so a compromised job cannot raise it. `GITHUB_TOKEN` has no permission for Actions variables [unverified today]. If automating, a separate scheduled job holds the maintainer PAT, and that PAT never enters an agent job.

```yaml
name: Claude fix with budget
on:
  issues:
    types: [labeled]
concurrency:
  group: claude-budget
  cancel-in-progress: false
permissions: {}
env:
  PER_RUN_MAX: "1.50"
  MIN_RUN: "0.25"
jobs:
  gate:
    if: github.event.label.name == 'claude-fix' && github.event.sender.login == 'JoshWright22'
    runs-on: ubuntu-latest
    permissions:
      contents: read
    outputs:
      budget: ${{ steps.calc.outputs.budget }}
    steps:
      - id: calc
        env:
          GH_TOKEN: ${{ github.token }}
          HARD_CAP: ${{ vars.AGENT_HARD_CAP_USD }}
          FUNDED: ${{ vars.AGENT_FUNDED_USD }}
        run: |
          month=$(date -u +%Y-%m)
          spent=$(gh api "repos/$GITHUB_REPOSITORY/contents/ledger/$month.jsonl?ref=agent-ledger" \
            -H 'Accept: application/vnd.github.raw' 2>/dev/null | jq -s 'map(.cost // 0) | add // 0' || echo 0)
          budget=$(awk -v c="$HARD_CAP" -v f="$FUNDED" -v s="$spent" -v p="$PER_RUN_MAX" -v m="$MIN_RUN" \
            'BEGIN{a=(c<f?c:f); r=a-s; if(r<m){print 0}else{printf "%.2f",(r<p?r:p)}}')
          echo "budget=$budget" >> "$GITHUB_OUTPUT"
  agent:
    needs: gate
    if: needs.gate.outputs.budget != '0'
    runs-on: ubuntu-latest
    timeout-minutes: 20
    permissions:
      contents: write
      pull-requests: write
      issues: write
      id-token: write
    outputs:
      cost: ${{ steps.cost.outputs.cost }}
    steps:
      - uses: actions/checkout@v7
      - id: claude
        uses: anthropics/claude-code-action@d535f5172dec02b204866b393d6b20b9b2aaf98d # v1.0.266
        env:
          CLAUDE_CODE_SUBPROCESS_ENV_SCRUB: "1"
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          label_trigger: claude-fix
          include_comments_by_actor: JoshWright22
          claude_args: |
            --model claude-sonnet-5-5
            --max-turns 20
            --max-budget-usd ${{ needs.gate.outputs.budget }}
            --disallowedTools "WebFetch,WebSearch"
      - id: cost
        if: always()
        env:
          FILE: ${{ steps.claude.outputs.execution_file }}
          BUDGET: ${{ needs.gate.outputs.budget }}
        run: |
          cost=$(jq '[.[] | select(.type=="result") | .total_cost_usd] | add // empty' "$FILE" 2>/dev/null || true)
          echo "cost=${cost:-$BUDGET}" >> "$GITHUB_OUTPUT"
  record:
    needs: [gate, agent]
    if: always() && needs.gate.outputs.budget != '0' && needs.gate.outputs.budget != ''
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - env:
          GH_TOKEN: ${{ github.token }}
          COST: ${{ needs.agent.outputs.cost }}
          FALLBACK: ${{ needs.gate.outputs.budget }}
        run: |
          month=$(date -u +%Y-%m); path="ledger/$month.jsonl"
          sha=$(gh api "repos/$GITHUB_REPOSITORY/contents/$path?ref=agent-ledger" --jq .sha 2>/dev/null || true)
          old=$(gh api "repos/$GITHUB_REPOSITORY/contents/$path?ref=agent-ledger" -H 'Accept: application/vnd.github.raw' 2>/dev/null || true)
          case "$sha" in [0-9a-f]*) ;; *) sha=""; old="" ;; esac
          line=$(jq -nc --arg r "$GITHUB_RUN_ID" --argjson c "${COST:-$FALLBACK}" '{run:$r,cost:$c}')
          content=$(printf '%s\n%s\n' "$old" "$line" | sed '/^$/d' | base64 -w0)
          args=(-X PUT "repos/$GITHUB_REPOSITORY/contents/$path" -f message="ledger $GITHUB_RUN_ID" -f branch=agent-ledger -f content="$content")
          [ -n "$sha" ] && args+=(-f sha="$sha")
          gh api "${args[@]}" > /dev/null
```

Notes:

- Create an orphan `agent-ledger` branch first, with branch rules blocking everyone but Actions if possible.
- A missing or failing ledger read counts as $0 spent, which fails open. That is acceptable only because the workspace limit sits behind it.
- If cost cannot be read, the job charges the full run budget.
- A job killed before `record` loses a ledger line, and again the workspace limit is the backstop.

### Human monthly routine

1. Check Sponsors, Ko-fi and bank.
2. Choose an amount, keeping tax in mind.
3. Buy credits in the Console.
4. Set `AGENT_FUNDED_USD`, for example with `gh variable set AGENT_FUNDED_USD --body 25`.
5. Adjust the workspace limit if needed.
6. Publish a short spend note so donors can see where money went [suggestion].

---

## Could not verify (combined)

- Whether an always-on public-issue bot on a subscription is "ordinary, individual usage". Ask Anthropic.
- Any API for remaining Console credit balance. None found, which is not proof of absence.
- `--max-budget-usd` end to end in the action, subscription behavior, and the `execution_file` JSON shape.
- Whether Chrome Web Store V1 still answers after 2026-10-15, and the service account plus `google-github-actions/auth` path (`v3` is the current tag).
- Ko-fi webhook schema from an official page (403 here), and current Ko-fi fees.
- GitHub Sponsors PAT scopes and live data, because this account has no Sponsors listing.
- Discord mutual-server rule for DMs, Slack DM behavior, GitHub's self-notification behavior.
- Support-page wording seen only in search snippets: credit expiry, spend lag, Play tester rule.
- What closing Playwright #7297 delivered. Firefox workarounds are third-party and untested.
- Target sites' behavior from Actions runners.
- All workflows here are unrun. YAML syntax was parsed, nothing more.
- Store account fees were not researched.

## Sources

Anthropic:
- https://code.claude.com/docs/en/github-actions
- https://github.com/anthropics/claude-code-action (action.yml, docs/security.md, docs/usage.md, docs/faq.md, examples/issue-triage.yml, src/github/token.ts)
- https://code.claude.com/docs/en/routines
- https://code.claude.com/docs/en/authentication
- https://code.claude.com/docs/en/legal-and-compliance
- https://code.claude.com/docs/en/cli-reference
- https://code.claude.com/docs/en/costs
- https://www.anthropic.com/legal/consumer-terms
- https://www.anthropic.com/legal/commercial-terms
- https://support.claude.com/en/articles/8977456-how-do-i-pay-for-my-claude-api-usage
- https://support.claude.com/en/articles/17154008-monthly-api-credits-for-max-ultra-and-team-plans
- https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan
- https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan
- https://support.claude.com/en/articles/8325617-cancel-your-pro-or-max-subscription
- https://platform.claude.com/docs/en/api/rate-limits
- https://platform.claude.com/docs/en/manage-claude/workspaces
- https://platform.claude.com/docs/en/manage-claude/spend-limits-api
- https://platform.claude.com/docs/en/manage-claude/usage-cost-api
- https://platform.claude.com/docs/en/manage-claude/usage-cost-analytics-api
- https://platform.claude.com/docs/en/about-claude/pricing
- https://platform.claude.com/docs/en/about-claude/models/overview
- https://claude.com/contact-sales/claude-for-oss

GitHub:
- https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
- https://docs.github.com/en/actions/concepts/security/github_token
- https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments
- https://docs.github.com/en/actions/how-tos/deploy/deploy-to-third-party-platforms/sign-xcode-applications
- https://docs.github.com/en/billing/concepts/product-billing/github-actions
- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- https://github.com/actions/starter-workflows/blob/main/pages/static.yml
- https://docs.github.com/en/repositories/releasing-projects-on-github/automatically-generated-release-notes
- https://docs.github.com/en/subscriptions-and-notifications/concepts/about-notifications
- https://docs.github.com/en/graphql/reference/sponsors
- https://docs.github.com/en/webhooks/webhook-events-and-payloads
- https://docs.github.com/en/site-policy/github-terms/github-sponsors-additional-terms
- https://docs.github.com/en/sponsors/getting-started-with-github-sponsors/about-github-sponsors
- https://docs.github.com/en/actions/reference/security/secure-use (not re-read)
- https://docs.github.com/en/actions/concepts/security/script-injections (not re-read)

Stores:
- https://developer.chrome.com/docs/webstore/using-api
- https://developer.chrome.com/docs/webstore/service-accounts
- https://developer.chrome.com/docs/webstore/api/reference/rest/v2/publishers.items/publish
- https://developer.chrome.com/docs/webstore/api/v1
- https://developers.google.com/identity/protocols/oauth2
- https://extensionworkshop.com/documentation/develop/web-ext-command-reference/
- https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/
- https://learn.microsoft.com/en-us/microsoft-edge/extensions/update/api/using-addons-api
- https://developer.apple.com/documentation/safariservices/packaging-a-web-extension-for-safari
- https://developer.apple.com/documentation/safariservices/packaging-and-distributing-safari-web-extensions-with-app-store-connect
- https://developer.apple.com/documentation/appstoreconnectapi/creating-api-keys-for-app-store-connect-api
- https://docs.fastlane.tools/actions/app_store_connect_api_key/
- https://developers.google.com/android-publisher/getting_started
- https://developers.google.com/android-publisher/edits
- https://developers.google.com/android-publisher/api-ref/rest/v3/edits.bundles/upload
- https://support.google.com/googleplay/android-developer/answer/14151465

Testing and notifications:
- https://playwright.dev/docs/chrome-extensions
- https://playwright.dev/docs/ci
- https://developer.chrome.com/docs/extensions/how-to/test/end-to-end-testing
- https://github.com/microsoft/playwright/issues/7297
- https://firefox-source-docs.mozilla.org/remote/webdriver-bidi/Extensions.html
- https://docs.discord.com/developers/resources/webhook
- https://docs.ntfy.sh/publish/
- https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/

Donations:
- https://help.ko-fi.com/hc/en-us/articles/360004162298-Does-Ko-fi-have-an-API-or-webhook (403 here, search snippet only)
- https://help.ko-fi.com/hc/en-us/articles/115003980093-How-do-I-get-paid
- https://graphql-docs-v2.opencollective.com/queries/account
