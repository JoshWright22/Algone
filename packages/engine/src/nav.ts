/** Calls back on client-side navigation, and on every batch of DOM changes. */
export function watchPage(onUrl: () => void, onMutations: () => void): () => void {
  let last = location.href;
  const check = () => {
    if (location.href !== last) {
      last = location.href;
      onUrl();
    }
  };
  let queued = false;
  const observer = new MutationObserver(() => {
    check();
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      onMutations();
    });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  const timer = setInterval(() => {
    if (!document.hidden) check();
  }, 250);
  return () => {
    observer.disconnect();
    clearInterval(timer);
  };
}
