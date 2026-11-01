import { useEffect, useMemo, useRef, useState } from "react";
import { AppState, BackHandler, Linking, Modal, View } from "react-native";
import { WebView } from "react-native-webview";
import type {
  ShouldStartLoadRequest,
  WebViewMessageEvent,
  WebViewNavigation,
} from "react-native-webview/lib/WebViewTypes";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { matchRoutes } from "@algone/engine/routes";
import { siteMap } from "@algone/rules";
import { MOBILE_COPY } from "../copy";
import { handleMessage } from "../hints";
import { injectionScript, PAUSE_MEDIA, updateScript } from "../injection";
import { useNav } from "../nav";
import { decide, isAllowedUrl, searchUrlFor } from "../navigationPolicy";
import { openUrl } from "../openUrl";
import { buildBoot } from "../pageSite";
import { launchPauseSeen, markLaunchPauseSeen } from "../session";
import { store } from "../store";
import { useColors, useStored } from "../theme";
import { Body, Button, Card, Field, Row, Screen } from "../ui";
import { injectionWatchdog } from "../watchdog";

function LaunchPause(props: { name: string; onLeave: () => void; onContinue: () => void }) {
  return (
    <Screen>
      <Card>
        <Body strong size={20}>{props.name}</Body>
        <Body>{MOBILE_COPY.launchPause}</Body>
        <Button kind="primary" label="Leave" onPress={props.onLeave} />
        <Button label="Continue to the site" onPress={props.onContinue} />
      </Card>
    </Screen>
  );
}

function pathOf(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return "/";
  }
}

export function SiteScreen({ site, url, active }: { site: string; url: string; active: boolean }) {
  const rule = siteMap()[site];
  const nav = useNav();
  const state = useStored();
  const pauseNow = !!state.settings.sites[site]?.intent.launchPause && !launchPauseSeen(site);
  const [paused, setPaused] = useState(pauseNow);
  if (!rule) return null;

  if (paused) {
    const done = () => markLaunchPauseSeen(site);
    return (
      <LaunchPause
        name={rule.name}
        onLeave={() => {
          done();
          nav.pop();
        }}
        onContinue={() => {
          done();
          setPaused(false);
        }}
      />
    );
  }
  return <SiteWeb site={site} url={url} active={active} />;
}

