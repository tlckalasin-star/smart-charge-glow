import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Battery, Zap, Lightbulb, Power, Clock, Check } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { deviceSettingsQuery, saveDeviceSettings } from "@/lib/tuya/client";
import type { DeviceSettings, BatteryType, LoadMode } from "@/lib/tuya/types";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "ตั้งค่า — MPPT HM-6096" },
      { name: "description", content: "ตั้งค่าแบตเตอรี่ แรงดัน โหลด และตัวจับเวลา" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(deviceSettingsQuery),
  component: SettingsPage,
});

function SettingsPage() {
  const { data } = useSuspenseQuery(deviceSettingsQuery);
  const qc = useQueryClient();
  const [s, setS] = useState<DeviceSettings>(data);
  useEffect(() => setS(data), [data]);

  const save = useMutation({
    mutationFn: saveDeviceSettings,
    onSuccess: () => {
      toast.success("บันทึกการตั้งค่าแล้ว");
      qc.invalidateQueries({ queryKey: ["tuya"] });
    },
  });

  const update = <K extends keyof DeviceSettings>(k: K, v: DeviceSettings[K]) =>
    setS((p) => ({ ...p, [k]: v }));

  return (
    <AppShell>
      <PageHeader title="ตั้งค่า" />

      <div className="space-y-5 px-5 pt-2">
        <Section icon={<Battery className="h-4 w-4" />} title="แบตเตอรี่">
          <Row label="แรงดันระบบ" hint="BAT voltage">
            <Select value={String(s.batVoltage)} onValueChange={(v) => update("batVoltage", Number(v) as 12 | 24 | 48)}>
              <SelectTrigger className="h-9 w-28 bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="12">12 V</SelectItem>
                <SelectItem value="24">24 V</SelectItem>
                <SelectItem value="48">48 V</SelectItem>
              </SelectContent>
            </Select>
          </Row>
          <Row label="ชนิดแบตเตอรี่" hint="BAT type">
            <Select value={s.batType} onValueChange={(v) => update("batType", v as BatteryType)}>
              <SelectTrigger className="h-9 w-32 bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Seal">Seal</SelectItem>
                <SelectItem value="Gel">Gel</SelectItem>
                <SelectItem value="Flooded">Flooded</SelectItem>
                <SelectItem value="Lithium">Lithium</SelectItem>
              </SelectContent>
            </Select>
          </Row>
          <VoltageRow label="แรงดันบาลานซ์" hint="Balance voltage" value={s.balanceVoltage} min={20} max={32} step={0.1} onChange={(v) => update("balanceVoltage", v)} />
        </Section>

        <Section icon={<Zap className="h-4 w-4" />} title="แรงดัน">
          <VoltageRow label="แรงดันเกิน" hint="Over-vol" value={s.overVoltage} min={20} max={32} step={0.1} onChange={(v) => update("overVoltage", v)} />
          <VoltageRow label="แรงดันคืนสภาพ" hint="Recovery" value={s.recoveryVoltage} min={18} max={28} step={0.1} onChange={(v) => update("recoveryVoltage", v)} />
          <VoltageRow label="แรงดันต่ำ" hint="Under-vol" value={s.underVoltage} min={16} max={26} step={0.1} onChange={(v) => update("underVoltage", v)} />
        </Section>

        <Section icon={<Lightbulb className="h-4 w-4" />} title="โหลด">
          <Row label="โหมดโหลด" hint="Load mode">
            <Select value={s.loadMode} onValueChange={(v) => update("loadMode", v as LoadMode)}>
              <SelectTrigger className="h-9 w-32 bg-background"><SelectValue /></SelectTrigger>
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
            <Slider value={[s.powerSet]} min={0} max={100} step={5} onValueChange={([v]) => update("powerSet", v)} />
          </div>
          <Row label="ช่วงเวลา RTC" hint="RTC timer">
            <div className="flex items-center gap-1 font-mono text-sm">
              <Input type="time" value={s.rtcStart} onChange={(e) => update("rtcStart", e.target.value)} className="h-9 w-24 bg-background" />
              <span className="text-muted-foreground">–</span>
              <Input type="time" value={s.rtcEnd} onChange={(e) => update("rtcEnd", e.target.value)} className="h-9 w-24 bg-background" />
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
              onClick={() => qc.invalidateQueries({ queryKey: ["tuya", "settings"] })}
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
    </AppShell>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-surface p-4">
      <header className="mb-2 flex items-center gap-2 px-1 pb-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/15 text-primary">{icon}</span>
        <h2 className="text-sm font-semibold">{title}</h2>
      </header>
      <div className="divide-y divide-border">{children}</div>
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
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
  label, hint, value, min, max, step, onChange,
}: { label: string; hint: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
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
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} />
    </div>
  );
}
