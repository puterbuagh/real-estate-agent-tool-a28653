"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Trash2, GitCompareArrows } from "lucide-react";
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

function getWinner(c: Comparison): { address: string; price: string } {
  if (!c.properties || c.properties.length === 0) return { address: "—", price: "" };
  const winner = [...c.properties].sort(
    (a, b) => (b.zestimate ?? 0) - (a.zestimate ?? 0)
  )[0];
  if (!winner) return { address: "—", price: "" };
  const price = winner.zestimate
    ? `$${winner.zestimate.toLocaleString()}`
    : "";
  return { address: winner.address, price };
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
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-[calc(100vw-2rem)] md:max-w-full overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
    >
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-gradient-to-r from-card to-muted/30 px-6 py-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
            <GitCompareArrows className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold tracking-tight text-foreground truncate">
              Recent Comparisons
            </h2>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground truncate">
              Last 3 · property analysis
            </p>
          </div>
        </div>
        <Link
          href="/property-comparator"
          className="group inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-all hover:bg-primary/10 hover:border-primary/30"
        >
          New comparison
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </header>

      {recent.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary/10 to-primary/5 text-primary ring-1 ring-primary/20">
            <GitCompareArrows className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <div>
            <p className="font-display text-base font-semibold text-foreground">
              No comparisons yet
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Run your first side-by-side analysis to see it here.
            </p>
          </div>
          <Link
            href="/property-comparator"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Run your first comparison
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <div className="w-full max-w-full overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                <th className="px-6 py-3 whitespace-nowrap">Date</th>
                <th className="px-6 py-3 whitespace-nowrap">Addresses</th>
                <th className="px-6 py-3 whitespace-nowrap">Winner</th>
                <th className="px-6 py-3 text-right whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((c, idx) => {
                const addresses = c.properties
                  .map((p) => p.address)
                  .filter(Boolean);
                const winner = getWinner(c);
                return (
                  <motion.tr
                    key={c.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      duration: 0.35,
                      delay: 0.3 + idx * 0.06,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="group border-b border-border last:border-b-0 transition-colors hover:bg-muted/40"
                  >
                    <td className="px-6 py-4 text-muted-foreground tabular-nums whitespace-nowrap font-mono text-xs">
                      {formatDate(c.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-foreground">
                      <div className="flex flex-col gap-0.5">
                        {addresses.length === 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          addresses.map((a, i) => (
                            <span key={i} className="truncate max-w-[18rem]">
                              {a}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-display font-semibold text-foreground truncate max-w-[16rem]">
                          {winner.address}
                        </span>
                        {winner.price && (
                          <span className="font-mono text-[11px] tabular-nums text-primary">
                            {winner.price}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
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
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </motion.section>
  );
}

export default RecentComparisons;
