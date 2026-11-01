// Uploads and submits a zip through the Chrome Web Store API v2. Usage: publish-chrome.mjs <zip>
import { readFileSync } from "node:fs";
import { accessToken } from "./google-token.mjs";
import { chromeUploadState } from "./publish-core.mjs";

const { CWS_SA_KEY_JSON, CWS_PUBLISHER_ID: publisher, CWS_EXTENSION_ID: extension } = process.env;
const zip = readFileSync(process.argv[2]);
const token = await accessToken(CWS_SA_KEY_JSON, "https://www.googleapis.com/auth/chromewebstore");
const item = `publishers/${publisher}/items/${extension}`;
const base = "https://chromewebstore.googleapis.com";

async function call(url, init = {}) {
  const res = await fetch(url, { ...init, headers: { authorization: `Bearer ${token}`, ...init.headers } });
  const text = await res.text();
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status} ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : {};
}

let state = chromeUploadState(await call(`${base}/upload/v2/${item}:upload`, { method: "POST", body: zip }));
for (let i = 0; state === "UPLOAD_IN_PROGRESS" && i < 40; i += 1) {
  await new Promise((r) => setTimeout(r, 15_000));
  state = chromeUploadState(await call(`${base}/v2/${item}:fetchStatus`));
}
console.log(`Upload state: ${state}`);
if (state !== "SUCCEEDED") throw new Error(`Upload ended in ${state}`);
console.log(await call(`${base}/v2/${item}:publish`, { method: "POST", headers: { "content-length": "0" } }));
