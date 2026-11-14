import abcnews from "../sites/abcnews.json" with { type: "json" };
import bluesky from "../sites/bluesky.json" with { type: "json" };
import facebook from "../sites/facebook.json" with { type: "json" };
import github from "../sites/github.json" with { type: "json" };
import hackernews from "../sites/hackernews.json" with { type: "json" };
import instagram from "../sites/instagram.json" with { type: "json" };
import kick from "../sites/kick.json" with { type: "json" };
import linkedin from "../sites/linkedin.json" with { type: "json" };
import medium from "../sites/medium.json" with { type: "json" };
import pinterest from "../sites/pinterest.json" with { type: "json" };
import quora from "../sites/quora.json" with { type: "json" };
import reddit from "../sites/reddit.json" with { type: "json" };
import substack from "../sites/substack.json" with { type: "json" };
import threads from "../sites/threads.json" with { type: "json" };
import tiktok from "../sites/tiktok.json" with { type: "json" };
import tumblr from "../sites/tumblr.json" with { type: "json" };
import twitch from "../sites/twitch.json" with { type: "json" };
import x from "../sites/x.json" with { type: "json" };
import youtube from "../sites/youtube.json" with { type: "json" };
import type { SiteRule } from "./schema";

export const SITES = [
  youtube, reddit, x, instagram, facebook, linkedin,
  tiktok, threads, bluesky, twitch, pinterest, substack,
  hackernews, github, abcnews, tumblr, quora, medium, kick,
] as unknown as SiteRule[];

export const siteMap = (sites: SiteRule[] = SITES): Record<string, SiteRule> =>
  Object.fromEntries(sites.map((s) => [s.id, s]));

export function siteForHost(hostname: string, sites: SiteRule[] = SITES): SiteRule | undefined {
  return sites.find((s) => s.hosts.includes(hostname));
}
