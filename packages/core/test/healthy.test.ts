import { describe, expect, it } from "vitest";
import { avoidHits, dailyBatch, healthyBatch, healthyScore, type HealthyContext, type HealthyItem } from "../src/index";

const NOW = new Date(2026, 10, 10, 12, 0, 0).getTime();
const ctx = (o: Partial<HealthyContext> = {}): HealthyContext => ({
  ratings: {}, allowTopics: [], avoid: ["outrage", "clickbait", "comparison", "doom"],
  healthy: { batchSize: 3, dailyBudgetMinutes: 30 }, usedMinutes: 0, seen: [], now: NOW, ...o,
});
let n = 0;
const item = (title: string, channel = `c${n}`, time?: number): HealthyItem =>
  ({ id: `i${++n}`, title, channel, url: `https://www.youtube.com/watch?v=${n}`, time });

describe("avoid rules", () => {
  it.each([
    ["Senator DESTROYS reporter in heated exchange", "outrage"],
    ["You won't believe what happened next", "clickbait"],
    ["Rich vs poor: a day in the life", "comparison"],
    ["The economic collapse is coming", "doom"],
  ])("%s -> %s", (title, id) => {
    expect(avoidHits(title, ["outrage", "clickbait", "comparison", "doom"])).toContain(id);
  });
  it("catches shape: shouting, ?!, listicles", () => {
    expect(avoidHits("THIS CHANGES EVERYTHING FOREVER", [])).toEqual(["shouting"]);
    expect(avoidHits("Is this the end?!", [])).toEqual(["punctuation"]);
    expect(avoidHits("10 craziest moments in sports", [])).toEqual(["listicle"]);
  });
  it("leaves calm titles alone", () => {
    for (const t of ["How bread rises: the chemistry of yeast", "Learning Rust, part 3", "NASA's new telescope images", "Quiet morning walk in Kyoto"]) {
      expect(avoidHits(t, ["outrage", "clickbait", "comparison", "doom"])).toEqual([]);
    }
  });
  it("matches whole words only", () => {
    expect(avoidHits("Garage tour", ["outrage"])).toEqual([]);
    expect(avoidHits("Rage quit", ["outrage"])).toEqual(["outrage"]);
  });
  it("only checks the lists the person kept on", () => {
    expect(avoidHits("Senator destroys reporter", ["doom"])).toEqual([]);
  });
});

describe("healthy batch", () => {
  it("puts calm, chosen and rated items first and drops ragebait", () => {
    const calm = item("How bread rises", "Bakers", NOW - 3_600_000);
    const rated = item("Weekly update", "Friend", NOW - 48 * 3_600_000);
    const rage = item("Pundit DESTROYS guest?!", "Outrage TV", NOW);
    const b = healthyBatch([rage, calm, rated], ctx({ ratings: { friend: "worth" } }));
    expect(b.items.map((i) => i.id)).toEqual([rated.id, calm.id]);
  });
  it("hides creators that made the person feel worse", () => {
    const a = item("Nice video", "Gloomy");
    expect(healthyBatch([a], ctx({ ratings: { gloomy: "worse" } })).items).toEqual([]);
  });
  it("is short, and one creator fills at most a third", () => {
    const items = Array.from({ length: 20 }, (_, i) => item(`Video ${i}`, i < 10 ? "Same" : `Other${i}`));
    const b = healthyBatch(items, ctx({ healthy: { batchSize: 6, dailyBudgetMinutes: 30 } }));
    expect(b.items).toHaveLength(6);
    expect(b.items.filter((i) => i.channel === "Same")).toHaveLength(2);
    const ten = healthyBatch(items, ctx({ healthy: { batchSize: 10, dailyBudgetMinutes: 30 } }));
    expect(ten.items.filter((i) => i.channel === "Same")).toHaveLength(3);
  });
  it("ends when the day's budget is used", () => {
    expect(healthyBatch([item("x")], ctx({ usedMinutes: 30 }))).toEqual({ items: [], end: "budget" });
  });
  it("skips items already opened, and duplicates", () => {
    const a = item("A");
    expect(healthyBatch([a, a, item("B")], ctx({ seen: [a.id] })).items.map((i) => i.title)).toEqual(["B"]);
  });
  it("prefers allowed topics", () => {
    const sci = item("Physics of black holes", "x1", NOW);
    const other = item("Random vlog", "x2", NOW);
    expect(healthyScore(sci, ctx({ allowTopics: ["Science"] }))).toBeGreaterThan(healthyScore(other, ctx({ allowTopics: ["Science"] })));
  });
});

describe("daily batch", () => {
  it("is picked once a day and kept", () => {
    const first = [item("One"), item("Two")];
    const r1 = dailyBatch(undefined, first, ctx(), "2026-11-10");
    expect(r1.saved?.items).toHaveLength(2);
    // Two items came first while the feed loaded; the batch of 3 tops up once, then stays.
    const r2 = dailyBatch(r1.saved!, [item("Three"), item("Four")], ctx(), "2026-11-10");
    expect(r2.batch.items.map((i) => i.title)).toEqual(["One", "Two", "Three"]);
    const r3 = dailyBatch(r2.saved!, [item("Five")], ctx(), "2026-11-10");
    expect(r3.batch.items.map((i) => i.title)).toEqual(["One", "Two", "Three"]);
    const done = dailyBatch(r2.saved!, [item("Six")], ctx({ seen: r2.saved!.items.map((i) => i.id) }), "2026-11-10");
    expect(done.batch.end).toBe("empty");
    const tomorrow = dailyBatch(r1.saved!, [item("Six")], ctx(), "2026-11-11");
    expect(tomorrow.batch.items.map((i) => i.title)).toEqual(["Six"]);
  });
  it("stricter settings apply to today's batch at once", () => {
    const a = item("Calm video", "Gloomy");
    const b = item("Another calm one", "Fine");
    const r = dailyBatch(undefined, [a, b], ctx(), "d");
    expect(r.batch.items).toHaveLength(2);
    const after = dailyBatch(r.saved!, [], ctx({ ratings: { gloomy: "worse" } }), "d");
    expect(after.batch.items.map((i) => i.id)).toEqual([b.id]);
    const smaller = dailyBatch(r.saved!, [], ctx({ healthy: { batchSize: 1, dailyBudgetMinutes: 30 } }), "d");
    expect(smaller.batch.items).toHaveLength(1);
    const blocked = dailyBatch(r.saved!, [], ctx({ filters: { blockKeywords: ["another"], blockChannels: [], blockTopics: [], allowTopics: [], hideKinds: [] } }), "d");
    expect(blocked.batch.items.map((i) => i.id)).toEqual([a.id]);
  });
  it("a channel named like a built-in property is just a name", () => {
    const x = item("Pundit DESTROYS guest", "constructor");
    expect(Number.isNaN(healthyScore(x, ctx()))).toBe(false);
    expect(healthyBatch([x], ctx()).items).toEqual([]);
  });
  it("does not keep an empty pick", () => {
    expect(dailyBatch(undefined, [], ctx(), "d").saved).toBeNull();
  });
});
