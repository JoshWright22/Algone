import { SITES } from "@algone/rules";
import { describe, expect, it } from "vitest";
import { decide, homeUrl, isAllowedUrl, searchUrlFor } from "../src/navigationPolicy";

const youtube = SITES.find((s) => s.id === "youtube")!;

describe("navigation policy", () => {
  it("allows https on every site's hosts and auxHosts, in that site's web view", () => {
    expect(SITES).toHaveLength(12);
    for (const site of SITES) {
      for (const host of [...site.hosts, ...(site.auxHosts ?? [])]) {
        expect(decide(`https://${host}/a?b=1`, site.id, true)).toEqual({ action: "allow" });
      }
    }
  });

  it("reopens another supported site instead of loading it under the wrong script", () => {
    expect(decide("https://www.reddit.com/r/a", "youtube", true)).toEqual({
      action: "switchSite",
      site: "reddit",
      url: "https://www.reddit.com/r/a",
    });
  });

  it("sends other web addresses to the system browser", () => {
    for (const url of ["https://example.com/", "http://www.youtube.com/", "https://accounts.google.com/signin"]) {
      expect(decide(url, "youtube", true)).toEqual({ action: "external", url });
    }
  });

  it("is not fooled by lookalike hosts", () => {
    for (const url of [
      "https://www.youtube.com@evil.example/",
      "https://www.youtube.com.evil.example/",
      "https://evil.example/www.youtube.com",
      "https://notx.com/",
      "https://www.youtube.com:443.evil.example/",
    ]) {
      const d = decide(url, "youtube", true);
      expect(["external", "deny"]).toContain(d.action);
      expect(isAllowedUrl(url)).toBe(false);
    }
  });

  it("never hands other schemes to the OS", () => {
    for (const url of [
      "algone://save?url=https://example.com",
      "intent://x#Intent;scheme=https;end",
      "javascript:alert(1)",
      "file:///etc/hosts",
      "data:text/html,hi",
      "blob:https://www.youtube.com/1",
      "about:blank",
      "tel:123",
      "vnd.youtube://x",
      "not a url",
    ]) {
      expect(decide(url, "youtube", true)).toEqual({ action: "deny" });
    }
  });

  it("lets embeds load without ever opening the system browser", () => {
    expect(decide("https://ads.example/frame", "youtube", false)).toEqual({ action: "allow" });
    expect(decide("about:srcdoc", "youtube", false)).toEqual({ action: "allow" });
    for (const url of ["http://x.example/", "algone://save?url=https://a.example", "intent://x"]) {
      expect(decide(url, "youtube", false)).toEqual({ action: "deny" });
    }
  });

  it("builds home and search addresses on an allowed host", () => {
    expect(isAllowedUrl(homeUrl(youtube))).toBe(true);
    const url = searchUrlFor(youtube, " a&b=c ")!;
    expect(url).toBe("https://www.youtube.com/results?search_query=a%26b%3Dc");
    expect(isAllowedUrl(url)).toBe(true);
    expect(searchUrlFor(youtube, "  ")).toBeNull();
  });
});
