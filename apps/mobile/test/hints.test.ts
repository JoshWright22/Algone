import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { FEED_CHUNK, handleMessage, parseHint, type HintTargets } from "../src/hints";
import { injectionWatchdog } from "../src/watchdog";

const GOOD = "https://www.youtube.com/watch?v=1";
const targets = (): HintTargets & Record<string, ReturnType<typeof vi.fn>> => ({
  injectionConfirmed: vi.fn(),
  routeChanged: vi.fn(),
  showEndSheet: vi.fn(),
  feedItems: vi.fn(),
});

describe("hints", () => {
  it("accepts the three hints from an allow-listed page", () => {
    expect(parseHint('{"type":"injectionOk"}', GOOD)).toEqual({ type: "injectionOk" });
    expect(parseHint('{"type":"videoEnded"}', GOOD)).toEqual({ type: "videoEnded" });
    expect(parseHint('{"type":"route","path":"/feed"}', GOOD)).toEqual({ type: "route", path: "/feed" });
  });

  it("rejects senders outside the allow-list", () => {
    for (const url of ["https://evil.example/", "http://www.youtube.com/", "https://www.youtube.com.evil.example/", ""]) {
      expect(parseHint('{"type":"injectionOk"}', url)).toBeNull();
    }
  });

  it("rejects anything else, and drops extra fields", () => {
    for (const data of [
      "nonsense", "null", "[]", "1", 7, undefined,
      '{"type":"save","url":"https://evil.example"}',
      '{"type":"route"}',
      '{"type":"route","path":"https://evil.example"}',
      '{"type":"route","path":7}',
      JSON.stringify({ type: "route", path: `/${"a".repeat(5000)}` }),
    ]) {
      expect(parseHint(data, GOOD)).toBeNull();
    }
    expect(parseHint('{"type":"videoEnded","url":"https://evil.example"}', GOOD)).toEqual({ type: "videoEnded" });
  });

  it("a videoEnded hint only shows the sheet, and only when stop at end is on", () => {
    const t = targets();
    handleMessage('{"type":"videoEnded"}', GOOD, { stopAtEnd: false }, t);
    expect(t.showEndSheet).not.toHaveBeenCalled();
    handleMessage('{"type":"videoEnded"}', GOOD, { stopAtEnd: true }, t);
    expect(t.showEndSheet).toHaveBeenCalledTimes(1);
    expect(t.routeChanged).not.toHaveBeenCalled();
  });

  it("passes feed items through only in their exact shape and size", () => {
    const item = { title: "A video", channel: "Someone", url: "https://www.youtube.com/watch?v=2" };
    const t = targets();
    handleMessage(JSON.stringify({ type: "feedItems", items: [{ ...item, extra: 1 }] }), GOOD, { stopAtEnd: false }, t);
    expect(t.feedItems).toHaveBeenCalledWith([item]);
    for (const items of [
      [],
      "x",
      Array.from({ length: FEED_CHUNK + 1 }, () => item),
      [{ ...item, title: "" }],
      [{ ...item, title: "t".repeat(201) }],
      [{ ...item, channel: 7 }],
      [{ ...item, url: "https://www.youtube.com/" + "a".repeat(2048) }],
      [null],
    ]) {
      expect(parseHint(JSON.stringify({ type: "feedItems", items }), GOOD)).toBeNull();
    }
    expect(parseHint(JSON.stringify({ type: "feedItems", items: [item] }), "https://evil.example/")).toBeNull();
  });

  it("forged messages reach nothing", () => {
    const t = targets();
    handleMessage('{"type":"openUrl","url":"https://evil.example"}', GOOD, { stopAtEnd: true }, t);
    handleMessage('{"type":"videoEnded"}', "https://evil.example/", { stopAtEnd: true }, t);
    for (const fn of Object.values(t)) expect(fn).not.toHaveBeenCalled();
  });

  it("the hint module has no way to write state or open a URL", () => {
    const source = readFileSync(join(__dirname, "../src/hints.ts"), "utf8");
    expect(source).not.toMatch(/from "\.\/store"|from "react-native"|Linking|openUrl/);
  });
});

describe("injection watchdog", () => {
  it("reports after 3 seconds without confirmation", () => {
    vi.useFakeTimers();
    const onTimeout = vi.fn();
    const w = injectionWatchdog(onTimeout);
    w.start();
    vi.advanceTimersByTime(2999);
    expect(onTimeout).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onTimeout).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("stays quiet once confirmed, and restarts on a new load", () => {
    vi.useFakeTimers();
    const onTimeout = vi.fn();
    const w = injectionWatchdog(onTimeout);
    w.start();
    vi.advanceTimersByTime(2000);
    w.cancel();
    vi.advanceTimersByTime(5000);
    expect(onTimeout).not.toHaveBeenCalled();
    w.start();
    vi.advanceTimersByTime(2000);
    w.start();
    vi.advanceTimersByTime(2999);
    expect(onTimeout).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
