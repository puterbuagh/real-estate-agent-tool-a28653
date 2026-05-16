"use client";

import { useMemo } from "react";
import { DollarSign, Layers, Clock, MapPin } from "lucide-react";
import { usePipeline } from "@/context/PipelineContext";
import { Card } from "@/components/ui/Card";
import { formatCurrency, daysBetween, cn } from "@/lib/utils";
import type { PipelineStage, PipelineItem } from "@/types";

const STAGES: PipelineStage[] = ["Lead", "Showing", "Under Contract", "Closed"];

const stageAccent: Record<PipelineStage, string> = {
  Lead: "bg-[hsl(210_40%_94%)] text-[hsl(210_60%_30%)]",
  Showing: "bg-[hsl(40_80%_94%)] text-[hsl(35_70%_35%)]",
  "Under Contract": "bg-[hsl(25_85%_94%)] text-[hsl(20_75%_38%)]",
  Closed: "bg-[hsl(150_50%_93%)] text-[hsl(155_55%_28%)]",
};

function PipelineSummaryBar() {
  const { pipeline } = usePipeline();

  const { totalValue, counts, longest } = useMemo(() => {
    const counts: Record<PipelineStage, number> = {
      Lead: 0,
      Showing: 0,
      "Under Contract": 0,
      Closed: 0,
    };
    let totalValue = 0;
    let longest: { item: PipelineItem; days: number } | null = null;
    const now = new Date();

    for (const item of pipeline) {
      counts[item.stage] = (counts[item.stage] ?? 0) + 1;
      if (typeof item.price === "number" && Number.isFinite(item.price)) {
        totalValue += item.price;
      }
      const ref = item.stageEnteredAt ?? item.createdAt;
      const days = daysBetween(ref, now);
      if (!longest || days > longest.days) {
        longest = { item, days };
      }
    }

    return { totalValue, counts, longest };
  }, [pipeline]);

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Total Pipeline Value
            </p>
            <p className="font-display text-3xl font-semibold tracking-tight mt-2 tabular-nums">
              {formatCurrency(totalValue)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Across {pipeline.length} {pipeline.length === 1 ? "property" : "properties"}
            </p>
          </div>
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <DollarSign className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            By Stage
          </p>
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Layers className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {STAGES.map((s) => (
            <div
              key={s}
              className={cn(
                "rounded-md px-2 py-2 text-center",
                stageAccent[s]
              )}
            >
              <p className="font-display text-xl font-semibold tabular-nums leading-none">
                {counts[s]}
              </p>
              <p className="text-[10px] uppercase tracking-wider mt-1 font-medium">
                {s === "Under Contract" ? "U/C" : s}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Longest-Sitting
            </p>
            {longest ? (
              <>
                <div className="flex items-baseline gap-2 mt-2">
                  <p className="font-display text-3xl font-semibold tracking-tight tabular-nums">
                    {longest.days}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {longest.days === 1 ? "day" : "days"} in {longest.item.stage}
                  </p>
                </div>
                <div className="flex items-start gap-1.5 mt-1">
                  <MapPin className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-xs text-muted-foreground truncate">
                    {longest.item.address}
                  </p>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">No properties yet</p>
            )}
          </div>
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
            <Clock className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>
      </Card>
    </div>
  );
}

export { PipelineSummaryBar };
export default PipelineSummaryBar;
