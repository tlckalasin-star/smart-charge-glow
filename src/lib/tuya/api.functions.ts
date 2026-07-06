import { createServerFn } from "@tanstack/react-start";
import type { DeviceStatus, DeviceSettings, DeviceInfo, BatteryType, LoadMode } from "./types";
import { mockInfo, mockSettings, mockStatus } from "./mock";

type CodeValue = { code: string; value: unknown };
type RawStatus = CodeValue[];
type SpecFn = { code: string; name?: string; type?: string; values?: string };

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

async function shouldUseMockTuya() {
  const { hasTuyaCredentials, isTuyaMockMode } = await import("./server");
  return isTuyaMockMode() || !hasTuyaCredentials();
}

function mockRawStatus(): RawStatus {
  return [
    { code: "work_state", value: mockStatus.state === "fault" ? "fault" : "standby" },
    { code: "device_state", value: mockStatus.state },
    { code: "charge_state", value: mockStatus.state },
    { code: "temperature", value: mockStatus.temperature },
    { code: "pv_voltage", value: Math.round(mockStatus.pv.voltage * 10) },
    { code: "pv_current", value: Math.round(mockStatus.pv.current * 100) },
    { code: "pv_power", value: Math.round(mockStatus.pv.power * 10) },
    { code: "battery_voltage", value: Math.round(mockStatus.battery.voltage * 10) },
    { code: "battery_current", value: Math.round(mockStatus.battery.current * 100) },
    { code: "battery_power", value: Math.round(mockStatus.battery.power * 10) },
    { code: "battery_percentage", value: mockStatus.battery.percent },
    { code: "load_voltage", value: Math.round(mockStatus.load.voltage * 10) },
    { code: "load_current", value: Math.round(mockStatus.load.current * 100) },
    { code: "load_power", value: Math.round(mockStatus.load.power * 10) },
    { code: "today_generation", value: Math.round(mockStatus.energy.day * 100) },
    { code: "total_generation", value: Math.round(mockStatus.energy.total * 100) },
    { code: "battery_voltage_class", value: mockSettings.batVoltage },
    { code: "battery_type", value: mockSettings.batType },
    { code: "balance_voltage", value: Math.round(mockSettings.balanceVoltage * 10) },
    { code: "over_voltage", value: Math.round(mockSettings.overVoltage * 10) },
    { code: "recovery_voltage", value: Math.round(mockSettings.recoveryVoltage * 10) },
    { code: "under_voltage", value: Math.round(mockSettings.underVoltage * 10) },
    { code: "load_mode", value: mockSettings.loadMode },
    { code: "power_set", value: mockSettings.powerSet },
    { code: "switch", value: mockSettings.switchOn },
    { code: "switch_led", value: mockSettings.switchLed },
    { code: "rtc_start", value: mockSettings.rtcStart },
    { code: "rtc_end", value: mockSettings.rtcEnd },
  ];
}

function mockSpecs(): { functions: SpecFn[]; status: SpecFn[] } {
  return {
    status: [
      { code: "work_state", name: "Work state", type: "string" },
      { code: "temperature", name: "Temperature", type: "value" },
      { code: "battery_voltage", name: "Battery voltage", type: "value" },
      { code: "battery_percentage", name: "Battery percent", type: "value" },
      { code: "pv_power", name: "PV power", type: "value" },
    ],
    functions: [
      { code: "switch", name: "Switch", type: "bool" },
      { code: "switch_led", name: "LED switch", type: "bool" },
      { code: "battery_type", name: "Battery type", type: "enum" },
      { code: "load_mode", name: "Load mode", type: "enum" },
    ],
  };
}

function mockHistory(range: "day" | "week" | "month") {
  const now = Date.now();
  const base = mockStatus.history.length
    ? mockStatus.history
    : Array.from({ length: 24 }, (_, hour) => ({ hour, power: 0 }));

  if (range === "day") {
    const start = now - 23 * 3600_000;
    return base.map((p, index) => ({ t: start + index * 3600_000, power: p.power }));
  }

  const days = range === "week" ? 7 : 30;
  const dayHistory = base.reduce((sum, item) => sum + item.power, 0) / base.length;
  return Array.from({ length: days }, (_, index) => ({
    t: now - (days - 1 - index) * 24 * 3600_000,
    power: dayHistory,
  }));
}

function pickNum(codes: RawStatus, keys: string[], scale = 1, fallback = 0): number {
  const item = pick(codes, keys);
  if (!item || typeof item.value !== "number") return fallback;
  return item.value / scale;
}

