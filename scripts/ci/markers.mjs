// The fixed marker the daily check writes into the issues it opens.
export const BOT_LOGIN = "github-actions[bot]";

const MARKER = /<!-- algone:site-check site=([a-z0-9-]+) run=(\d+) -->/;

export const marker = (site, runId) => `<!-- algone:site-check site=${site} run=${runId} -->`;

/** Returns { site, runId } or null. Only the bot's own issues count: anyone can paste a marker. */
export function parseMarker(body, authorLogin) {
  if (authorLogin !== BOT_LOGIN || typeof body !== "string") return null;
  const m = MARKER.exec(body);
  return m ? { site: m[1], runId: m[2] } : null;
}
