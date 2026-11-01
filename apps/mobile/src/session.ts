// In memory, so it ends with the app session. A yes/no per site: no time is stored or
// compared, which is how this pause stays distinct from timestamp-based interventions.
// See D-24 and the patent note in the spec.
const seen = new Set<string>();

export const launchPauseSeen = (site: string) => seen.has(site);
export const markLaunchPauseSeen = (site: string) => void seen.add(site);
