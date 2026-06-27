import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  back = "/",
  right,
}: {
  title: string;
  back?: string;
  right?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between bg-background/85 px-4 py-4 backdrop-blur">
      <Link
        to={back}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-muted-foreground transition hover:text-foreground"
        aria-label="ย้อนกลับ"
      >
        <ChevronLeft className="h-5 w-5" />
      </Link>
      <h1 className="text-base font-semibold tracking-tight">{title}</h1>
      <div className="flex h-9 w-9 items-center justify-center">{right}</div>
    </header>
  );
}
