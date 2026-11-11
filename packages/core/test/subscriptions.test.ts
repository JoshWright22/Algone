import { describe, expect, it } from "vitest";
import { newPipeExport, opmlExport, youtubeChannels, type FeedSource } from "../src/index";

const src = (url: string, title = ""): FeedSource => ({ id: url, kind: "rss", url, title, site: "custom", failures: 0, nextAt: 0 });
const A = "UCabcdefghijklmnopqrstuv";

describe("subscription export", () => {
  it("keeps YouTube channel feeds only, once each", () => {
    const ch = youtubeChannels([
      src(`https://www.youtube.com/feeds/videos.xml?channel_id=${A}`, "Bakers & Co"),
      src(`https://www.youtube.com/feeds/videos.xml?channel_id=${A}`),
      src("https://www.reddit.com/r/books/.rss"),
      src("https://www.youtube.com/feeds/videos.xml?channel_id=bad"),
    ]);
    expect(ch).toEqual([{ id: A, name: "Bakers & Co" }]);
  });
  it("writes NewPipe's format", () => {
    const j = JSON.parse(newPipeExport([{ id: A, name: "Bakers" }]));
    expect(j.subscriptions).toEqual([{ service_id: 0, url: `https://www.youtube.com/channel/${A}`, name: "Bakers" }]);
    expect(typeof j.app_version_int).toBe("number");
  });
  it("writes OPML with names escaped", () => {
    const o = opmlExport([{ id: A, name: 'Bakers & "Co" <x>' }]);
    expect(o).toContain('text="Bakers &amp; &quot;Co&quot; &lt;x&gt;"');
    expect(o).toContain(`xmlUrl="https://www.youtube.com/feeds/videos.xml?channel_id=${A}"`);
  });
});
