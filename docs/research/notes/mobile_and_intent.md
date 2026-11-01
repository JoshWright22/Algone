# Algone: mobile, desktop-native, and intent research notes

Researched 2026-10-31. Companion to the other notes in this folder.

**Evidence labels**
- **[P]** Primary doc read directly (Apple, Google, Mozilla, Microsoft, a peer-reviewed abstract, or a store listing).
- **[V]** Vendor's own claim about its product.
- **[S]** Secondary source (press, blog, forum).
- **[U]** Could not verify. Treat as an open question.
- **[J]** My judgment, not a sourced fact.

**Method limits**
- Google, Mozilla, and store pages were read through a summarizing fetch tool, so re-read quoted policy wording at the source before relying on it.
- Apple docs were read from Apple's documentation JSON.
- Nothing here was tested on a device. No Apple or Google reviewer was consulted. This is not legal advice.

## Bottom line

1. **No public API on either phone OS edits another app's interface.** iOS has no feature-level control at all. Android can only detect a screen through Accessibility, then react.
2. **iOS has two real paths.** One is web filtering, through a Safari extension or an in-app browser. The other is whole-app friction, through Screen Time or Shortcuts. Inside the native Instagram or YouTube app, you cannot remove Reels or Shorts.
3. **Android Accessibility is the only path that reaches native apps.** It is widely used on Play today, but it is also the largest single policy and platform risk.
4. **Recommended stack: Expo (React Native) with thin Swift and Kotlin native parts, plus one shared TypeScript rules package.** This is a judgment call; I found no benchmark comparing the stacks.
5. **Skip native desktop filtering.** The extension already covers the web surface. Native desktop apps can only be blocked whole.

## 1. iOS and iPadOS

### Safari Web Extensions

