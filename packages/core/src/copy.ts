/** Fixed statements of limits. A test checks these stay present in the product. */
export const COPY = {
  uninstall:
    "You can always uninstall Algone. These barriers are there to interrupt autopilot, not to trap you.",
  bypass:
    "Changing your system clock, using another browser, or using a private window where Algone is not allowed also gets around them.",
  browserOnly:
    "Algone works in the browser. It does not change the YouTube, Instagram, or TikTok apps, so open these sites in your browser.",
  likelyAi:
    "Likely AI is a text match on phrases such as “AI generated”. It will miss some and wrongly catch some.",
  capture:
    "Algone only knows what your browser has shown on this page. Nothing is sent anywhere.",
  privacy:
    "Your settings stay on this device. Algone has no account and collects no data.",
  rules:
    "Once a day Algone downloads updated site rules from GitHub. The file is data, not code, and the request carries no identifier. GitHub sees your IP address, as with any web request.",
  wikipedia:
    "This asks Wikipedia for a random article summary. Wikipedia sees your IP address. Nothing else is sent.",
} as const;
