"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, type LucideIcon } from "lucide-react";

export interface StatCardProps {
  label: string;
  value?: string | number | null;
  sublabel?: string;
  trend?: { value: string; direction: "up" | "down" | "neutral" };
  icon?: LucideIcon;
  loading?: boolean;
  error?: string | null;
  accent?: boolean;
  className?: string;
}

function StatCard({
  label,
  value,
  sublabel,
  trend,
  icon: Icon,
  loading = false,
  error = null,
  accent = false,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border border-border bg-card p-6",
        "transition-all duration-200 hover:border-primary/40 hover:shadow-sm",
        className
      )}
    >
      {accent && (
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-0.5 bg-primary"
        />
      )}

      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        {Icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
      </div>

      <div className="mt-4 min-h-[2.5rem]">
        {loading ? (
          <div
            className="h-8 w-24 animate-pulse rounded-md bg-muted"
            aria-label="Loading"
          />
        ) : error ? (
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <span className="text-sm font-medium">Failed to load</span>
          </div>
        ) : (
          <p className="font-display text-3xl font-semibold tracking-tight text-foreground tabular-nums">
            {value ?? "—"}
          </p>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        {error ? (
          <p className="text-xs text-muted-foreground">{error}</p>
        ) : (
          <>
            {sublabel && (
              <p className="text-xs text-muted-foreground">{sublabel}</p>
            )}
            {trend && !loading && (
              <span
                className={cn(
                  "text-xs font-medium tabular-nums",
                  trend.direction === "up" && "text-emerald-600",
                  trend.direction === "down" && "text-red-600",
                  trend.direction === "neutral" && "text-muted-foreground"
                )}
              >
                {trend.value}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export { StatCard };
export default StatCard;
