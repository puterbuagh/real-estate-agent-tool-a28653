"use client";

import * as React from "react";
import {
  Briefcase,
  Trash2,
  MapPin,
  User,
  Clock,
  StickyNote,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { usePipeline } from "@/context/PipelineContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import AddPropertyForm from "@/components/pipeline/AddPropertyForm";
import { cn, formatCurrency } from "@/lib/utils";
import type { PipelineStage, PipelineItem } from "@/types";

const STAGES: PipelineStage[] = [
  "Lead",
  "Showing",
  "Under Contract",
  "Closed",
];

const stageAccent: Record<PipelineStage, string> = {
  Lead: "bg-[hsl(210_70%_55%)]",
  Showing: "bg-[hsl(38_92%_50%)]",
  "Under Contract": "bg-[hsl(25_85%_55%)]",
  Closed: "bg-[hsl(152_55%_42%)]",
};

const stageGradient: Record<PipelineStage, string> = {
  Lead: "from-[hsl(210_70%_55%)] to-[hsl(210_70%_55%)]/20",
  Showing: "from-[hsl(38_92%_50%)] to-[hsl(38_92%_50%)]/20",
  "Under Contract": "from-[hsl(25_85%_55%)] to-[hsl(25_85%_55%)]/20",
  Closed: "from-[hsl(152_55%_42%)] to-[hsl(152_55%_42%)]/20",
};

function daysSince(iso: string): number {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 0;
  const ms = Date.now() - then;
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

interface CardProps {
  item: PipelineItem;
  onDragStart: (e: React.DragEvent, id: string) => void;
  isDragging: boolean;
  onDragEnd: () => void;
}

function PipelineCard({ item, onDragStart, isDragging, onDragEnd }: CardProps) {
  const { removePipelineItem, updatePipelineNotes } = usePipeline();
  const [expanded, setExpanded] = React.useState(false);
  const [notesDraft, setNotesDraft] = React.useState(item.notes ?? "");

  React.useEffect(() => {
    setNotesDraft(item.notes ?? "");
  }, [item.notes]);

  const days = daysSince(item.stageEnteredAt);
  const stale = days > 14;

  const handleDelete = () => {
    if (typeof window !== "undefined") {
      const ok = window.confirm(`Remove "${item.address}" from pipeline?`);
      if (!ok) return;
    }
    removePipelineItem(item.id);
    toast.success("Removed from pipeline");
  };

  const handleNotesBlur = () => {
    if (notesDraft !== (item.notes ?? "")) {
      updatePipelineNotes(item.id, notesDraft);
      toast.success("Notes saved");
    }
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, item.id)}
      onDragEnd={onDragEnd}
      className={cn(
        "group cursor-grab active:cursor-grabbing",
        "rounded-lg border border-border bg-card p-4 shadow-sm",
        "transition-all duration-200",
        "hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5",
        isDragging && "opacity-50 scale-95 shadow-lg"
      )}
    >
      <div className="flex items-start gap-2">
        <MapPin
          className="size-4 text-primary mt-0.5 shrink-0"
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          <p className="font-display text-sm font-semibold leading-snug break-words text-foreground">
            {item.address}
          </p>
          {typeof item.price === "number" && item.price > 0 && (
            <p className="mt-1.5 font-display text-xl font-semibold tracking-tight text-foreground tabular-nums">
              {formatCurrency(item.price)}
            </p>
          )}
        </div>
        <button
          onClick={handleDelete}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
          aria-label="Remove from pipeline"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      {item.clientName && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <User className="size-3.5" aria-hidden="true" />
          <span className="font-display truncate">{item.clientName}</span>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
            stale
              ? "bg-destructive/10 text-destructive"
              : "bg-muted text-muted-foreground"
          )}
        >
          <Clock className="size-3" aria-hidden="true" />
          {days} {days === 1 ? "day" : "days"} in stage
        </span>

        <button
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          aria-expanded={expanded}
        >
          <StickyNote className="size-3.5" aria-hidden="true" />
          Notes
          <ChevronDown
            className={cn(
              "size-3 transition-transform",
              expanded && "rotate-180"
            )}
            aria-hidden="true"
          />
        </button>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-border">
          <textarea
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            onBlur={handleNotesBlur}
            placeholder="Add notes — last contact, preferences, deal blockers…"
            rows={3}
            className={cn(
              "flex w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background",
              "resize-none"
            )}
          />
          <p className="mt-1 text-[10px] text-muted-foreground">
            Auto-saves when you click away
          </p>
        </div>
      )}
    </div>
  );
}

