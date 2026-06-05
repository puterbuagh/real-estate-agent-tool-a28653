"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { usePipeline } from "@/context/PipelineContext";
import PipelineCard from "./PipelineCard";
import { cn } from "@/lib/utils";
import type { PipelineItem, PipelineStage } from "@/types";

const STAGES: PipelineStage[] = ["Lead", "Showing", "Under Contract", "Closed"];

const stageHeader: Record<PipelineStage, string> = {
  Lead: "border-t-[hsl(210_60%_50%)]",
  Showing: "border-t-[hsl(35_85%_55%)]",
  "Under Contract": "border-t-[hsl(20_85%_55%)]",
  Closed: "border-t-[hsl(155_55%_42%)]",
};

const stageDotColor: Record<PipelineStage, string> = {
  Lead: "bg-[hsl(210_60%_50%)]",
  Showing: "bg-[hsl(35_85%_55%)]",
  "Under Contract": "bg-[hsl(20_85%_55%)]",
  Closed: "bg-[hsl(155_55%_42%)]",
};

function KanbanBoard() {
  const { pipeline, updatePipelineStage } = usePipeline();
  const [dragOverStage, setDragOverStage] = useState<PipelineStage | null>(null);

  const grouped = useMemo(() => {
    const map: Record<PipelineStage, PipelineItem[]> = {
      Lead: [],
      Showing: [],
      "Under Contract": [],
      Closed: [],
    };
    for (const item of pipeline) {
      map[item.stage].push(item);
    }
    return map;
  }, [pipeline]);

  function handleDragOver(e: React.DragEvent<HTMLDivElement>, stage: PipelineStage) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverStage !== stage) setDragOverStage(stage);
  }

  function handleDragLeave(stage: PipelineStage) {
    if (dragOverStage === stage) setDragOverStage(null);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>, stage: PipelineStage) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    setDragOverStage(null);
    if (!id) return;
    const item = pipeline.find((p) => p.id === id);
    if (!item) return;
    if (item.stage === stage) return;
    updatePipelineStage(id, stage);
    toast.success(`Moved to ${stage}`);
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {STAGES.map((stage) => {
        const items = grouped[stage];
        const isDropTarget = dragOverStage === stage;
        return (
          <div
            key={stage}
            onDragOver={(e) => handleDragOver(e, stage)}
            onDragLeave={() => handleDragLeave(stage)}
            onDrop={(e) => handleDrop(e, stage)}
            className={cn(
              "flex flex-col rounded-lg border border-t-2 border-border bg-muted/30 p-3 min-h-[280px]",
              "transition-colors duration-150",
              stageHeader[stage],
              isDropTarget && "bg-primary/5 border-primary/40"
            )}
          >
            <div className="flex items-center justify-between px-1 pb-3">
              <div className="flex items-center gap-2">
                <span className={cn("h-2 w-2 rounded-full", stageDotColor[stage])} aria-hidden="true" />
                <h2 className="font-display text-xs font-semibold tracking-wide uppercase text-foreground">
                  {stage}
                </h2>
              </div>
              <span className="text-[11px] font-semibold text-muted-foreground bg-background border border-border px-2 py-0.5 rounded-full tabular-nums">
                {items.length}
              </span>
            </div>

            <div className="flex-1 space-y-2.5">
              {items.length === 0 ? (
                <div
                  className={cn(
                    "flex h-32 items-center justify-center rounded-md border border-dashed border-border",
                    "text-[11px] text-muted-foreground text-center px-3",
                    isDropTarget && "border-primary/60 text-primary"
                  )}
                >
                  {isDropTarget ? "Drop to move here" : "Drag a card here"}
                </div>
              ) : (
                items.map((item) => (
                  <PipelineCard key={item.id} item={item} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { KanbanBoard };
export default KanbanBoard;
