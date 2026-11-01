import bluesky from "../sites/bluesky.json";
import facebook from "../sites/facebook.json";
import instagram from "../sites/instagram.json";
import linkedin from "../sites/linkedin.json";
import pinterest from "../sites/pinterest.json";
import reddit from "../sites/reddit.json";
import substack from "../sites/substack.json";
import threads from "../sites/threads.json";
import tiktok from "../sites/tiktok.json";
import twitch from "../sites/twitch.json";
import x from "../sites/x.json";
import youtube from "../sites/youtube.json";
import type { SiteRule } from "./schema";

export const SITES = [
  youtube, reddit, x, instagram, facebook, linkedin,
  tiktok, threads, bluesky, twitch, pinterest, substack,
] as unknown as SiteRule[];

export const siteMap = (sites: SiteRule[] = SITES): Record<string, SiteRule> =>
  Object.fromEntries(sites.map((s) => [s.id, s]));

export function siteForHost(hostname: string, sites: SiteRule[] = SITES): SiteRule | undefined {
  return sites.find((s) => s.hosts.includes(hostname));
}
