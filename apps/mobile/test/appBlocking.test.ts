import { applyPatch, defaultSettings } from "@algone/core";
import { SITES } from "@algone/rules";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({ Platform: { OS: "ios" } }));
vi.mock("expo", () => ({ requireOptionalNativeModule: () => null }));
vi.mock("../src/store", () => ({ store: { get: () => ({ settings: defaultSettings(SITES) }), subscribe: () => () => {} } }));

const { rulesJson, startAppBlocking } = await import("../src/appBlocking");
const has = (list: Array<{ packages: string[] }>, pkg: string) => list.some((r) => r.packages.includes(pkg));

describe("app blocking", () => {
  it("sends normal rules, break rules and the break's end, so the service can end a break alone", () => {
    const yt = "com.google.android.youtube";
    const r = JSON.parse(rulesJson(defaultSettings(SITES)));
    expect(r.breakUntil).toBe(0);
    expect(has(r.normal, yt)).toBe(true);
    expect(has(r.onBreak, yt)).toBe(true);
    const off = applyPatch(defaultSettings(SITES), { op: "setApp", platform: "android", app: "youtube", config: { mode: "allow" } });
    expect(has(JSON.parse(rulesJson(off)).normal, yt)).toBe(false);
    const broke = applyPatch(defaultSettings(SITES), { op: "startBreak", until: 1234 });
    expect(JSON.parse(rulesJson(broke)).breakUntil).toBe(1234);
  });
  it("does nothing without the native module", () => {
    expect(() => startAppBlocking()()).not.toThrow();
  });
});
