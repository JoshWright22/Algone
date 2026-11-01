import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

const ASSETS = "store/assets";
const SHOTS = "store/screenshots";

const SIZES: Array<[string, number, number, boolean]> = [
  // file, width, height, must be opaque
  ["chrome/icon-128.png", 128, 128, false],
  ["firefox/icon-128.png", 128, 128, false],
  ["chrome/promo-tile-440x280.png", 440, 280, true],
  ["chrome/marquee-1400x560.png", 1400, 560, true],
  ["edge/logo-300x300.png", 300, 300, false],
  ["edge/tile-440x280.png", 440, 280, true],
  ["edge/tile-1400x560.png", 1400, 560, true],
  ["app-store/icon-1024.png", 1024, 1024, true],
  ["play/icon-512.png", 512, 512, true],
  ["play/feature-graphic-1024x500.png", 1024, 500, true],
];

const STORES = ["chrome", "firefox", "edge", "safari", "browser-ios", "play"];
const EXTENSION_STORES = ["chrome", "firefox", "edge", "safari"];
const MOBILE_STORES = ["browser-ios", "play"];
const FILES = ["listing.md", "checklist.md", "reviewer-notes.md", "permissions.md", "privacy.md"];

const read = (store: string, file: string) => readFileSync(join("store", store, file), "utf8");
const allText = (store: string) => FILES.map((f) => read(store, f)).join("\n");

describe("store images", () => {
  it.each(SIZES)("%s is %i x %i", async (file, width, height, opaque) => {
    const meta = await sharp(join(ASSETS, file)).metadata();
    expect(meta.format).toBe("png");
    expect([meta.width, meta.height]).toEqual([width, height]);
    if (opaque) expect(meta.hasAlpha).toBe(false);
  });

  it("has at least five screenshots, all 1280x800 with no alpha", async () => {
    const shots = readdirSync(SHOTS).filter((f) => f.endsWith(".png"));
    expect(shots.length).toBeGreaterThanOrEqual(5);
    for (const file of shots) {
      const meta = await sharp(join(SHOTS, file)).metadata();
      expect([file, meta.width, meta.height, meta.hasAlpha]).toEqual([file, 1280, 800, false]);
    }
  });

  it.each(["chrome/icon-128.png", "firefox/icon-128.png"])("%s keeps its art inside 16 px of padding", async (file) => {
    const { data, info } = await sharp(join(ASSETS, file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const alpha = (x: number, y: number) => data[(y * info.width + x) * info.channels + 3]!;
    for (const [x, y] of [[0, 0], [127, 0], [0, 127], [127, 127]] as const) expect(alpha(x, y)).toBe(0);
    let touched = 0;
    for (let y = 0; y < 128; y++) {
      for (let x = 0; x < 128; x++) {
        const inside = x >= 16 && x < 112 && y >= 16 && y < 112;
        if (!inside) expect(alpha(x, y), `pixel ${x},${y}`).toBe(0);
        else if (alpha(x, y) > 0) touched++;
      }
    }
    expect(touched).toBeGreaterThan(96 * 96 * 0.8);
    // The art fills the 96 px box: its edges reach each side.
    expect(alpha(64, 16)).toBeGreaterThan(0);
    expect(alpha(16, 64)).toBeGreaterThan(0);
    expect(alpha(111, 64)).toBeGreaterThan(0);
    expect(alpha(64, 111)).toBeGreaterThan(0);
  });
});

describe("store folders", () => {
  it.each(STORES)("%s has every required file", (store) => {
    for (const f of FILES) expect(existsSync(join("store", store, f)), f).toBe(true);
  });

  it.each(STORES)("%s listing states the limits", (store) => {
    const text = read(store, "listing.md").toLowerCase();
    expect(text).toContain("works in the browser only");
    expect(text).toContain("does not change native apps");
    expect(text).toContain("uninstalling always works");
    expect(text).toContain("replace algorithmic feeds with something you control");
  });

  it.each(EXTENSION_STORES.filter((s) => s !== "safari"))("%s listing uses the store name", (store) => {
    expect(read(store, "listing.md")).toContain("Algone: Algorithm Control");
  });

  it.each(STORES)("%s has no banned claims", (store) => {
    const banned = [
      /seamless/i, /effortless/i, /frictionless/i, /\bflawless/i, /\bperfect(ly)?\b/i, /guarantee/i,
      /disable[sd]? (the |all |your )?algorithms?/i, /remove[sd]? (the |all |your )?algorithms?/i,
      /\b(now|already) (available|live) (on|in)\b/i, /live on the/i,
      /can.?t be (removed|uninstalled)/i, /impossible to bypass/i,
    ];
    const text = allText(store);
    for (const re of banned) expect(text, String(re)).not.toMatch(re);
  });

  it.each(STORES)("%s covers the lockout, Non-Trader, the logged-in check, and remote rules", (store) => {
    const notes = read(store, "reviewer-notes.md");
    expect(notes).toContain("Show for 10 minutes");
    expect(notes).toContain("Continue");
    expect(notes).toMatch(/30 seconds?/);
    expect(notes).toContain("Nothing needs an account");
    const checklist = read(store, "checklist.md");
    expect(checklist).toContain("Non-Trader");
    expect(checklist).toContain("check:logged-in");
    expect(read(store, "permissions.md")).toContain("Remote rules disclosure");
    expect(read(store, "permissions.md")).toContain("rules/v1/rules.json");
  });

  it("Firefox declares no data collection and links the review doc", () => {
    expect(allText("firefox")).toContain("data_collection_permissions");
    expect(read("firefox", "reviewer-notes.md")).toContain("docs/firefox-review.md");
    expect(read("firefox", "checklist.md")).toContain("docs/firefox-review.md");
  });

  it("Safari has both packaging routes, the site access step, and no tip link", () => {
    const checklist = read("safari", "checklist.md");
    expect(checklist).toContain("safari-web-extension-packager");
    expect(checklist).toContain("No-Mac route");
    expect(checklist).toContain("Per-site access");
    for (const f of ["listing.md", "reviewer-notes.md"]) expect(read("safari", f)).not.toMatch(/sponsors|ko-fi/i);
  });

  it.each(MOBILE_STORES)("%s records its limits and rejection risks", (store) => {
    const checklist = read(store, "checklist.md");
    for (const phrase of [
      "Apple 5.2.2", "Apple 4.2", "Play Spam", "Device and Network Abuse", "ad filter", "Safari extension is separate",
      "APK", "government ID", "closed test", "Re-read the live", "16+",
    ]) {
      expect(checklist.toLowerCase(), phrase).toContain(phrase.toLowerCase());
    }
  });
});

describe("repo front matter", () => {
  it("has its license and policies", () => {
    expect(readFileSync("LICENSE", "utf8")).toContain("Copyright (c) 2026 Josh Wright");
    expect(readFileSync("LICENSE", "utf8")).toContain("MIT License");
    for (const f of ["README.md", "CONTRIBUTING.md", "SECURITY.md", "THIRD_PARTY_NOTICES.md", "docs/firefox-review.md"]) {
      expect(existsSync(f), f).toBe(true);
    }
  });

  it("README makes no banned claims and states the limits", () => {
    const text = readFileSync("README.md", "utf8");
    expect(text).toContain("assets/icon.svg");
    expect(text.toLowerCase()).toContain("uninstalling always works");
    expect(text).not.toMatch(/seamless|effortless|disable[sd]? (the |all )?algorithms?/i);
  });
});