function SiteWeb({ site, url, active }: { site: string; url: string; active: boolean }) {
  const rule = siteMap()[site]!;
  const c = useColors();
  const nav = useNav();
  const state = useStored();
  const insets = useSafeAreaInsets();
  const web = useRef<WebView<object>>(null);

  const [start] = useState({ uri: url });
  const [now, setNow] = useState(Date.now);
  const [notFiltering, setNotFiltering] = useState(false);
  const [path, setPath] = useState(pathOf(url));
  const [page, setPage] = useState({ url, title: "", canGoBack: false });
  const [ended, setEnded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [query, setQuery] = useState("");

  const boot = useMemo(() => buildBoot(state, rule, now), [state, rule, now]);
  const script = useMemo(() => injectionScript(boot), [boot]);
  const { view } = boot.payload;
  const watchdog = useMemo(() => injectionWatchdog(() => setNotFiltering(true)), []);

  // New settings reach the open page here. New documents get them from the prop.
  useEffect(() => {
    web.current?.injectJavaScript(updateScript(boot.payload));
  }, [boot]);

  // Snoozes end on the native clock: a page cannot ask for new state, so it is told.
  useEffect(() => {
    if (!view.snoozedUntil) return;
    const timer = setTimeout(() => setNow(Date.now()), Math.max(0, view.snoozedUntil - Date.now()) + 50);
    return () => clearTimeout(timer);
  }, [view.snoozedUntil]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") setNow(Date.now());
      else web.current?.injectJavaScript(PAUSE_MEDIA);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (active) setNow(Date.now());
    else web.current?.injectJavaScript(PAUSE_MEDIA);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!page.canGoBack) return false;
      web.current?.goBack();
      return true;
    });
    return () => sub.remove();
  }, [active, page.canGoBack]);

  useEffect(() => watchdog.cancel, [watchdog]);

  const onRequest = (req: ShouldStartLoadRequest): boolean => {
    const d = decide(req.url, site, req.isTopFrame !== false);
    switch (d.action) {
      case "allow":
        return true;
      case "switchSite":
        nav.replace({ name: "site", site: d.site, url: d.url });
        return false;
      case "external":
        void Linking.openURL(d.url);
        return false;
      case "deny":
        return false;
    }
  };

  const onMessage = (e: WebViewMessageEvent) =>
    handleMessage(e.nativeEvent.data, e.nativeEvent.url, { stopAtEnd: view.stopAtEnd }, {
      injectionConfirmed: () => {
        watchdog.cancel();
        setNotFiltering(false);
      },
      routeChanged: setPath,
      showEndSheet: () => setEnded(true),
    });

  const onNavigation = (n: WebViewNavigation) => {
    setPage({ url: n.url, title: n.title, canGoBack: n.canGoBack });
    setPath(pathOf(n.url));
    setSaved(false);
  };

  const onLoadStart = (e: { nativeEvent: { url: string } }) => {
    setNotFiltering(false);
    let host = "";
    try {
      host = new URL(e.nativeEvent.url).hostname;
    } catch {
      // No host: no script is expected here.
    }
    // auxHosts pages, such as a consent screen, are allowed but not filtered.
    if (rule.hosts.includes(host)) watchdog.start();
    else watchdog.cancel();
  };

  const showForAWhile = () =>
    void store.requestSnooze(site).then((r) => {
      if (r.needsBarrier) nav.push({ name: "barrier" });
    });

  const save = () => {
    if (!isAllowedUrl(page.url)) return;
    void store.queueAdd({ url: page.url, title: page.title, site }).then(() => setSaved(true));
  };

  const search = () => {
    const target = searchUrlFor(rule, query);
    if (target) web.current?.injectJavaScript(`location.assign(${JSON.stringify(target)});true;`);
  };

  const onHome = matchRoutes(boot.payload.site.routes, path, "").includes("home");
  const panel = onHome ? view.panel : null;
  const next = state.queue[0];

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <View style={{ padding: 8, gap: 8, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <Row>
          <Button
            label="Back"
            onPress={() => (page.canGoBack ? web.current?.goBack() : nav.pop())}
          />
          <Button label="Home" onPress={nav.home} />
          {view.snoozedUntil ? (
            <Button label="End now" onPress={() => void store.endSnooze(site)} />
          ) : (
            <Button label="Show for a while" onPress={showForAWhile} />
          )}
          <Button label={saved ? "Saved" : "Save for later"} disabled={saved} onPress={save} />
        </Row>
        {notFiltering ? (
          <View accessibilityRole="alert" style={{ padding: 8, borderRadius: 12, borderWidth: 1, borderColor: c.warn }}>
            <Body size={13}>{MOBILE_COPY.notFiltering}</Body>
          </View>
        ) : null}
        {panel?.prompt ? <Body muted size={13}>{MOBILE_COPY.launchPause}</Body> : null}
        {panel?.search && rule.searchUrl ? (
          <Field
            accessibilityLabel={`Search ${rule.name}`}
            placeholder={`Search ${rule.name}`}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={search}
            returnKeyType="search"
          />
        ) : null}
        {panel?.content === "random" ? <Button label="Open Random" onPress={() => nav.push({ name: "random" })} /> : null}
        {panel?.content === "custom" ? <Button label="Open Custom feed" onPress={() => nav.push({ name: "custom" })} /> : null}
      </View>
      <WebView<object>
        ref={web}
        source={start}
        style={{ flex: 1, backgroundColor: c.bg }}
        // "*" sends every scheme to onRequest. The library's own whitelist would pass
        // anything it rejects straight to Linking, which is what the policy forbids.
        originWhitelist={["*"]}
        onShouldStartLoadWithRequest={onRequest}
        onMessage={onMessage}
        onNavigationStateChange={onNavigation}
        onLoadStart={onLoadStart}
        injectedJavaScriptBeforeContentLoaded={script}
        injectedJavaScriptBeforeContentLoadedForMainFrameOnly
        // Android runs the early script at page start, which can miss. This retries at
        // load end, and does nothing if the first run worked.
        injectedJavaScript={script}
        injectedJavaScriptForMainFrameOnly
        javaScriptCanOpenWindowsAutomatically={false}
        setSupportMultipleWindows={false}
        mixedContentMode="never"
        allowFileAccess={false}
        allowFileAccessFromFileURLs={false}
        allowUniversalAccessFromFileURLs={false}
        allowsInlineMediaPlayback
        allowsPictureInPictureMediaPlayback={false}
        allowsAirPlayForMediaPlayback={false}
        allowsLinkPreview={false}
        allowsBackForwardNavigationGestures
      />
      <Modal visible={ended} transparent animationType="fade" onRequestClose={() => setEnded(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end", padding: 16, paddingBottom: insets.bottom + 16 }}>
          <View style={{ backgroundColor: c.bg, borderRadius: 12 }}>
            <Card>
              <Body strong>That video has ended</Body>
              {next ? (
                <Button
                  kind="primary"
                  label={`Next: ${next.title}`}
                  onPress={() => {
                    setEnded(false);
                    openUrl(next.url, nav.push);
                  }}
                />
              ) : null}
              <Button
                kind={next ? "ghost" : "primary"}
                label="Back to Algone"
                onPress={() => {
                  setEnded(false);
                  nav.home();
                }}
              />
              <Button label="Stay here" onPress={() => setEnded(false)} />
            </Card>
          </View>
        </View>
      </Modal>
    </View>
  );
}
