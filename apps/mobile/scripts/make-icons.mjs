// Writes the app icons from assets/icon.svg, using sharp from the repo root node_modules.
// Run with `npm run icons` after changing the mark. The PNGs are committed.
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sharp = createRequire(resolve(app, "../../package.json"))("sharp");
const svg = readFileSync(resolve(app, "../../assets/icon.svg"), "utf8");
const SIZE = 1024;
const INK = "#14141c";

// iOS rejects alpha, and rounds the corners itself, so the square goes edge to edge.
const square = svg.replace('rx="22"', 'rx="0"').replace(/<rect x="\.75"[^>]*\/>\n?/, "");
// Android masks the foreground to the middle 66%, so only the strokes stay, scaled to fit.
const strokes = svg.replace(/<rect[^>]*\/>\n?/g, "");

mkdirSync(resolve(app, "assets"), { recursive: true });
await sharp(Buffer.from(square), { density: 1200 })
  .resize(SIZE, SIZE)
  .flatten({ background: INK })
  .removeAlpha()
  .png()
  .toFile(resolve(app, "assets/icon.png"));

const art = await sharp(Buffer.from(strokes), { density: 1200 })
  .resize(Math.round(SIZE * 0.62), Math.round(SIZE * 0.62))
  .png()
  .toBuffer();
await sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: art }])
  .png()
  .toFile(resolve(app, "assets/adaptive-foreground.png"));
console.log("mobile icons written");
