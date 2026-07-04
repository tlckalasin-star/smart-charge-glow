import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Copy, Wifi, Check, AlertCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { deviceInfoQuery } from "@/lib/tuya/client";

export const Route = createFileRoute("/device-info")({
  head: () => ({
    meta: [
      { title: "ข้อมูลอุปกรณ์ — MPPT HM-6096" },
      { name: "description", content: "รหัสอุปกรณ์ IP MAC โซนเวลา และความแรงสัญญาณ Wi-Fi" },
    ],
  }),
  component: InfoPage,
});

function InfoPage() {
  const { data, isLoading, isError, error, refetch } = useQuery(deviceInfoQuery);

  if (isLoading || !data) {
    return (
      <AppShell>
        <PageHeader title="ข้อมูลอุปกรณ์" />
        <div className="grid min-h-[50vh] place-items-center px-5 text-sm text-muted-foreground">
          {isError ? (
            <div className="max-w-sm rounded-3xl bg-surface p-6 text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
              <p className="mt-3 text-sm font-semibold">โหลดข้อมูลไม่สำเร็จ</p>
              <p className="mt-1 text-xs text-muted-foreground break-words">{(error as Error)?.message}</p>
              <button
                onClick={() => refetch()}
                className="mt-4 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
              >
                ลองใหม่
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              กำลังโหลด...
            </div>
          )}
        </div>
      </AppShell>
    );
  }

  const bars = rssiBars(data.rssi);

  return (
    <AppShell>
      <PageHeader title="ข้อมูลอุปกรณ์" />
      <div className="px-5 pt-2">
        <div className="rounded-3xl bg-surface p-1">
          <InfoRow label="ID เสมือน" value={data.virtualId} copy mono />
          <InfoRow label="IP" value={data.ip} mono />
          <InfoRow label="MAC" value={data.mac} copy mono />
          <InfoRow label="โซนเวลา" value={data.timezone} />
          <div className="flex items-center justify-between gap-3 px-4 py-3.5">
            <div className="min-w-0">
              <p className="text-sm">ความแรงสัญญาณ</p>
              <p className="text-xs text-muted-foreground">Wi-Fi RSSI</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm">{data.rssi} dBm</span>
              <div className="flex items-end gap-0.5">
                {[1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className={`w-1 rounded-sm ${i <= bars ? "bg-battery" : "bg-muted"}`}
                    style={{ height: 4 + i * 3 }}
                  />
                ))}
                <Wifi className="ml-1 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>
        </div>

        <p className="mt-4 px-2 text-xs leading-relaxed text-muted-foreground">
          ข้อมูลนี้มาจากอุปกรณ์โดยตรง หากต้องการเปลี่ยน Wi-Fi โปรดรีเซ็ตอุปกรณ์แล้วเชื่อมต่อใหม่ผ่านแอป
        </p>
      </div>
    </AppShell>
  );
}

function InfoRow({ label, value, copy, mono }: { label: string; value: string; copy?: boolean; mono?: boolean }) {
  const [done, setDone] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch {}
  };
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3.5 last:border-b-0">
      <p className="text-sm shrink-0">{label}</p>
      <div className="flex min-w-0 items-center gap-2">
        <span className={`truncate text-sm text-muted-foreground ${mono ? "font-mono" : ""}`}>{value}</span>
        {copy && (
          <button
            onClick={onCopy}
            className="shrink-0 text-primary transition hover:text-primary/80"
            aria-label="คัดลอก"
          >
            {done ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

function rssiBars(rssi: number) {
  if (rssi >= -50) return 4;
  if (rssi >= -65) return 3;
  if (rssi >= -75) return 2;
  return 1;
}
