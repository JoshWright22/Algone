import { Linking } from "react-native";
import { decide } from "./navigationPolicy";
import type { Route } from "./nav";

/** Opens a stored or user-chosen URL: as a site if allow-listed, otherwise in the browser. */
export function openUrl(url: string, push: (route: Route) => void): void {
  const d = decide(url, null, true);
  if (d.action === "switchSite") push({ name: "site", site: d.site, url: d.url });
  else if (d.action === "external") void Linking.openURL(d.url);
}
