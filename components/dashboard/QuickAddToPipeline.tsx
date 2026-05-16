"use client";

import * as React from "react";
import { z } from "zod";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
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
  address: z
    .string()
    .trim()
    .min(3, "Address must be at least 3 characters")
    .max(200, "Address is too long"),
  stage: z.enum(["Lead", "Showing", "Under Contract", "Closed"]),
  website: z.string().max(0).optional(), // honeypot
});

function QuickAddToPipeline() {
  const { addPipelineItem } = usePipeline();
  const [address, setAddress] = React.useState("");
  const [stage, setStage] = React.useState<PipelineStage>("Lead");
  const [website, setWebsite] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsed = schema.safeParse({ address, stage, website });
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Invalid input";
      setError(msg);
      return;
    }

    // Honeypot: silently accept bots
    if (parsed.data.website && parsed.data.website.length > 0) {
      setAddress("");
      setStage("Lead");
      return;
    }

    setSubmitting(true);
    try {
      addPipelineItem(parsed.data.address, parsed.data.stage);
      toast.success("Added to pipeline", {
        description: `${parsed.data.address} — ${parsed.data.stage}`,
      });
      setAddress("");
      setStage("Lead");
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
    <section className="rounded-lg border border-border bg-card">
      <header className="border-b border-border px-6 py-4">
        <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
          Quick Add to Pipeline
        </h2>
        <p className="text-xs text-muted-foreground">
          Drop a new property straight into your pipeline
        </p>
      </header>

      <form onSubmit={handleSubmit} noValidate className="px-6 py-5">
        {/* Honeypot — hidden from users */}
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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_220px_auto]">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="qa-address"
              className="text-xs font-medium text-foreground"
            >
              Property address
            </label>
            <input
              id="qa-address"
              type="text"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                if (error) setError(null);
              }}
              placeholder="123 Main St, Columbus, OH"
              autoComplete="street-address"
              className={cn(
                "h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground",
                "placeholder:text-muted-foreground/70",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "transition-colors",
                error && "border-destructive focus-visible:ring-destructive"
              )}
              aria-invalid={!!error}
              aria-describedby={error ? "qa-address-error" : undefined}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="qa-stage"
              className="text-xs font-medium text-foreground"
            >
              Stage
            </label>
            <select
              id="qa-stage"
              value={stage}
              onChange={(e) => setStage(e.target.value as PipelineStage)}
              className={cn(
                "h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "transition-colors"
              )}
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-transparent select-none">
              Add
            </span>
            <Button
              type="submit"
              loading={submitting}
              disabled={submitting || address.trim().length < 3}
              className="h-10 w-full sm:w-auto"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add to Pipeline
            </Button>
          </div>
        </div>

        {error && (
          <p
            id="qa-address-error"
            role="alert"
            className="mt-2 text-xs font-medium text-destructive"
          >
            {error}
          </p>
        )}
      </form>
    </section>
  );
}

export { QuickAddToPipeline };
export default QuickAddToPipeline;
