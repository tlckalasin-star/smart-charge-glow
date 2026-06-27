import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation } from "@tanstack/react-query";
import { RefreshCw, Sun, BatteryCharging, Lightbulb, Thermometer, Zap, TrendingUp } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, XAxis, Tooltip } from "recharts";
import { AppShell } from "@/components/app-shell";
import { deviceStatusQuery, restartDevice } from "@/lib/tuya/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "หน้าหลัก — MPPT HM-6096" },
      { name: "description", content: "ดูค่าแผงโซลาร์ แบตเตอรี่ และโหลดแบบเรียลไทม์" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(deviceStatusQuery),
  component: Dashboard,
});

const stateLabel: Record<string, { th: string; tone: string }> = {
  standby: { th: "พร้อมทำงาน", tone: "bg-muted text-muted-foreground" },
  charging: { th: "กำลังชาร์จ", tone: "bg-primary/15 text-primary" },
  discharging: { th: "จ่ายไฟ", tone: "bg-[oklch(0.7_0.14_220)]/15 text-[oklch(0.78_0.14_220)]" },
  fault: { th: "ผิดปกติ", tone: "bg-destructive/20 text-destructive" },
};

function Dashboard() {
  const { data } = useSuspenseQuery(deviceStatusQuery);
  const restart = useMutation({ mutationFn: restartDevice });
  const s = stateLabel[data.state];

  return (
    <AppShell>
      {/* Header */}
      <div className="px-5 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">MPPT Controller</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">{data.model}</h1>
          </div>
          <button
            onClick={() => restart.mutate()}
            disabled={restart.isPending}
            className="flex items-center gap-2 rounded-full bg-surface px-4 py-2 text-xs font-medium text-foreground transition active:scale-95"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", restart.isPending && "animate-spin")} />
            รีสตาร์ต
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium", s.tone)}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {s.th}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-xs text-muted-foreground">
            <Thermometer className="h-3 w-3" />
            {data.temperature}°C
          </span>
        </div>
      </div>

      {/* Hero: Battery + Energy */}
      <div className="mt-5 grid grid-cols-5 gap-3 px-5">
        <div className="col-span-3 rounded-3xl bg-gradient-to-br from-[oklch(0.3_0.06_160)] to-surface p-5 glow-battery">
          <p className="text-xs text-muted-foreground">แบตเตอรี่</p>
          <div className="mt-2 flex items-end gap-1">
            <span className="font-mono text-5xl font-bold text-battery-glow">{data.battery.percent}</span>
            <span className="mb-1.5 text-lg text-muted-foreground">%</span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-background/40">
            <div
              className="h-full rounded-full bg-gradient-to-r from-battery to-battery-glow transition-all"
              style={{ width: `${data.battery.percent}%` }}
            />
          </div>
          <p className="mt-3 font-mono text-sm text-muted-foreground">
            {data.battery.voltage.toFixed(1)} V · {data.battery.current.toFixed(1)} A
          </p>
        </div>
        <div className="col-span-2 flex flex-col gap-3">
          <MiniCard label="วันนี้" value={data.energy.day} unit="kWh" icon={<Zap className="h-3.5 w-3.5" />} accent="text-primary" />
          <MiniCard label="รวม" value={data.energy.total} unit="kWh" icon={<TrendingUp className="h-3.5 w-3.5" />} />
        </div>
      </div>

      {/* PV + Load */}
      <div className="mt-3 grid grid-cols-2 gap-3 px-5">
        <MetricCard
          icon={<Sun className="h-5 w-5" />}
          accent="solar"
          label="แผงโซลาร์"
          power={data.pv.power}
          rows={[
            ["แรงดัน", `${data.pv.voltage.toFixed(1)} V`],
            ["กระแส", `${data.pv.current.toFixed(1)} A`],
          ]}
        />
        <MetricCard
          icon={<Lightbulb className="h-5 w-5" />}
          accent="load"
          label="โหลด"
          power={data.load.power}
          rows={[
            ["แรงดัน", `${data.load.voltage.toFixed(1)} V`],
            ["กระแส", `${data.load.current.toFixed(1)} A`],
          ]}
        />
      </div>

      {/* Battery card spans full */}
      <div className="mt-3 px-5">
        <div className="flex items-center gap-3 rounded-2xl bg-surface p-4">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-battery/15 text-battery">
            <BatteryCharging className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">กำลังแบตเตอรี่</p>
            <p className="font-mono text-lg font-semibold">{data.battery.power.toFixed(1)} W</p>
          </div>
          <p className="font-mono text-sm text-muted-foreground">{data.battery.current.toFixed(1)} A</p>
        </div>
      </div>

      {/* Chart */}
      <div className="mt-4 px-5">
        <div className="rounded-3xl bg-surface p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">กำลังแบตเตอรี่</p>
              <p className="text-sm font-semibold">วันนี้</p>
            </div>
            <span className="rounded-full bg-background/60 px-3 py-1 text-[10px] font-medium text-muted-foreground">
              ทุก 1 ชั่วโมง
            </span>
          </div>
          <div className="h-44 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.history}>
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
                  ticks={[0, 6, 12, 18, 23]}
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
                <Area type="monotone" dataKey="power" stroke="oklch(0.85 0.18 75)" strokeWidth={2} fill="url(#g1)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function MiniCard({
  label,
  value,
  unit,
  icon,
  accent = "text-foreground",
}: {
  label: string;
  value: number;
  unit: string;
  icon: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="flex flex-1 flex-col justify-between rounded-2xl bg-surface p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1">
        <span className={cn("font-mono text-2xl font-bold", accent)}>{value}</span>
        <span className="ml-1 text-xs text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  power,
  rows,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  power: number;
  rows: [string, string][];
  accent: "solar" | "load";
}) {
  const colors = {
    solar: { bg: "bg-primary/15", text: "text-primary", glow: "glow-solar" },
    load: { bg: "bg-[oklch(0.7_0.14_220)]/15", text: "text-[oklch(0.78_0.14_220)]", glow: "" },
  }[accent];
  return (
    <div className={cn("rounded-2xl bg-surface p-4", colors.glow)}>
      <div className="flex items-center justify-between">
        <div className={cn("grid h-10 w-10 place-items-center rounded-xl", colors.bg, colors.text)}>
          {icon}
        </div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="mt-3">
        <span className={cn("font-mono text-2xl font-bold", colors.text)}>{power.toFixed(0)}</span>
        <span className="ml-1 text-xs text-muted-foreground">W</span>
      </div>
      <div className="mt-3 space-y-1 border-t border-border pt-3">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{k}</span>
            <span className="font-mono">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
