"use client";

import * as React from "react";
import { GitCompareArrows } from "lucide-react";
import Link from "next/link";
import { Select } from "@/components/ui/Select";
import type { Comparison } from "@/types";

export interface ComparisonSelectorProps {
  comparisons: Comparison[];
  value: string | null;
  onChange: (id: string | null) => void;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function summarize(c: Comparison): string {
  const props = Array.isArray(c?.properties) ? c.properties : [];
  const addresses = props
    .map((p) => p?.address)
    .filter((a): a is string => !!a)
    .slice(0, 2);
  const extra = props.length > 2 ? ` +${props.length - 2} more` : "";
  const joined = addresses.join(" vs ") || "Comparison";
  return `${formatDate(c.createdAt)} — ${joined}${extra}`;
}

function ComparisonSelector({
  comparisons,
  value,
  onChange,
}: ComparisonSelectorProps) {
  const safeList: Comparison[] = Array.isArray(comparisons) ? comparisons : [];

  const sorted = React.useMemo(
    () =>
      [...safeList].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [safeList]
  );

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-start gap-2 rounded-md border border-dashed border-border bg-muted/30 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <GitCompareArrows
            className="h-4 w-4 text-primary"
            aria-hidden="true"
          />
          No saved comparisons yet
        </div>
        <p className="text-xs text-muted-foreground">
          Run a comparison and click &ldquo;Save This Comparison&rdquo; first.
        </p>
        <Link
          href="/property-comparator"
          className="text-xs font-medium text-primary hover:underline"
        >
          Open Property Comparator →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <label
        htmlFor="comparison-select"
        className="text-xs font-medium text-foreground"
      >
        Saved comparison
      </label>
      <Select
        id="comparison-select"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">Select a comparison…</option>
        {sorted.map((c) => (
          <option key={c.id} value={c.id}>
            {summarize(c)}
          </option>
        ))}
      </Select>
      <p className="text-[11px] text-muted-foreground">
        {sorted.length} saved{" "}
        {sorted.length === 1 ? "comparison" : "comparisons"}
      </p>
    </div>
  );
}

export { ComparisonSelector };
export default ComparisonSelector;
