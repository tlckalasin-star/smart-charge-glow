export type DeviceStatus = {
  state: "standby" | "charging" | "discharging" | "fault";
  model: string;
  mac: string;
  temperature: number;
  pv: { voltage: number; current: number; power: number };
  battery: { voltage: number; current: number; power: number; percent: number };
  load: { voltage: number; current: number; power: number };
  energy: { day: number; total: number };
  history: { hour: number; power: number }[];
};

export type BatteryType = "Seal" | "Gel" | "Flooded" | "Lithium";
export type LoadMode = "24H" | "Light" | "Manual" | "Timer";

export type DeviceSettings = {
  batVoltage: 12 | 24 | 48;
  batType: BatteryType;
  balanceVoltage: number;
  overVoltage: number;
  recoveryVoltage: number;
  underVoltage: number;
  loadMode: LoadMode;
  powerSet: number;
  switchOn: boolean;
  switchLed: boolean;
  rtcStart: string;
  rtcEnd: string;
};

export type DeviceInfo = {
  virtualId: string;
  ip: string;
  mac: string;
  timezone: string;
  rssi: number;
};
