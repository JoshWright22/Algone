import { useEffect, useState } from "react";
import { AppState, Linking, View } from "react-native";
import { ShareIntentModule, useShareIntent } from "expo-share-intent";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { rulesConfig } from "./config";
import { parseSaveLink, parseSharedText } from "./deepLink";
import { refreshFeeds } from "./feedSync";
import { Navigator, useNav, type Route } from "./nav";
import { checkRules } from "./rules";
import { BarrierScreen } from "./screens/Barrier";
import { CustomScreen } from "./screens/Custom";
import { HomeScreen } from "./screens/Home";
import { QueueScreen } from "./screens/Queue";
import { RandomScreen } from "./screens/Random";
import { SettingsScreen } from "./screens/Settings";
import { SiteScreen } from "./screens/Site";
import { store } from "./store";
import { useColors } from "./theme";

function background(): void {
  void checkRules(store, rulesConfig);
  void refreshFeeds(store);
}

/** Saved links stay inert text in the queue until the user taps one. */
function useInboundLinks(): void {
  const nav = useNav();
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent({
    disabled: !ShareIntentModule, // Expo Go has no native side.
    resetOnBackground: false,
  });

  useEffect(() => {
    const onLink = (link: string | null | undefined) => {
      const url = link && parseSaveLink(link);
      if (!url) return;
      void store.queueAdd({ url, title: url, site: "" });
      nav.push({ name: "queue" });
    };
    void Linking.getInitialURL().then(onLink);
    const sub = Linking.addEventListener("url", (e) => onLink(e.url));
    return () => sub.remove();
  }, [nav]);

  useEffect(() => {
    if (!hasShareIntent) return;
    const url = parseSharedText(shareIntent.webUrl ?? shareIntent.text);
    if (url) {
      void store.queueAdd({ url, title: shareIntent.meta?.title ?? url, site: "" });
      nav.push({ name: "queue" });
    }
    resetShareIntent();
  }, [hasShareIntent, shareIntent, resetShareIntent, nav]);
}

function InboundLinks() {
  useInboundLinks();
  return null;
}

function screen(route: Route, active: boolean) {
  switch (route.name) {
    case "home":
      return <HomeScreen />;
    case "site":
      return <SiteScreen site={route.site} url={route.url} active={active} />;
    case "queue":
      return <QueueScreen />;
    case "custom":
      return <CustomScreen />;
    case "random":
      return <RandomScreen />;
    case "settings":
      return <SettingsScreen />;
    case "barrier":
      return <BarrierScreen />;
  }
}

function Shell() {
  const c = useColors();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style={c.scheme === "dark" ? "light" : "dark"} />
      <Navigator
        render={(route, active) => (
          <>
            {route.name === "home" ? <InboundLinks /> : null}
            {screen(route, active)}
          </>
        )}
      />
    </View>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void store.load(rulesConfig.buildRev).then(() => {
      setReady(true);
      background();
    });
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") background();
    });
    return () => sub.remove();
  }, []);

  return <SafeAreaProvider>{ready ? <Shell /> : null}</SafeAreaProvider>;
}
