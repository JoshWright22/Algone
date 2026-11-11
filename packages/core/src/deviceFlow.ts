import type { Fetch } from "./gist";

/**
 * GitHub's device flow: the person opens github.com/login/device, types a short code,
 * and approves. No password ever passes through Algone, and no client secret is needed.
 * https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow
 */
export interface DeviceCode {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  /** Seconds between polls. */
  interval: number;
  expiresAt: number;
}

export type PollResult =
  | { kind: "token"; token: string }
  | { kind: "wait"; interval: number }
  | { kind: "failed"; error: string };

const form = (o: Record<string, string>) => new URLSearchParams(o).toString();

async function post(f: Fetch, url: string, body: Record<string, string>): Promise<any> {
  const res = await f(url, {
    method: "POST",
    credentials: "omit",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: form(body),
  });
  if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
  return res.json();
}

export async function startDeviceFlow(f: Fetch, clientId: string, now: number): Promise<DeviceCode> {
  const r = await post(f, "https://github.com/login/device/code", { client_id: clientId, scope: "gist" });
  if (!r.device_code || !r.user_code) throw new Error(r.error_description ?? "GitHub did not start sign-in");
  const uri = String(r.verification_uri ?? "");
  if (!uri.startsWith("https://github.com/")) throw new Error("Unexpected sign-in address");
  return {
    deviceCode: String(r.device_code),
    userCode: String(r.user_code),
    verificationUri: uri,
    interval: Math.max(5, Number(r.interval) || 5),
    expiresAt: now + (Number(r.expires_in) || 900) * 1000,
  };
}

export async function pollDeviceFlow(f: Fetch, clientId: string, code: DeviceCode): Promise<PollResult> {
  const r = await post(f, "https://github.com/login/oauth/access_token", {
    client_id: clientId,
    device_code: code.deviceCode,
    grant_type: "urn:ietf:params:oauth:grant-type:device_code",
  });
  if (r.access_token) return { kind: "token", token: String(r.access_token) };
  if (r.error === "authorization_pending") return { kind: "wait", interval: code.interval };
  if (r.error === "slow_down") return { kind: "wait", interval: Number(r.interval) || code.interval + 5 };
  if (r.error === "expired_token") return { kind: "failed", error: "The code expired. Start again." };
  if (r.error === "access_denied") return { kind: "failed", error: "Sign-in was cancelled." };
  return { kind: "failed", error: String(r.error_description ?? r.error ?? "Sign-in failed") };
}
