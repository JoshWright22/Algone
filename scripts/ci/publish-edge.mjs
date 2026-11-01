// Uploads and submits a zip through the Edge Add-ons API v1.1. Usage: publish-edge.mjs <zip> <notes>
import { readFileSync } from "node:fs";
import { edgeOperationId } from "./publish-core.mjs";

const { EDGE_CLIENT_ID: client, EDGE_API_KEY: key, EDGE_PRODUCT_ID: product } = process.env;
const base = `https://api.addons.microsoftedge.microsoft.com/v1/products/${product}/submissions`;
const headers = { authorization: `ApiKey ${key}`, "x-clientid": client };

async function start(url, init) {
  const res = await fetch(url, { method: "POST", ...init, headers: { ...headers, ...init.headers } });
  if (res.status !== 202) throw new Error(`${url}: HTTP ${res.status} ${(await res.text()).slice(0, 400)}`);
  return edgeOperationId(res.headers.get("location"));
}

async function wait(url) {
  for (let i = 0; i < 40; i += 1) {
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
    const body = await res.json();
    if (body.status === "Succeeded") return;
    if (body.status !== "InProgress") throw new Error(`Operation ended: ${JSON.stringify(body).slice(0, 400)}`);
    await new Promise((r) => setTimeout(r, 15_000));
  }
  throw new Error(`Timed out on ${url}`);
}

const upload = await start(`${base}/draft/package`, {
  body: readFileSync(process.argv[2]),
  headers: { "content-type": "application/zip" },
});
await wait(`${base}/draft/package/operations/${upload}`);
const publish = await start(base, {
  body: JSON.stringify({ notes: process.argv[3] ?? "Automated release" }),
  headers: { "content-type": "application/json" },
});
await wait(`${base}/operations/${publish}`);
console.log("Submitted to Edge Add-ons.");
