import type { DeviceStatus } from "./tuya/types";
import type { AlertRule } from "./app-settings";

export type ActiveAlert = {
  id: string;
  label: string;
  metric: AlertRule["metric"];
  value: number;
  threshold: number;
  op: AlertRule["op"];
};

function readMetric(status: DeviceStatus, metric: AlertRule["metric"]): number {
  switch (metric) {
    case "battery.percent":
      return status.battery.percent;
    case "battery.voltage":
      return status.battery.voltage;
    case "pv.power":
      return status.pv.power;
    case "load.power":
      return status.load.power;
    case "temperature":
      return status.temperature;
  }
}

export function evaluateAlerts(status: DeviceStatus | undefined, rules: AlertRule[]): ActiveAlert[] {
  if (!status) return [];
  const out: ActiveAlert[] = [];
  for (const r of rules) {
    if (!r.enabled) continue;
    const v = readMetric(status, r.metric);
    const triggered = r.op === "lt" ? v < r.threshold : v > r.threshold;
    if (triggered) {
      out.push({ id: r.id, label: r.label, metric: r.metric, value: v, threshold: r.threshold, op: r.op });
    }
  }
  return out;
}

export const METRIC_LABEL: Record<AlertRule["metric"], string> = {
  "battery.percent": "% แบตเตอรี่",
  "battery.voltage": "แรงดันแบต (V)",
  "pv.power": "กำลัง PV (W)",
  "load.power": "กำลังโหลด (W)",
  temperature: "อุณหภูมิ (°C)",
};
