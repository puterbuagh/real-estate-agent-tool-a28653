"use client";

import * as React from "react";
import { motion } from "framer-motion";
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
  index?: number;
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
  index = 0,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border bg-card p-6",
        "shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_12px_-4px_rgba(15,23,42,0.06)]",
        "transition-all duration-300 hover:border-primary/40 hover:shadow-[0_2px_4px_rgba(15,23,42,0.05),0_12px_28px_-8px_rgba(46,134,171,0.18)]",
        "hover:-translate-y-0.5",
        className
      )}
    >
      {/* Gradient accent border on top */}
      {accent && (
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent"
        />
      )}

      {/* Subtle radial glow on hover */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/5 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
      />

      <div className="relative flex items-start justify-between gap-3">
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </p>
        {Icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20 transition-all group-hover:bg-primary/15 group-hover:ring-primary/30">
            <Icon className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          </span>
        )}
      </div>

      <div className="relative mt-5 min-h-[3rem]">
        {loading ? (
          <div
            className="h-10 w-28 animate-pulse rounded-md bg-gradient-to-r from-muted via-muted/60 to-muted bg-[length:200%_100%]"
            style={{ animation: "shimmer 1.8s ease-in-out infinite" }}
            aria-label="Loading"
          />
        ) : error ? (
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <span className="text-sm font-medium">Failed to load</span>
          </div>
        ) : (
          <p className="font-display text-[2.5rem] font-semibold leading-none tracking-tight text-foreground tabular-nums">
            {value ?? "—"}
          </p>
        )}
      </div>

      <div className="relative mt-3 flex items-center justify-between gap-2">
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
                  "font-mono text-[11px] font-medium tabular-nums",
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
    </motion.div>
  );
}

export { StatCard };
export default StatCard;
