import type { Player } from "@algone/rules";

const watched = new WeakSet<Element>();

/** Calls back when the site's main video ends, ignoring ads. */
export function watchPlayer(player: Player, onEnd: (video: HTMLVideoElement) => void): void {
  let video: Element | null = null;
  try {
    video = document.querySelector(player.selector);
  } catch {
    return;
  }
  if (!(video instanceof HTMLVideoElement) || watched.has(video)) return;
  watched.add(video);
  const v = video;
  v.addEventListener("ended", () => {
    try {
      if (player.adMarker && document.querySelector(player.adMarker)) return;
    } catch {
      // A broken marker should not stop the panel.
    }
    onEnd(v);
  });
}
