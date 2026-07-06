import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { deviceStatusQuery } from "@/lib/tuya/client";
import { useAppSettings } from "@/lib/app-settings";
import { evaluateAlerts } from "@/lib/alerts";
import { cn } from "@/lib/utils";

type Mood = "happy" | "worried" | "shocked" | "sleeping";

function deriveMood(args: {
  hasStatus: boolean;
  soc: number;
  pvPower: number;
  hasAlert: boolean;
  hour: number;
}): { mood: Mood; message: string } {
  const { hasStatus, soc, pvPower, hasAlert, hour } = args;
  if (!hasStatus) return { mood: "sleeping", message: "รอสัญญาณจากอุปกรณ์..." };
  if (hasAlert) return { mood: "shocked", message: "มีบางอย่างผิดปกติ! เช็คแจ้งเตือนด้วย" };
  if (soc < 20) return { mood: "worried", message: "แบตเหลือน้อยแล้วนะ ระวังหน่อย" };
  const isNight = hour < 6 || hour >= 19;
  if (isNight && pvPower <= 5) return { mood: "sleeping", message: "พรุ่งนี้เจอกันนะ 🌙" };
  if (pvPower > 0) return { mood: "happy", message: "แดดดี ชาร์จเต็มที่เลย ☀️" };
  return { mood: "happy", message: "ทุกอย่างเรียบร้อยดี" };
}

export function SolarBuddy() {
  const { mascotEnabled, alertRules } = useAppSettings();
  const status = useQuery(deviceStatusQuery);
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const activeAlerts = useMemo(
    () => evaluateAlerts(status.data, alertRules),
    [status.data, alertRules],
  );

  const { mood, message } = useMemo(
    () =>
      deriveMood({
        hasStatus: !!status.data,
        soc: status.data?.battery.percent ?? 0,
        pvPower: status.data?.pv.power ?? 0,
        hasAlert: activeAlerts.length > 0,
        hour: new Date().getHours(),
      }),
    [status.data, activeAlerts],
  );

  if (!mascotEnabled || dismissed) return null;

  return (
    <div className="pointer-events-none fixed bottom-24 right-4 z-40 flex flex-col items-end gap-2">
      {open && (
        <div className="pointer-events-auto max-w-[220px] rounded-2xl border border-border bg-surface/95 p-3 text-xs shadow-xl backdrop-blur">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium leading-snug text-foreground">{message}</p>
            <button
              onClick={() => setDismissed(true)}
              className="rounded-full p-0.5 text-muted-foreground hover:text-foreground"
              aria-label="ปิดโซลาร์บัดดี้"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {activeAlerts.length > 0 && (
            <ul className="mt-1.5 space-y-0.5 text-[10px] text-destructive">
              {activeAlerts.slice(0, 2).map((a) => (
                <li key={a.id}>• {a.label}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "pointer-events-auto grid h-14 w-14 place-items-center rounded-full bg-surface shadow-lg ring-1 ring-primary/30 transition active:scale-95",
          mood === "happy" && "ring-primary/50 shadow-primary/20",
          mood === "worried" && "ring-yellow-400/40",
          mood === "shocked" && "ring-destructive/60 animate-pulse",
        )}
        aria-label="โซลาร์บัดดี้"
      >
        <BuddyFace mood={mood} />
      </button>
    </div>
  );
}

function BuddyFace({ mood }: { mood: Mood }) {
  // Chibi sun with a solar-cap face. Uses outline + accent to sit on dark bg.
  const primary = "oklch(0.78 0.16 70)"; // solar orange
  const leaf = "oklch(0.72 0.16 155)"; // green accent
  return (
    <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden>
      {/* rays */}
      {mood !== "sleeping" &&
        [0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <line
            key={deg}
            x1="24"
            y1="4"
            x2="24"
            y2="8"
            stroke={primary}
            strokeWidth="1.5"
            strokeLinecap="round"
            transform={`rotate(${deg} 24 24)`}
            opacity={mood === "worried" ? 0.5 : 0.9}
          />
        ))}
      {/* body */}
      <circle cx="24" cy="24" r="12" fill="none" stroke={primary} strokeWidth="2" />
      {/* solar-panel cap */}
      <rect
        x="14"
        y="10"
        width="20"
        height="4"
        rx="1"
        fill="none"
        stroke={leaf}
        strokeWidth="1.5"
      />
      <line x1="20" y1="10" x2="20" y2="14" stroke={leaf} strokeWidth="1" />
      <line x1="28" y1="10" x2="28" y2="14" stroke={leaf} strokeWidth="1" />
      {/* eyes */}
      {mood === "sleeping" ? (
        <>
          <path d="M18 24 q2 -2 4 0" stroke={primary} strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M26 24 q2 -2 4 0" stroke={primary} strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </>
      ) : mood === "shocked" ? (
        <>
          <circle cx="20" cy="24" r="2" fill={primary} />
          <circle cx="28" cy="24" r="2" fill={primary} />
        </>
      ) : (
        <>
          <circle cx="20" cy="24" r="1.2" fill={primary} />
          <circle cx="28" cy="24" r="1.2" fill={primary} />
        </>
      )}
      {/* mouth */}
      {mood === "happy" && (
        <path d="M19 29 q5 4 10 0" stroke={primary} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      )}
      {mood === "worried" && (
        <path d="M19 30 q5 -3 10 0" stroke={primary} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      )}
      {mood === "shocked" && (
        <ellipse cx="24" cy="30" rx="2" ry="2.5" stroke={primary} strokeWidth="1.5" fill="none" />
      )}
      {mood === "sleeping" && (
        <path d="M20 30 h8" stroke={primary} strokeWidth="1.5" strokeLinecap="round" />
      )}
    </svg>
  );
}
