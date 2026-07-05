import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/** Threshold rule. `op` compares live value with threshold. */
export type AlertRule = {
  id: string;
  label: string;
  metric: "battery.percent" | "battery.voltage" | "pv.power" | "load.power" | "temperature";
  op: "lt" | "gt";
  threshold: number;
  enabled: boolean;
};

export type AppSettings = {
  refreshMs: number;
  reduceMotion: boolean;
  alertRules: AlertRule[];
};

const STORAGE_KEY = "smart-charge-glow:app-settings-v1";

const DEFAULT_RULES: AlertRule[] = [
  {
    id: "batt-low",
    label: "แบตต่ำ",
    metric: "battery.percent",
    op: "lt",
    threshold: 20,
    enabled: true,
  },
  {
    id: "batt-under-v",
    label: "แรงดันแบตต่ำ",
    metric: "battery.voltage",
    op: "lt",
    threshold: 22,
    enabled: true,
  },
  {
    id: "temp-high",
    label: "อุณหภูมิสูง",
    metric: "temperature",
    op: "gt",
    threshold: 65,
    enabled: true,
  },
];

const DEFAULTS: AppSettings = {
  refreshMs: 32_000,
  reduceMotion: false,
  alertRules: DEFAULT_RULES,
};

type Ctx = AppSettings & {
  setRefreshMs: (v: number) => void;
  setReduceMotion: (v: boolean) => void;
  setAlertRules: (rules: AlertRule[]) => void;
  updateRule: (id: string, patch: Partial<AlertRule>) => void;
};

const AppSettingsCtx = createContext<Ctx | null>(null);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);

  // Hydrate from localStorage (client only)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<AppSettings>;
      setSettings((prev) => ({
        refreshMs: typeof parsed.refreshMs === "number" ? parsed.refreshMs : prev.refreshMs,
        reduceMotion:
          typeof parsed.reduceMotion === "boolean" ? parsed.reduceMotion : prev.reduceMotion,
        alertRules:
          Array.isArray(parsed.alertRules) && parsed.alertRules.length
            ? parsed.alertRules
            : prev.alertRules,
      }));
    } catch {
      /* ignore */
    }
  }, []);

  // Persist
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  }, [settings]);

  const value = useMemo<Ctx>(
    () => ({
      ...settings,
      setRefreshMs: (v) =>
        setSettings((s) => ({ ...s, refreshMs: Math.max(5_000, Math.min(300_000, v)) })),
      setReduceMotion: (v) => setSettings((s) => ({ ...s, reduceMotion: v })),
      setAlertRules: (rules) => setSettings((s) => ({ ...s, alertRules: rules })),
      updateRule: (id, patch) =>
        setSettings((s) => ({
          ...s,
          alertRules: s.alertRules.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        })),
    }),
    [settings],
  );

  return <AppSettingsCtx.Provider value={value}>{children}</AppSettingsCtx.Provider>;
}

export function useAppSettings(): Ctx {
  const ctx = useContext(AppSettingsCtx);
  if (!ctx) throw new Error("useAppSettings must be used inside AppSettingsProvider");
  return ctx;
}
