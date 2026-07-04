import { queryOptions } from "@tanstack/react-query";
import {
  getDeviceStatusFn,
  getDeviceSettingsFn,
  getDeviceInfoFn,
  saveDeviceSettingsFn,
  restartDeviceFn,
  getPowerHistoryFn,
} from "./api.functions";
import type { DeviceSettings } from "./types";

/** Polling interval for live device data (ms). */
export const REFRESH_MS = 32_000;

export const deviceStatusQuery = queryOptions({
  queryKey: ["tuya", "status"],
  queryFn: () => getDeviceStatusFn(),
  refetchInterval: REFRESH_MS,
  refetchIntervalInBackground: false,
  staleTime: REFRESH_MS / 2,
});

export const deviceSettingsQuery = queryOptions({
  queryKey: ["tuya", "settings"],
  queryFn: () => getDeviceSettingsFn(),
  staleTime: 60_000,
});

export const deviceInfoQuery = queryOptions({
  queryKey: ["tuya", "info"],
  queryFn: () => getDeviceInfoFn(),
  staleTime: 5 * 60_000,
});

export const powerHistoryQuery = (range: "day" | "week" | "month") =>
  queryOptions({
    queryKey: ["tuya", "history", range],
    queryFn: () => getPowerHistoryFn({ data: { range } }),
    refetchInterval: range === "day" ? REFRESH_MS * 2 : 5 * 60_000,
    staleTime: REFRESH_MS,
  });

export const saveDeviceSettings = (s: DeviceSettings) => saveDeviceSettingsFn({ data: s });
export const restartDevice = () => restartDeviceFn();
