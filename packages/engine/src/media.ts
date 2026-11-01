/** `display: none` does not stop a video. Pause any video inside something Algone hid. */
export function pauseHiddenMedia(active: boolean): void {
  if (!active) return;
  for (const video of document.querySelectorAll("video")) {
    if (video.paused && video.muted) continue;
    // getComputedStyle reports the element's own display, so hidden ancestors need this.
    if (video.getClientRects().length === 0 && document.documentElement.contains(video)) {
      if (!video.closest("[data-algone-panel]")) {
        video.muted = true;
        video.pause();
      }
    }
  }
}
