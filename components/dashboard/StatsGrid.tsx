"use client";

import { useEffect, useState } from "react";
import { Briefcase, GitCompare, Percent, CalendarClock } from "lucide-react";
import StatCard from "./StatCard";
import { usePipeline } from "@/context/PipelineContext";

interface RateState {
  value: string | null;
  date: string | null;
  loading: boolean;
  error: string | null;
}

interface RatePoint {
  date: string;
  value: number;
}

interface MortgageApiResponse {
  ok?: boolean;
  // New shape
  data?: {
    thirtyYear?: { current?: number | null; history?: RatePoint[] };
    fifteenYear?: { current?: number | null; history?: RatePoint[] };
    asOf?: string | null;
  };
  // Legacy shape (backward compatible)
  value?: string | number | null;
  date?: string | null;
  seriesId?: string;
  error?: string;
}

function StatsGrid() {
  const { pipeline, comparisonsThisMonth } = usePipeline();
  const [rate, setRate] = useState<RateState>({
    value: null,
    date: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setRate((r) => ({ ...r, loading: true, error: null }));
      try {
        const res = await fetch("/api/mortgage-rate", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch rate");
        const data = (await res.json()) as MortgageApiResponse;
        if (cancelled) return;

        // Prefer new shape: data.thirtyYear.current
        const newCurrent = data?.data?.thirtyYear?.current;
        const newAsOf = data?.data?.asOf ?? null;

        if (typeof newCurrent === "number" && Number.isFinite(newCurrent)) {
          setRate({
            value: newCurrent.toFixed(2),
            date: newAsOf,
            loading: false,
            error: null,
          });
          return;
        }

        // Legacy shape fallback
        const legacyVal =
          typeof data.value === "number"
            ? data.value.toFixed(2)
            : typeof data.value === "string"
            ? data.value
            : null;

        setRate({
          value: legacyVal,
          date: data.date ?? null,
          loading: false,
          error: legacyVal ? null : data.error ?? "No data",
        });
      } catch (err) {
        if (cancelled) return;
        setRate({
          value: null,
          date: null,
          loading: false,
          error: err instanceof Error ? err.message : "Error",
        });
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const rateSublabel = rate.date
    ? `Week of ${new Date(rate.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })} · FRED`
    : "Source: FRED MORTGAGE30US";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Properties in Pipeline"
        value={pipeline.length.toString()}
        sublabel={
          pipeline.length === 0
            ? "Add your first lead below"
            : "Active across all stages"
        }
        icon={Briefcase}
        accent
      />
      <StatCard
        label="Comparisons This Month"
        value={comparisonsThisMonth.toString()}
        sublabel={`${new Date().toLocaleString("en-US", {
          month: "long",
        })} to date`}
        icon={GitCompare}
      />
      <StatCard
        label="Florida 30yr Fixed Rate"
        value={rate.value ? `${rate.value}%` : "—"}
        sublabel={rateSublabel}
        icon={Percent}
        loading={rate.loading}
        error={rate.error}
      />
      <StatCard
        label="Median Days on Market"
        value="38"
        sublabel="Florida · updated weekly"
        icon={CalendarClock}
      />
    </div>
  );
}

export default StatsGrid;
