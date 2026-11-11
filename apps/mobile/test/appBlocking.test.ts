import { applyPatch, defaultSettings } from "@algone/core";
import { SITES } from "@algone/rules";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({ Platform: { OS: "ios" } }));
vi.mock("expo", () => ({ requireOptionalNativeModule: () => null }));
vi.mock("../src/store", () => ({ store: { get: () => ({ settings: defaultSettings(SITES) }), subscribe: () => () => {} } }));

const { rulesJson, startAppBlocking } = await import("../src/appBlocking");

describe("app blocking", () => {
  it("sends the service the rules this device's settings switch on", () => {
    const rules = JSON.parse(rulesJson(defaultSettings(SITES), 0));
    expect(rules.some((r: { packages: string[] }) => r.packages.includes("com.google.android.youtube"))).toBe(true);
    const off = applyPatch(defaultSettings(SITES), { op: "setApp", platform: "android", app: "youtube", config: { mode: "allow" } });
    expect(JSON.parse(rulesJson(off, 0)).some((r: { packages: string[] }) => r.packages.includes("com.google.android.youtube"))).toBe(false);
  });
  it("does nothing without the native module", () => {
    expect(() => startAppBlocking()()).not.toThrow();
  });
});
