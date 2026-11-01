// Exchanges a service account key for an access token, using a signed JWT.
// This route needs no extra IAM setup and no third-party action.
import { createSign } from "node:crypto";

const b64url = (v) => Buffer.from(v).toString("base64url");

export function signedJwt(key, scope, nowSeconds) {
  const claims = {
    iss: key.client_email,
    scope,
    aud: key.token_uri ?? "https://oauth2.googleapis.com/token",
    iat: nowSeconds,
    exp: nowSeconds + 3600,
  };
  const body = `${b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64url(JSON.stringify(claims))}`;
  return `${body}.${createSign("RSA-SHA256").update(body).sign(key.private_key, "base64url")}`;
}

export async function accessToken(keyJson, scope) {
  const key = JSON.parse(keyJson);
  const res = await fetch(key.token_uri ?? "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: signedJwt(key, scope, Math.floor(Date.now() / 1000)),
    }),
  });
  if (!res.ok) throw new Error(`Google token: HTTP ${res.status}`);
  return (await res.json()).access_token;
}
