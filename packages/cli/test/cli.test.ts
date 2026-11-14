import { describe, expect, it } from "vitest";
import { run, type Io } from "../src/cli";

const NOW = new Date(2026, 10, 10, 12, 0, 0).getTime();

function io(env: Record<string, string> = {}) {
  const files = new Map<string, string>();
  const out: string[] = [];
  const err: string[] = [];
  const x: Io = {
    readFile: async (p) => {
      const t = files.get(p);
      if (t === undefined) throw new Error("ENOENT");
      return t;
    },
    writeFile: async (p, t) => void files.set(p, t),
    out: (t) => out.push(t),
    err: (t) => err.push(t),
    env,
    fetch: async () => new Response("{}", { status: 500 }),
    now: () => NOW,
  };
  return { x, files, out, err, json: (p: string) => JSON.parse(files.get(p)!) };
}

describe("algone CLI", () => {
  it("init, validate, get", async () => {
    const t = io();
    expect(await run(["init", "p.json"], t.x)).toBe(0);
    expect(await run(["validate", "p.json"], t.x)).toBe(0);
    expect(await run(["get", "p.json", "sites.youtube.mode"], t.x)).toBe(0);
    expect(t.out.at(-1)).toBe('"nofeed"');
  });

  it("set changes one value, checks it, and counts the revision", async () => {
    const t = io({ ALGONE_AGENT: "claude" });
    await run(["init", "p.json"], t.x);
    expect(await run(["set", "p.json", "sites.youtube.mode", "nofeed"], t.x)).toBe(0);
    expect(await run(["set", "p.json", "healthy.batchSize", "5"], t.x)).toBe(0);
    const p = t.json("p.json");
    expect(p.settings.sites.youtube.mode).toBe("nofeed");
    expect(p.settings.healthy.batchSize).toBe(5);
    expect(p.rev).toBe(3);
    expect(p.updatedBy).toBe("agent:claude");
  });

  it("set refuses anything the file may not hold, and leaves the file alone", async () => {
    const t = io();
    await run(["init", "p.json"], t.x);
    const before = t.files.get("p.json");
    for (const [path, value] of [
      ["sites.youtube.mode", "everything"],
      ["theme", "dark"],
      ["barrier", '{"type":"partner","salt":"s","hash":"h","iterations":1,"recoveryAt":null}'],
      ["__proto__.x", "1"],
      ["healthy.batchSize", "1000"],
    ]) {
      expect(await run(["set", "p.json", path!, value!], t.x)).toBe(1);
    }
    expect(t.files.get("p.json")).toBe(before);
    expect(t.err.length).toBe(5);
  });

  it("set writes platform overrides", async () => {
    const t = io();
    await run(["init", "p.json"], t.x);
    expect(await run(["set", "p.json", "overrides.platform:android.sites.youtube.mode", "random"], t.x)).toBe(0);
    expect(t.json("p.json").overrides["platform:android"].sites.youtube.mode).toBe("random");
  });

  it("export-zen writes hide rules only", async () => {
    const t = io();
    await run(["init", "p.json"], t.x);
    expect(await run(["export-zen", "p.json", "zen.txt"], t.x)).toBe(0);
    const text = t.files.get("zen.txt")!;
    expect(text).toContain("! Title: Algone");
    expect(text).toContain("www.youtube.com,m.youtube.com##");
  });

  it("pull and push need a token", async () => {
    const t = io();
    expect(await run(["pull", "p.json"], t.x)).toBe(1);
    expect(t.err[0]).toMatch(/ALGONE_GITHUB_TOKEN/);
  });

  it("prints help", async () => {
    const t = io();
    expect(await run([], t.x)).toBe(0);
    expect(t.out[0]).toContain("algone set");
    expect(await run(["nonsense"], t.x)).toBe(1);
  });
});
