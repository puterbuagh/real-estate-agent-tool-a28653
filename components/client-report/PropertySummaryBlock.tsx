"use client";

import * as React from "react";
import Image from "next/image";
import { Award, Home } from "lucide-react";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import type { ComparedProperty } from "@/types";

export interface PropertySummaryBlockProps {
  property: ComparedProperty & {
    photo?: string | null;
    price?: number | null;
    bedrooms?: number | null;
    bathrooms?: number | null;
    livingArea?: number | null;
    pricePerSqft?: number | null;
  };
  isBestValue?: boolean;
  isHighestValue?: boolean;
  notes: string;
  onNotesChange: (value: string) => void;
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium">
        {label}
      </span>
      <span className="font-display text-base font-semibold tabular-nums text-foreground">
        {value}
      </span>
    </div>
  );
}

function PropertySummaryBlock({
  property,
  isBestValue = false,
  isHighestValue = false,
  notes,
  onNotesChange,
}: PropertySummaryBlockProps) {
  const photo = property.photo ?? null;
  const price = property.price ?? property.zestimate ?? null;
  const ppsf =
    property.pricePerSqft ??
    (price && property.livingArea
      ? Math.round(price / property.livingArea)
      : null);

  return (
    <article
      data-print-break-inside="avoid"
      className="rounded-lg border border-border bg-card overflow-hidden"
    >
      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr]">
        <div className="relative h-44 md:h-full bg-muted">
          {photo ? (
            <Image
              src={photo}
              alt={property.address}
              fill
              sizes="(max-width: 768px) 100vw, 220px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <Home className="h-8 w-8" aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-display text-lg font-semibold tracking-tight text-foreground break-words">
                {property.address}
              </h3>
              <p className="font-display text-2xl font-semibold tracking-tight tabular-nums text-primary mt-1">
                {formatCurrency(price)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              {isBestValue && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-1",
                    "bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]",
                    "text-[11px] font-semibold uppercase tracking-wider"
                  )}
                >
                  <Award className="h-3 w-3" aria-hidden="true" />
                  Best Value
                </span>
              )}
              {isHighestValue && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-1",
                    "bg-primary/10 text-primary",
                    "text-[11px] font-semibold uppercase tracking-wider"
                  )}
                >
                  <Award className="h-3 w-3" aria-hidden="true" />
                  Highest Value
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 border-t border-border">
            <Stat label="Price" value={formatCurrency(price)} />
            <Stat
              label="Beds"
              value={
                property.bedrooms !== null && property.bedrooms !== undefined
                  ? formatNumber(property.bedrooms)
                  : "—"
              }
            />
            <Stat
              label="Baths"
              value={
                property.bathrooms !== null && property.bathrooms !== undefined
                  ? formatNumber(property.bathrooms)
                  : "—"
              }
            />
            <Stat
              label="Sqft"
              value={
                property.livingArea !== null &&
                property.livingArea !== undefined
                  ? formatNumber(property.livingArea)
                  : "—"
              }
            />
            <Stat
              label="$/Sqft"
              value={ppsf ? `$${formatNumber(ppsf)}` : "—"}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={`notes-${property.address}`}
              className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-medium"
            >
              Agent observations
            </label>
            <textarea
              id={`notes-${property.address}`}
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Why this property matters for your client — condition, location, value play…"
              rows={3}
              className={cn(
                "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground",
                "placeholder:text-muted-foreground/70",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "resize-none"
              )}
            />
            {notes.trim().length > 0 && (
              <p
                className="hidden text-sm leading-relaxed text-foreground whitespace-pre-wrap print:block"
                aria-hidden="true"
              >
                {notes}
              </p>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export { PropertySummaryBlock };
export default PropertySummaryBlock;
