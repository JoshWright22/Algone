// Prints release notes to stdout, or the Firefox review list with --firefox-review.
import { FIREFOX_REVIEW, renderNotes } from "./release-core.mjs";

if (process.argv.includes("--firefox-review")) {
  console.log(FIREFOX_REVIEW);
} else {
  console.log(
    renderNotes({
      channel: process.env.CHANNEL,
      version: process.env.VERSION,
      manifestVersion: process.env.MANIFEST_VERSION,
      promotedFrom: process.env.PROMOTED_FROM,
      apkState: process.env.APK_STATE,
    }),
  );
}
