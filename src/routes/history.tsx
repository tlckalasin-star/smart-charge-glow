import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { AlertCircle, Loader2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { deviceStatusQuery, powerHistoryQuery } from "@/lib/tuya/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "กราฟพลังงาน — MPPT HM-6096" },
      { name: "description", content: "กราฟกำลังแบตเตอรี่ รายวัน รายสัปดาห์ และรายเดือน" },
    ],
  }),
  component: HistoryPage,
});

const ranges = [
  { id: "day", label: "วัน" },
  { id: "week", label: "สัปดาห์" },
  { id: "month", label: "เดือน" },
] as const;
type RangeId = (typeof ranges)[number]["id"];

function HistoryPage() {
  const status = useQuery(deviceStatusQuery);
  const [range, setRange] = useState<RangeId>("day");
  const historyQ = useQuery(powerHistoryQuery(range));

  const series = (historyQ.data ?? []).map((p) => {
    const d = new Date(p.t);
    const x =
      range === "day"
        ? `${d.getHours()}`
        : range === "week"
          ? ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"][d.getDay()]
          : `${d.getDate()}`;
    return { x, y: Math.round(p.power) };
  });

  // Estimate kWh from average power * time spanned.
  // For "day": each bucket is 1 h → sum(W) / 1000 = kWh.
  // For "week"/"month": each bucket is 1 day → avg(W) * 24 / 1000 = kWh per bucket.
  // kWh from average power × time spanned.
  // Day: each bucket = 1 h → totalW(W) / 1000 = kWh.
  // Week/Month: each bucket = 1 d → totalW × 24(h) / 1000 = kWh.
  // NOTE: missing-data periods (e.g. overnight) naturally lower the average,
  // so this is a conservative floor, not an over-estimate.
  const totalW = series.reduce((a, b) => a + b.y, 0);
  const totalKWh = series.length === 0 ? 0 : (totalW * (range === "day" ? 1 : 24)) / 1000;

  return (
    <AppShell>
      <PageHeader title="กราฟพลังงาน" />
      <div className="space-y-4 px-5 pt-2">
        <div className="rounded-3xl bg-surface p-5">
          <p className="text-xs text-muted-foreground">
            รวมพลังงาน{ranges.find((r) => r.id === range)?.label}นี้
          </p>
          <p className="mt-1 font-mono text-3xl font-bold text-primary">
            {totalKWh.toFixed(2)} <span className="text-base text-muted-foreground">kWh</span>
          </p>

          <div className="mt-4 grid grid-cols-3 gap-1 rounded-full bg-background/60 p-1">
            {ranges.map((r) => (
              <button
                key={r.id}
                onClick={() => setRange(r.id)}
                className={cn(
                  "rounded-full py-2 text-xs font-medium transition",
                  range === r.id ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div className="mt-4 h-64 -mx-2 relative">
            {historyQ.isLoading ? (
              <div className="grid h-full place-items-center text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  กำลังโหลดกราฟ...
                </div>
              </div>
            ) : historyQ.isError ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-xs text-destructive">
                <AlertCircle className="h-5 w-5" />
                <p>{(historyQ.error as Error).message || "โหลดกราฟล้มเหลว"}</p>
                <button
                  onClick={() => historyQ.refetch()}
                  className="mt-1 rounded-full bg-destructive/15 px-3 py-1 font-medium"
                >
                  ลองใหม่
                </button>
              </div>
            ) : series.length === 0 ? (
              <div className="grid h-full place-items-center text-xs text-muted-foreground">
                ไม่มีข้อมูลในช่วงนี้
              </div>
            ) : (
              <>
                {historyQ.isFetching && (
                  <span className="absolute right-2 top-1 z-10 inline-flex items-center gap-1 rounded-full bg-background/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    อัปเดต
                  </span>
                )}
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={series}>
                    <defs>
                      <linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="oklch(0.85 0.18 75)" stopOpacity={0.6} />
                        <stop offset="100%" stopColor="oklch(0.78 0.16 70)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 4"
                      stroke="oklch(1 0 0 / 0.06)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="x"
                      tick={{ fill: "oklch(0.7 0.02 260)", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "oklch(0.7 0.02 260)", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      width={28}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "oklch(0.22 0.03 260)",
                        border: "1px solid oklch(1 0 0 / 0.1)",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                      formatter={(v: unknown) => [`${v} W`, "กำลัง"] as [string, string]}
                    />
                    <Area
                      type="monotone"
                      dataKey="y"
                      stroke="oklch(0.85 0.18 75)"
                      strokeWidth={2}
                      fill="url(#hg)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Stat
            label="สูงสุด"
            value={series.length ? `${Math.max(...series.map((p) => p.y))} W` : "-"}
          />
          <Stat
            label="เฉลี่ย"
            value={
              series.length
                ? `${(series.reduce((a, b) => a + b.y, 0) / series.length).toFixed(1)} W`
                : "-"
            }
          />
          <Stat label="อุณหภูมิ" value={status.data ? `${status.data.temperature}°C` : "-"} />
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface p-3 text-center">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-sm font-semibold">{value}</p>
    </div>
  );
}
