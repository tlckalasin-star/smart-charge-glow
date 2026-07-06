import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Battery,
  Zap,
  Lightbulb,
  Power,
  Clock,
  Check,
  AlertCircle,
  Loader2,
  Bell,
  Smartphone,
  Trash2,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { deviceSettingsQuery, saveDeviceSettings } from "@/lib/tuya/client";
import type { DeviceSettings, BatteryType, LoadMode } from "@/lib/tuya/types";
import { useAppSettings, type AlertRule } from "@/lib/app-settings";
import { METRIC_LABEL } from "@/lib/alerts";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "ตั้งค่า — MPPT HM-6096" },
      { name: "description", content: "ตั้งค่าแบตเตอรี่ แรงดัน โหลด และตัวจับเวลา" },
    ],
  }),
  component: SettingsPage,
});

type Tab = "device" | "app";

function SettingsPage() {
  const [tab, setTab] = useState<Tab>("device");
  return (
    <AppShell>
      <PageHeader title="ตั้งค่า" />
      <div className="px-5 pt-2">
        <div className="grid grid-cols-2 gap-1 rounded-full bg-surface p-1">
          <button
            onClick={() => setTab("device")}
            className={cn(
              "rounded-full py-2 text-xs font-medium transition",
              tab === "device" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            อุปกรณ์
          </button>
          <button
            onClick={() => setTab("app")}
            className={cn(
              "rounded-full py-2 text-xs font-medium transition",
              tab === "app" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            แอป
          </button>
        </div>
      </div>
      {tab === "device" ? <DeviceTab /> : <AppTab />}
    </AppShell>
  );
}

function DeviceTab() {
  const q = useQuery(deviceSettingsQuery);
  const qc = useQueryClient();
  const [s, setS] = useState<DeviceSettings | null>(q.data ?? null);
  const hasHydrated = useRef(false);
  useEffect(() => {
    if (q.data && !hasHydrated.current) {
      setS(q.data);
      hasHydrated.current = true;
    }
  }, [q.data]);

  const save = useMutation({
    mutationFn: saveDeviceSettings,
    onSuccess: () => {
      toast.success("บันทึกการตั้งค่าแล้ว");
      qc.invalidateQueries({ queryKey: ["tuya"] });
    },
    onError: (e: Error) => toast.error(e.message || "บันทึกไม่สำเร็จ"),
  });

  if (!s) {
    return (
      <div className="grid min-h-[50vh] place-items-center px-5 text-sm text-muted-foreground">
        {q.isError ? (
          <div className="max-w-sm rounded-3xl bg-surface p-6 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
            <p className="mt-3 text-sm font-semibold">โหลดค่าจากอุปกรณ์ไม่สำเร็จ</p>
            <p className="mt-1 text-xs text-muted-foreground break-words">
              {(q.error as Error)?.message}
            </p>
            <button
              onClick={() => q.refetch()}
              className="mt-4 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
            >
              ลองใหม่
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            กำลังโหลดค่า...
          </div>
        )}
      </div>
    );
  }

  const update = useCallback(<K extends keyof DeviceSettings>(k: K, v: DeviceSettings[K]) =>
    setS((p) => (p ? { ...p, [k]: v } : p)), []);

  return (
    <div className="space-y-5 px-5 pt-4">
      <Section icon={<Battery className="h-4 w-4" />} title="แบตเตอรี่">
        <Row label="แรงดันระบบ" hint="BAT voltage">
          <Select
            value={String(s.batVoltage)}
            onValueChange={(v) => update("batVoltage", Number(v) as 12 | 24 | 48)}
          >
            <SelectTrigger className="h-9 w-28 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="12">12 V</SelectItem>
              <SelectItem value="24">24 V</SelectItem>
              <SelectItem value="48">48 V</SelectItem>
            </SelectContent>
          </Select>
        </Row>
        <Row label="ชนิดแบตเตอรี่" hint="BAT type">
          <Select value={s.batType} onValueChange={(v) => update("batType", v as BatteryType)}>
            <SelectTrigger className="h-9 w-32 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Seal">Seal</SelectItem>
              <SelectItem value="Gel">Gel</SelectItem>
              <SelectItem value="Flooded">Flooded</SelectItem>
              <SelectItem value="Lithium">Lithium</SelectItem>
            </SelectContent>
          </Select>
        </Row>
        <VoltageRow
          label="แรงดันบาลานซ์"
          hint="Balance voltage"
          value={s.balanceVoltage}
          min={20}
          max={32}
          step={0.1}
          onChange={(v) => update("balanceVoltage", v)}
        />
      </Section>

      <Section icon={<Zap className="h-4 w-4" />} title="แรงดัน">
        <VoltageRow
          label="แรงดันเกิน"
          hint="Over-vol"
          value={s.overVoltage}
          min={20}
          max={32}
          step={0.1}
          onChange={(v) => update("overVoltage", v)}
        />
        <VoltageRow
          label="แรงดันคืนสภาพ"
          hint="Recovery"
          value={s.recoveryVoltage}
          min={18}
          max={28}
          step={0.1}
          onChange={(v) => update("recoveryVoltage", v)}
        />
        <VoltageRow
          label="แรงดันต่ำ"
          hint="Under-vol"
          value={s.underVoltage}
          min={16}
          max={26}
          step={0.1}
          onChange={(v) => update("underVoltage", v)}
        />
      </Section>

      <Section icon={<Lightbulb className="h-4 w-4" />} title="โหลด">
        <Row label="โหมดโหลด" hint="Load mode">
          <Select value={s.loadMode} onValueChange={(v) => update("loadMode", v as LoadMode)}>
            <SelectTrigger className="h-9 w-32 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24H">24 ชม.</SelectItem>
              <SelectItem value="Light">ตามแสง</SelectItem>
              <SelectItem value="Manual">ปรับเอง</SelectItem>
              <SelectItem value="Timer">ตั้งเวลา</SelectItem>
            </SelectContent>
          </Select>
        </Row>
        <div className="space-y-2 py-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">กำลังโหลด</p>
              <p className="text-xs text-muted-foreground">Power set</p>
            </div>
            <span className="font-mono text-sm font-semibold text-primary">{s.powerSet}%</span>
          </div>
          <Slider
            value={[s.powerSet]}
            min={0}
            max={100}
            step={5}
            onValueChange={([v]) => update("powerSet", v)}
          />
        </div>
        <Row label="ช่วงเวลา RTC" hint="RTC timer">
          <div className="flex items-center gap-1 font-mono text-sm">
            <Input
              type="time"
              value={s.rtcStart}
              onChange={(e) => update("rtcStart", e.target.value)}
              className="h-9 w-24 bg-background"
            />
            <span className="text-muted-foreground">–</span>
            <Input
              type="time"
              value={s.rtcEnd}
              onChange={(e) => update("rtcEnd", e.target.value)}
              className="h-9 w-24 bg-background"
            />
          </div>
        </Row>
      </Section>

      <Section icon={<Power className="h-4 w-4" />} title="สวิตช์">
        <Row label="สวิตช์โหลด" hint="Switch">
          <Switch checked={s.switchOn} onCheckedChange={(v) => update("switchOn", v)} />
        </Row>
        <Row label="ไฟ LED" hint="Switch LED">
          <Switch checked={s.switchLed} onCheckedChange={(v) => update("switchLed", v)} />
        </Row>
      </Section>

      <div className="sticky bottom-20 -mx-5 border-t border-border bg-background/95 px-5 py-3 backdrop-blur">
        <div className="flex gap-2">
          <button
            onClick={() => {
              hasHydrated.current = false;
              qc.invalidateQueries({ queryKey: ["tuya", "settings"] });
            }}
            className="flex-1 rounded-full bg-surface py-3 text-sm font-medium"
          >
            <Clock className="mr-1.5 inline h-4 w-4" />
            อ่านค่า
          </button>
          <button
            onClick={() => save.mutate(s)}
            disabled={save.isPending}
            className="flex-[2] rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            <Check className="mr-1.5 inline h-4 w-4" />
            {save.isPending ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AppTab() {
  const {
    refreshMs,
    setRefreshMs,
    reduceMotion,
    setReduceMotion,
    alertRules,
    setAlertRules,
    updateRule,
    mascotEnabled,
    setMascotEnabled,
    energyPricePerKwh,
    setEnergyPricePerKwh,
    monthlyTargetKwh,
    setMonthlyTargetKwh,
  } = useAppSettings();
  const seconds = Math.round(refreshMs / 1000);

  const addRule = () => {
    const r: AlertRule = {
      id: `rule-${Date.now()}`,
      label: "แจ้งเตือนใหม่",
      metric: "battery.percent",
      op: "lt",
      threshold: 30,
      enabled: true,
    };
    setAlertRules([...alertRules, r]);
  };
  const removeRule = (id: string) => setAlertRules(alertRules.filter((r) => r.id !== id));

  return (
    <div className="space-y-5 px-5 pt-4">
      <Section icon={<Smartphone className="h-4 w-4" />} title="ทั่วไป">
        <div className="space-y-2 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">รอบอัปเดต</p>
              <p className="text-xs text-muted-foreground">ดึงข้อมูลใหม่ทุก</p>
            </div>
            <span className="font-mono text-sm font-semibold text-primary">{seconds} วิ</span>
          </div>
          <Slider
            value={[seconds]}
            min={5}
            max={120}
            step={1}
            onValueChange={([v]) => setRefreshMs(v * 1000)}
          />
        </div>
        <Row label="ลดการเคลื่อนไหว" hint="Reduce motion">
          <Switch checked={reduceMotion} onCheckedChange={setReduceMotion} />
        </Row>
        <Row label="แสดงโซลาร์บัดดี้" hint="Mascot on dashboard">
          <Switch checked={mascotEnabled} onCheckedChange={setMascotEnabled} />
        </Row>
      </Section>

      <Section icon={<Zap className="h-4 w-4" />} title="โซลาร์บัดดี้ · ใบเสร็จ">
        <Row label="ราคาไฟต่อหน่วย" hint="บาท / kWh">
          <div className="flex items-center gap-1">
            <Input
              type="number"
              step={0.1}
              min={0}
              value={energyPricePerKwh}
              onChange={(e) => setEnergyPricePerKwh(Number(e.target.value))}
              className="h-9 w-20 bg-background text-right font-mono"
            />
            <span className="text-xs text-muted-foreground">฿</span>
          </div>
        </Row>
        <Row label="เป้าหมายเดือน" hint="kWh / เดือน">
          <div className="flex items-center gap-1">
            <Input
              type="number"
              step={1}
              min={1}
              value={monthlyTargetKwh}
              onChange={(e) => setMonthlyTargetKwh(Number(e.target.value))}
              className="h-9 w-20 bg-background text-right font-mono"
            />
            <span className="text-xs text-muted-foreground">kWh</span>
          </div>
        </Row>
      </Section>


      <Section icon={<Bell className="h-4 w-4" />} title="เกณฑ์แจ้งเตือน">
        <div className="space-y-3 py-2">
          {alertRules.map((r) => (
            <div key={r.id} className="rounded-2xl bg-background/50 p-3">
              <div className="flex items-center gap-2">
                <Input
                  value={r.label}
                  onChange={(e) => updateRule(r.id, { label: e.target.value })}
                  className="h-8 flex-1 bg-background text-sm"
                />
                <Switch
                  checked={r.enabled}
                  onCheckedChange={(v) => updateRule(r.id, { enabled: v })}
                />
                <button
                  onClick={() => removeRule(r.id)}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                  aria-label="ลบ"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 grid grid-cols-[1fr_auto_auto] items-center gap-2">
                <Select
                  value={r.metric}
                  onValueChange={(v) => updateRule(r.id, { metric: v as AlertRule["metric"] })}
                >
                  <SelectTrigger className="h-8 bg-background text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(METRIC_LABEL) as AlertRule["metric"][]).map((m) => (
                      <SelectItem key={m} value={m}>
                        {METRIC_LABEL[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={r.op}
                  onValueChange={(v) => updateRule(r.id, { op: v as AlertRule["op"] })}
                >
                  <SelectTrigger className="h-8 w-20 bg-background text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lt">น้อยกว่า</SelectItem>
                    <SelectItem value="gt">มากกว่า</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  value={r.threshold}
                  onChange={(e) => updateRule(r.id, { threshold: Number(e.target.value) })}
                  className="h-8 w-20 bg-background text-right font-mono text-xs"
                />
              </div>
            </div>
          ))}
          <button
            onClick={addRule}
            className="w-full rounded-2xl border border-dashed border-border py-2 text-xs text-muted-foreground hover:text-foreground"
          >
            + เพิ่มเกณฑ์ใหม่
          </button>
        </div>
      </Section>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-surface p-4">
      <header className="mb-2 flex items-center gap-2 px-1 pb-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/15 text-primary">
          {icon}
        </span>
        <h2 className="text-sm font-semibold">{title}</h2>
      </header>
      <div className="divide-y divide-border">{children}</div>
    </section>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="text-sm">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function VoltageRow({
  label,
  hint,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2 py-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm">{label}</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            value={value}
            step={step}
            min={min}
            max={max}
            onChange={(e) => onChange(Number(e.target.value))}
            className="h-9 w-20 bg-background text-right font-mono"
          />
          <span className="text-xs text-muted-foreground">V</span>
        </div>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
      />
    </div>
  );
}
