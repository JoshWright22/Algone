import { describe, expect, it } from "vitest";
import { BOT_LOGIN, marker, parseMarker } from "./markers.mjs";
import {
  brokenIssue, findOpenIssue, nextStatus, safeReason, walledIssue, WALLED_AFTER_DAYS,
} from "./site-status-core.mjs";

process.env.MAINTAINERS = "octocat";

describe("streak logic", () => {
  const run = (outcome) => ({ date: "d", sites: { x: { outcome, tier: 1, method: "fixture", probes: [] } } });
  const walk = (days) => {
    let status = null;
    const events = [];
    days.forEach((outcome, i) => {
      const r = nextStatus(status, run(outcome), { today: `2026-10-${String(i + 1).padStart(2, "0")}`, runId: i });
      status = r.status;
      if (r.newlyWalled.length) events.push(i);
    });
    return { entry: status.sites.x, events };
  };
  const seven = Array(WALLED_AFTER_DAYS).fill("inconclusive");

  it("walls on day seven only", () => {
    expect(walk(seven.slice(1)).entry.walled).toBe(false);
    expect(walk(seven)).toMatchObject({ entry: { walled: true, inconclusiveDays: 7 }, events: [6] });
  });
  it("fires once, then stays quiet", () => {
    expect(walk([...seven, "inconclusive", "inconclusive"]).events).toEqual([6]);
  });
  it("resets on pass and on broken, and can fire again", () => {
    expect(walk([...seven, "pass"]).entry).toMatchObject({ walled: false, inconclusiveDays: 0, lastPass: "2026-10-08" });
    expect(walk([...seven.slice(1), "broken", "inconclusive"]).entry.inconclusiveDays).toBe(1);
    expect(walk([...seven, "pass", ...seven]).events).toEqual([6, 14]);
  });
  it("counts a day once", () => {
    let s = nextStatus(null, run("inconclusive"), { today: "2026-10-01", runId: 1 });
    s = nextStatus(s.status, run("inconclusive"), { today: "2026-10-01", runId: 2 });
    expect(s.status.sites.x.inconclusiveDays).toBe(1);
  });
  it("leaves not-checked and absent sites alone", () => {
    const prev = { sites: { x: { inconclusiveDays: 3, walled: false }, y: { inconclusiveDays: 5, walled: false } } };
    const r = nextStatus(prev, run("not-checked"), { today: "2026-10-01", runId: 1 });
    expect(r.status.sites).toEqual(prev.sites);
  });
  it("reports broken sites with cleaned reasons", () => {
    const results = {
      date: "d",
      sites: {
        x: {
          outcome: "broken",
          probes: [
            { path: "/", outcome: "broken", reason: "home: no selector matches <img src=x>`" },
            { path: "/ok", outcome: "pass", reason: "" },
          ],
        },
      },
    };
    expect(nextStatus(null, results, { today: "t", runId: 1 }).broken).toEqual([
      { site: "x", reasons: [{ path: "/", reason: "home: no selector matches img srcx" }] },
    ]);
  });
  it("cleans markup and caps length", () => {
    expect(safeReason("<!-- -->")).toBe("-- --");
    expect(safeReason("a".repeat(300))).toHaveLength(200);
  });
});

describe("issues and dedupe", () => {
  const ctx = { runId: 77, runUrl: "https://example.test/run", simulated: false };
  const issue = (over = {}) => ({
    state: "open",
    user: { login: BOT_LOGIN },
    labels: [{ name: "site-change" }],
    body: marker("youtube", 5),
    ...over,
  });
  it("writes the mention, the label, and a parsable marker", () => {
    const i = brokenIssue({ site: "youtube", reasons: [{ path: "/", reason: "home" }] }, ctx);
    expect(i.labels).toEqual(["site-change"]);
    expect(i.body).toContain("@octocat");
    expect(parseMarker(i.body, BOT_LOGIN)).toEqual({ site: "youtube", runId: "77" });
    expect(i.title).not.toContain("simulated");
    expect(brokenIssue({ site: "x", reasons: [] }, { ...ctx, simulated: true }).title).toContain("[simulated]");
  });
  it("writes the walled issue", () => {
    const i = walledIssue("tiktok", ctx);
    expect(i.labels).toEqual(["site-walled"]);
    expect(i.body).toContain("@octocat");
  });
  it("finds the bot's open issue for that site", () => {
    expect(findOpenIssue([issue({ number: 1 })], "site-change", "youtube")?.number).toBe(1);
  });
  it("is not suppressed by a stranger, another site, or another label", () => {
    expect(findOpenIssue([issue({ user: { login: "stranger" } })], "site-change", "youtube")).toBeNull();
    expect(findOpenIssue([issue()], "site-change", "reddit")).toBeNull();
    expect(findOpenIssue([issue({ labels: [] })], "site-change", "youtube")).toBeNull();
    expect(findOpenIssue([issue({ pull_request: {} })], "site-change", "youtube")).toBeNull();
    expect(findOpenIssue([issue({ state: "closed" })], "site-change", "youtube")).toBeNull();
  });
});
