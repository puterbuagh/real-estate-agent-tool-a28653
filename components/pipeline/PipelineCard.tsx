"use client";

import { useState } from "react";
import { MapPin, Trash2, User, StickyNote, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { usePipeline } from "@/context/PipelineContext";
import { cn, formatCurrency, daysBetween } from "@/lib/utils";
import type { PipelineItem } from "@/types";

interface PipelineCardProps {
  item: PipelineItem;
}

function PipelineCard({ item }: PipelineCardProps) {
  const { removePipelineItem, updatePipelineNotes } = usePipeline();
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesDraft, setNotesDraft] = useState(item.notes ?? "");
  const [isDragging, setIsDragging] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  const stageRef = item.stageEnteredAt ?? item.createdAt;
  const days = daysBetween(stageRef);
  const isStale = days > 14;

  function handleDragStart(e: React.DragEvent<HTMLDivElement>) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", item.id);
    setIsDragging(true);
  }

  function handleDragEnd() {
    setIsDragging(false);
  }

  async function handleDelete() {
    if (typeof window !== "undefined") {
      const ok = window.confirm(
        `Remove "${item.address}" from your pipeline?`
      );
      if (!ok) return;
    }
    setDeleting(true);
    try {
      removePipelineItem(item.id);
      toast.success("Removed from pipeline");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to remove item";
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  }

  async function handleNotesSave() {
    setSaving(true);
    try {
      updatePipelineNotes(item.id, notesDraft.trim());
      toast.success("Notes saved");
      setNotesOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save notes";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={cn(
        "group p-3.5 cursor-grab active:cursor-grabbing select-none",
        "transition-all duration-200",
        "hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5",
        isDragging && "opacity-50 rotate-1 shadow-xl ring-2 ring-primary/40"
      )}
    >
      <div className="flex items-start gap-2">
        <MapPin className="size-4 text-primary mt-0.5 shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="font-display text-sm font-semibold leading-snug break-words text-foreground tracking-tight">
            {item.address}
          </p>
          {typeof item.price === "number" && Number.isFinite(item.price) && (
            <p className="font-display text-lg font-semibold tracking-tight mt-1 tabular-nums text-foreground">
              {formatCurrency(item.price)}
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          loading={deleting}
          disabled={deleting}
          className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
          aria-label="Remove from pipeline"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      {item.clientName && (
        <div className="flex items-center gap-1.5 mt-2.5 text-xs text-muted-foreground">
          <User className="size-3" aria-hidden="true" />
          <span className="font-display tracking-tight truncate">{item.clientName}</span>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-border">
        <span
          className={cn(
            "inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full tabular-nums",
            isStale
              ? "bg-destructive/10 text-destructive"
              : "bg-muted text-muted-foreground"
          )}
          title={`Entered ${item.stage} ${days} ${days === 1 ? "day" : "days"} ago`}
        >
          {days}d in {item.stage === "Under Contract" ? "U/C" : item.stage}
        </span>
        <button
          type="button"
          onClick={() => setNotesOpen((v) => !v)}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          aria-expanded={notesOpen}
        >
          <StickyNote className="size-3" aria-hidden="true" />
          {item.notes && item.notes.length > 0 ? "Notes" : "Add notes"}
          {notesOpen ? (
            <ChevronUp className="size-3" aria-hidden="true" />
          ) : (
            <ChevronDown className="size-3" aria-hidden="true" />
          )}
        </button>
      </div>

      {notesOpen && (
        <div className="mt-3 space-y-2">
          <textarea
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            placeholder="Showing feedback, follow-ups, deal terms…"
            rows={3}
            className={cn(
              "w-full rounded-md border border-input bg-background px-2.5 py-2 text-xs text-foreground",
              "placeholder:text-muted-foreground/70",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "resize-none"
            )}
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setNotesDraft(item.notes ?? "");
                setNotesOpen(false);
              }}
              className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <Button
              type="button"
              onClick={handleNotesSave}
              loading={saving}
              disabled={saving}
              size="sm"
              variant="ghost"
              className="text-[11px] font-medium text-primary hover:text-primary/80 h-auto px-2 py-1"
            >
              Save
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

export { PipelineCard };
export default PipelineCard;
