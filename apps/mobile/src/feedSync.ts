import { dueSources, MAX_FEED_BYTES, mergeEntries, nextFetchAt, parseFeed, type FeedStore } from "@algone/core";
import type { Store } from "./store";

/** Fetches due RSS sources one at a time. Each result goes through the store. */
export async function refreshFeeds(store: Store, now: number = Date.now()): Promise<void> {
  for (const source of dueSources(store.get().feeds, now)) {
    let failures = source.failures + 1;
    let entries: ReturnType<typeof parseFeed>["entries"] = [];
    try {
      const res = await fetch(source.url, { credentials: "omit" });
      const text = res.ok ? await res.text() : "";
      if (text && text.length <= MAX_FEED_BYTES) entries = parseFeed(text).entries;
      if (entries.length) failures = 0;
    } catch {
      // Counted as a failure, which backs this source off.
    }
    await store.updateFeeds((feeds: FeedStore) => {
      const merged = entries.length ? mergeEntries(feeds, source.id, entries) : feeds;
      return {
        ...merged,
        sources: merged.sources.map((s) =>
          s.id === source.id ? { ...s, failures, nextAt: nextFetchAt(failures, now) } : s,
        ),
      };
    });
  }
}
