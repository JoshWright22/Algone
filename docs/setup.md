# Owner setup

Everything here is optional for CI. CI passes with no secrets, and every publish workflow exits successfully with a notice when its secrets are missing.

Add secrets at **Settings > Secrets and variables > Actions**, or under **Settings > Environments > release** where marked. Store secrets go in the `release` environment, never at repo level. No job that runs Claude uses that environment.

## Repo protections

Steps 1 to 4 and step 6 were done on 2026-11-01. Step 5 is yours to decide. The steps stay here in case you need to redo them.

1. **Pages.** Settings > Pages > Source: GitHub Actions.
2. **Labels.** Create `claude-fix`, `site-change`, `site-walled`, `bug`, `feature`. `bug` already exists. The daily check fails to open an issue if its label is missing.
3. **`release` environment.** Settings > Environments > New environment > `release`. Add yourself as a required reviewer. Under deployment branches and tags, allow `main` and `v*`. Do this before the first stable run: GitHub creates an environment with no protection if a workflow names one that does not exist.
4. **`site-status` branch.** Create an empty branch for `status.json`. Without it, the report job of `site-check.yml` fails. No ruleset covers this branch, and it holds no code.

   ```sh
   git switch --orphan site-status
   git commit --allow-empty -m "Start site status"
   git push origin site-status
   git switch main
   ```

