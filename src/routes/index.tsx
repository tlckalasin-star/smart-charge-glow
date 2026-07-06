import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  RefreshCw,
  Sun,
  Lightbulb,
  AlertCircle,
  Loader2,
  Settings,
  Zap,
} from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, XAxis, Tooltip } from "recharts";
import { AppShell } from "@/components/app-shell";
import { AlertBanner } from "@/components/alert-banner";
import { deviceStatusQuery, powerHistoryQuery, restartDevice } from "@/lib/tuya/client";
import { useAppSettings } from "@/lib/app-settings";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "หน้าหลัก — Solar Monitor" },
      { name: "description", content: "ดูค่าแผงโซลาร์ แบตเตอรี่ และโหลดแบบเรียลไทม์" },
    ],
  }),
  component: Dashboard,
});

const stateLabel: Record<string, { th: string; tone: string; bg: string; border: string; dot: string; text: string }> = {
  standby: { th: "พร้อมทำงาน", tone: "bg-muted text-muted-foreground", bg: "bg-muted/50", border: "border-muted/50", dot: "bg-muted-foreground", text: "text-muted-foreground" },
  charging: { th: "กำลังชาร์จ", tone: "bg-primary/15 text-primary", bg: "bg-primary/20", border: "border-primary/40", dot: "bg-primary", text: "text-primary" },
  discharging: { th: "จ่ายไฟ", tone: "bg-load/15 text-load", bg: "bg-load/20", border: "border-load/40", dot: "bg-load", text: "text-load" },
  fault: { th: "ผิดปกติ", tone: "bg-destructive/20 text-destructive", bg: "bg-destructive/20", border: "border-destructive/40", dot: "bg-destructive", text: "text-destructive" },
};

