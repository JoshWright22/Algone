import { safeHttps } from "@algone/core";

const MAX_URL = 2048;

/** Validates `algone://save?url=`. Returns the https URL to store as text, or null. */
export function parseSaveLink(link: string): string | null {
  let u: URL;
  try {
    u = new URL(link);
  } catch {
    return null;
  }
  if (u.protocol !== "algone:" || u.hostname !== "save" || !["", "/"].includes(u.pathname)) return null;
  const urls = u.searchParams.getAll("url");
  return urls.length === 1 ? validSaved(urls[0]!) : null;
}

function validSaved(url: string): string | null {
  return url.length > MAX_URL ? null : safeHttps(url);
}

/** Shared text may be a bare URL or a sentence with one in it. */
export function parseSharedText(text: string | null | undefined): string | null {
  const match = /https:\/\/\S+/i.exec(text ?? "");
  return match ? validSaved(match[0]) : null;
}
