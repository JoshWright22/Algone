import { describe, expect, it } from "vitest";
import { APPS, validateApp } from "../src/index";

describe("native-app rules", () => {
  it.each(APPS.map((a) => [a.id, a] as const))("%s is valid", (_id, app) => {
    expect(validateApp(app)).toEqual([]);
  });
  it("rejects broken rules", () => {
    const bad = { ...APPS[0]!, packages: ["not a package"], screens: [{ id: "x", label: "x", kind: "feed", action: "back", match: {} }] };
    expect(validateApp(bad as never).length).toBeGreaterThan(1);
  });
  it("never claims a check that did not run", () => {
    for (const a of APPS) expect(a.verified.method).toBe("unverified");
  });
});
