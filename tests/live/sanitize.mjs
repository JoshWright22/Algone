// Reduces a page to structure. All text is dropped, since page text is the main
// prompt-injection channel, and values that look like identifiers are masked.
const SAFE_VALUE = /^[A-Za-z0-9_-]+$/;
const KEEP = ["id", "class", "role", "data-testid", "data-e2e", "data-a-target", "page-subtype",
  "data-test-id", "data-test-selector", "data-view-name", "slot", "componentkey",
  "data-component", "data-timeline-id"];

export function maskValue(value) {
  if (!SAFE_VALUE.test(value)) return null;
  if (value.length > 40 || (value.match(/\d/g) ?? []).length >= 4) return "<id>";
  return value;
}

/** Runs in the browser. Must stay self-contained, so it is passed to page.evaluate. */
export const snapshotInPage = ({ keep, loggedIn }) => {
  const mask = (v) => {
    if (!/^[A-Za-z0-9_-]+$/.test(v)) return null;
    if (v.length > 40 || (v.match(/\d/g) ?? []).length >= 4) return "<id>";
    return v;
  };
  const skip = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "SVG", "PATH", "LINK", "META", "TEMPLATE", "IFRAME"]);
  const walk = (el, depth) => {
    if (skip.has(el.tagName.toUpperCase()) || depth > 40) return null;
    const attrs = {};
    for (const name of keep) {
      if (loggedIn && name === "id") continue;
      const raw = el.getAttribute(name);
      if (raw === null) continue;
      const parts = raw.split(/\s+/).map(mask).filter(Boolean);
      if (parts.length) attrs[name] = parts.slice(0, 12).join(" ");
    }
    const aria = el.getAttributeNames().filter((n) => n.startsWith("aria-"));
    if (aria.length) attrs["aria-names"] = aria.join(" ");
    const href = el.getAttribute("href");
    if (href && href.startsWith("/")) {
      const segs = href.split("?")[0].split("/").filter(Boolean);
      const safe = (loggedIn ? segs.slice(0, 1) : segs).map((s) => mask(s) ?? "<id>");
      attrs.href = `/${safe.join("/")}`;
    }
    const kids = [...el.children].map((c) => walk(c, depth + 1)).filter(Boolean);
    const node = { t: el.tagName.toLowerCase() };
    if (Object.keys(attrs).length) node.a = attrs;
    if (kids.length) node.k = kids.slice(0, 60);
    return node;
  };
  return walk(document.body, 0);
};

export const KEEP_ATTRS = KEEP;

/** Turns a snapshot back into inert HTML, for fixtures. */
export function toHtml(node) {
  const esc = (s) => String(s).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
  const attrs = Object.entries(node.a ?? {})
    .filter(([k]) => k !== "aria-names")
    .map(([k, v]) => ` ${k}="${esc(v)}"`)
    .join("");
  const kids = (node.k ?? []).map(toHtml).join("");
  const voids = new Set(["input", "img", "br", "hr"]);
  if (voids.has(node.t)) return `<${node.t}${attrs}>`;
  return `<${node.t}${attrs}>${kids}</${node.t}>`;
}
