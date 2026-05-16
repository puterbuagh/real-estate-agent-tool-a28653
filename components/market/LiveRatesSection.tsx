"use client";

import * as React from "react";
import { AlertCircle, RefreshCw, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import Sparkline from "./Sparkline";
import { cn, formatDate } from "@/lib/utils";
import type { MortgageRatesPayload, RatePoint } from "@/types";

export interface LiveRatesSectionProps {
  onRatesLoaded?: (payload: MortgageRatesPayload) => void;
}

interface ApiResponse {
  ok?: boolean;
  data?: MortgageRatesPayload;
  // legacy fallback fields
  value?: string;
  date?: string;
  seriesId?: string;
  error?: string;
}

function weekOverWeekDelta(history: RatePoint[]): number | null {
  if (!history || history.length < 2) return null;
  const last = history[history.length - 1]?.value;
  const prev = history[history.length - 2]?.value;
  if (typeof last !== "number" || typeof prev !== "number") return null;
  return last - prev;
}

function RateDisplay({
  label,
  current,
  history,
  asOf,
}: {
  label: string;
  current: number | null;
  history: RatePoint[];
  asOf: string | null;
}) {
  const delta = weekOverWeekDelta(history);
  const direction: "up" | "down" | "neutral" =
    delta === null || Math.abs(delta) < 0.005
      ? "neutral"
      : delta > 0
      ? "up"
      : "down";

  const DeltaIcon =
    direction === "up" ? TrendingUp : direction === "down" ? TrendingDown : Minus;

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <div className="mt-3 flex items-baseline gap-3">
            <p className="font-display text-5xl font-semibold tracking-tight tabular-nums text-foreground">
              {current !== null ? `${current.toFixed(2)}%` : "—"}
            </p>
            {delta !== null && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-xs font-medium tabular-nums",
                  direction === "up" && "text-destructive",
                  direction === "down" && "text-[hsl(var(--success))]",
                  direction === "neutral" && "text-muted-foreground"
                )}
              >
                <DeltaIcon className="h-3.5 w-3.5" aria-hidden="true" />
                {delta > 0 ? "+" : ""}
                {delta.toFixed(2)} wk/wk
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {asOf ? `Week of ${formatDate(asOf)}` : "—"}
          </p>
        </div>
        <div className="shrink-0">
          <Sparkline
            data={history}
            width={180}
            height={56}
            ariaLabel={`${label} last 12 weeks`}
          />
          <p className="mt-1 text-right text-[10px] uppercase tracking-wider text-muted-foreground">
            12-wk trend
          </p>
        </div>
      </div>
    </Card>
  );
}

function LiveRatesSection({ onRatesLoaded }: LiveRatesSectionProps) {
  const [payload, setPayload] = React.useState<MortgageRatesPayload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/mortgage-rate", { cache: "no-store" });
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const json = (await res.json()) as ApiResponse;

        if (cancelled) return;

        if (json.data && json.data.thirtyYear) {
          setPayload(json.data);
          onRatesLoaded?.(json.data);
        } else if (json.value) {
          // Legacy shape — coerce into MortgageRatesPayload
          const fallback: MortgageRatesPayload = {
            thirtyYear: {
              current: Number(json.value),
              history: [
                {
                  date: json.date ?? new Date().toISOString().slice(0, 10),
                  value: Number(json.value),
                },
              ],
            },
            fifteenYear: { current: null, history: [] },
            asOf: json.date ?? null,
          };
          setPayload(fallback);
          onRatesLoaded?.(fallback);
        } else {
          throw new Error(json.error ?? "No rate data returned");
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load rates");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[0, 1].map((i) => (
          <Card key={i} className="p-6">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="mt-4 h-12 w-40" />
            <Skeleton className="mt-3 h-3 w-24" />
            <Skeleton className="mt-4 h-14 w-full" />
          </Card>
        ))}
      </div>
    );
  }

  if (error || !payload) {
    return (
      <Card className="p-6">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-destructive/10 text-destructive">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">
                Couldn&apos;t load mortgage rates
              </p>
              <p className="text-xs text-muted-foreground">
                {error ?? "Data unavailable — check your connection."}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setReloadKey((k) => k + 1)}
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-4 md:grid-cols-2">
        <RateDisplay
          label="30-Year Fixed"
          current={payload.thirtyYear.current}
          history={payload.thirtyYear.history}
          asOf={payload.asOf}
        />
        <RateDisplay
          label="15-Year Fixed"
          current={payload.fifteenYear.current}
          history={payload.fifteenYear.history}
          asOf={payload.asOf}
        />
      </div>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
        Source: Federal Reserve (FRED) ·{" "}
        {payload.asOf ? `Updated ${formatDate(payload.asOf)}` : "Updated weekly"}
      </p>
    </div>
  );
}

export { LiveRatesSection };
export default LiveRatesSection;
