/** When the "feed returns soon" style notice appears: 60 s before, or halfway if shorter. */
export function warnTime(until: number, snoozeMinutes: number): number {
  const lead = Math.min(60_000, (snoozeMinutes * 60_000) / 2);
  return until - lead;
}
