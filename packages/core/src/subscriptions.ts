import type { FeedSource } from "./types";

/**
 * Takes the YouTube channels in the Custom feed to apps that show subscriptions without an
 * algorithm: NewPipe on Android (its own JSON) and FreeTube on computers (which imports it
 * too, and OPML). Only the channel list goes; nothing about what was watched.
 */
export interface Channel {
  id: string;
  name: string;
}

const CHANNEL_FEED = /^https:\/\/www\.youtube\.com\/feeds\/videos\.xml\?channel_id=(UC[\w-]{22})$/;

export function youtubeChannels(sources: FeedSource[]): Channel[] {
  const out = new Map<string, Channel>();
  for (const s of sources) {
    const id = CHANNEL_FEED.exec(s.url)?.[1];
    if (id && !out.has(id)) out.set(id, { id, name: s.title && s.title !== s.url ? s.title : id });
  }
  return [...out.values()];
}

/** NewPipe's subscription export format (service 0 is YouTube). */
export function newPipeExport(channels: Channel[]): string {
  return JSON.stringify(
    {
      app_version: "0.27.0",
      app_version_int: 1000,
      subscriptions: channels.map((c) => ({ service_id: 0, url: `https://www.youtube.com/channel/${c.id}`, name: c.name })),
    },
    null,
    2,
  );
}

const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function opmlExport(channels: Channel[]): string {
  const rows = channels.map((c) => {
    const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${c.id}`;
    return `    <outline text="${xml(c.name)}" title="${xml(c.name)}" type="rss" xmlUrl="${url}"/>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<opml version="1.1">\n  <head><title>Algone subscriptions</title></head>\n  <body>\n${rows.join("\n")}\n  </body>\n</opml>\n`;
}