5. **Actions PR setting.** Settings > Actions > General > Workflow permissions: turn on "Allow GitHub Actions to create and approve pull requests". `claude-fix.yml` only needs it as a last resort (see [The agent's pull request](#the-agents-pull-request)).
6. **Rulesets, last.** They block direct pushes for anyone without bypass.
   - On `main`: require a pull request, with admin bypass for the owner.
   - On tags matching `v*`: block creation, excluding `v*-nightly.*`. Add the GitHub Actions app as a bypass actor, so the stable tag job can create tags. The Claude app is not a bypass actor.

The stable tag job runs in `release`, so it waits for your approval. Each publish workflow also runs in `release`, so a stable run asks for approval once for the tag and once for each store workflow, even a store with no secrets. An environment's secrets cannot be read before approval.

## Secrets and variables

### Agent

| Name | Kind | Where to get it | Used by |
|---|---|---|---|
| `CLAUDE_CODE_OAUTH_TOKEN` | Secret | Run `claude setup-token` on your machine, signed in to your Claude plan. Lasts one year | `claude-fix.yml` |
| `ANTHROPIC_API_KEY` | Secret | Claude Console, in a dedicated workspace. Alternative to the token. If both exist, the API key wins | `claude-fix.yml` |
| `AGENT_MAX_RUNS_PER_DAY` | Variable | Your choice. Default 3 | `claude-fix.yml` |

Also install the Claude GitHub app: go to <https://github.com/apps/claude>, choose Configure, and select this repo. The workflow cannot check for the app with its own token. If the app is missing, the action fails at the token exchange and the run says so.

### Alerts

| Name | Kind | Where to get it | Used by |
|---|---|---|---|
| `NTFY_TOPIC` | Secret | Choose a long random name. On ntfy.sh anyone who knows a topic name can read it. Subscribe to it in the ntfy phone app | `site-check.yml`, `notify-owner.yml` |

**Alert delivery has not been tested.** Neither the GitHub mention nor the ntfy push has been seen arriving. To test, run `site-check.yml` with `simulate_break` and watch for both. Then close the `[simulated]` issue, or it will hide real breaks of that site.

### Chrome Web Store (`release` environment)

Used by `publish-chrome.yml`. The first submission is by hand: see `store/chrome/checklist.md`.

| Name | Where to get it |
|---|---|
| `CWS_SA_KEY_JSON` | In Google Cloud, enable the Chrome Web Store API, create a service account with no project roles, and create a JSON key. Paste the whole file. Add the service account's email in the Developer Dashboard, Account section |
| `CWS_PUBLISHER_ID` | Developer Dashboard, Account section |
| `CWS_EXTENSION_ID` | The ID in the item's dashboard URL |

### Firefox (`release` environment)

Used by `publish-firefox.yml`. See `store/firefox/checklist.md` for the first submission. `store/firefox/amo-metadata.json` is passed to `web-ext sign` if it exists. It does not exist yet, and the first listed version needs it unless you submit that version by hand.

| Name | Where to get it |
|---|---|
| `AMO_JWT_ISSUER` | <https://addons.mozilla.org/developers/addon/api/key/>, "JWT issuer" |
| `AMO_JWT_SECRET` | Same page, "JWT secret" |

### Edge (`release` environment)

Used by `publish-edge.yml`. The product must already exist in Partner Center: see `store/edge/checklist.md`.

| Name | Where to get it |
|---|---|
| `EDGE_CLIENT_ID` | Partner Center > Microsoft Edge > Publish API. Enable the new experience, then Create API credentials |
| `EDGE_API_KEY` | Same page. Keys have an expiry date, so set a reminder |
| `EDGE_PRODUCT_ID` | The extension's overview page, Extension identity |

### Safari (`release` environment)

Used by `publish-safari.yml`, on `macos-latest`. It uploads to TestFlight and does not submit for review. The bundle ID is `io.github.joshwright22.algone.safari`, set at the top of the workflow.

| Name | Where to get it |
|---|---|
| `ASC_KEY_ID` | App Store Connect > Users and Access > Integrations > App Store Connect API > Team Keys. Needs Admin |
| `ASC_ISSUER_ID` | Same page |
| `ASC_KEY_P8` | The `.p8` file's text. It downloads only once |
| `BUILD_CERTIFICATE_BASE64` | Your Apple Distribution certificate, exported as `.p12`, then `base64 -i cert.p12` |
| `P12_PASSWORD` | The password you set on that export |
| `BUILD_PROVISION_PROFILE_BASE64` | The app's App Store provisioning profile, base64 encoded |
| `BUILD_EXTENSION_PROFILE_BASE64` | Optional. The extension target has its own bundle ID, so it normally needs its own profile |
| `KEYCHAIN_PASSWORD` | Any random string. It protects a temporary keychain on the runner |

If you have no Mac, App Store Connect has a web packager. See `store/safari/checklist.md`.

### Algone Browser (`release` environment)

Used by `publish-mobile.yml`, which starts an EAS build and auto-submit.

| Name | Where to get it |
|---|---|
| `EXPO_TOKEN` | expo.dev > Account settings > Access tokens |
| `PLAY_SA_JSON` | No workflow reads this today. EAS submits with credentials stored on Expo's side, so upload the Play service account key there. Keep this name if a workflow ever needs the key directly |

Used by `release.yml` to sign the APK. Without them the APK is debug-signed and the notes call it a testing build. Store them in `release`, so stable releases are signed and nightlies stay testing builds.

| Name | Where to get it |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | Your keystore file, base64 encoded |
| `ANDROID_KEYSTORE_PASSWORD` | The keystore password |
| `ANDROID_KEY_ALIAS` | The key's alias |
| `ANDROID_KEY_PASSWORD` | The key's password. Leave it out if it matches the keystore password |

Keep a copy of the keystore outside GitHub. A lost key means users must reinstall.

## Weekly logged-in check

The daily check runs logged out, so it cannot see logged-in feeds. This one runs on your machine, in a browser profile you signed in to. It never runs in CI, and agents cannot run it.

1. Build the test extension:

   ```sh
   node apps/extension/scripts/build.mjs --target chrome --test --out-dir apps/extension/dist-test
   ```

2. Run the check. Choose a folder outside the repo for the profile, and sign in to the sites in it the first time.

   ```sh
   npm run check:logged-in -- --profile <profile folder> --out local-snapshots
   ```

3. Read the output. Each line says `pass`, `broken`, or `inconclusive`. A `broken` line writes a snapshot.
4. Scan the snapshots for your names. This fails if a handle or email remains:

   ```sh
   npm run snapshot:scan -- local-snapshots <your handle> <your name>
   ```

5. Only after the scan passes, commit a snapshot into `tests/fixtures/snapshots/<site>/` for the agent to use.

## Schedules stop after 60 days

GitHub turns off scheduled workflows on a public repo after 60 days with no repo activity. `release.yml` and `site-check.yml` then stop, and nothing can alert you, because the alert is what stopped.

The sign is an old date on the website's status page, which reads `status.json` in the visitor's browser.

To turn them back on: Actions tab > choose the workflow > **Enable workflow**. Then run it once with **Run workflow**. Do this for both.

## Before you label an issue

The label check covers who started the run, not whose text Claude reads. **It does not vet the issue's text.** Read the whole issue before adding `claude-fix`.

- The gate refuses to run if anyone but you edited the title or body. If a stranger edited a useful issue, repost the text in a new one.
- Comments from anyone but you are left out of what Claude reads.
- Claude has no web tools and no store secrets, and it can only reach `main` through a PR you merge. Your review is the last control.

## The agent's pull request

Claude pushes a `claude/` branch. A workflow step then opens the PR, with `Closes #N` in the body. Merging closes the issue, and that triggers the mention from `notify-owner.yml`.

The pinned action revokes its own token as its last step, so the step cannot rely on that token. It tries, in order: the action's output, a new app token from the same exchange the action uses, and `GITHUB_TOKEN`. The second is not a documented API, so it may break when the action changes. The third works, but a PR opened with it starts no CI. If the run warns about this, close and reopen the PR to start CI.

If three `claude-fix` labels land while a run is going, GitHub keeps only the newest waiting run. Remove and re-add the label on the one that was dropped.

## Anthropic's terms

Using your subscription token for CI you run on your own repo is a documented use: Anthropic offers `claude setup-token` and the action's `claude_code_oauth_token` input for it.

A bot that strangers can trigger is a different thing. Nothing confirms that it fits the subscription terms, so it was not built. Every run stays owner-triggered: a public issue never starts Claude, and only your label does. Keep it that way. If you ever want a bot that others can trigger, use an API key and ask Anthropic first.
