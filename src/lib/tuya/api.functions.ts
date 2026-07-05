import { createServerFn } from "@tanstack/react-start";
import type { DeviceStatus, DeviceSettings, DeviceInfo, BatteryType, LoadMode } from "./types";

type CodeValue = { code: string; value: unknown };
type RawStatus = CodeValue[];

/**
 * Tokenize a DP code or alias into lower-case tokens for fuzzy matching.
 */
function tokensOf(s: string) {
  return s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function codeMatches(code: string, key: string) {
  if (code === key) return true;
  if (code.toLowerCase() === key.toLowerCase()) return true;

  const codeTokens = tokensOf(code);
  const keyTokens = tokensOf(key);

  // Require the SAME set of tokens (order-independent), not just "every key
  // token appears somewhere in code". A subset check lets a short alias like
  // "battery_voltage" ([battery, voltage]) wrongly match a longer, semantically
  // different dp code like "battery_voltage_class" ([battery, voltage, class])
  // — those are different settings entirely, not aliases of each other.
  if (codeTokens.length !== keyTokens.length) return false;

  const codeSet = new Set(codeTokens);
  return keyTokens.every((t) => codeSet.has(t));
}

/** Normalize a Tuya DP value with heuristic scaling. */
function s<T extends string>(codes: RawStatus, key: string, fallback: T): T {
  const item = pick(codes, [key]);
  return (typeof item?.value === "string" ? (item.value as T) : fallback) as T;
}
function b(codes: RawStatus, key: string, fallback = false): boolean {
  const item = pick(codes, [key]);
  return typeof item?.value === "boolean" ? item.value : fallback;
}

/**
 * Finds a dp code entry matching one of the candidate `keys`, trying:
 *   1. exact match
 *   2. case-insensitive match
 *   3. token-set fuzzy match (same tokens, different order/case/separators)
 *
 * Each tier is tried across ALL candidate keys before falling through to the
 * next tier, so an exact match on a later alias always wins over a fuzzy
 * match on an earlier one.
 */
function pick(codes: RawStatus, keys: string[]): CodeValue | undefined {
  for (const k of keys) {
    const found = codes.find((c) => c.code === k);
    if (found) return found;
  }
  for (const k of keys) {
    const found = codes.find((c) => c.code.toLowerCase() === k.toLowerCase());
    if (found) return found;
  }
  for (const k of keys) {
    const found = codes.find((c) => codeMatches(c.code, k));
    if (found) return found;
  }
  return undefined;
}

function pickNum(codes: RawStatus, keys: string[], scale = 1, fallback = 0): number {
  const item = pick(codes, keys);
  if (!item || typeof item.value !== "number") return fallback;
  return item.value / scale;
}

function mapStatus(codes: RawStatus, model: string, mac: string): DeviceStatus {
  // DP code names vary between MPPT firmware revisions.
  // We try common aliases used by Tuya solar-charge-controller schemas.
  const stateRaw = String(pick(codes, ["work_state", "device_state", "charge_state"])?.value ?? "");
  const state: DeviceStatus["state"] = /fault|error/i.test(stateRaw)
    ? "fault"
    : /discharg/i.test(stateRaw)
      ? "discharging"
      : /charg/i.test(stateRaw)
        ? "charging"
        : "standby";

  return {
    state,
    model,
    mac,
    temperature: pickNum(codes, ["temp_current", "temperature", "controller_temp"], 1),
    pv: {
      voltage: pickNum(codes, ["pv_voltage", "solar_voltage"], 10),
      current: pickNum(codes, ["pv_current", "solar_current"], 100),
      power: pickNum(codes, ["pv_power", "solar_power"], 10),
    },
    battery: {
      voltage: pickNum(codes, ["battery_voltage", "bat_voltage"], 10),
      current: pickNum(codes, ["battery_current", "bat_current"], 100),
      power: pickNum(codes, ["battery_power", "bat_power"], 10),
      percent: Math.max(
        0,
        Math.min(100, pickNum(codes, ["battery_percentage", "bat_percentage", "soc"], 1, 0)),
      ),
    },
    load: {
      voltage: pickNum(codes, ["load_voltage"], 10),
      current: pickNum(codes, ["load_current"], 100),
      power: pickNum(codes, ["load_power"], 10),
    },
    energy: {
      day: pickNum(codes, ["today_generation", "energy_today", "day_energy"], 100),
      total: pickNum(codes, ["total_generation", "energy_total", "cumulative_energy"], 100),
    },
    history: [],
  };
}

function mapSettings(codes: RawStatus): DeviceSettings {
  const bv = pickNum(codes, ["system_voltage", "battery_voltage_class"], 1, 24);
  const batVoltage = (bv >= 36 ? 48 : bv >= 18 ? 24 : 12) as 12 | 24 | 48;
  return {
    batVoltage,
    batType: s<BatteryType>(codes, "battery_type", "Seal"),
    balanceVoltage: pickNum(codes, ["balance_voltage", "boost_voltage"], 10, 28.8),
    overVoltage: pickNum(codes, ["over_voltage", "hvd_voltage"], 10, 27.2),
    recoveryVoltage: pickNum(codes, ["recovery_voltage", "lvr_voltage"], 10, 23.0),
    underVoltage: pickNum(codes, ["under_voltage", "lvd_voltage"], 10, 22.0),
    loadMode: s<LoadMode>(codes, "load_mode", "24H"),
    powerSet: pickNum(codes, ["power_set", "load_power_set"], 1, 30),
    switchOn: b(codes, "switch", false),
    switchLed: b(codes, "switch_led", false),
    rtcStart: s(codes, "rtc_start", "18:30"),
    rtcEnd: s(codes, "rtc_end", "06:30"),
  };
}

export type RawCode = { code: string; value: string | number | boolean | null };
export const getRawStatusFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<RawCode[]> => {
    const { tuyaRequest, getDeviceId } = await import("./server");
    const id = getDeviceId();
    const codes = await tuyaRequest<RawStatus>(`/v1.0/iot-03/devices/${id}/status`);
    return codes.map((c) => ({
      code: c.code,
      value:
        typeof c.value === "string" || typeof c.value === "number" || typeof c.value === "boolean"
          ? c.value
          : c.value === null
            ? null
            : JSON.stringify(c.value),
    }));
  },
);

