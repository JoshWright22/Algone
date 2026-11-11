import { defaultRuntime, defaultSettings, emptyHealthyStore, handleRulesFile, type Overlay } from "@algone/core";
import { SITES, siteMap, type SiteRule } from "@algone/rules";
import { describe, expect, it, vi } from "vitest";

vi.mock("@react-native-async-storage/async-storage", () => ({ default: {} }));

import { injectionScript, updateScript } from "../src/injection";
import { buildBoot, buildPayload, offeredKinds } from "../src/pageSite";
import type { Stored } from "../src/store";

const youtube = SITES.find((s) => s.id === "youtube")!;
const NOW = 1_800_000_000_000;

function state(overlay: Overlay | null = null): Stored {
  const settings = defaultSettings(SITES);
  settings.sites.youtube = {
    ...settings.sites.youtube!,
    mode: "tuned",
    tuned: {
      blockKeywords: [],
      blockChannels: [],
      blockTopics: [],
      allowTopics: [],
      hideKinds: ["shorts", "ads", "ADS "],
    },
  };
  return {
    settings,
    runtime: defaultRuntime(),
    queue: [{ id: "q", url: "https://secret.example/queued", title: "queued title", site: "", addedAt: 1 }],
    feeds: {
      sources: [{ id: "s", kind: "rss", url: "https://secret.example/source", title: "t", site: "", failures: 0, nextAt: 0 }],
      items: [],
    },
    rulesOverlay: overlay,
    healthy: { ...emptyHealthyStore(), ratings: { "secret creator": "worse" } },
  };
}

/** A published overlay that tries to put `ads` back, through the real validator. */
function hostileOverlay(rule: SiteRule): Overlay {
  const text = JSON.stringify({
    schema: 1,
    rev: 100,
    sites: {
      [rule.id]: {
        elements: [],
        tuned: { ...rule.tuned, kinds: { ...rule.tuned?.kinds, ads: ":has(.ad)", Ads: ":has(.ad2)", shorts: ":has(.s)" } },
      },
    },
  });
  const { overlay } = handleRulesFile(text, siteMap(), 0, 0, null);
  expect(overlay?.sites[rule.id]?.tuned?.kinds?.ads).toBe(":has(.ad)");
  return overlay!;
}

describe("page payload", () => {
  it("has no ads kind in bundled tuned rules or hideKinds", () => {
    expect(youtube.tuned?.kinds?.ads).toBeTruthy();
    const { site, view } = buildPayload(state(), youtube, NOW);
    expect(Object.keys(site.tuned!.kinds!)).not.toContain("ads");
    expect(view.tuned!.hideKinds).toEqual(["shorts"]);
  });

  it("an overlay cannot restore it", () => {
    const { site } = buildPayload(state(hostileOverlay(youtube)), youtube, NOW);
    expect(Object.keys(site.tuned!.kinds!).map((k) => k.toLowerCase())).not.toContain("ads");
    expect(site.tuned!.kinds!.shorts).toBe(":has(.s)");
  });

  it("every site's payload is ads-free", () => {
    for (const rule of SITES) {
      const json = JSON.stringify(buildPayload(state(hostileOverlay(rule)), rule, NOW).site.tuned?.kinds ?? {});
      expect(json).not.toMatch(/"ads"/i);
    }
  });

  it("Settings never offers ads", () => {
    for (const rule of SITES) expect(offeredKinds(rule)).not.toContain("ads");
  });

  it("holds no queue, sources, or password", () => {
    const s = state();
    s.settings.barrier = { type: "partner", salt: "SALTSALT", hash: "HASHHASH", iterations: 5, recoveryAt: null };
    const text = JSON.stringify(buildBoot(s, youtube, NOW));
    for (const secret of ["secret creator", "secret.example", "queued title", "SALTSALT", "HASHHASH", '"queue"', '"sources"', '"barrier"', '"password"']) {
      expect(text).not.toContain(secret);
    }
    const boot = buildBoot(s, youtube, NOW);
    expect(Object.keys(boot).sort()).toEqual(["css", "hosts", "payload"]);
    expect(Object.keys(boot.payload).sort()).toEqual(["overlayCss", "site", "view"]);
  });

  it("the injected script escapes data so it cannot break out", () => {
    const s = state();
    const boot = buildBoot(s, youtube, NOW);
    boot.css = `</script>${String.fromCharCode(0x2028)}x`;
    const script = injectionScript(boot);
    expect(script).not.toContain("</script>x");
    expect(script).not.toContain(String.fromCharCode(0x2028));
    expect(() => new Function(script)).not.toThrow();
    expect(() => new Function(updateScript(boot.payload))).not.toThrow();
  });

  it("the page script carries engine code only, and speaks only through the bridge", () => {
    const script = injectionScript(buildBoot(state(), youtube, NOW));
    for (const absent of ["addToQueue", "verifyPassword", "pbkdf", "handleRulesFile", "AsyncStorage", "RULES_URL"]) {
      expect(script).not.toContain(absent);
    }
    expect(script).toContain("adoptedStyleSheets");
    expect(script).toContain("createElement(\"style\")");
    // The healthy batch's items reach the app through the same bridge.
    expect(script).toContain("feedItems");
  });
});
