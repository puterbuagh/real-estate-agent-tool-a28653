"use client";

import { useState, useRef, useEffect } from "react";
import { MapPin, Trash2, User, StickyNote, ChevronDown, ChevronUp } from "lucide-react";
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

  const [editingAddress, setEditingAddress] = useState(false);
  const [editingPrice, setEditingPrice] = useState(false);
  const [editingClient, setEditingClient] = useState(false);
  const [editingStage, setEditingStage] = useState(false);

  const [addressDraft, setAddressDraft] = useState(item.address);
  const [priceDraft, setPriceDraft] = useState(
    typeof item.price === "number" && Number.isFinite(item.price)
      ? item.price.toString()
      : ""
  );
  const [clientNameDraft, setClientNameDraft] = useState(item.clientName ?? "");
  const [stageDraft, setStageDraft] = useState<PipelineStage>(item.stage);

  const addressInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);
  const clientInputRef = useRef<HTMLInputElement>(null);
  const stageSelectRef = useRef<HTMLSelectElement>(null);

  const stageRef = item.stageEnteredAt ?? item.createdAt;
  const days = daysBetween(stageRef);
  const isStale = days > 14;

  const isAnyFieldEditing = editingAddress || editingPrice || editingClient || editingStage;

  useEffect(() => {
    if (editingAddress && addressInputRef.current) {
      addressInputRef.current.focus();
      addressInputRef.current.select();
    }
  }, [editingAddress]);

  useEffect(() => {
    if (editingPrice && priceInputRef.current) {
      priceInputRef.current.focus();
      priceInputRef.current.select();
    }
  }, [editingPrice]);

  useEffect(() => {
    if (editingClient && clientInputRef.current) {
      clientInputRef.current.focus();
      clientInputRef.current.select();
    }
  }, [editingClient]);

  useEffect(() => {
    if (editingStage && stageSelectRef.current) {
      stageSelectRef.current.focus();
    }
  }, [editingStage]);

  function handleDragStart(e: React.DragEvent<HTMLDivElement>) {
    if (isAnyFieldEditing) {
      e.preventDefault();
      return;
    }
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

  function saveAddress() {
    if (!addressDraft.trim()) {
      toast.error("Address cannot be empty");
      setAddressDraft(item.address);
      setEditingAddress(false);
      return;
    }
    if (addressDraft.trim() !== item.address) {
      updatePipelineItem(item.id, { address: addressDraft.trim() });
      toast.success("Address updated");
    }
    setEditingAddress(false);
  }

  function cancelAddress() {
    setAddressDraft(item.address);
    setEditingAddress(false);
  }

  function savePrice() {
    const priceNum = priceDraft.trim()
      ? parseFloat(priceDraft.replace(/[^0-9.]/g, ""))
      : undefined;
    const newPrice = priceNum && Number.isFinite(priceNum) ? priceNum : undefined;
    if (newPrice !== item.price) {
      updatePipelineItem(item.id, { price: newPrice });
      toast.success("Price updated");
    }
    setEditingPrice(false);
  }

  function cancelPrice() {
    setPriceDraft(
      typeof item.price === "number" && Number.isFinite(item.price)
        ? item.price.toString()
        : ""
    );
    setEditingPrice(false);
  }

  function saveClient() {
    const newClient = clientNameDraft.trim() || undefined;
    if (newClient !== item.clientName) {
      updatePipelineItem(item.id, { clientName: newClient });
      toast.success("Client updated");
    }
    setEditingClient(false);
  }

  function cancelClient() {
    setClientNameDraft(item.clientName ?? "");
    setEditingClient(false);
  }

  function saveStage() {
    if (stageDraft !== item.stage) {
      updatePipelineItem(item.id, { stage: stageDraft });
      toast.success("Stage updated");
    }
    setEditingStage(false);
  }

  function cancelStage() {
    setStageDraft(item.stage);
    setEditingStage(false);
  }

  function handleAddressKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      saveAddress();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelAddress();
    }
  }

  function handlePriceKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      savePrice();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelPrice();
    }
  }

  function handleClientKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      saveClient();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelClient();
    }
  }

  function handleStageKeyDown(e: React.KeyboardEvent<HTMLSelectElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      saveStage();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelStage();
    }
  }

  function handleAddressClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (!editingAddress && !editingPrice && !editingClient && !editingStage) {
      setEditingAddress(true);
    }
  }

  function handlePriceClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (!editingAddress && !editingPrice && !editingClient && !editingStage) {
      setEditingPrice(true);
    }
  }

  function handleClientClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (!editingAddress && !editingPrice && !editingClient && !editingStage) {
      setEditingClient(true);
    }
  }

  function handleStageClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (!editingAddress && !editingPrice && !editingClient && !editingStage) {
      setEditingStage(true);
    }
  }

  return (
    <Card
      draggable={!isAnyFieldEditing}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={cn(
        "group p-3.5 select-none",
        "transition-all duration-200",
        !isAnyFieldEditing && "cursor-grab active:cursor-grabbing hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5",
        isDragging && "opacity-50 rotate-1 shadow-xl ring-2 ring-primary/40",
        isAnyFieldEditing && "ring-2 ring-primary/60 shadow-lg"
      )}
    >
      <div className="flex items-start gap-2">
        <MapPin className="size-4 text-primary mt-0.5 shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          {editingAddress ? (
            <Input
              ref={addressInputRef}
              type="text"
              value={addressDraft}
              onChange={(e) => setAddressDraft(e.target.value)}
              onBlur={saveAddress}
              onKeyDown={handleAddressKeyDown}
              placeholder="Property address"
              className="text-sm font-semibold mb-1"
            />
          ) : (
            <p
              onClick={handleAddressClick}
              className="font-display text-sm font-semibold leading-snug break-words text-foreground tracking-tight cursor-pointer hover:text-primary hover:underline decoration-primary/40 underline-offset-2 transition-colors"
              title="Click to edit address"
            >
              {item.address}
            </p>
          )}

          {editingPrice ? (
            <Input
              ref={priceInputRef}
              type="text"
              value={priceDraft}
              onChange={(e) => setPriceDraft(e.target.value)}
              onBlur={savePrice}
              onKeyDown={handlePriceKeyDown}
              placeholder="Price (optional)"
              className="text-sm mt-1"
            />
          ) : (
            typeof item.price === "number" && Number.isFinite(item.price) ? (
              <p
                onClick={handlePriceClick}
                className="font-display text-lg font-semibold tracking-tight mt-1 tabular-nums text-foreground cursor-pointer hover:text-primary hover:underline decoration-primary/40 underline-offset-2 transition-colors"
                title="Click to edit price"
              >
                {formatCurrency(item.price)}
              </p>
            ) : (
              <p
                onClick={handlePriceClick}
                className="text-xs text-muted-foreground mt-1 cursor-pointer hover:text-primary hover:underline decoration-primary/40 underline-offset-2 transition-colors"
                title="Click to add price"
              >
                + Add price
              </p>
            )
          )}
        </div>
        {!isAnyFieldEditing && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            loading={deleting}
            disabled={deleting}
            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Remove from pipeline"
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>

      {editingClient ? (
        <Input
          ref={clientInputRef}
          type="text"
          value={clientNameDraft}
          onChange={(e) => setClientNameDraft(e.target.value)}
          onBlur={saveClient}
          onKeyDown={handleClientKeyDown}
          placeholder="Client name (optional)"
          className="text-xs mt-2"
        />
      ) : (
        item.clientName ? (
          <div
            onClick={handleClientClick}
            className="flex items-center gap-1.5 mt-2.5 text-xs text-muted-foreground cursor-pointer hover:text-primary hover:underline decoration-primary/40 underline-offset-2 transition-colors"
            title="Click to edit client name"
          >
            <User className="size-3" aria-hidden="true" />
            <span className="font-display tracking-tight truncate">{item.clientName}</span>
          </div>
        ) : (
          <p
            onClick={handleClientClick}
            className="text-xs text-muted-foreground mt-2 cursor-pointer hover:text-primary hover:underline decoration-primary/40 underline-offset-2 transition-colors"
            title="Click to add client name"
          >
            + Add client name
          </p>
        )
      )}

      <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-border">
        {editingStage ? (
          <Select
            ref={stageSelectRef}
            value={stageDraft}
            onChange={(e) => setStageDraft(e.target.value as PipelineStage)}
            onBlur={saveStage}
            onKeyDown={handleStageKeyDown}
            className="text-xs flex-1"
          >
            <option value="Lead">Lead</option>
            <option value="Showing">Showing</option>
            <option value="Under Contract">Under Contract</option>
            <option value="Closed">Closed</option>
          </Select>
        ) : (
          <span
            onClick={handleStageClick}
            className={cn(
              "inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full tabular-nums cursor-pointer hover:ring-2 hover:ring-primary/40 hover:underline decoration-primary/40 underline-offset-2 transition-all",
              isStale
                ? "bg-destructive/10 text-destructive"
                : "bg-muted text-muted-foreground"
            )}
            title={`Click to change stage (${days} ${days === 1 ? "day" : "days"} in ${item.stage})`}
          >
            {days}d in {item.stage === "Under Contract" ? "U/C" : item.stage}
          </span>
        )}
        {!editingStage && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setNotesOpen((v) => !v);
            }}
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
        )}
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
