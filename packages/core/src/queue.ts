import type { QueueItem } from "./types";

export function safeHttps(url: string): string | null {
  try {
    const u = new URL(url);
    return u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}

/** Adds an item. Saving is never blocked by the soft cap. */
export function addToQueue(
  queue: QueueItem[],
  item: { url: string; title: string; site: string },
  now: number,
): QueueItem[] {
  const url = safeHttps(item.url);
  if (!url || queue.some((q) => q.url === url)) return queue;
  const title = item.title.trim().slice(0, 200) || url;
  return [...queue, { id: `${now}-${queue.length}`, url, title, site: item.site, addedAt: now }];
}

export const removeFromQueue = (queue: QueueItem[], id: string) =>
  queue.filter((q) => q.id !== id);

export function moveInQueue(queue: QueueItem[], id: string, delta: number): QueueItem[] {
  const i = queue.findIndex((q) => q.id === id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= queue.length) return queue;
  const next = [...queue];
  const [item] = next.splice(i, 1);
  next.splice(j, 0, item!);
  return next;
}

/** The first items are a real choice. The rest are one click away. */
export function visibleQueue(queue: QueueItem[], softCap: number, showAll: boolean) {
  return {
    items: showAll ? queue : queue.slice(0, softCap),
    hiddenCount: showAll ? 0 : Math.max(0, queue.length - softCap),
  };
}
