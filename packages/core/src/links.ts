export const WEBSITE_URL = "https://joshwright22.github.io/Algone/";
export const PRIVACY_URL = `${WEBSITE_URL}privacy/`;
export const UNINSTALL_URL = `${WEBSITE_URL}uninstalled/`;
export const REPO_URL = "https://github.com/JoshWright22/Algone";
export const SPONSOR_URL = "https://github.com/sponsors/JoshWright22";
/** Empty until a maintainer has a handle. An empty link is not shown. */
export const KOFI_URL = "";

export function reportUrl(site: string, page: string, version: string): string {
  const q = new URLSearchParams({
    template: "broken-site.yml",
    title: `${site}: something is broken`,
    site,
    page,
    version,
  });
  return `${REPO_URL}/issues/new?${q}`;
}
