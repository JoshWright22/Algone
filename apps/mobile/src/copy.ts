/** App-only text. Shared statements of limits stay in COPY in packages/core. */
export const MOBILE_COPY = {
  inAppBrowser: "Algone works in this app's browser.",
  youtubeSignIn:
    "YouTube sign-in may not work here, because Google blocks sign-in in embedded web views.",
  notFiltering: "Filtering is not active on this page.",
  launchPause: "What did you come here to do?",
  healthyNote: (site: string) =>
    `Picked from what ${site} already loaded, without outrage, clickbait and doom where the words give it away. It misses some and wrongly catches some.`,
} as const;
