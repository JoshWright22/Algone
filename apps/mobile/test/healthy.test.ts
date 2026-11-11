import { currentBatch } from "@algone/core";
import { describe, expect, it, vi } from "vitest";

vi.mock("@react-native-async-storage/async-storage", () => ({ default: {} }));

import { cleanFeedItems, createStore, STATE_KEY, type KeyValue } from "../src/store";

const NOW = new Date(2026, 10, 10, 12).getTime();

function memory(): KeyValue & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: async (k) => data.get(k) ?? null, setItem: async (k, v) => void data.set(k, v) };
}

const item = (n: number, channel = `Creator ${n}`) => ({
  title: `A calm video about gardening ${n}`,
  channel,
  url: `https://www.youtube.com/watch?v=${n}`,
});

async function ready(clock = () => NOW) {
  const kv = memory();
  const store = createStore(kv, clock);
  await store.load(0);
  return { store, kv };
}

describe("feed items from a page", () => {
  it("keeps only https items on the site's own hosts, with capped text", () => {
    const long = { ...item(1), title: "t".repeat(500), channel: "c".repeat(500) };
    const clean = cleanFeedItems("youtube", [
      long,
      item(2),
      { ...item(3), url: "https://evil.example/watch?v=3" },
      { ...item(4), url: "http://www.youtube.com/watch?v=4" },
      { ...item(5), url: "javascript:alert(1)" },
      { ...item(6), title: 7 },
      { ...item(7), url: `https://www.youtube.com/${"a".repeat(2100)}` },
      null,
      { ...item(8), channel: undefined },
    ]);
    expect(clean.map((i) => i.url)).toEqual([item(1).url, item(2).url, item(8).url]);
    expect(clean[0]!.title).toHaveLength(200);
    expect(clean[0]!.channel).toHaveLength(100);
    expect(clean[2]!.channel).toBe("");
    expect(cleanFeedItems("nosuchsite", [item(1)])).toEqual([]);
    expect(cleanFeedItems("youtube", "nope")).toEqual([]);
    expect(cleanFeedItems("youtube", Array.from({ length: 100 }, (_, i) => item(i)))).toHaveLength(60);
  });

  it("builds today's batch, persisted, and a rejected report writes nothing", async () => {
    const { store, kv } = await ready();
    expect((await store.healthyFeedItems("youtube", [{ ...item(1), url: "https://evil.example/" }])).ok).toBe(false);
    expect(kv.data.get(STATE_KEY)).not.toContain("evil.example");
    await store.healthyFeedItems("youtube", Array.from({ length: 12 }, (_, i) => item(i)));
    const s = store.get();
    const batch = currentBatch(s.settings, "youtube", s.healthy, NOW);
    expect(batch.items).toHaveLength(10);
    expect(batch.end).toBe("batch");
    expect(JSON.parse(kv.data.get(STATE_KEY)!).healthy.batches.youtube.items).toHaveLength(10);
  });

  it("an opened item is marked seen and its creator can be rated", async () => {
    const { store } = await ready();
    await store.healthyFeedItems("youtube", [item(1), item(2)]);
    await store.healthySeen(item(1).url);
    await store.healthySeen(item(2).url);
    expect(store.get().healthy.seen).toEqual([item(1).url, item(2).url]);
    expect((await store.rate("Creator 1", "worth")).ok).toBe(true);
    expect((await store.rate("Creator 1", "bogus" as "worth")).ok).toBe(false);
    expect((await store.rate("x".repeat(101), "worth")).ok).toBe(false);
    expect(store.get().healthy.ratings).toEqual({ "creator 1": "worth" });
    const s = store.get();
    const batch = currentBatch(s.settings, "youtube", s.healthy, NOW);
    expect(batch.items).toHaveLength(2);
    expect(batch.items.every((i) => s.healthy.seen.includes(i.id))).toBe(true);
  });

  it("visible minutes count toward the day's budget", async () => {
    const { store } = await ready();
    await store.healthyFeedItems("youtube", [item(1)]);
    for (let i = 0; i < 30; i++) await store.healthyMinute();
    const s = store.get();
    expect(s.healthy.usage.minutes).toBe(30);
    expect(currentBatch(s.settings, "youtube", s.healthy, NOW).end).toBe("budget");
  });
});
