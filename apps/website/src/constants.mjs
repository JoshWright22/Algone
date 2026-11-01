// Every outside link the website uses. When a store listing goes live, replace
// its GitHub Releases link below and set `listed: true`; the install page then
// shows it as a store link instead of a pending one.
export const REPO_URL = "https://github.com/JoshWright22/Algone";
export const RELEASES_URL = `${REPO_URL}/releases`;
export const ISSUES_URL = `${REPO_URL}/issues`;
export const REPORT_URL = `${REPO_URL}/issues/new?template=broken-site.yml`;
export const UNINSTALL_FEEDBACK_URL = `${REPO_URL}/issues/new?template=uninstall-feedback.yml`;
export const STATUS_URL = "https://raw.githubusercontent.com/JoshWright22/Algone/site-status/status.json";
export const SPONSOR_URL = "https://github.com/sponsors/JoshWright22";
/** Empty until the owner has a handle. An empty link is not shown. */
export const KOFI_URL = "";

export const STORES = {
  chrome: { url: RELEASES_URL, listed: false },
  edge: { url: RELEASES_URL, listed: false },
  firefox: { url: RELEASES_URL, listed: false },
  safari: { url: RELEASES_URL, listed: false },
  browserAndroid: { url: RELEASES_URL, listed: false },
};
