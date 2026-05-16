"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Eye, Trash2, GitCompareArrows } from "lucide-react";
import { usePipeline } from "@/context/PipelineContext";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import type { Comparison } from "@/types";

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

function getWinner(c: Comparison): string {
  if (!c.properties || c.properties.length === 0) return "—";
  const winner = [...c.properties].sort(
    (a, b) => (b.zestimate ?? 0) - (a.zestimate ?? 0)
  )[0];
  if (!winner) return "—";
  const price = winner.zestimate
    ? `$${winner.zestimate.toLocaleString()}`
    : "";
  return price ? `${winner.address} — ${price}` : winner.address;
}

function RecentComparisons() {
  const { comparisons, deleteComparison } = usePipeline();
  const recent = React.useMemo(
    () =>
      [...comparisons]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, 3),
    [comparisons]
  );

  const handleDelete = (id: string) => {
    deleteComparison(id);
    toast.success("Comparison deleted");
  };

  return (
    <section className="rounded-lg border border-border bg-card">
      <header className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
            Recent Comparisons
          </h2>
          <p className="text-xs text-muted-foreground">
            Last 3 property comparisons you&apos;ve run
          </p>
        </div>
        <Link
          href="/property-comparator"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          New comparison
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </header>

      {recent.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <GitCompareArrows className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="text-sm font-medium text-foreground">
            No comparisons yet
          </p>
          <Link
            href="/property-comparator"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Run your first comparison
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Addresses Compared</th>
                <th className="px-6 py-3">Winner</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((c, idx) => {
                const addresses = c.properties
                  .map((p) => p.address)
                  .filter(Boolean);
                return (
                  <tr
                    key={c.id}
                    className={
                      idx % 2 === 1
                        ? "bg-muted/40 border-b border-border last:border-b-0"
                        : "border-b border-border last:border-b-0"
                    }
                  >
                    <td className="px-6 py-4 text-muted-foreground tabular-nums whitespace-nowrap">
                      {formatDate(c.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-foreground">
                      <div className="flex flex-col gap-0.5">
                        {addresses.length === 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          addresses.map((a, i) => (
                            <span key={i} className="truncate max-w-[20rem]">
                              {a}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-foreground">
                      {getWinner(c)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/property-comparator?id=${c.id}`}
                          aria-label="View comparison"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Delete comparison"
                          onClick={() => handleDelete(c.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export { RecentComparisons };
export default RecentComparisons;
