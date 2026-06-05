"use client";

import { useState } from "react";
import { MapPin, Trash2, User, StickyNote, ChevronDown, ChevronUp, Edit2, X, Check } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { usePipeline } from "@/context/PipelineContext";
import { cn, formatCurrency, daysBetween } from "@/lib/utils";
import type { PipelineItem, PipelineStage } from "@/types";

interface PipelineCardProps {
  item: PipelineItem;
}

function PipelineCard({ item }: PipelineCardProps) {
  const { removePipelineItem, updatePipelineNotes, updatePipelineItem } = usePipeline();
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesDraft, setNotesDraft] = useState(item.notes ?? "");
  const [isDragging, setIsDragging] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [addressDraft, setAddressDraft] = useState(item.address);
  const [stageDraft, setStageDraft] = useState<PipelineStage>(item.stage);
  const [clientNameDraft, setClientNameDraft] = useState(item.clientName ?? "");
  const [priceDraft, setPriceDraft] = useState(
    typeof item.price === "number" && Number.isFinite(item.price)
      ? item.price.toString()
      : ""
  );

  const stageRef = item.stageEnteredAt ?? item.createdAt;
  const days = daysBetween(stageRef);
  const isStale = days > 14;

  function handleDragStart(e: React.DragEvent<HTMLDivElement>) {
    if (isEditing) return;
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

  function handleEditStart() {
    setAddressDraft(item.address);
    setStageDraft(item.stage);
    setClientNameDraft(item.clientName ?? "");
    setPriceDraft(
      typeof item.price === "number" && Number.isFinite(item.price)
        ? item.price.toString()
        : ""
    );
    setIsEditing(true);
  }

  function handleEditCancel() {
    setAddressDraft(item.address);
    setStageDraft(item.stage);
    setClientNameDraft(item.clientName ?? "");
    setPriceDraft(
      typeof item.price === "number" && Number.isFinite(item.price)
        ? item.price.toString()
        : ""
    );
    setIsEditing(false);
  }

  function handleEditSave() {
    if (!addressDraft.trim()) {
      toast.error("Address is required");
      return;
    }

    setSaving(true);
    try {
      const priceNum = priceDraft.trim()
        ? parseFloat(priceDraft.replace(/[^0-9.]/g, ""))
        : undefined;

      updatePipelineItem(item.id, {
        address: addressDraft.trim(),
        stage: stageDraft,
        clientName: clientNameDraft.trim() || undefined,
        price: priceNum && Number.isFinite(priceNum) ? priceNum : undefined,
      });

      setIsEditing(false);
      toast.success("Card updated");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update card";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card
      draggable={!isEditing}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={cn(
        "group p-3.5 select-none",
        "transition-all duration-200",
        !isEditing && "cursor-grab active:cursor-grabbing hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5",
        isDragging && "opacity-50 rotate-1 shadow-xl ring-2 ring-primary/40",
        isEditing && "ring-2 ring-primary/60 shadow-lg"
      )}
    >
      <div className="flex items-start gap-2">
        <MapPin className="size-4 text-primary mt-0.5 shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-2">
              <Input
                type="text"
                value={addressDraft}
                onChange={(e) => setAddressDraft(e.target.value)}
                placeholder="Property address"
                className="text-sm font-semibold"
              />
              <Input
                type="text"
                value={priceDraft}
                onChange={(e) => setPriceDraft(e.target.value)}
                placeholder="Price (optional)"
                className="text-sm"
              />
              <Input
                type="text"
                value={clientNameDraft}
                onChange={(e) => setClientNameDraft(e.target.value)}
                placeholder="Client name (optional)"
                className="text-sm"
              />
              <Select
                value={stageDraft}
                onChange={(e) => setStageDraft(e.target.value as PipelineStage)}
                className="text-sm"
              >
                <option value="Lead">Lead</option>
                <option value="Showing">Showing</option>
                <option value="Under Contract">Under Contract</option>
                <option value="Closed">Closed</option>
              </Select>
            </div>
          ) : (
            <>
              <p className="font-display text-sm font-semibold leading-snug break-words text-foreground tracking-tight">
                {item.address}
              </p>
              {typeof item.price === "number" && Number.isFinite(item.price) && (
                <p className="font-display text-lg font-semibold tracking-tight mt-1 tabular-nums text-foreground">
                  {formatCurrency(item.price)}
                </p>
              )}
            </>
          )}
        </div>
        {!isEditing && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleEditStart}
              className="h-8 w-8 p-0"
              aria-label="Edit card"
            >
              <Edit2 className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              loading={deleting}
              disabled={deleting}
              className="h-8 w-8 p-0"
              aria-label="Remove from pipeline"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        )}
      </div>

      {isEditing && (
        <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-border">
          <Button
            type="button"
            onClick={handleEditCancel}
            variant="ghost"
            size="sm"
            className="text-xs font-medium"
          >
            <X className="size-3 mr-1" />
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleEditSave}
            loading={saving}
            disabled={saving}
            size="sm"
            className="text-xs font-medium"
          >
            <Check className="size-3 mr-1" />
            Save
          </Button>
        </div>
      )}

      {!isEditing && item.clientName && (
        <div className="flex items-center gap-1.5 mt-2.5 text-xs text-muted-foreground">
          <User className="size-3" aria-hidden="true" />
          <span className="font-display tracking-tight truncate">{item.clientName}</span>
        </div>
      )}

      {!isEditing && (
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
      )}

      {!isEditing && notesOpen && (
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