function BatteryGauge({ percent, voltage, current, power, state }: {
  percent: number;
  voltage: number;
  current: number;
  power: number;
  state: string;
}) {
  const radius = 70;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, percent));
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // Color gradient based on battery level
  const getColor = (p: number) => {
    if (p > 60) return { main: "oklch(0.75 0.19 155)", glow: "oklch(0.75 0.19 155 / 0.4)" };
    if (p > 30) return { main: "oklch(0.8 0.18 70)", glow: "oklch(0.8 0.18 70 / 0.4)" };
    return { main: "oklch(0.65 0.22 25)", glow: "oklch(0.65 0.22 25 / 0.4)" };
  };
  const color = getColor(percent);

  const stateConfig: Record<string, { icon: string; text: string; color: string }> = {
    charging: { icon: "↑", text: "ชาร์จ", color: "text-primary" },
    discharging: { icon: "↓", text: "จ่าย", color: "text-load" },
    standby: { icon: "●", text: "สแตนด์บาย", color: "text-muted-foreground" },
    fault: { icon: "✗", text: "ผิดปกติ", color: "text-destructive" },
  };
  const sc = stateConfig[state] ?? stateConfig.standby;

  return (
    <div className="relative flex flex-col items-center">
      {/* Gauge */}
      <div className="relative">
        <svg width="180" height="180" viewBox="0 0 180 180" className="drop-shadow-lg">
          <defs>
            <linearGradient id="gauge-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color.main} />
              <stop offset="100%" stopColor={color.glow} />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Background track */}
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke="oklch(1 0 0 / 8%)"
            strokeWidth={strokeWidth}
          />
          {/* Progress arc */}
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke="url(#gauge-gradient)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 90 90)"
            filter="url(#glow)"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-5xl font-bold text-foreground">{percent}</span>
          <span className="text-lg text-muted-foreground">%</span>
        </div>
      </div>
      {/* Info below gauge */}
      <div className="mt-3 flex flex-col items-center gap-1">
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-background/40 px-3 py-1 text-xs font-medium ${sc.color}`}>
          <span aria-hidden="true">{sc.icon}</span>
          {sc.text}
        </span>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="font-mono">{voltage.toFixed(1)}V</span>
          <span className="text-border">·</span>
          <span className="font-mono">{current.toFixed(1)}A</span>
          <span className="text-border">·</span>
          <span className="font-mono">{power > 0 ? "+" : ""}{power.toFixed(0)}W</span>
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const { refreshMs } = useAppSettings();
  const status = useQuery({ ...deviceStatusQuery, refetchInterval: refreshMs });
  const history = useQuery({ ...powerHistoryQuery("day"), refetchInterval: refreshMs * 2 });
  const restart = useMutation({
    mutationFn: restartDevice,
    onSuccess: () => toast.success("ส่งคำสั่งรีสตาร์ตแล้ว"),
    onError: (e: Error) => toast.error(e.message || "รีสตาร์ตล้มเหลว"),
  });

  if (status.isLoading && !status.data) return <LoadingScreen />;
  if (status.isError && !status.data)
    return <ErrorScreen error={status.error as Error} onRetry={() => status.refetch()} />;
  const data = status.data!;
  const s = stateLabel[data.state];
  const refreshingLive = status.isFetching;

  return (
    <AppShell>
      <AlertBanner status={data} />
      <div className="animate-fade-in">
      {/* Header */}
      <div className="px-5 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Solar Monitor</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">{data.model}</h1>
          </div>
          <button
            onClick={() => restart.mutate()}
            disabled={restart.isPending}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-muted-foreground transition hover:bg-surface-2 active:scale-95 min-h-11 cursor-pointer"
            aria-label="ตั้งค่า"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>

        {/* Solar Conditions Widget */}
        <div className="mt-4 rounded-2xl bg-gradient-to-br from-primary/15 to-surface p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Sun className="h-10 w-10 text-primary animate-[spin_20s_linear_infinite]" />
                <div className="absolute inset-0 h-10 w-10 rounded-full bg-primary/20 blur-xl" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.pv.power > 0 ? "☀️" : "🌙"} {data.temperature}°</p>
                <p className="text-xs text-muted-foreground">
                  {data.pv.power > 0 ? "มีแดด" : "ไม่มีแดด"} · PV {data.pv.power.toFixed(0)}W
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              {refreshingLive && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] text-primary">
                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                  อัปเดต
                </span>
              )}
              {status.isRefetchError && (
                <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] text-destructive">
                  <AlertCircle className="h-2.5 w-2.5" />
                  ผิดพลาด
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Battery Gauge */}
      <div className="mt-5 px-5">
        <div className="rounded-3xl bg-gradient-to-br from-surface to-surface-2 p-6 glow-battery">
          <BatteryGauge
            percent={data.battery.percent}
            voltage={data.battery.voltage}
            current={data.battery.current}
            power={data.battery.power}
            state={data.state}
          />
        </div>
      </div>

      {/* PV + Load + Energy */}
      <div className="mt-4 grid grid-cols-2 gap-3 px-5">
        {/* PV Card */}
        <div className="rounded-2xl bg-surface p-4 glow-solar">
          <div className="flex items-center justify-between">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
              <Sun className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] text-muted-foreground">ON</span>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xs text-muted-foreground">แผงโซลาร์</p>
            <p className="font-mono text-2xl font-bold text-primary">{data.pv.power.toFixed(0)}<span className="ml-1 text-xs text-muted-foreground">W</span></p>
          </div>
          <div className="mt-3 space-y-1 border-t border-border pt-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">แรงดัน</span>
              <span className="font-mono">{data.pv.voltage.toFixed(1)}V</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">กระแส</span>
              <span className="font-mono">{data.pv.current.toFixed(1)}A</span>
            </div>
          </div>
        </div>

        {/* Load Card */}
        <div className="rounded-2xl bg-surface p-4">
          <div className="flex items-center justify-between">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-load/15 text-load">
              <Lightbulb className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-load" />
              <span className="text-[10px] text-muted-foreground">ON</span>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xs text-muted-foreground">การใช้ไฟ</p>
            <p className="font-mono text-2xl font-bold text-load">{data.load.power.toFixed(0)}<span className="ml-1 text-xs text-muted-foreground">W</span></p>
          </div>
          <div className="mt-3 space-y-1 border-t border-border pt-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">แรงดัน</span>
              <span className="font-mono">{data.load.voltage.toFixed(1)}V</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">กระแส</span>
              <span className="font-mono">{data.load.current.toFixed(1)}A</span>
            </div>
          </div>
        </div>
      </div>

      {/* Energy Badge */}
      <div className="mt-3 px-5">
        <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-green-500/15 to-green-600/10 p-4 border border-green-500/20">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-green-500/20 text-green-500">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-green-600 dark:text-green-400">พลังงานวันนี้</p>
              <p className="font-mono text-xl font-bold text-green-600 dark:text-green-400">{data.energy.day.toFixed(1)}<span className="ml-1 text-xs">kWh</span></p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">ประหยัดได้</p>
            <p className="font-mono text-sm font-semibold text-green-600 dark:text-green-400">{(data.energy.day * 4).toFixed(0)} ฿</p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="mt-5 px-5 pb-6">
        <div className="rounded-2xl bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <p className="text-xs font-medium">ประวัติกำลัง</p>
            </div>
            <span className="rounded-full bg-background/60 px-2 py-0.5 text-[10px] text-muted-foreground">
              ทุก {Math.round(refreshMs / 1000)}วิ
            </span>
          </div>
          <ChartArea query={history} />
        </div>
      </div>
      </div>
    </AppShell>
  );
}

type HistoryQuery = ReturnType<typeof useQuery<{ t: number; power: number }[], Error>>;
function ChartArea({ query }: { query: HistoryQuery }) {
  const { data, isLoading, isError, error, refetch, isFetching } = query;

  if (isLoading) {
    return (
      <div className="grid h-44 place-items-center text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          กำลังโหลดกราฟ...
        </div>
      </div>
    );
  }
  if (isError) {
    return (
      <div className="flex h-44 flex-col items-center justify-center gap-2 text-center text-xs text-destructive">
        <AlertCircle className="h-5 w-5" />
        <p>{(error as Error).message || "โหลดกราฟล้มเหลว"}</p>
        <button
          onClick={() => refetch()}
          className="mt-1 rounded-full bg-destructive/15 px-3 py-2.5 font-medium min-h-11 cursor-pointer hover:bg-destructive/25"
        >
          ลองใหม่
        </button>
      </div>
    );
  }
  const series = (data ?? []).map((p) => ({
    hour: new Date(p.t).getHours(),
    power: Math.round(p.power),
  }));
  if (series.length === 0) {
    return (
      <div className="grid h-44 place-items-center text-xs text-muted-foreground">
        ยังไม่มีข้อมูลใน 24 ชั่วโมงล่าสุด
      </div>
    );
  }
  return (
    <div className="h-44 -mx-2 relative animate-fade-in">
      {isFetching && (
        <span className="absolute right-2 top-1 z-10 inline-flex items-center gap-1 rounded-full bg-background/60 px-2 py-0.5 text-[10px] text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          อัปเดต
        </span>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series}>
          <defs>
            <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.85 0.18 75)" stopOpacity={0.6} />
              <stop offset="100%" stopColor="oklch(0.78 0.16 70)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="hour"
            tick={{ fill: "oklch(0.7 0.02 260)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "oklch(0.22 0.03 260)",
              border: "1px solid oklch(1 0 0 / 0.1)",
              borderRadius: 12,
              fontSize: 12,
            }}
            labelFormatter={(h) => `${h}:00`}
            formatter={(v: unknown) => [`${v} W`, "กำลัง"] as [string, string]}
          />
          <Area
            type="monotone"
            dataKey="power"
            stroke="oklch(0.85 0.18 75)"
            strokeWidth={2}
            fill="url(#g1)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function LoadingScreen() {
  return (
    <AppShell>
      <div className="grid min-h-[60vh] place-items-center px-5 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          กำลังเชื่อมต่ออุปกรณ์...
        </div>
      </div>
    </AppShell>
  );
}

function ErrorScreen({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <AppShell>
      <div className="grid min-h-[60vh] place-items-center px-5">
        <div className="max-w-sm rounded-3xl bg-surface p-6 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
          <p className="mt-3 text-sm font-semibold">เชื่อมต่ออุปกรณ์ไม่สำเร็จ</p>
          <p className="mt-1 text-xs text-muted-foreground break-words">
            {error?.message || "ไม่ทราบสาเหตุ"}
          </p>
          <button
            onClick={onRetry}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground min-h-11 cursor-pointer hover:brightness-110"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            ลองใหม่
          </button>
        </div>
      </div>
    </AppShell>
  );
}
