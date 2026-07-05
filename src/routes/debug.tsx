import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { rawStatusQuery, specificationsQuery } from "@/lib/tuya/client";

export const Route = createFileRoute("/debug")({
  head: () => ({
    meta: [
      { title: "ดีบัก DP — MPPT HM-6096" },
      { name: "description", content: "ดู DP code ดิบและชื่อจริงจาก Tuya specifications" },
    ],
  }),
  component: DebugPage,
});

type SpecFn = { code: string; name?: string; type?: string; values?: string };
type Specs = { functions?: SpecFn[]; status?: SpecFn[] };

function DebugPage() {
  const raw = useQuery(rawStatusQuery);
  const specs = useQuery(specificationsQuery);

  const specMap = new Map<string, SpecFn>();
  const specData = (specs.data as Specs | undefined) ?? {};
  for (const s of [...(specData.status ?? []), ...(specData.functions ?? [])]) {
    if (s?.code) specMap.set(s.code, s);
  }

  const rows =
    (raw.data ?? []).map((c) => {
      const spec = specMap.get(c.code);
      return {
        code: c.code,
        name: spec?.name || "",
        type: spec?.type || typeof c.value,
        value: c.value,
        group: groupOf(c.code),
      };
    }) ?? [];

  const groups: Record<string, typeof rows> = { PV: [], Battery: [], Load: [], System: [] };
  for (const r of rows) groups[r.group].push(r);

  return (
    <AppShell>
      <PageHeader title="ดีบัก DP" />
      <div className="space-y-4 px-5 pt-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {raw.data ? `${raw.data.length} DP · ${specMap.size} spec` : "รอข้อมูล..."}
          </p>
          <button
            onClick={() => {
              raw.refetch();
              specs.refetch();
            }}
            className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-xs text-muted-foreground"
          >
            <RefreshCw className={`h-3 w-3 ${raw.isFetching ? "animate-spin" : ""}`} />
            รีเฟรช
          </button>
        </div>

        {raw.isLoading ? (
          <div className="grid min-h-[40vh] place-items-center text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              กำลังโหลด DP...
            </div>
          </div>
        ) : raw.isError ? (
          <div className="rounded-3xl bg-surface p-6 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
            <p className="mt-3 text-sm font-semibold">โหลดไม่สำเร็จ</p>
            <p className="mt-1 break-words text-xs text-muted-foreground">{(raw.error as Error).message}</p>
            <button
              onClick={() => raw.refetch()}
              className="mt-4 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
            >
              ลองใหม่
            </button>
          </div>
        ) : (
          Object.entries(groups).map(([g, list]) =>
            list.length ? (
              <section key={g} className="rounded-3xl bg-surface p-1">
                <h3 className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {g}
                </h3>
                {list.map((r) => (
                  <div
                    key={r.code}
                    className="flex items-start justify-between gap-3 border-b border-border px-4 py-2.5 last:border-b-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-xs">{r.code}</p>
                      {r.name && <p className="truncate text-[11px] text-muted-foreground">{r.name}</p>}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-mono text-xs text-primary">{formatVal(r.value)}</p>
                      <p className="text-[10px] text-muted-foreground">{r.type}</p>
                    </div>
                  </div>
                ))}
              </section>
            ) : null,
          )
        )}
      </div>
    </AppShell>
  );
}

function groupOf(code: string): "PV" | "Battery" | "Load" | "System" {
  const c = code.toLowerCase();
  if (c.includes("pv") || c.includes("solar")) return "PV";
  if (c.includes("bat") || c.includes("soc") || c.includes("charge")) return "Battery";
  if (c.includes("load") || c.includes("switch") || c.includes("rtc") || c.includes("power_set")) return "Load";
  return "System";
}

function formatVal(v: unknown): string {
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
