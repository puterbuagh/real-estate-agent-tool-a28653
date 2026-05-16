"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn, formatPercent } from "@/lib/utils";
import type { RateSeries } from "@/types";
import Sparkline from "./Sparkline";

export interface RateDisplayProps {
  label: string;
  seriesLabel: string;
  series: RateSeries;
  className?: string;
}

function RateDisplay({ label, seriesLabel, series, className }: RateDisplayProps) {
  const history = series.history;
  const current = series.current;
  const prior = history.length >= 2 ? history[history.length - 2].value : current;
  const delta = current - prior;
  const deltaAbs = Math.abs(delta);
  const direction: "up" | "down" | "flat" =
    deltaAbs < 0.005 ? "flat" : delta > 0 ? "up" : "down";

  const DeltaIcon =
    direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus;

  const deltaColor =
    direction === "up"
      ? "text-destructive"
      : direction === "down"
      ? "text-[hsl(var(--success))]"
      : "text-muted-foreground";

  const asOfDate = new Date(series.currentDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Card className={cn("p-6 flex flex-col gap-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground font-medium">
            {label}
          </p>
          <p className="text-[11px] text-muted-foreground/80 mt-0.5">{seriesLabel}</p>
        </div>
        <div
          className={cn(
            "inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-xs font-medium tabular-nums",
            deltaColor
          )}
          title={`Week-over-week change: ${delta >= 0 ? "+" : ""}${delta.toFixed(2)} pts`}
        >
          <DeltaIcon className="h-3.5 w-3.5" aria-hidden="true" />
          {direction === "flat"
            ? "flat"
            : `${delta >= 0 ? "+" : ""}${delta.toFixed(2)} pts`}
        </div>
      </div>

      <div className="flex items-baseline gap-2">
        <p className="font-display text-5xl font-semibold tracking-tight tabular-nums text-foreground">
          {formatPercent(current)}
        </p>
        <p className="text-xs text-muted-foreground">as of {asOfDate}</p>
      </div>

      <div className="-mx-1">
        <Sparkline data={history} height={56} />
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>12-week trend</span>
        <span className="tabular-nums">
          low {formatPercent(Math.min(...history.map((h) => h.value)))} · high{" "}
          {formatPercent(Math.max(...history.map((h) => h.value)))}
        </span>
      </div>
    </Card>
  );
}

export { RateDisplay };
export default RateDisplay;
