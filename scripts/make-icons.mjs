// Store icons follow the Chrome rule: 128 px canvas, 96 px art, 16 px transparent padding.
import { mkdirSync, readFileSync } from "node:fs";
import sharp from "sharp";

const svg = readFileSync("assets/icon.svg");
const art = (size) => sharp(svg, { density: 900 }).resize(size, size).png().toBuffer();

async function padded(size, file) {
  const inner = Math.round((size * 96) / 128);
  await sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: await art(inner) }])
    .png()
    .toFile(file);
}

mkdirSync("apps/extension/public/icons", { recursive: true });
for (const size of [16, 32, 48]) {
  await sharp(await art(size)).toFile(`apps/extension/public/icons/icon-${size}.png`);
}
await padded(128, "apps/extension/public/icons/icon-128.png");
console.log("icons written");
