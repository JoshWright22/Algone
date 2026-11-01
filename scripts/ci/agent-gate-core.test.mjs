import { describe, expect, it } from "vitest";
import { countAgentRuns, decide, outsideEditors, parseCap, slotsFor } from "./agent-gate-core.mjs";
import { BOT_LOGIN, marker, parseMarker } from "./markers.mjs";
import { openWithFallback, prBody } from "./open-agent-pr-core.mjs";

describe("cap logic", () => {
  it("reads the cap, defaulting to 3", () => {
    expect(parseCap("5")).toBe(5);
    expect(parseCap("0")).toBe(0);
    for (const bad of ["", undefined, "x", "-1", "2.5"]) expect(parseCap(bad)).toBe(3);
  });
  it("reserves slots by priority", () => {
    expect(slotsFor(["site-change"], 3)).toBe(3);
    expect(slotsFor(["bug"], 3)).toBe(2);
    expect(slotsFor(["feature"], 3)).toBe(1);
    expect(slotsFor([], 1)).toBe(0);
    expect(slotsFor(["bug", "site-change"], 3)).toBe(3);
  });
  it("counts only agent jobs that started", () => {
    const started_at = "2026-10-31T01:00:00Z";
    expect(
      countAgentRuns([
        { name: "agent", started_at, conclusion: "success" },
        { name: "agent", started_at, conclusion: "failure" },
        { name: "agent", started_at, conclusion: "skipped" },
        { name: "agent", started_at: null, conclusion: "cancelled" },
        { name: "gate", started_at, conclusion: "success" },
      ]),
    ).toBe(2);
  });
});

describe("edit detection", () => {
  const edit = (editor, hour) => ({ editor, editedAt: `2026-10-31T0${hour}:00:00Z` });
  const clean = { maintainers: ["octocat"], includesCreatedEdit: false, bodyEdits: [], titleRenames: [], truncated: false };
  it("passes an unedited issue", () => {
    expect(outsideEditors(clean)).toEqual({ complete: true, editors: [] });
  });
  it("ignores the creation entry, whose editor is the author", () => {
    const r = outsideEditors({
      ...clean,
      includesCreatedEdit: true,
      bodyEdits: [edit("octocat", 2), edit("stranger", 1)],
    });
    expect(r.editors).toEqual([]);
  });
  it("catches a stranger's edit in any position", () => {
    const r = outsideEditors({
      ...clean,
      includesCreatedEdit: true,
      bodyEdits: [edit("octocat", 3), edit("stranger", 2), edit("stranger", 1)],
    });
    expect(r.editors).toEqual(["stranger"]);
  });
  it("catches a title rename, and a deleted account", () => {
    expect(outsideEditors({ ...clean, titleRenames: [{ actor: "stranger" }] }).editors).toEqual(["stranger"]);
    expect(outsideEditors({ ...clean, titleRenames: [{ actor: undefined }] }).editors).toEqual(["unknown"]);
  });
  it("does not treat a cut-off list as clean", () => {
    expect(outsideEditors({ ...clean, truncated: true }).complete).toBe(false);
  });
});

describe("decide", () => {
  const ok = {
    label: "claude-fix",
    sender: "octocat",
    maintainers: ["octocat"],
    hasCredential: true,
    edits: { complete: true, editors: [] },
    labels: ["bug"],
    usedToday: 0,
    cap: 3,
  };
  it("proceeds", () => expect(decide(ok).proceed).toBe(true));
  it("stops with only a notice on the wrong label, sender, or no credential", () => {
    for (const c of [{ label: "bug" }, { sender: "stranger" }, { hasCredential: false }]) {
      expect(decide({ ...ok, ...c })).toMatchObject({ proceed: false, kind: "notice" });
    }
  });
  it("comments and stops on outside edits", () => {
    for (const edits of [{ complete: true, editors: ["x"] }, { complete: false, editors: [] }]) {
      expect(decide({ ...ok, edits })).toMatchObject({ proceed: false, kind: "comment" });
    }
  });
  it("applies the slots at the boundary", () => {
    expect(decide({ ...ok, usedToday: 1 }).proceed).toBe(true);
    expect(decide({ ...ok, usedToday: 2 })).toMatchObject({ proceed: false, kind: "comment" });
    expect(decide({ ...ok, labels: ["site-change"], usedToday: 2 }).proceed).toBe(true);
    expect(decide({ ...ok, labels: ["site-change"], usedToday: 3 }).proceed).toBe(false);
    expect(decide({ ...ok, labels: [], usedToday: 1 }).proceed).toBe(false);
  });
});

describe("marker parsing", () => {
  it("round-trips from the bot", () => {
    expect(parseMarker(`text\n${marker("youtube", 123)}\n`, BOT_LOGIN)).toEqual({ site: "youtube", runId: "123" });
  });
  it("ignores a marker from anyone else", () => {
    expect(parseMarker(marker("youtube", 123), "stranger")).toBeNull();
  });
  it("ignores malformed markers", () => {
    expect(parseMarker("<!-- algone:site-check site=y run=1; rm -->", BOT_LOGIN)).toBeNull();
    expect(parseMarker(null, BOT_LOGIN)).toBeNull();
  });
});

describe("opening the pull request", () => {
  it("moves past a revoked token and a failed exchange", async () => {
    const r = await openWithFallback(
      [
        { name: "one", get: () => "dead" },
        { name: "two", get: async () => { throw new Error("no"); } },
        { name: "three", get: () => "live" },
      ],
      async (t) => {
        if (t === "dead") throw new Error("401");
        return "url";
      },
    );
    expect(r).toMatchObject({ used: "three", url: "url" });
    expect(r.errors).toHaveLength(2);
  });
  it("reports failure when nothing works", async () => {
    expect((await openWithFallback([{ name: "one", get: () => "" }], async () => "url")).url).toBeNull();
  });
  it("closes the issue on merge", () => expect(prBody(4)).toContain("Closes #4."));
});
