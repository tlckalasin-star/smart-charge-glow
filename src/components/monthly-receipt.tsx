import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Sparkles } from "lucide-react";
import { powerHistoryQuery } from "@/lib/tuya/client";
import { useAppSettings } from "@/lib/app-settings";
import { cn } from "@/lib/utils";

/** kWh from a series where each bucket represents 1 day (week/month). */
function seriesToKWh(series: { t: number; power: number }[]): number {
  return series.reduce((a, p) => a + Math.max(0, p.power) * 24, 0) / 1000;
}

function monthLabel(d: Date) {
  return d.toLocaleDateString("th-TH", { month: "long", year: "numeric" });
}

function reportNumber(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `SX-${y}${m}`;
}

export function MonthlyReceipt() {
  const { energyPricePerKwh, monthlyTargetKwh } = useAppSettings();
  const monthQ = useQuery(powerHistoryQuery("month"));

  const now = useMemo(() => new Date(), []);
  const series = monthQ.data ?? [];

  const produced = useMemo(() => seriesToKWh(series), [series]);
  // "used" ≈ produced (single MPPT feeds load through battery). Use it as consumption proxy.
  const used = produced;
  const saved = produced * energyPricePerKwh;

  // Previous "month" not available — compare vs half of the target as baseline benchmark.
  const targetPct = Math.min(100, Math.round((produced / monthlyTargetKwh) * 100));

  const producedPct = produced === 0 ? 0 : 100;
  const usedPct = produced === 0 ? 0 : Math.round((used / produced) * 100);
  const savedPct = produced === 0 ? 0 : Math.min(100, Math.round((saved / (produced * 5)) * 100));

  return (
    <section className="rounded-3xl bg-surface p-5">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/15 text-primary">
            <FileText className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">ใบเสร็จพลังงาน</p>
            <p className="text-[10px] text-muted-foreground">
              เลขที่ {reportNumber(now)} · ออก {now.toLocaleDateString("th-TH")}
            </p>
          </div>
        </div>
        <span className="rounded-full bg-background/60 px-2.5 py-1 text-[10px] text-muted-foreground">
          {monthLabel(now)}
        </span>
      </header>

      <div className="flex items-center gap-5">
        <ProgressRing pct={targetPct} />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            เดือนนี้ vs เป้าหมาย
          </p>
          <p className="mt-0.5 font-mono text-2xl font-bold text-primary">
            {produced.toFixed(1)}
            <span className="ml-1 text-xs text-muted-foreground">
              / {monthlyTargetKwh} kWh
            </span>
          </p>
          <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" />
            ประหยัดค่าไฟ ≈ {saved.toFixed(0)} ฿
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2 border-t border-border pt-3">
        <ReceiptBar label="พลังงานที่ผลิตได้" pct={producedPct} value={`${produced.toFixed(1)} kWh`} accent="solar" />
        <ReceiptBar label="พลังงานที่ใช้ผ่านระบบ" pct={usedPct} value={`${used.toFixed(1)} kWh`} accent="load" />
        <ReceiptBar label="ค่าไฟที่ประหยัดได้" pct={savedPct} value={`${saved.toFixed(0)} ฿`} accent="battery" />
      </div>

      <p className="mt-3 border-t border-dashed border-border pt-2 text-center text-[10px] text-muted-foreground">
        คำนวณจาก {energyPricePerKwh.toFixed(2)} บาท/หน่วย · ปรับได้ในตั้งค่า → แอป
      </p>
    </section>
  );
}

function ProgressRing({ pct }: { pct: number }) {
  const r = 32;
  const c = 2 * Math.PI * r;
  const off = c * (1 - pct / 100);
  return (
    <div className="relative h-20 w-20 shrink-0">
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
        <circle cx="40" cy="40" r={r} stroke="oklch(1 0 0 / 0.08)" strokeWidth="6" fill="none" />
        <circle
          cx="40"
          cy="40"
          r={r}
          stroke="oklch(0.85 0.18 75)"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="font-mono text-sm font-bold text-primary">{pct}%</span>
      </div>
    </div>
  );
}

function ReceiptBar({
  label,
  pct,
  value,
  accent,
}: {
  label: string;
  pct: number;
  value: string;
  accent: "solar" | "load" | "battery";
}) {
  const color = {
    solar: "bg-primary",
    load: "bg-[oklch(0.7_0.14_220)]",
    battery: "bg-[oklch(0.72_0.16_155)]",
  }[accent];
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono">
          {value} <span className="text-muted-foreground">· {pct}%</span>
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-background/50">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