type SpecFn = { code: string; name?: string; type?: string; values?: string };
export const getSpecificationsFn = createServerFn({ method: "GET" }).handler(async () => {
  const { tuyaRequest, getDeviceId } = await import("./server");
  const id = getDeviceId();
  const res = await tuyaRequest<{ functions?: SpecFn[]; status?: SpecFn[] }>(
    `/v1.0/devices/${id}/specifications`,
  ).catch(() => ({ functions: [], status: [] }));
  return res;
});

export const getDeviceStatusFn = createServerFn({ method: "GET" }).handler(async () => {
  const { tuyaRequest, getDeviceId } = await import("./server");
  const id = getDeviceId();
  const [statusCodes, info] = await Promise.all([
    tuyaRequest<RawStatus>(`/v1.0/iot-03/devices/${id}/status`),
    tuyaRequest<{ name?: string; product_name?: string; mac?: string; category?: string }>(
      `/v1.0/devices/${id}`,
    ).catch(() => ({}) as { name?: string; product_name?: string; mac?: string }),
  ]);
  const model = info.product_name || info.name || "HM-6096";
  const mac = (info.mac || "").toUpperCase();
  return mapStatus(statusCodes, model, mac);
});

export const getDeviceSettingsFn = createServerFn({ method: "GET" }).handler(async () => {
  const { tuyaRequest, getDeviceId } = await import("./server");
  const id = getDeviceId();
  const codes = await tuyaRequest<RawStatus>(`/v1.0/iot-03/devices/${id}/status`);
  return mapSettings(codes);
});

