/**
 * Tuya OpenAPI signing + fetch helper. SERVER ONLY.
 * Referenced from src/lib/tuya/api.functions.ts inside createServerFn handlers.
 *
 * Signing: https://developer.tuya.com/en/docs/iot/new-signature
 *   sign = HMAC-SHA256(access_id + [access_token] + t + nonce + stringToSign, secret).toUpperCase()
 *   stringToSign = method + "\n" + sha256Hex(body) + "\n" + signHeadersStr + "\n" + urlPathWithQuery
 */
import { createHash, createHmac } from "node:crypto";

const BASE_URL = process.env.TUYA_BASE_URL || "https://openapi.tuyaus.com";
const FETCH_TIMEOUT_MS = 15_000;

type TokenCache = { token: string; expiresAt: number } | null;
let tokenCache: TokenCache = null;
/** Dedup concurrent token-fetch requests so only one hits the wire. */
let tokenPromise: Promise<string> | null = null;

function sha256Hex(input: string) {
  return createHash("sha256").update(input, "utf8").digest("hex");
}
function hmacHex(input: string, secret: string) {
  return createHmac("sha256", secret).update(input, "utf8").digest("hex").toUpperCase();
}

/** Thin wrapper around fetch that bombs out after FETCH_TIMEOUT_MS. */
function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
}

function credentials() {
  const accessId = process.env.TUYA_ACCESS_ID;
  const accessSecret = process.env.TUYA_ACCESS_SECRET;
  const deviceId = process.env.TUYA_DEVICE_ID;
  if (!accessId || !accessSecret || !deviceId) {
    throw new Error("TUYA_ACCESS_ID / TUYA_ACCESS_SECRET / TUYA_DEVICE_ID ยังไม่ได้ตั้งค่า");
  }
  return { accessId, accessSecret, deviceId };
}

function buildSign(
  accessId: string,
  accessSecret: string,
  accessToken: string,
  method: string,
  urlPath: string,
  body: string,
  t: string,
) {
  const contentHash = sha256Hex(body);
  const stringToSign = `${method}\n${contentHash}\n\n${urlPath}`;
  const signStr = `${accessId}${accessToken}${t}${stringToSign}`;
  return hmacHex(signStr, accessSecret);
}

async function getAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.token;
  }

  if (!tokenPromise) {
    tokenPromise = (async () => {
      try {
        const { accessId, accessSecret } = credentials();
        const path = "/v1.0/token?grant_type=1";
        const t = Date.now().toString();
        const sign = buildSign(accessId, accessSecret, "", "GET", path, "", t);
        const res = await fetchWithTimeout(`${BASE_URL}${path}`, {
          method: "GET",
          headers: {
            client_id: accessId,
            sign,
            t,
            sign_method: "HMAC-SHA256",
            "Content-Type": "application/json",
          },
        });
        const json = (await res.json()) as {
          success: boolean;
          msg?: string;
          code?: number;
          result?: { access_token: string; expire_time: number };
        };
        if (!json.success || !json.result) {
          throw new Error(`Tuya token ล้มเหลว: ${json.msg || json.code || res.status}`);
        }
        tokenCache = {
          token: json.result.access_token,
          expiresAt: Date.now() + json.result.expire_time * 1000,
        };
        return tokenCache.token;
      } finally {
        tokenPromise = null;
      }
    })();
  }

  return tokenPromise;
}

export async function tuyaRequest<T = unknown>(
  path: string,
  init: { method?: "GET" | "POST" | "PUT" | "DELETE"; body?: unknown } = {},
): Promise<T> {
  const { accessId, accessSecret } = credentials();
  const method = init.method || "GET";
  const bodyStr = init.body === undefined ? "" : JSON.stringify(init.body);
  const token = await getAccessToken();
  const t = Date.now().toString();
  const sign = buildSign(accessId, accessSecret, token, method, path, bodyStr, t);

  const res = await fetchWithTimeout(`${BASE_URL}${path}`, {
    method,
    headers: {
      client_id: accessId,
      access_token: token,
      sign,
      t,
      sign_method: "HMAC-SHA256",
      "Content-Type": "application/json",
    },
    body: bodyStr || undefined,
  });
  const json = (await res.json()) as {
    success?: boolean;
    msg?: string;
    code?: number;
    result?: T;
  };
  if (json.success === false) {
    // Auth error → drop cached token so next call re-issues.
    if (json.code === 1010 || json.code === 1011 || json.code === 1012) tokenCache = null;
    throw new Error(`Tuya API ${path} ล้มเหลว: ${json.msg || json.code}`);
  }
  return json.result as T;
}

export function getDeviceId() {
  return credentials().deviceId;
}
