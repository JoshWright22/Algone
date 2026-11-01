export const INJECTION_TIMEOUT_MS = 3000;

/** Fails open: a page that never confirms stays usable, and the app says so. */
export function injectionWatchdog(onTimeout: () => void, ms = INJECTION_TIMEOUT_MS) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cancel = () => clearTimeout(timer);
  return {
    start() {
      cancel();
      timer = setTimeout(onTimeout, ms);
    },
    cancel,
  };
}
