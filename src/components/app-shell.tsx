import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, LineChart, Settings, Info } from "lucide-react";
import type { ReactNode } from "react";

const nav = [
  { to: "/", label: "หน้าหลัก", icon: LayoutDashboard },
  { to: "/history", label: "กราฟ", icon: LineChart },
  { to: "/settings", label: "ตั้งค่า", icon: Settings },
  { to: "/device-info", label: "อุปกรณ์", icon: Info },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-md pb-24">{children}</div>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto grid max-w-md grid-cols-4">
          {nav.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-col items-center gap-1 py-3 text-[11px] transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
