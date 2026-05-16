"use client";

import * as React from "react";
import { z } from "zod";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { usePipeline } from "@/context/PipelineContext";
import type { PipelineStage } from "@/types";
import { cn } from "@/lib/utils";

const STAGES: PipelineStage[] = [
  "Lead",
  "Showing",
  "Under Contract",
  "Closed",
];

const schema = z.object({
  address: z.string().trim().min(3, "Address is required").max(200),
  price: z
    .string()
    .trim()
    .optional()
    .refine(
      (v) => !v || (!Number.isNaN(Number(v.replace(/[^0-9.]/g, ""))) && Number(v.replace(/[^0-9.]/g, "")) >= 0),
      "Price must be a positive number"
    ),
  clientName: z.string().trim().max(100).optional(),
  stage: z.enum(["Lead", "Showing", "Under Contract", "Closed"]),
  notes: z.string().max(2000).optional(),
  website: z.string().max(0).optional(),
});

function AddPropertyForm() {
  const { addPipelineItem } = usePipeline();
  const [address, setAddress] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [clientName, setClientName] = React.useState("");
  const [stage, setStage] = React.useState<PipelineStage>("Lead");
  const [notes, setNotes] = React.useState("");
  const [website, setWebsite] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsed = schema.safeParse({
      address,
      price,
      clientName,
      stage,
      notes,
      website,
    });
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Invalid input";
      setError(msg);
      return;
    }

    if (parsed.data.website && parsed.data.website.length > 0) {
      // Honeypot triggered — pretend success
      setAddress("");
      setPrice("");
      setClientName("");
      setStage("Lead");
      setNotes("");
      return;
    }

    setSubmitting(true);
    try {
      const cleanPrice = parsed.data.price
        ? Number(parsed.data.price.replace(/[^0-9.]/g, ""))
        : null;

      addPipelineItem({
        address: parsed.data.address,
        stage: parsed.data.stage,
        price: cleanPrice,
        clientName: parsed.data.clientName || null,
        notes: parsed.data.notes || "",
      });

      toast.success("Added to pipeline", {
        description: `${parsed.data.address} — ${parsed.data.stage}`,
      });

      setAddress("");
      setPrice("");
      setClientName("");
      setStage("Lead");
      setNotes("");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to add to pipeline";
      toast.error(msg);
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
          Add Property
        </h2>
        <p className="text-xs text-muted-foreground">
          Drop a new property into any stage of your pipeline
        </p>
      </div>
      <form onSubmit={handleSubmit} noValidate className="space-y-3">
        <div
          aria-hidden="true"
          className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
        >
          <label>
            Website
            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-5 space-y-1.5">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Address
            </label>
            <Input
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                if (error) setError(null);
              }}
              placeholder="123 Riverside Dr, Columbus, OH"
              aria-invalid={!!error}
            />
          </div>
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Price
            </label>
            <Input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="$425,000"
              inputMode="numeric"
            />
          </div>
          <div className="md:col-span-3 space-y-1.5">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Client name
            </label>
            <Input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Sarah Patel"
            />
          </div>
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Stage
            </label>
            <Select
              value={stage}
              onChange={(e) => setStage(e.target.value as PipelineStage)}
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Pre-approved for $500k, looking for 3+ bed, prefers Clintonville"
            rows={2}
            className={cn(
              "flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background",
              "transition-colors resize-none"
            )}
          />
        </div>

        {error && (
          <p role="alert" className="text-xs font-medium text-destructive">
            {error}
          </p>
        )}

        <div className="flex justify-end">
          <Button
            type="submit"
            loading={submitting}
            disabled={submitting || address.trim().length < 3}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add to Pipeline
          </Button>
        </div>
      </form>
    </Card>
  );
}

export { AddPropertyForm };
export default AddPropertyForm;
