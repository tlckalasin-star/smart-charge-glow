import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { deviceStatusQuery } from "@/lib/tuya/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "กราฟพลังงาน — MPPT HM-6096" },
      { name: "description", content: "กราฟกำลังแบตเตอรี่ รายวัน รายสัปดาห์ และรายเดือน" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(deviceStatusQuery),
  component: HistoryPage,
});

const ranges = [
  { id: "day", label: "วัน" },
  { id: "week", label: "สัปดาห์" },
  { id: "month", label: "เดือน" },
] as const;

function HistoryPage() {
  const { data } = useSuspenseQuery(deviceStatusQuery);
  const [range, setRange] = useState<(typeof ranges)[number]["id"]>("day");

  const series =
    range === "day"
      ? data.history.map((h) => ({ x: `${h.hour}`, y: h.power }))
      : range === "week"
        ? ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"].map((d, i) => ({ x: d, y: [12, 18, 9, 22, 30, 28, 14][i] }))
        : Array.from({ length: 30 }, (_, i) => ({ x: `${i + 1}`, y: Math.round(Math.random() * 30) }));

  const totalDay = data.history.reduce((a, b) => a + b.power, 0) / 60;

  return (
    <AppShell>
      <PageHeader title="กราฟพลังงาน" />
      <div className="space-y-4 px-5 pt-2">
        <div className="rounded-3xl bg-surface p-5">
          <p className="text-xs text-muted-foreground">รวมพลังงาน{ranges.find((r) => r.id === range)?.label}นี้</p>
          <p className="mt-1 font-mono text-3xl font-bold text-primary">
            {totalDay.toFixed(2)} <span className="text-base text-muted-foreground">kWh</span>
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

          <div className="mt-4 h-64 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.85 0.18 75)" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="oklch(0.78 0.16 70)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 4" stroke="oklch(1 0 0 / 0.06)" vertical={false} />
                <XAxis dataKey="x" tick={{ fill: "oklch(0.7 0.02 260)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "oklch(0.7 0.02 260)", fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.22 0.03 260)",
                    border: "1px solid oklch(1 0 0 / 0.1)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [`${v} W`, "กำลัง"]}
                />
                <Area type="monotone" dataKey="y" stroke="oklch(0.85 0.18 75)" strokeWidth={2} fill="url(#hg)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Stat label="สูงสุด" value={`${Math.max(...series.map((p) => p.y))} W`} />
          <Stat label="เฉลี่ย" value={`${(series.reduce((a, b) => a + b.y, 0) / series.length).toFixed(1)} W`} />
          <Stat label="อุณหภูมิ" value={`${data.temperature}°C`} />
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