function PipelinePage() {
  const { pipeline, updatePipelineStage } = usePipeline();
  const [dragOver, setDragOver] = React.useState<PipelineStage | null>(null);
  const [draggingId, setDraggingId] = React.useState<string | null>(null);

  const grouped = React.useMemo(() => {
    const map: Record<PipelineStage, PipelineItem[]> = {
      Lead: [],
      Showing: [],
      "Under Contract": [],
      Closed: [],
    };
    for (const item of pipeline) map[item.stage].push(item);
    return map;
  }, [pipeline]);

  const totalValue = React.useMemo(
    () =>
      pipeline.reduce(
        (sum, p) => sum + (typeof p.price === "number" ? p.price : 0),
        0
      ),
    [pipeline]
  );

  const longestSitting = React.useMemo(() => {
    if (pipeline.length === 0) return null;
    let winner = pipeline[0];
    let winnerDays = daysSince(winner.stageEnteredAt);
    for (const p of pipeline) {
      const d = daysSince(p.stageEnteredAt);
      if (d > winnerDays) {
        winner = p;
        winnerDays = d;
      }
    }
    return { item: winner, days: winnerDays };
  }, [pipeline]);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
    setDraggingId(id);
  };

  const handleDragOver = (e: React.DragEvent, stage: PipelineStage) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOver !== stage) setDragOver(stage);
  };

  const handleDragLeave = (stage: PipelineStage) => {
    if (dragOver === stage) setDragOver(null);
  };

  const handleDrop = (e: React.DragEvent, stage: PipelineStage) => {
    e.preventDefault();
    setDragOver(null);
    setDraggingId(null);
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;
    const item = pipeline.find((p) => p.id === id);
    if (!item || item.stage === stage) return;
    updatePipelineStage(id, stage);
    toast.success(`Moved to ${stage}`);
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-1">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-medium">
          Workspace
        </p>
        <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">
          My Pipeline
        </h1>
        <p className="text-muted-foreground text-sm max-w-2xl">
          Every property you&apos;re working — from cold lead to closed deal.
          Drag cards between columns as deals progress.
        </p>
      </header>

      <AddPropertyForm />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="p-5 relative overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary to-primary/30"
          />
          <p className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">
            Total Pipeline Value
          </p>
          <p className="mt-2 font-display text-4xl font-semibold tracking-tight tabular-nums text-foreground">
            {formatCurrency(totalValue)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Across {pipeline.length}{" "}
            {pipeline.length === 1 ? "property" : "properties"}
          </p>
        </Card>

        <Card className="p-5 relative overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-[hsl(38_92%_50%)] to-[hsl(38_92%_50%)]/30"
          />
          <p className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">
            By Stage
          </p>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {STAGES.map((s) => (
              <div key={s} className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn("size-1.5 rounded-full", stageAccent[s])}
                    aria-hidden="true"
                  />
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">
                    {s}
                  </span>
                </div>
                <span className="font-display text-2xl font-semibold tabular-nums text-foreground">
                  {grouped[s].length}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 relative overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-[hsl(25_85%_55%)] to-[hsl(25_85%_55%)]/30"
          />
          <p className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">
            Longest-Sitting Property
          </p>
          {longestSitting ? (
            <div className="mt-2">
              <p className="font-display text-4xl font-semibold tracking-tight tabular-nums text-foreground">
                {longestSitting.days}d
              </p>
              <p className="mt-1 text-xs text-foreground truncate font-display">
                {longestSitting.item.address}
              </p>
              <p className="text-[11px] text-muted-foreground">
                in {longestSitting.item.stage}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              No properties yet
            </p>
          )}
        </Card>
      </section>

      {pipeline.length === 0 ? (
        <Card className="p-12">
          <EmptyState
            icon={Briefcase}
            title="Your pipeline is empty"
            description="Add your first property above to start tracking it through the deal lifecycle."
          />
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {STAGES.map((s) => (
            <div
              key={s}
              onDragOver={(e) => handleDragOver(e, s)}
              onDragLeave={() => handleDragLeave(s)}
              onDrop={(e) => handleDrop(e, s)}
              className={cn(
                "flex flex-col rounded-lg border border-border bg-muted/30 p-3 transition-colors",
                dragOver === s && "border-primary bg-primary/5"
              )}
            >
              <div className="flex items-center justify-between mb-3 px-1 pb-2 relative">
                <div className="flex items-center gap-2">
                  <span
                    className={cn("size-2 rounded-full", stageAccent[s])}
                    aria-hidden="true"
                  />
                  <h2 className="font-display text-sm font-semibold tracking-[0.08em] uppercase text-foreground">
                    {s}
                  </h2>
                </div>
                <span className="text-xs font-medium text-muted-foreground bg-card border border-border px-2 py-0.5 rounded-full tabular-nums">
                  {grouped[s].length}
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute bottom-0 left-1 right-1 h-px bg-gradient-to-r",
                    stageGradient[s]
                  )}
                />
              </div>
              <div className="space-y-2.5 flex-1 min-h-[120px]">
                {grouped[s].length === 0 ? (
                  <div className="flex items-center justify-center h-full border border-dashed border-border rounded-md p-4 text-center text-xs text-muted-foreground">
                    Drop a card here
                  </div>
                ) : (
                  grouped[s].map((item) => (
                    <PipelineCard
                      key={item.id}
                      item={item}
                      onDragStart={handleDragStart}
                      onDragEnd={() => setDraggingId(null)}
                      isDragging={draggingId === item.id}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PipelinePage;