function mapStatus(codes: RawStatus, model: string, mac: string): DeviceStatus {
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

/**
 * Build the full set of commands from a DeviceSettings object.
 * This is the canonical mapping so we diff against it when saving.
 */
function settingsToCommands(s: DeviceSettings): CodeValue[] {
  return [
    { code: "battery_voltage_class", value: s.batVoltage },
    { code: "battery_type", value: s.batType },
    { code: "balance_voltage", value: Math.round(s.balanceVoltage * 10) },
    { code: "over_voltage", value: Math.round(s.overVoltage * 10) },
    { code: "recovery_voltage", value: Math.round(s.recoveryVoltage * 10) },
    { code: "under_voltage", value: Math.round(s.underVoltage * 10) },
    { code: "load_mode", value: s.loadMode },
    { code: "power_set", value: s.powerSet },
    { code: "switch", value: s.switchOn },
    { code: "switch_led", value: s.switchLed },
    { code: "rtc_start", value: s.rtcStart },
    { code: "rtc_end", value: s.rtcEnd },
  ];
}

export type RawCode = { code: string; value: string | number | boolean | null };
export const getRawStatusFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<RawCode[]> => {
    if (await shouldUseMockTuya()) {
      return mockRawStatus().map((c) => ({
        code: c.code,
        value:
          typeof c.value === "string" || typeof c.value === "number" || typeof c.value === "boolean"
            ? c.value
            : c.value === null
              ? null
              : JSON.stringify(c.value),
      }));
    }

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

export const getSpecificationsFn = createServerFn({ method: "GET" }).handler(async () => {
  if (await shouldUseMockTuya()) {
    return mockSpecs();
  }

  const { tuyaRequest, getDeviceId } = await import("./server");
  const id = getDeviceId();
  const res = await tuyaRequest<{ functions?: SpecFn[]; status?: SpecFn[] }>(
    `/v1.0/devices/${id}/specifications`,
  ).catch(() => ({ functions: [], status: [] }));
  return res;
});

export const getDeviceStatusFn = createServerFn({ method: "GET" }).handler(async () => {
  if (await shouldUseMockTuya()) {
    return mockStatus;
  }

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
  if (await shouldUseMockTuya()) {
    return mockSettings;
  }

  const { tuyaRequest, getDeviceId } = await import("./server");
  const id = getDeviceId();
  const codes = await tuyaRequest<RawStatus>(`/v1.0/iot-03/devices/${id}/status`);
  return mapSettings(codes);
});

export const getDeviceInfoFn = createServerFn({ method: "GET" }).handler(async () => {
  if (await shouldUseMockTuya()) {
    return mockInfo;
  }

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

/**
 * Save device settings — only sends commands whose values differ from current device state.
 * This avoids unnecessary writes and reduces the chance of device rejection.
 */
export const saveDeviceSettingsFn = createServerFn({ method: "POST" })
  .validator((input: DeviceSettings): DeviceSettings => {
    // Basic sanity: clamp / validate before sending to device
    const clamped = { ...input };
    if (![12, 24, 48].includes(clamped.batVoltage)) clamped.batVoltage = 24;
    clamped.balanceVoltage =
      Math.round(Math.max(20, Math.min(32, clamped.balanceVoltage)) * 10) / 10;
    clamped.overVoltage = Math.round(Math.max(20, Math.min(32, clamped.overVoltage)) * 10) / 10;
    clamped.recoveryVoltage =
      Math.round(Math.max(18, Math.min(28, clamped.recoveryVoltage)) * 10) / 10;
    clamped.underVoltage = Math.round(Math.max(16, Math.min(26, clamped.underVoltage)) * 10) / 10;
    return clamped;
  })
  .handler(async ({ data }) => {
    if (await shouldUseMockTuya()) {
      return { ok: true, changed: 0 };
    }

    const { tuyaRequest, getDeviceId } = await import("./server");
    const id = getDeviceId();

    // Fetch current raw status for diffing
    const currentCodes = await tuyaRequest<RawStatus>(`/v1.0/iot-03/devices/${id}/status`);
    const desired = settingsToCommands(data);

    // Only keep commands where value actually changed
    const changed = desired.filter((cmd) => {
      const cur = currentCodes.find((c) => c.code === cmd.code);
      // If code not found on device, send it (might be first-time write)
      if (!cur) return true;
      // Deep compare — Tuya returns numbers, booleans, strings
      return JSON.stringify(cur.value) !== JSON.stringify(cmd.value);
    });

    if (changed.length === 0) {
      return { ok: true, changed: 0 };
    }

    await tuyaRequest(`/v1.0/iot-03/devices/${id}/commands`, {
      method: "POST",
      body: { commands: changed },
    });
    return { ok: true, changed: changed.length };
  });

export const restartDeviceFn = createServerFn({ method: "POST" }).handler(async () => {
  if (await shouldUseMockTuya()) {
    return { ok: true };
  }

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
    if (await shouldUseMockTuya()) {
      return mockHistory(data.range);
    }

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
    // Only fetch battery_power — pv_power was unused, wasting API quota
    const codes = "battery_power";
    const size = data.range === "day" ? 100 : data.range === "week" ? 300 : 500;
    const res = await tuyaRequest<LogsResp>(
      `/v1.0/devices/${id}/logs?start_time=${start}&end_time=${end}&type=7&codes=${codes}&size=${size}`,
    ).catch(() => ({}) as LogsResp);
    const logs = res.logs || [];
    const battLogs = logs
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
