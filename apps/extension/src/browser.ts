/** Chrome, Edge, Firefox, and Safari all expose `chrome.*`. */
export const api = chrome;

declare global {
  const SHOW_TIPS: boolean;
  const REMOTE_RULES: boolean;
  const TEST_HOOKS: boolean;
  const BUILD_REV: number;
  const BUILD_TARGET: string;
}

export function now(): number {
  if (TEST_HOOKS) {
    const shift = (globalThis as { __algoneClockShift?: number }).__algoneClockShift;
    if (shift) return Date.now() + shift;
  }
  return Date.now();
}
