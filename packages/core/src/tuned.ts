import aiPhrases from "./content/ai-phrases.json" with { type: "json" };
import topics from "./content/topics.json" with { type: "json" };
import type { TunedFilters } from "./types";

export interface TunedItem {
  title: string;
  channel: string;
  /** Rule kinds that matched this item, such as "shorts" or "ads". */
  kinds: string[];
}

const TOPICS = topics as Record<string, string[]>;
export const TOPIC_NAMES = Object.keys(TOPICS);
export const KIND_LABELS: Record<string, string> = {
  shorts: "Shorts and Reels",
  reels: "Shorts and Reels",
  ads: "Ads",
  likelyAi: "Likely AI",
};

const has = (text: string, phrase: string) => text.includes(phrase.toLowerCase());

export function matchesTopic(title: string, topic: string): boolean {
  const t = title.toLowerCase();
  return (TOPICS[topic] ?? []).some((w) => {
    const re = new RegExp(`(^|[^a-z0-9])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`, "i");
    return re.test(t);
  });
}

/** Text match on explicit phrases. It misses some and wrongly catches some. */
export function isLikelyAi(title: string): boolean {
  const t = title.toLowerCase();
  return (aiPhrases as string[]).some((p) => has(t, p));
}

export function shouldHide(item: TunedItem, f: TunedFilters): boolean {
  const title = item.title.toLowerCase();
  const channel = item.channel.toLowerCase();
  if (f.blockKeywords.some((k) => k && has(title, k))) return true;
  if (f.blockChannels.some((c) => c && has(channel, c))) return true;
  if (f.blockTopics.some((t) => matchesTopic(item.title, t))) return true;
  if (f.hideKinds.some((k) => item.kinds.includes(k))) return true;
  if (f.hideKinds.includes("likelyAi") && isLikelyAi(item.title)) return true;
  if (f.allowTopics.length && !f.allowTopics.some((t) => matchesTopic(item.title, t))) return true;
  return false;
}