- Available on iOS 15+, built from standard WebExtension JS, HTML, and CSS, and packaged inside an app. [P: Apple](https://developer.apple.com/documentation/safariservices/safari-web-extensions)
- Safari supports `chrome.*` and `browser.*` namespaces and Manifest V2 and V3 from 15.4. Blocking `webRequest` responses are not supported. [P: Apple](https://developer.apple.com/documentation/safariservices/assessing-your-safari-web-extension-s-browser-compatibility)
- App Review rules: the extension may not contain marketing, ads, or in-app purchases; it should not claim more site access than needed; and the host app should have functionality such as help or settings (Guidelines 4.4, 4.4.2). [P: Apple](https://developer.apple.com/app-store/review/guidelines/)
- Precedent exists on the App Store: [BlockYT](https://apps.apple.com/in/app/id1575379461), [Shorts Blocker](https://apps.apple.com/us/app/-/id6451330524), [Disable Shorts](https://apps.apple.com/us/app/-/id6754694677) (claims www and m.youtube.com). Open-source: [Slowth](https://awesome.ecosyste.ms/projects/github.com%2Fskar404%2Fslowth). [V]
- Limit: it affects Safari only, never native apps.
- [U] Whether links tapped in Safari escape into the YouTube app (Universal Links), how far iPad's desktop-class pages differ from iPhone's, and how well Instagram and TikTok mobile web work logged in. Test all three on devices.
- Safari's reach is meaningful: about 25.9% of worldwide mobile browsing, Aug 2026. [P: StatCounter](https://gs.statcounter.com/browser-market-share/mobile/worldwide)
- [Orion](https://help.kagi.com/orion/browser-extensions/ios-ipados-extensions.html) offers "preliminary" Chrome and Firefox extension support on iOS, still beta. Treat it as a bonus target, not a plan. [V]

### Screen Time API

**What it does**
- Three frameworks: Family Controls (authorization), Managed Settings (restrictions), Device Activity (schedules and thresholds). [P: Apple](https://developer.apple.com/documentation/screentimeapidocumentation)
- Adults can self-authorize. Apple's `individual` member arrived in iOS 16 and asks for Face ID or Touch ID. [P: Apple](https://developer.apple.com/documentation/familycontrols/authorizationcenter)
- `ShieldSettings` covers "apps and websites" with a shielding view. Shielded apps get a dimmed icon with an hourglass, and the app can configure the covering view. [P: Apple](https://developer.apple.com/documentation/managedsettings/shieldsettings), [DeviceActivityMonitor](https://developer.apple.com/documentation/deviceactivity/deviceactivitymonitor)
- The picker returns opaque tokens, so the app cannot read what was picked. Tokens void on revocation. [P: Apple](https://developer.apple.com/documentation/familycontrols/familyactivityselection)
- The shield configuration extension receives names and bundle IDs but runs in a sandbox with no network and no way to move data out. [P: Apple](https://developer.apple.com/documentation/managedsettingsui/shieldconfigurationdatasource)
- Apple warns that the system "doesn't guarantee" your settings govern behavior. [P: Apple](https://developer.apple.com/documentation/managedsettings/managedsettingsstore)
- Docs list iOS, iPadOS, and Mac Catalyst, not native macOS. [P: Apple](https://developer.apple.com/documentation/familycontrols)
- [U] Whether a shield action can deep-link straight into Algone or another app. Prototype this; the redirect design depends on it.

**Entitlement process** [P: Apple](https://developer.apple.com/documentation/familycontrols/requesting-the-family-controls-entitlement)
- Development works in Xcode with the capability added. App Store and TestFlight distribution need Apple's approval.
- The Account Holder submits the request.
- Each Screen Time extension needs its own request, so up to four bundle IDs: the app, Monitor, Shield Action, and Shield Configuration. [S: react-native-device-activity](https://github.com/kingstinct/react-native-device-activity)
- Apple reviews the app and adds the capability to the account. No official timeline found.
- Developers report days to about a month, and Apple forum staff acknowledged a backlog. Extension requests can lag the main app. [S: forum threads, anecdotal](https://developer.apple.com/forums/thread/812332), [more](https://developer.apple.com/forums/thread/826427), [more](https://developer.apple.com/forums/thread/765074)
- Screen Time APIs may not be monetized (Guideline 4.10). A free app avoids most of that question. [P: Apple](https://developer.apple.com/app-store/review/guidelines/) [J: whether donations or tips conflict is unclear; ScreenZen uses tips]
- Open-source precedent: [Foqos](https://github.com/awaseem/foqos), free, NFC or QR unlock, reported on the App Store via its [HN launch post](https://hn.svelte.dev/item/42782295). [S] Forks need their own entitlement. [J]

### Shortcuts

- one sec's iOS interception uses a Shortcuts automation with the App trigger, one per app, set to Run Immediately. [V: one sec](https://one-sec.app/blog/when-one-sec-gets-too-annoying-how-to-enable-intentional-app-switching/), [V: tutorial](https://tutorials.one-sec.app/en/articles/4018306)
- Apps expose actions to Shortcuts through [App Intents](https://developer.apple.com/documentation/appintents). [P]
- This needs no entitlement but relies on user setup. It intercepts app open, not in-app navigation. [J]
- Since iOS 26.4, a Screen Time lock reportedly stops users disabling these apps. [V, not independently verified: one sec](https://one-sec.app/blog/lock-screen-time-permission/)
- Possible IP issue: [USPTO 12468828](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/12468828), "Method and computing device for intervening access to a target media service," surfaced beside one sec's research. [U] I did not read it or confirm its owner or claims. Check it before copying the launch-intervention flow.

### What cannot be done to third-party native apps

- No API hides or modifies parts of another app. Apps may not read or write outside their container or change other apps (Guideline 2.5.2), and only public APIs are allowed (2.5.1). [P: Apple](https://developer.apple.com/app-store/review/guidelines/)
- Vendors confirm the limit: [one sec](https://tutorials.one-sec.app/en/articles/4071170) says "no way technically," and [AppBlock](https://appblock.app/can-appblock-block-instagram-reels-youtube-shorts-or-snapchat-stories-on-iphone/) says Apple offers no API to control what happens inside another app. [V]
- The iOS network route is closed for adult users. Content filter providers require supervised devices, or Screen Time apps on **child devices only**. Per-app use needs managed devices. [P: Apple TN3134](https://developer.apple.com/documentation/technotes/tn3134-network-extension-provider-deployment), [NEFilterManager](https://developer.apple.com/documentation/networkextension/nefiltermanager)
- VPN apps need organization enrollment, and content blockers using `NEVPNManager` must be "approved providers" (5.4). MDM is limited to enterprises and limited parental cases (5.5). [P: Apple](https://developer.apple.com/app-store/review/guidelines/)

### What the products actually do

| Product | Actual mechanism | In-app feature blocking on iOS? | Evidence |
|---|---|---|---|
| Opal | Screen Time API; on-device; paid plans | Listing describes whole apps and sites only | [P: listing](https://apps.apple.com/us/app/opal-screen-time-control/id1497465230) |
| one sec | Shortcuts automation for apps; Safari extension for sites; Android has Reels and Shorts removal | No, says impossible | [V](https://one-sec.app/blog/how-one-sec-works/), [V](https://tutorials.one-sec.app/en/articles/4071170) |
| Brick | NFC hardware plus Screen Time shields; $59 | No | [S: comparison](https://habitdoom.com/blog/best-app-blockers-iphone-2026), not vendor-confirmed |
| ScreenZen | Android: Accessibility for apps, sites, Shorts, Reels, and settings protection. iOS "Minimal" versions of 8 networks: **website filtering with added styles and scripts**, with cookies stored in app storage | Only by replacing the app with filtered web | [P: privacy policy](https://screenzen.co/policies/privacy-policy), [listing](https://apps.apple.com/us/app/screenzen-screen-time-control/id1541027222) |
| UNDOOMED | Own private browser filters mobile web; states it "does not modify third-party apps" | Same model | [P: listing](https://apps.apple.com/app/id6751837079) |

**Key correction to a common claim:** apps advertising Reels blocking on iOS are filtering the web version, not the native app. ScreenZen and UNDOOMED are live precedents for that model on the App Store. [J: inference from their listings being live; their review history is unknown.]

**In-app browser risk**
- Guideline 5.2.2 requires permission under the third-party service's terms when an app "uses, accesses... or displays content" from it, and authorization can be requested. 4.2 and 4.2.2 reject repackaged sites and web clippings. [P: Apple](https://developer.apple.com/app-store/review/guidelines/)
- The precedents show approval is possible, not that it is safe. Treat it as a v2 feature with a real rejection or removal risk. [J]

## 2. Android

### Browsers with extensions

| Browser | Status | Evidence |
|---|---|---|
| Firefox | Open ecosystem since Dec 14, 2023; 1,000+ extensions by May 2024. [Unhook is available](https://addons.mozilla.org/en-US/android/addon/youtube-recommended-videos/) (171,847 users, desktop and Android combined as far as I can tell) | [P: Mozilla](https://blog.mozilla.org/addons/2023/12/14/a-new-world-of-open-extensions-on-firefox-for-android-has-arrived/), [P](https://blog.mozilla.org/addons/2024/05/02/1000-firefox-for-android-extensions-now-available/) |
| Edge | Curated in-app store; 20+ extensions at v134. Beta status conflicts between sources; current count [U] | [S](https://www.androidauthority.com/microsoft-edge-extensions-android-3535402/) |
| Vivaldi | 8.2 (Sept 2026) adds Chrome Web Store extensions, experimental, not all compatible | [S](https://alternativeto.net/news/2026/9/vivaldi-8-2-lands-on-mobile-bringing-extensions-to-android-and-an-address-bar-calculator/), [S](https://piunikaweb.com/2026/09/10/vivaldi-v8-2-update-android-finally-support-extensions/) |
| Brave | Work reported started; not shipped as far as I found | [S](https://piunikaweb.com/2026/10/01/brave-starts-work-android-extensions/) |
| Chrome | No extensions, per secondary sources; no primary statement found | [S](https://web-highlights.com/blog/how-to-install-chrome-extensions-on-android/) |
| Kiwi | Discontinued Jan 2025, repo archived, removed from Play | [S](https://www.neowin.net/news/kiwi-browser-takes-final-breath-but-at-least-some-of-it-will-live-on-in-microsoft-edge/) |
| Samsung Internet | Content blockers exist; general extension status [U] | [S](https://adguard.com/en/blog/vivaldi-adguard-extension-android.html) |

- Firefox engineering notes: use a `gecko_android` version key, and Mozilla recommends **MV2 for Android targets** because MV3 parity is incomplete and service workers are unsupported. [P: Mozilla](https://extensionworkshop.com/documentation/develop/developing-extensions-for-firefox-for-android/) This may force a separate build from the Chrome MV3 target. [J]
- Reach is small: Chrome 66.17%, Samsung 2.52%, Firefox 0.75% of worldwide mobile, Aug 2026. Android-only shares not found. [P: StatCounter](https://gs.statcounter.com/browser-market-share/mobile/worldwide)
- Cheap to ship, but it will not reach most users. [J]

### AccessibilityService

**Capability**
- A service can read the active window's node tree, act on nodes, perform global actions such as Back, and dispatch gestures. [P: Android](https://developer.android.com/guide/topics/ui/accessibility/service)
- It does not expose a way to set arbitrary view properties, so "hiding" really means back-navigating, covering, or redirecting. [J, supported by [AwayDoomscrollin'](https://f-droid.org/packages/com.resolvecommunity.awaydoomscrollin/) and [Shorts Blocker](https://github.com/atick-faisal/Shorts-Blocker), which do those things]
- Detection breaks as apps update and varies by device. [V: same sources]

**Google Play policy** ([Accessibility policy](https://support.google.com/googleplay/android-developer/answer/10964491), [Permissions policy](https://support.google.com/googleplay/android-developer/answer/16558241?hl=en)) [P]

| Requirement or ban | Effect on Algone |
|---|---|
| In-app prominent disclosure with affirmative consent, separate from other disclosures | Required |
| Play Console declaration; use documented in the listing; re-declare on change | Required |
| `isAccessibilityTool` only for apps whose core function supports people with disabilities | **Algone must not set it** |
| Cannot "prevent users from disabling or uninstalling" unless parent, guardian, or enterprise authorized | **No uninstall protection or anti-disable strict mode on Play** |
| Cannot work around Android security, privacy controls, or notifications | Avoid |
| Cannot change or use UI deceptively | Label covers clearly |
| No autonomous "initiate, plan, and execute"; deterministic rule-based automation is allowed | **Fixed rules, no AI agent acting through the service** |
| Use narrower APIs when possible | Reviewer could argue this; be ready to justify |

- The policies contain **no explicit carve-out for digital wellbeing**, and no ban on it either.
- Device and Network Abuse bars interfering with other apps "in an unauthorized manner" and blocking or interfering with another app's ads. [P: Google](https://support.google.com/googleplay/android-developer/answer/9888379) It has no example about hiding app sections. An ad-covering overlay would be a clear problem. [J]
- Latest change: an Oct 29, 2026 announcement "clarified the policy summary" on `isAccessibilityTool` and disclosure. [P: Google](https://support.google.com/googleplay/android-developer/answer/18100766?hl=en) No accessibility deadline is listed in [Policy Deadlines](https://support.google.com/googleplay/android-developer/table/12921780?hl=en).

**Market evidence**
- Many apps on Play openly state this use: [Reels Blocker](https://play.google.com/store/apps/details?id=com.swt.reelsblocker), [Shorts & Reels Blocker](https://play.google.com/store/apps/details?id=dev.atick.shorts&hl=en_US), [BlockBuzz](https://play.google.com/store/apps/details?id=com.block.buzz&hl=en), [OffScroll](https://play.google.com/store/apps/details?id=app.usage.screentime.offscroll.reelblocker&hl=en_US). [P: listings via search]
- ScreenZen does so too, per its [privacy policy](https://screenzen.co/policies/privacy-policy). [P]
- Regain has several listings, and one says accessibility is optional and active during sessions. It advertises uninstall prevention. [V: listing](https://play.google.com/store/apps/details?id=ai.regainapp.focus&hl=en_IN), [V: site](https://regainapp.ai/) Its exact mechanism in the main listing is unconfirmed.
- one sec offers Reels and Shorts removal; the article does not name the permission. [V](https://tutorials.one-sec.app/en/articles/4071170)
- "Unhook" on mobile: the known Unhook is a browser extension. A Play app named [Unhook: Block Reels & Shorts](https://play.google.com/store/apps/details?id=com.ddj.angie1.unhook&hl=en_IN) uses Accessibility. I found no evidence they are related. [U]
- Digital Wellbeing offers [app timers and Focus mode](https://support.google.com/android/answer/9346420?hl=en), which act on whole apps. [P] An older [help page](https://support.google.com/pixelphone/answer/9137850?hl=en) describes Chrome site limits. No Shorts-specific control found. [S: parenting guide](https://findmykids.org/blog/en/how-to-limit-youtube-shorts-on-android)
- I found **no reported removal** of these apps. That is absence of evidence, not a safe harbor. Install counts and listing history [U].

**Android 17 risk**
- Press reports say Advanced Protection Mode blocks and revokes Accessibility for non-accessibility tools. [S: Android Authority](https://www.androidauthority.com/android-17-beta-2-advanced-protection-mode-accessibility-apps-3648860), [S: Security Affairs](https://securityaffairs.com/189497/security/advanced-protection-mode-in-android-17-prevents-apps-from-misusing-accessibility-services.html)
- Version details conflict (Beta 2 vs 17.2), and I found no primary Android page confirming it. [U]
- APM is opt-in, so it should not affect typical users. [J] Reports that Google will broadly restrict Accessibility to accessibility tools are [press interpretation](https://www.malwarebytes.com/blog/mobile/2026/03/google-cracks-down-on-android-apps-abusing-accessibility) that the Play pages do not state. [U]

### UsageStats and overlays

- `UsageStatsManager` reports per-app usage and events, granted through Usage Access settings, with no screen content. [U: fetch tool answered from background knowledge, not the page.](https://developer.android.com/reference/android/app/usage/UsageStatsManager) Confirm against the docs. Play policy text on `PACKAGE_USAGE_STATS` was not found on the pages read. [U]
- It gives foreground-app detection for whole-app timers and cannot detect Shorts or Reels. [J]
- `SYSTEM_ALERT_WINDOW` is a special permission that users approve in system settings. [P: Google](https://support.google.com/googleplay/android-developer/answer/9888170) Overlay-specific restrictions [U].
- Lowest-risk Android tier: UsageStats plus an overlay gives intent prompts on app launch without Accessibility. [J]

### Sideloading, F-Droid, and developer verification

**What Google says** [P: overview](https://developer.android.com/developer-verification), [P: FAQ](https://developer.android.com/developer-verification/guides/faq), [P: June blog](https://android-developers.googleblog.com/2026/06/android-developer-verification.html), [P: guides](https://developer.android.com/developer-verification/guides)
- Sept 30, 2026: applies in Brazil, Indonesia, Singapore, and Thailand on certified Android 7+ devices, for installs from participating stores (Google Play, HONOR, OPPO, Samsung Galaxy Store, Palm Store, vivo, Xiaomi GetApps).
- The FAQ says sideloaded apps and other stores "aren't affected yet." The June blog says unregistered apps can still be sideloaded via adb or advanced flow.
- 2027: expands globally to all apps on certified devices. Exact 2027 dates [U].
- Advanced flow: developer mode, anti-coercion check, restart, one-day wait, biometric or PIN confirmation, enable for 7 days or indefinitely, then "Install Anyway" warnings.
- ADB installs are exempt.
- Full Distribution: $25 and government ID. Limited Distribution: free, no ID, 20 devices.
- Conflict: [F-Droid's Feb 2026 letter](https://f-droid.org/2026/02/24/open-letter-opposing-developer-verification.html) opposes the plan, urges developers not to sign up, and says no advanced flow was available. It predates Google's August launch plans. [XDA reports the flow rolling out](https://www.xda-developers.com/googles-controversial-advanced-flow-sideloading-rolling-out-ahead-of-stricter-developer-verification/). Whether it fully shipped [U].

**For Algone**
- [Registering is optional](https://developer.android.com/developer-verification/guides/open-source-app-registration) for open-source repos, but unregistered apps will need advanced flow once enforced there. Register the package and all signing keys, including a repo's re-signing key. [P]
- That means a real person or organization holds a verified Google identity. Decide this early, since Full accounts cannot convert to Limited. [P: FAQ]
- Android 13+ restricts Accessibility for non-session-installed apps until the user allows "restricted settings." Session-based installs are exempt. [S: Android Authority](https://androidauthority.com/android-15-restricted-settings-sideloading-3481098) Whether F-Droid clients always qualify [U].
- **Value of F-Droid:** builds trust and keeps strict features out of Play's scope. The F-Droid build could offer stronger commitment modes since Play rules do not apply there. [J] It is not a reach channel, and the 2027 rules narrow its advantage. [J]

## 3. Desktop native apps

- **Little to filter.** Instagram on Windows has been a PWA since about 2021. [S, dated: Windows Report](https://windowsreport.com/instagram-full-pwa/) Current status of Instagram, TikTok, X, and YouTube desktop apps [U]. Whether extensions run inside installed PWAs [U].
- **Blockers work on whole apps or domains.** [Cold Turkey](https://alternativeto.net/software/cold-turkey/about) blocks by executable or app bundle, reportedly with hosts-file site blocks. [S] [FocusMe](https://focusme.com/blog/how-to-block-apps-on-windows/) blocks Store apps. [V]
- **Windows:** no built-in adult limits; Family Safety covers child accounts. [S](https://www.digitalzen.app/blog/how-to-limit-screen-time-on-windows/)
- **macOS:** Safari Web Extensions ship in the same project as iOS. [P: Apple](https://developer.apple.com/documentation/safariservices/safari-web-extensions) Content filters run as system extensions on macOS 10.15+ and could block domains. [P: TN3134](https://developer.apple.com/documentation/technotes/tn3134-network-extension-provider-deployment) Screen Time APIs are documented for iOS, iPadOS, and Mac Catalyst, not AppKit macOS; third-party Mac use [U].
- **UI Automation or AX element hiding:** no source or product found. I would not pursue it. [U/J]

**Recommendation:** no native desktop app in v1. Ship extensions for Chrome, Edge, Firefox, and Safari on Mac. Later, at most an open-at-login whole-app block. [J]

## 4. App stack

**Requirements are native whichever you pick:** Safari extension target, up to three Screen Time extension targets in Swift, one Kotlin AccessibilityService. Extensions cannot run a cross-platform runtime in any useful way for this. [J] So the choice is mostly about the shell and how much build glue you maintain.

| Criterion | Expo (React Native) | Capacitor | Flutter |
|---|---|---|---|
| Share TS with browser extension | High | Highest (the app is web) | Low (Dart) |
| Regenerate native projects from config | Yes: [CNG](https://docs.expo.dev/workflow/continuous-native-generation/) with config plugins | No: native project maintained directly [J] | No equivalent found |
| Safari target | [expo-apple-targets](https://github.com/EvanBacon/expo-apple-targets), [expo-targets](https://github.com/csark0812/expo-targets), both community | Add in Xcode; no doc found | Manual [J] |
| Screen Time | [react-native-device-activity](https://github.com/kingstinct/react-native-device-activity): MIT, config plugin, shields, filters | No maintained plugin found [U] | [flutter_family_controls](https://pub.dev/packages/flutter_family_controls): v0.0.x, unverified uploader |
| Accessibility service | Custom [Expo Module](https://docs.expo.dev/modules/overview/) in Kotlin | [Custom native code](https://capacitorjs.com/docs/ios/custom-code) | [flutter_accessibility_service](https://pub.dev/documentation/flutter_accessibility_service/1.2.0/): small, maintenance unclear |
| Agent-driven upkeep | Native changes in reviewable config and small modules; prebuild is scriptable | Xcode project diffs are harder to review [J] | Separate language from extension |

**Recommendation: Expo. Fallback: Capacitor** if the app stays mostly a settings UI and Screen Time is dropped.

Community target plugins are the weak link, so pin versions and keep a CI prebuild. Check Expo SDK compatibility first; the maintenance status of those plugins was not verified.

**Repository shape** [J]

```text
packages/rules      platform and selector rules as data, plus schema
packages/core       settings, intents, queue, local storage, shared UI logic
apps/extension      Chrome, Edge, Firefox (with Android build), Safari source
apps/mobile         Expo app
modules/ios-shield  Swift: Screen Time, App Intents
modules/android-a11y Kotlin: AccessibilityService, overlay, UsageStats
```

**Native modules needed**
- iOS: Safari Web Extension target, FamilyControls, ManagedSettings, DeviceActivity, Shield Action and Configuration, App Intents, Share Extension, App Group storage.
- Android: AccessibilityService, overlay, UsageStats, share intent receiver.

**Rule updates:** ship rules in app releases, or fetch data-only JSON if review allows it. Never fetch executable code; Apple bars code that "introduces or changes features" (2.5.2). Whether remote selector data qualifies is a gray area. [J] Google's Accessibility rules update path is also unverified. [U]

## 5. What works on mobile, what to exclude, and architecture

### Value ranking [J]

| Approach | Value | Risk | Decision |
|---|---|---|---|
| Android Accessibility: leave Shorts and Reels on detection | Highest; acts in native apps | Policy and breakage | **v1 Android core** |
| iOS Safari extension | Good for web users | Low | **v1 iOS core** |
| Guided native settings (below) | Moderate; cheap | None | **v1, both** |
| Screen Time shield on the app | Strong but blunt | Entitlement delay | **v1.1 iOS** |
| Intent prompt on launch (Shortcuts; UsageStats plus overlay) | Good evidence base | one sec patent check | **v1.1** |
| Firefox Android extension | Works well for few people | Low | **v1 cheap add** |
| iOS and Android filtered web "Minimal" browser | Best iOS feed-free experience | 5.2.2, 4.2, terms, breakage | **v2, behind review test** |
| Edge or Vivaldi Android | Modest | Compatibility | Test, no promises |

**Guided native settings to include**
- YouTube: turning off watch history removes homepage recommendations for accounts with no significant history. [P: YouTube Help](https://support.google.com/youtube/answer/95725), [S: 9to5Google](https://9to5google.com/2023/11/30/youtube-recommendations-no-watch-history/?extended-comments=1) It will not work for everyone.
- YouTube Shorts daily limit, reportedly down to 0. Enforcement details conflict and menu paths vary. [S](https://www.republicworld.com/tech/are-you-tired-of-shorts-heres-how-youtube-finally-lets-you-switch-them-off), [S](https://imp.news/apps-and-software/youtube-launches-dismissible-shorts-timer-as-digital-well-being-tool-70615/)
- EU users: Article 38 of the DSA requires a non-profiling recommender option on very large platforms. An Amsterdam court required Meta's option to be direct and persistent, and Meta is appealing. [S: DLA Piper](https://www.dlapiper.com/insights/blogs/mse-today/2025/the-amsterdam-court-putting-the-dsa-into-practice), [S: Bits of Freedom](https://www.bitsoffreedom.nl/en/pers/meta-implements-and-appeals-court-orders/)
- Instagram Following or Favorites feeds; deep-link paths [U].
- Instagram and Snapchat recommendation resets rebuild rather than stop recommendations. [S: Fortune](https://fortune.com/2024/11/19/instagram-feed-reset-new-tool-feature)

### Exclude

| Excluded | Why |
|---|---|
| Hiding elements inside native apps on iOS | No API. Impossible |
| iOS on-device content filter or VPN filtering for adults | Child devices or supervision only; VPN route needs approved-provider status |
| MDM or configuration profiles | Guideline 5.5; wrong audience |
| ReVanced-style patched apps | Google forced [Vanced's shutdown](https://www.techspot.com/news/93760-youtube-vanced-shutting-down-after-owners-receive-cease.html) by legal demand; clear conflict with Play and [YouTube's terms](https://www.youtube.com/t/terms); high user risk |
| Third-party video clients in stores | Apple 5.2.2 and 5.2.3; conflicts with YouTube's terms; Play's position not checked |
| Setting `isAccessibilityTool` | Policy violation |
| Uninstall or disable prevention on Play | Explicitly barred. Competitors appear to offer it; do not copy |
| AI agent acting through Accessibility | Autonomous actions barred |
| Ad hiding or covering | Device and Network Abuse |
| Chrome for Android extensions, Kiwi | Unsupported or discontinued |
| Root, Xposed, device-admin locks | Tiny audience; undermines trust [J] |
| Claiming "blocks Reels in the iPhone app" | False. Would invite rejection and distrust |

### Recommended architecture [J]

```text
Shared: rules, settings, queue, intent logic (TypeScript), all local, no account

iOS and iPadOS app (App Store)
  Tier 1  Safari Web Extension
  Tier 2  Setup guide for native settings and Shortcuts intent automation
  Tier 3  Screen Time shields for chosen apps (after entitlement)
  Tier 4  Optional filtered web browser, submitted separately as a test

Android app (Play; F-Droid build later)
  Tier 1  Usage Access plus overlay: intent prompts, app limits
  Tier 2  Opt-in Accessibility: detect Shorts/Reels and go Back
  Tier 3  Firefox extension and guided settings
  F-Droid only: stronger commitment modes
```

**Design rules**
- Keep Accessibility opt-in and separate, so that Play rejecting or removing it leaves a working app. Prefer feature flags per distribution channel.
- Limit the service's scope to targeted package names, and do all processing on-device with no analytics. ScreenZen's wording is a useful model.
- Never say "disable the algorithm." The accurate claim is "hide recommendation surfaces where the platform allows it."
- Apply for Family Controls early, even before the UI is finished, since approval timing is unknown.
- Build a selector-health monitor for extension and Accessibility rules, because breakage is the main ongoing cost.

**Legal note**
- [YouTube's terms](https://www.youtube.com/t/terms) bar users from circumventing or interfering with parts of the service, or altering it. Whether a personal display tool breaches them is untested in anything I found. [U]
- Meta sent [Unfollow Everything's developer](https://gizmodo.com/facebook-banned-the-creator-of-unfollow-everything-and-1847826505) a cease-and-desist and banned his accounts in 2021.
- [Zuckerman v. Meta](https://knightcolumbia.org/content/federal-judge-says-challenge-in-zuckerman-v-meta-cannot-go-forward-yet) was dismissed on [ripeness grounds](https://blog.ericgoldman.org/?p=27056) in Nov 2024, so the question remains open.
- Avoid platform logos and names in product branding, and avoid automating accounts. Get counsel before a public launch, especially for an in-app wrapper.

## 6. Helping users pick what they watch

### Evidence

| Source | Finding | Limits |
|---|---|---|
| [Lukoff et al., CHI 2021](https://arxiv.org/pdf/2101.11778) | 120-person US survey: autoplay and recommendations mainly reduce sense of agency; search and playlists tend to support it; 13 co-design sessions | Self-report, not behavior |
| [Lyngs et al., CHI 2020](https://arxiv.org/abs/2001.04180v2) | 58 students: goal reminders and removed newsfeed both helped people stay on task | Reminders irritated; some feared missing out. Small; Facebook |
| [Grüning et al., PNAS 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC9974409) | one sec: 36% of opens abandoned; 57% fewer actual opens after 6 weeks; dismiss option was the strongest mechanism | Self-selected users, within-subject field data, N=280 plus online N=500. **App's founder is a co-author** |
| [Guess et al., Science 2023](https://doi.org/10.1126/science.abp9364) ([abstract](https://dare.uva.nl/id/d481168f-5e57-4e41-bfe0-c447851bde8b)) | Chronological feeds substantially cut time on Facebook and Instagram | Political and untrustworthy content rose; attitudes did not shift |
| [Allcott et al., AER 2022](https://www.nber.org/system/files/working_papers/w28936/w28936.pdf) | Bonus cut targeted app use by 56 min/day (39%), with persistence; evidence of self-control problems | About 2,000 adults; limit-arm size not verified here |
| [Milli et al., PNAS Nexus 2025](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11894805/) | Engagement ranking amplified divisive content; users did not prefer its political tweets | Overall users slightly preferred algorithmic tweets, so removal is not always wanted |

**Gaps**
- I found **no direct trial** of removing YouTube recommendations, a subscriptions-only view, or a search-first home on watch time or satisfaction.
- Evidence above is by analogy. Algone could run its own opt-in local study.

### Existing products

- **"Reset":** [U] I could not identify a product by this name that helps people choose what to watch. Closest matches are [Instagram's recommendation reset](https://fortune.com/2024/11/19/instagram-feed-reset-new-tool-feature) and the [Facebook Reset & Feed Control](https://chromewebstore.google.com/detail/aedbhppfjmagggfkhpbpfeahebjkdenk) extension. Please confirm what was meant.
- **Nebula:** subscription video service. [S: Learning Revolution](https://www.learningrevolution.net/youtube-alternatives/) Its recommendation behavior not verified. [U]
- **Client-based subscriptions:** [NewPipe](https://alternativeto.net/software/grayjay) local subscriptions, [FreeTube](https://alternativeto.net/software/freetube) on desktop, [Grayjay](https://alternativeto.net/software/grayjay) multi-source, listed as "Free and Proprietary." [S] Whether YouTube currently blocks these clients [U]. Algone should not become one.
- **RSS:** `youtube.com/feeds/videos.xml?channel_id=...` works per many guides, but holds only 10 to 15 recent items, and one source reports [intermittent 404s from Dec 2025](https://hushread.com/blog/youtube-channel-rss-feed). No official documentation found. [S]
- **Tournesol:** open source collaborative ratings; [extension shows picks on the YouTube home page](https://github.com/tournesol-app/tournesol) without an account. 137,000+ comparisons from 7,000+ contributors by Aug 2023. [P: paper](https://ar5iv.labs.arxiv.org/html/2211.01179), [paper](https://arxiv.org/pdf/2107.07334) Public API terms and ideological or topical skew [U].
- **Native queues:** YouTube's Watch Later and playlists exist. API access to Watch Later [U], so use a local list.

### Recommended features [J]

1. **Search-first home.** Replace the home feed with a search box, a quiet "What do you want to watch?" prompt, and the queue. Support: Lukoff, Lyngs. Prompt must be skippable and never repeated in-session, since reminders irritated Lyngs's participants.
2. **Subscriptions-first view.** Route YouTube home to the subscriptions page, hide Shorts, and sort by date. No API key or account needed; it works on pages the user already has. Support: Guess, by analogy. On mobile, offer it through the extension and the filtered browser.
3. **Algone Queue.** A local list filled from a "Save for later" button in the extension and from the mobile share sheet. Opens with a soft cap, such as 5 items, to force choice. Support: Lukoff on playlists.
4. **Stop at the end.** Disable autoplay, and replace end-of-video suggestions with "Next in your queue" or "Done." Support: Lukoff on autoplay.
5. **Launch intent check on mobile.** A pause with one tap to leave, before opening chosen apps. Offer "Search for something specific" as a third option. Support: Grüning, where dismissal did the most work. Check the patent first.

Optional later: a small "Community picks" panel from Tournesol, off by default, and RSS import for non-YouTube sources.

## Open items to verify

1. Shield action deep-linking behavior on iOS.
2. Safari extension behavior on the iPad and with Universal Links.
3. Actual App Review outcome for a free app with a filtered browser.
4. Play review outcome with a "deterministic rules" declaration.
5. Primary Android docs for Advanced Protection and Accessibility.
6. Play policy on `PACKAGE_USAGE_STATS`, and UsageStats docs read directly.
7. Exact 2027 verification dates and what F-Droid clients do then.
8. Patent USPTO 12468828 scope.
9. What "Reset" refers to.
10. Current Edge Android catalog and whether a third-party extension can get listed.
