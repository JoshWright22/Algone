const KEY = "algone-launch-passed";

/**
 * A yes/no flag for this tab session. No time is stored or compared, which is how this
 * pause stays distinct from timestamp-based interventions. See the patent note in the spec.
 */
export const launchPassed = () => sessionStorage.getItem(KEY) === "1";
export const markLaunchPassed = () => sessionStorage.setItem(KEY, "1");
