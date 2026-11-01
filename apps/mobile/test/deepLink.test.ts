import { describe, expect, it } from "vitest";
import { parseSaveLink, parseSharedText } from "../src/deepLink";

describe("deep links", () => {
  it("accepts https targets", () => {
    expect(parseSaveLink("algone://save?url=https%3A%2F%2Fexample.com%2Fa")).toBe("https://example.com/a");
    expect(parseSaveLink("algone://save/?url=https://example.com/")).toBe("https://example.com/");
  });

  it("rejects everything else", () => {
    for (const link of [
      "algone://save?url=http%3A%2F%2Fexample.com",
      "algone://save?url=javascript%3Aalert(1)",
      "algone://save?url=file%3A%2F%2F%2Fetc%2Fhosts",
      "algone://save?url=data%3Atext%2Fhtml%2Chi",
      "algone://save?url=algone%3A%2F%2Fsave",
      "algone://save",
      "algone://save?url=",
      "algone://save?url=not-a-url",
      "algone://other?url=https%3A%2F%2Fexample.com",
      "algone://save/extra?url=https%3A%2F%2Fexample.com",
      "algone://save?url=https%3A%2F%2Fa.example&url=https%3A%2F%2Fb.example",
      "https://save?url=https%3A%2F%2Fexample.com",
      `algone://save?url=https%3A%2F%2Fexample.com%2F${"a".repeat(3000)}`,
      "garbage",
      "",
    ]) {
      expect(parseSaveLink(link)).toBeNull();
    }
  });

  it("finds the https URL in shared text, and no other kind", () => {
    expect(parseSharedText("look at https://example.com/x now")).toBe("https://example.com/x");
    expect(parseSharedText("https://example.com/x")).toBe("https://example.com/x");
    expect(parseSharedText("http://example.com/x")).toBeNull();
    expect(parseSharedText("javascript:alert(1)")).toBeNull();
    expect(parseSharedText(null)).toBeNull();
  });
});
