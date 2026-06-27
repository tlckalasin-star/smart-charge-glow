import { queryOptions } from "@tanstack/react-query";
import { mockStatus, mockSettings, mockInfo } from "./mock";
import type { DeviceSettings } from "./types";

/**
 * Tuya Cloud API client placeholder.
 * แทนที่ฟังก์ชันเหล่านี้ด้วยการเรียก Tuya OpenAPI ผ่าน server function
 * (ต้องเปิด Lovable Cloud + เก็บ Access ID / Secret) เมื่อพร้อมเชื่อมต่อจริง
 */

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchDeviceStatus() {
  await delay(120);
  return mockStatus;
}
export async function fetchDeviceSettings() {
  await delay(120);
  return mockSettings;
}
export async function fetchDeviceInfo() {
  await delay(120);
  return mockInfo;
}
export async function saveDeviceSettings(_s: DeviceSettings) {
  await delay(300);
  return { ok: true };
}
export async function restartDevice() {
  await delay(400);
  return { ok: true };
}

export const deviceStatusQuery = queryOptions({
  queryKey: ["tuya", "status"],
  queryFn: fetchDeviceStatus,
  refetchInterval: 5000,
});
export const deviceSettingsQuery = queryOptions({
  queryKey: ["tuya", "settings"],
  queryFn: fetchDeviceSettings,
});
export const deviceInfoQuery = queryOptions({
  queryKey: ["tuya", "info"],
  queryFn: fetchDeviceInfo,
});
