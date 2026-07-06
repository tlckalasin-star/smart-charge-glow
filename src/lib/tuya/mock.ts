import type { DeviceStatus, DeviceSettings, DeviceInfo } from "./types";

export const mockStatus: DeviceStatus = {
  state: "standby",
  model: "HM-6096",
  mac: "E4AEE4F3986E",
  temperature: 38,
  pv: { voltage: 24.9, current: 0, power: 0 },
  battery: { voltage: 24.6, current: 0, power: 0, percent: 50 },
  load: { voltage: 0, current: 0, power: 0 },
  energy: { day: 0.01, total: 0.5 },
  history: Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    power: h === 16 ? 32 : h === 15 || h === 17 ? 14 : h === 14 || h === 18 ? 3 : 0,
  })),
};

export const mockSettings: DeviceSettings = {
  batVoltage: 24,
  batType: "Seal",
  balanceVoltage: 28.8,
  overVoltage: 27.2,
  recoveryVoltage: 23.0,
  underVoltage: 22.0,
  loadMode: "24H",
  powerSet: 30,
  switchOn: false,
  switchLed: false,
  rtcStart: "18:30",
  rtcEnd: "06:30",
};

export const mockInfo: DeviceInfo = {
  virtualId: "eb6b9fb69da13bbc11mivn",
  ip: "49.228.179.*",
  mac: "e4:ae:e4:f3:98:6e",
  timezone: "Asia/Bangkok",
  rssi: -32,
};