export const getDeviceInfoFn = createServerFn({ method: "GET" }).handler(async () => {
  const { tuyaRequest, getDeviceId } = await import("./server");
  const id = getDeviceId();
  type InfoResp = {
    uuid?: string;
    ip?: string;
    mac?: string;
    time_zone?: string;
    id?: string;
  };
  type FactoryResp = { rssi?: number; mac?: string; uuid?: string };
  const [info, factory] = await Promise.all([
    tuyaRequest<InfoResp>(`/v1.0/devices/${id}`),
    tuyaRequest<FactoryResp[]>(`/v1.0/devices/factory-infos?device_ids=${id}`).catch(
      () => [] as FactoryResp[],
    ),
  ]);
  const f = factory[0] || {};
  const result: DeviceInfo = {
    virtualId: info.id || info.uuid || id,
    ip: info.ip || "-",
    mac: (f.mac || info.mac || "").toLowerCase(),
    timezone: info.time_zone || "Asia/Bangkok",
    rssi: typeof f.rssi === "number" ? f.rssi : -100,
  };
  return result;
});

export const saveDeviceSettingsFn = createServerFn({ method: "POST" })
  .validator((input: DeviceSettings) => input)
  .handler(async ({ data }) => {
    const { tuyaRequest, getDeviceId } = await import("./server");
    const id = getDeviceId();
    const commands: CodeValue[] = [
      { code: "system_voltage", value: data.batVoltage },
      { code: "battery_voltage_class", value: data.batVoltage },
      { code: "battery_type", value: data.batType },
      { code: "balance_voltage", value: Math.round(data.balanceVoltage * 10) },
      { code: "over_voltage", value: Math.round(data.overVoltage * 10) },
      { code: "recovery_voltage", value: Math.round(data.recoveryVoltage * 10) },
      { code: "under_voltage", value: Math.round(data.underVoltage * 10) },
      { code: "load_mode", value: data.loadMode },
      { code: "power_set", value: data.powerSet },
      { code: "switch", value: data.switchOn },
      { code: "switch_led", value: data.switchLed },
      { code: "rtc_start", value: data.rtcStart },
      { code: "rtc_end", value: data.rtcEnd },
    ];
    await tuyaRequest(`/v1.0/iot-03/devices/${id}/commands`, {
      method: "POST",
      body: { commands },
    });
    return { ok: true };
  });

export const restartDeviceFn = createServerFn({ method: "POST" }).handler(async () => {
  const { tuyaRequest, getDeviceId } = await import("./server");
  const id = getDeviceId();
  await tuyaRequest(`/v1.0/iot-03/devices/${id}/commands`, {
    method: "POST",
    body: { commands: [{ code: "reset", value: true }] },
  }).catch(() => null);
  return { ok: true };
});

/** Battery power history via Tuya device logs (event type 7 = data-point report). */
export const getPowerHistoryFn = createServerFn({ method: "GET" })
  .validator((input: { range: "day" | "week" | "month" }) => input)
  .handler(async ({ data }) => {
    const { tuyaRequest, getDeviceId } = await import("./server");
    const id = getDeviceId();
    const end = Date.now();
    const spanMs =
      data.range === "day"
        ? 24 * 3600_000
        : data.range === "week"
          ? 7 * 24 * 3600_000
          : 30 * 24 * 3600_000;
    const start = end - spanMs;
    type LogsResp = { logs?: { event_time: number; value: string; code?: string }[] };
    const codes = "battery_power,pv_power";
    const size = data.range === "day" ? 100 : data.range === "week" ? 300 : 500;
    const res = await tuyaRequest<LogsResp>(
      `/v1.0/devices/${id}/logs?start_time=${start}&end_time=${end}&type=7&codes=${codes}&size=${size}`,
    ).catch(() => ({}) as LogsResp);
    const logs = res.logs || [];
    const battLogs = logs
      .filter((l) => l.code === "battery_power")
      .map((l) => ({ t: l.event_time, v: Number(l.value) / 10 }))
      .filter((p) => Number.isFinite(p.v))
      .sort((a, b) => a.t - b.t);
    // Bucket to hours for day view; days for week/month.
    const bucketMs = data.range === "day" ? 3600_000 : 24 * 3600_000;
    const buckets = new Map<number, { sum: number; n: number }>();
    for (const p of battLogs) {
      const k = Math.floor(p.t / bucketMs) * bucketMs;
      const b = buckets.get(k) || { sum: 0, n: 0 };
      b.sum += p.v;
      b.n += 1;
      buckets.set(k, b);
    }
    return Array.from(buckets.entries())
      .map(([t, b]) => ({ t, power: b.sum / b.n }))
      .sort((a, b) => a.t - b.t);
  });
