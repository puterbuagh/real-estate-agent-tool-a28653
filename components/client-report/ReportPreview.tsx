"use client";

import * as React from "react";
import Image from "next/image";
import {
  Printer,
  Link2,
  Award,
  Home,
  Phone,
  Mail,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn, formatCurrency, formatNumber, formatDate } from "@/lib/utils";
import { useAgentBranding } from "@/context/AgentBrandingContext";
import type { Comparison, ComparedProperty } from "@/types";

export interface ReportPreviewProps {
  comparison: Comparison | null;
  branding?: {
    fullName?: string;
    phone?: string;
    email?: string;
    brokerage?: string;
  };
  clientName: string;
}

interface EnrichedProperty extends ComparedProperty {
  price?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  livingArea?: number | null;
  pricePerSqft?: number | null;
  photo?: string | null;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </p>
      <p className="font-display text-base font-semibold tabular-nums text-foreground mt-0.5">
        {value}
      </p>
    </div>
  );
}

function PropertyBlock({
  property,
  notes,
  onNotesChange,
  isBestValue,
  index,
}: {
  property: EnrichedProperty;
  notes: string;
  onNotesChange: (v: string) => void;
  isBestValue: boolean;
  index: number;
}) {
  const price = property.price ?? property.zestimate ?? null;

  return (
    <section
      data-print-break-inside="avoid"
      className="report-property rounded-lg border border-border bg-card overflow-hidden"
    >
      <div className="grid gap-0 md:grid-cols-[280px_1fr]">
        <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[200px] bg-muted">
          {property.photo ? (
            <Image
              src={property.photo}
              alt={property.address || `Property ${index + 1}`}
              fill
              sizes="(max-width: 768px) 100vw, 280px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <Home className="h-10 w-10" aria-hidden="true" />
            </div>
          )}
          {isBestValue && (
            <div className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground shadow-sm">
              <Award className="h-3 w-3" aria-hidden="true" />
              Best Value
            </div>
          )}
        </div>

        <div className="p-5 space-y-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-medium">
              Property {index + 1}
            </p>
            <h3 className="font-display text-xl font-semibold tracking-tight text-foreground mt-0.5 break-words">
              {property.address || "Address unavailable"}
            </h3>
            <p className="font-display text-3xl font-semibold tracking-tight tabular-nums text-primary mt-2">
              {formatCurrency(price)}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 border-t border-border">
            <Stat label="Price" value={formatCurrency(price)} />
            <Stat label="Beds" value={formatNumber(property.bedrooms ?? null)} />
            <Stat
              label="Baths"
              value={formatNumber(property.bathrooms ?? null)}
            />
            <Stat
              label="Sqft"
              value={formatNumber(property.livingArea ?? null)}
            />
            <Stat
              label="$/Sqft"
              value={
                property.pricePerSqft
                  ? `$${formatNumber(property.pricePerSqft)}`
                  : "—"
              }
            />
          </div>

          <div className="no-print">
            <label
              htmlFor={`notes-${index}`}
              className="text-xs font-medium text-foreground"
            >
              Agent observations
            </label>
            <textarea
              id={`notes-${index}`}
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="e.g. Quiet cul-de-sac, recently renovated kitchen, walk to downtown…"
              rows={2}
              className={cn(
                "mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground",
                "placeholder:text-muted-foreground/70",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "resize-none"
              )}
            />
          </div>

          {notes && (
            <div className="hidden print:block pt-3 border-t border-border">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-medium mb-1">
                Agent observations
              </p>
              <p className="text-sm text-foreground leading-relaxed">{notes}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ReportPreview({
  comparison,
  branding: brandingProp,
  clientName,
}: ReportPreviewProps) {
  const { branding: contextBranding } = useAgentBranding();
  const branding = brandingProp ?? contextBranding;

  const agentName = branding?.fullName || "Your Name";
  const agentPhone = branding?.phone || "";
  const agentEmail = branding?.email || "";
  const agentBrokerage = branding?.brokerage || "AgentDesk Realty";
  const safeClientName = clientName?.trim() || "your client";

  const [notesMap, setNotesMap] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    setNotesMap({});
  }, [comparison?.id]);

  const properties: EnrichedProperty[] = React.useMemo(() => {
    if (!comparison || !Array.isArray(comparison.properties)) return [];
    return comparison.properties as EnrichedProperty[];
  }, [comparison]);

  const bestValueAddress = React.useMemo(() => {
    if (properties.length === 0) return null;
    const usable = properties.filter(
      (p) =>
        typeof p.pricePerSqft === "number" && (p.pricePerSqft ?? 0) > 0
    );
    if (usable.length === 0) {
      const sorted = [...properties].sort(
        (a, b) => (b.zestimate ?? 0) - (a.zestimate ?? 0)
      );
      return sorted[0]?.address ?? null;
    }
    const sorted = [...usable].sort(
      (a, b) => (a.pricePerSqft ?? Infinity) - (b.pricePerSqft ?? Infinity)
    );
    return sorted[0]?.address ?? null;
  }, [properties]);

  const reportDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  function handlePrint() {
    if (typeof window !== "undefined") {
      window.print();
    }
  }

  function handleCopyLink() {
    if (typeof window === "undefined" || !comparison) return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("id", comparison.id);
      navigator.clipboard
        .writeText(url.toString())
        .then(() => toast.success("Shareable link copied"))
        .catch(() => toast.error("Couldn't copy link"));
    } catch {
      toast.error("Couldn't copy link");
    }
  }

  if (!comparison) {
    return (
      <EmptyState
        icon={Printer}
        title="Select a comparison to preview the report"
        description="Once you pick a saved comparison above, your branded, print-ready report will render here."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div
        className="flex flex-wrap items-center justify-between gap-3 no-print"
        data-print-hide="true"
      >
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight">
            Report preview
          </h2>
          <p className="text-xs text-muted-foreground">
            This is exactly what your client will see.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleCopyLink}>
            <Link2 className="h-4 w-4" aria-hidden="true" />
            Copy shareable link
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4" aria-hidden="true" />
            Print / Save as PDF
          </Button>
        </div>
      </div>

      <div className="report-page p-8 md:p-10 space-y-8">
        <header className="report-header flex flex-col gap-6 border-b border-border pb-6 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-primary font-semibold">
              {agentBrokerage}
            </p>
            <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight text-foreground mt-2">
              Property Comparison Report
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Prepared exclusively for{" "}
              <span className="font-display font-semibold tracking-tight text-foreground">
                {safeClientName}
              </span>
              {" · "}
              {reportDate}
            </p>
          </div>

          <div className="rounded-md border border-border bg-muted/30 p-4 text-sm space-y-1.5 min-w-[220px]">
            <p className="font-display text-base font-semibold tracking-tight text-foreground">
              {agentName}
            </p>
            {agentBrokerage && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Building2 className="h-3 w-3" aria-hidden="true" />
                {agentBrokerage}
              </p>
            )}
            {agentPhone && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Phone className="h-3 w-3" aria-hidden="true" />
                {agentPhone}
              </p>
            )}
            {agentEmail && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Mail className="h-3 w-3" aria-hidden="true" />
                {agentEmail}
              </p>
            )}
          </div>
        </header>

        <div className="space-y-4">
          {properties.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              This comparison has no properties to display.
            </p>
          ) : (
            properties.map((p, idx) => (
              <PropertyBlock
                key={`${p.address}-${idx}`}
                property={p}
                notes={notesMap[p.address] ?? ""}
                onNotesChange={(v) =>
                  setNotesMap((prev) => ({ ...prev, [p.address]: v }))
                }
                isBestValue={p.address === bestValueAddress}
                index={idx}
              />
            ))
          )}
        </div>

        <footer className="report-footer border-t border-border pt-6 space-y-3">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Data sourced from Zillow. Values are estimates and should not be considered appraisals.
            Comparison generated {formatDate(comparison.createdAt)}; rendered {reportDate}.
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="font-display text-sm font-semibold tracking-tight text-foreground">
              {agentName}
              {agentBrokerage ? ` · ${agentBrokerage}` : ""}
            </span>
            <span className="tabular-nums">
              {[agentPhone, agentEmail]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}

export { ReportPreview };
export default ReportPreview;
