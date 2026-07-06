import { createHash, createHmac } from "node:crypto";

const BASE_URL = process.env.TUYA_BASE_URL || "https://openapi.tuyaus.com";
const FETCH_TIMEOUT_MS = 15_000;
const TUYA_MOCK_MODE = process.env.TUYA_MOCK_MODE === "1";

type TokenCache = { token: string; expiresAt: number } | null;
let tokenCache: TokenCache = null;
/** Dedup concurrent token-fetch requests so only one hits the wire. */
let tokenPromise: Promise<string> | null = null;

type TuyaResponse<T> = {
  success?: boolean;
  msg?: string;
  code?: number;
  result?: T;
};

export class TuyaRequestError extends Error {
  constructor(
    message: string,
    public readonly path: string,
    public readonly status?: number,
    public readonly code?: number,
  ) {
    super(message);
    this.name = "TuyaRequestError";
  }
}

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

export function isTuyaMockMode() {
  return TUYA_MOCK_MODE;
}

export function hasTuyaCredentials() {
  return Boolean(
    process.env.TUYA_ACCESS_ID && process.env.TUYA_ACCESS_SECRET && process.env.TUYA_DEVICE_ID,
  );
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
  nonce = "",
) {
  const contentHash = sha256Hex(body);
  const stringToSign = `${method}\n${contentHash}\n\n${urlPath}`;
  const signStr = `${accessId}${accessToken}${t}${nonce}${stringToSign}`;
  return hmacHex(signStr, accessSecret);
}

async function readResponseBody<T>(res: Response): Promise<{
  bodyText: string;
  bodyJson?: TuyaResponse<T>;
}> {
  const bodyText = await res.text();
  if (!bodyText) return { bodyText };

  try {
    return { bodyText, bodyJson: JSON.parse(bodyText) as TuyaResponse<T> };
  } catch {
    return { bodyText };
  }
}

function formatSnippet(bodyText: string) {
  const cleaned = bodyText.trim().replace(/\s+/g, " ");
  if (!cleaned) return "";
  return cleaned.length > 180 ? `${cleaned.slice(0, 180)}…` : cleaned;
}

function throwTuyaError(
  path: string,
  res: Response,
  bodyText: string,
  code?: number,
  msg?: string,
) {
  const snippet = formatSnippet(bodyText);
  const suffix = [
    `HTTP ${res.status}`,
    code !== undefined ? `code ${code}` : undefined,
    msg,
    snippet ? `body ${snippet}` : undefined,
  ]
    .filter(Boolean)
    .join(", ");

  throw new TuyaRequestError(`Tuya API ${path} ล้มเหลว (${suffix})`, path, res.status, code);
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
        const { bodyText, bodyJson } = await readResponseBody<{
          access_token: string;
          expire_time: number;
        }>(res);
        const result = bodyJson?.result;
        if (!res.ok || result === undefined || result.access_token === undefined) {
          throwTuyaError(path, res, bodyText, bodyJson?.code, bodyJson?.msg);
        }
        const tokenResult = result as { access_token: string; expire_time: number };
        tokenCache = {
          token: tokenResult.access_token,
          expiresAt: Date.now() + tokenResult.expire_time * 1000,
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

  const { bodyText, bodyJson } = await readResponseBody<T>(res);
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) tokenCache = null;
    throwTuyaError(path, res, bodyText, bodyJson?.code, bodyJson?.msg);
  }

  if (bodyJson?.success === false) {
    // Auth error -> drop cached token so the next call re-issues it.
    if (bodyJson.code === 1010 || bodyJson.code === 1011 || bodyJson.code === 1012) {
      tokenCache = null;
    }
    throwTuyaError(path, res, bodyText, bodyJson.code, bodyJson.msg);
  }

  if (!bodyJson || bodyJson.result === undefined) {
    throwTuyaError(path, res, bodyText, bodyJson?.code, bodyJson?.msg);
  }

  const response = bodyJson as TuyaResponse<T> & { result: T };
  return response.result;
}

export function getDeviceId() {
  return credentials().deviceId;
}
