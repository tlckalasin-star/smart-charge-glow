import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { useAppSettings } from "@/lib/app-settings";
import { evaluateAlerts } from "@/lib/alerts";
import type { DeviceStatus } from "@/lib/tuya/types";

export function AlertBanner({ status }: { status: DeviceStatus | undefined }) {
  const { alertRules } = useAppSettings();
  const active = evaluateAlerts(status, alertRules);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Whenever alert set changes signature, clear stale dismissals for rules no longer active.
  const sig = active.map((a) => `${a.id}:${a.value.toFixed(1)}`).join("|");
  useEffect(() => {
    setDismissed((prev) => {
      const next = new Set<string>();
      for (const a of active) if (prev.has(a.id + ":" + a.value.toFixed(1))) next.add(a.id + ":" + a.value.toFixed(1));
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  const visible = active.filter((a) => !dismissed.has(a.id + ":" + a.value.toFixed(1)));
  if (!visible.length) return null;

  return (
    <div className="space-y-2 px-5 pt-3">
      {visible.map((a) => (
        <div
          key={a.id}
          className="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-destructive"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1 text-xs leading-relaxed">
            <p className="font-semibold">{a.label}</p>
            <p className="text-destructive/80">
              ค่า <span className="font-mono">{a.value.toFixed(1)}</span> {a.op === "lt" ? "ต่ำกว่า" : "สูงกว่า"}{" "}
              เกณฑ์ <span className="font-mono">{a.threshold}</span>
            </p>
          </div>
          <button
            onClick={() => setDismissed((d) => new Set(d).add(a.id + ":" + a.value.toFixed(1)))}
            aria-label="ปิดแจ้งเตือน"
            className="shrink-0 rounded-full p-1 hover:bg-destructive/20"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
