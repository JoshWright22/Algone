import { createVerify, generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { signedJwt } from "./google-token.mjs";
import { applyGuard, changedSites, parsePublished } from "./guard-rules-core.mjs";
import { chromeUploadState, edgeOperationId } from "./publish-core.mjs";

describe("rules guard", () => {
  const a = { elements: [{ id: "h", selectors: ["a"] }], slot: { selector: "s", fallback: "fixed" } };
  const b = { elements: [{ id: "h", selectors: ["b"] }] };
  const file = (sites, rev = 1) => ({ schema: 1, rev, sites });

  it("parses only a rules file", () => {
    expect(parsePublished('{"sites":{}}')).toEqual({ sites: {} });
    for (const t of ["nope", "null", "[]", '{"sites":[]}']) expect(parsePublished(t)).toBeNull();
  });
  it("finds changes regardless of key order or rev", () => {
    const reordered = { slot: { fallback: "fixed", selector: "s" }, elements: a.elements };
    expect(changedSites(file({ x: a }, 1), file({ x: reordered }, 2))).toEqual([]);
    expect(changedSites(file({ x: a, y: b }), file({ x: b, y: b }))).toEqual(["x"]);
  });
  it("treats new sites and a missing file as changed", () => {
    expect(changedSites(file({ x: a }), file({ x: a, y: b }))).toEqual(["y"]);
    expect(changedSites(null, file({ x: a }))).toEqual(["x"]);
  });
  it("keeps the previous entry only for a broken site", () => {
    const r = applyGuard(file({ x: a, y: a, z: a }, 1), file({ x: b, y: b, z: b }, 2), {
      x: "broken",
      y: "pass",
      z: "inconclusive",
    });
    expect(r.kept).toEqual(["x"]);
    expect(r.rules).toEqual(file({ x: a, y: b, z: b }, 2));
  });
  it("leaves out a broken new site", () => {
    expect(applyGuard(file({}), file({ x: a }), { x: "broken" })).toMatchObject({
      withheld: ["x"],
      rules: { sites: {} },
    });
  });
});

describe("store helpers", () => {
  it("reads Chrome upload state", () => {
    expect(chromeUploadState({ uploadState: "SUCCEEDED" })).toBe("SUCCEEDED");
    expect(chromeUploadState({ lastAsyncUploadState: "FAILED" })).toBe("FAILED");
    expect(chromeUploadState(null)).toBe("UNKNOWN");
  });
  it("reads the Edge operation ID", () => {
    expect(edgeOperationId("abc-1")).toBe("abc-1");
    expect(edgeOperationId("/v1/products/p/submissions/operations/abc-1")).toBe("abc-1");
    expect(() => edgeOperationId(null)).toThrow();
  });
  it("signs a Google JWT that verifies", () => {
    const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const key = { client_email: "a@b", private_key: privateKey.export({ type: "pkcs8", format: "pem" }) };
    const [h, c, s] = signedJwt(key, "scope", 1000).split(".");
    expect(JSON.parse(Buffer.from(c, "base64url"))).toMatchObject({ iss: "a@b", scope: "scope", exp: 4600 });
    expect(createVerify("RSA-SHA256").update(`${h}.${c}`).verify(publicKey, s, "base64url")).toBe(true);
  });
});
