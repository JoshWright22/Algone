// Decisions for the rules publishing guard. Pure: guard-rules.mjs does the I/O.

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

/** Returns the published file, or null when the text cannot be trusted as one. */
export function parsePublished(text) {
  try {
    const file = JSON.parse(text);
    return file && file.sites && typeof file.sites === "object" && !Array.isArray(file.sites) ? file : null;
  } catch {
    return null;
  }
}

export function changedSites(previous, next) {
  const old = previous?.sites ?? {};
  return Object.keys(next.sites).filter((id) => !(id in old) || canonical(old[id]) !== canonical(next.sites[id]));
}

/**
 * Keeps the previous entry for a changed site that came back broken.
 * A new site has no previous entry, so it stays out of the file until it passes.
 * Inconclusive publishes: a wall says nothing about the change.
 */
export function applyGuard(previous, next, outcomes) {
  const sites = { ...next.sites };
  const kept = [];
  const withheld = [];
  for (const [id, outcome] of Object.entries(outcomes)) {
    if (outcome !== "broken") continue;
    if (previous?.sites?.[id]) {
      sites[id] = previous.sites[id];
      kept.push(id);
    } else {
      delete sites[id];
      withheld.push(id);
    }
  }
  return { rules: { ...next, sites }, kept, withheld };
}
