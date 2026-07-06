import { Link, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  LineChart,
  Settings,
  Info,
  Bug,
  Wifi,
  WifiOff,
  RefreshCw,
} from "lucide-react";
import { useEffect, useState, useRef, useCallback, type ReactNode } from "react";

const nav = [
  { to: "/", label: "หน้าหลัก", icon: LayoutDashboard },
  { to: "/history", label: "กราฟ", icon: LineChart },
  { to: "/settings", label: "ตั้งค่า", icon: Settings },
  { to: "/device-info", label: "อุปกรณ์", icon: Info },
  { to: "/debug", label: "ดีบัก", icon: Bug },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Track when data was last updated
  useEffect(() => {
    const interval = setInterval(() => {
      const queryState = queryClient.getQueryState(["tuya", "status"]);
      if (queryState?.dataUpdatedAt) {
        setLastUpdated(new Date(queryState.dataUpdatedAt));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [queryClient]);

  // Pull-to-refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["tuya"] });
    setTimeout(() => {
      setIsRefreshing(false);
      setPullDistance(0);
    }, 500);
  }, [queryClient]);

  // Touch handlers for pull-to-refresh
  const handleTouchStart = (e: React.TouchEvent) => {
    // Only allow pull-to-refresh when at top of page
    if (window.scrollY === 0) {
      touchStartY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling.current) return;

    const currentY = e.touches[0].clientY;
    const distance = currentY - touchStartY.current;

    // Only pull down, max 100px
    if (distance > 0 && distance < 100) {
      setPullDistance(distance);
    }
  };

  const handleTouchEnd = () => {
    isPulling.current = false;
    if (pullDistance > 60) {
      // Trigger refresh if pulled enough
      handleRefresh();
    } else {
      setPullDistance(0);
    }
  };

  // Format time since last update
  const formatTimeSince = (date: Date | null) => {
    if (!date) return "";
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 5) return "เมื่อสักครู่";
    if (seconds < 60) return `${seconds}วิที่แล้ว`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}นาทีที่แล้ว`;
    return `${Math.floor(minutes / 60)}ชม.ที่แล้ว`;
  };

  return (
    <div
      className="min-h-screen bg-background text-foreground"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      {pullDistance > 0 && (
        <div
          className="fixed left-0 right-0 z-[60] flex items-center justify-center transition-opacity"
          style={{
            top: 0,
            height: pullDistance,
            opacity: pullDistance / 60,
          }}
        >
          <RefreshCw
            className={`h-5 w-5 text-primary transition-transform ${
              pullDistance > 60 ? "rotate-180" : ""
            } ${isRefreshing ? "animate-spin" : ""}`}
            style={{ transform: `rotate(${(pullDistance / 60) * 180}deg)` }}
          />
        </div>
      )}

      {/* Sticky Status Header - Mobile optimized */}
      <div
        className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur"
        style={{
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingBottom: "8px",
        }}
      >
        <div className="mx-auto flex max-w-md items-center justify-between px-4">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            <span className="text-xs text-muted-foreground">
              {isOnline ? "เชื่อมต่อ" : "ออฟไลน์"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-xs text-muted-foreground">{formatTimeSince(lastUpdated)}</span>
            )}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-surface active:scale-90"
              aria-label="รีเฟรช"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-md pb-28">{children}</div>

      {/* Bottom Navigation - Mobile optimized with safe area */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 shadow-lg shadow-primary/20 backdrop-blur"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="mx-auto grid max-w-md grid-cols-5">
          {nav.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] transition-colors active:scale-95 ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
                style={{ minHeight: "48px" }}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
                <span className="truncate max-w-[60px]">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
