"use client";

import { Printer, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn, formatCurrency } from "@/lib/utils";
import type { ZillowProperty } from "@/types";

interface ClientReportProps {
  properties: ZillowProperty[];
  agentName?: string;
  agentPhone?: string;
  onClose: () => void;
}

function formatNum(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US").format(n);
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function ClientReport({
  properties,
  agentName = "Jordan Miller",
  agentPhone = "(614) 555-0142",
  onClose,
}: ClientReportProps) {
  const usable = properties.filter((p) => p.status === "ok");

  const lowestPpsf = Math.min(
    ...usable
      .map((p) => p.pricePerSqft)
      .filter((v): v is number => typeof v === "number" && v > 0)
  );
  const highestZest = Math.max(
    ...usable
      .map((p) => p.zestimate)
      .filter((v): v is number => typeof v === "number" && v > 0)
  );

  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-foreground/40 backdrop-blur-sm print:static print:bg-transparent print:backdrop-blur-none print:overflow-visible"
      role="dialog"
      aria-modal="true"
      aria-label="Client report preview"
    >
      <div className="mx-auto my-8 max-w-4xl px-4 print:my-0 print:max-w-none print:px-0">
        <div className="flex items-center justify-between gap-3 mb-4 print:hidden">
          <p className="text-xs uppercase tracking-[0.18em] text-white/80">
            Client report preview
          </p>
          <div className="flex items-center gap-2">
            <Button
              onClick={() =>
                typeof window !== "undefined" && window.print()
              }
              variant="primary"
            >
              <Printer className="h-4 w-4" aria-hidden="true" />
              Print / Save PDF
            </Button>
            <Button onClick={onClose} variant="outline">
              <X className="h-4 w-4" aria-hidden="true" />
              Close
            </Button>
          </div>
        </div>

        <article className="rounded-lg bg-white text-[hsl(222_35%_12%)] shadow-xl print:rounded-none print:shadow-none">
          <header className="flex items-start justify-between gap-6 border-b border-[hsl(220_16%_89%)] px-10 py-8 print:px-12 print:py-10">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[hsl(201_58%_43%)]">
                AgentDesk · Property Comparison Report
              </p>
              <h1
                className="mt-2 text-3xl font-semibold tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Prepared for your client
              </h1>
              <p className="mt-1 text-sm text-[hsl(220_12%_46%)]">
                {today} · {usable.length} propert
                {usable.length === 1 ? "y" : "ies"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold">{agentName}</p>
              <p className="text-xs text-[hsl(220_12%_46%)]">Ohio Realtor®</p>
              <p className="text-xs text-[hsl(220_12%_46%)] mt-1">
                {agentPhone}
              </p>
            </div>
          </header>

          <div className="divide-y divide-[hsl(220_16%_89%)]">
            {usable.map((p, idx) => {
              const isBestValue =
                Number.isFinite(lowestPpsf) && p.pricePerSqft === lowestPpsf;
              const isHighestValue =
                Number.isFinite(highestZest) && p.zestimate === highestZest;

              return (
                <section
                  key={p.zpid ?? `${p.address}-${idx}`}
                  className={cn(
                    "px-10 py-8 print:px-12 print:py-10",
                    idx < usable.length - 1 && "print:break-after-page"
                  )}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[hsl(220_12%_46%)]">
                        Property {idx + 1}
                      </p>
                      <h2
                        className="mt-1 text-xl font-semibold tracking-tight"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        {p.address}
                      </h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {isHighestValue && (
                        <span className="rounded-full bg-[hsl(201_58%_43%/0.1)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(201_58%_38%)]">
                          Highest Value
                        </span>
                      )}
                      {isBestValue && (
                        <span className="rounded-full bg-[hsl(152_55%_42%/0.12)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(152_55%_28%)]">
                          Best Value
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
                    <Stat label="List Price" value={formatCurrency(p.price)} large />
                    <Stat
                      label="Zestimate"
                      value={formatCurrency(p.zestimate)}
                      large
                    />
                    <Stat
                      label="$/Sqft"
                      value={
                        p.pricePerSqft
                          ? `$${formatNum(p.pricePerSqft)}`
                          : "—"
                      }
                      large
                    />
                    <Stat
                      label="Days on Market"
                      value={formatNum(p.daysOnMarket)}
                      large
                    />
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-3 border-t border-[hsl(220_16%_89%)] pt-5 sm:grid-cols-3">
                    <Stat label="Beds" value={formatNum(p.bedrooms)} />
                    <Stat label="Baths" value={formatNum(p.bathrooms)} />
                    <Stat
                      label="Living Area"
                      value={
                        p.livingArea ? `${formatNum(p.livingArea)} sqft` : "—"
                      }
                    />
                    <Stat
                      label="Lot Size"
                      value={
                        p.lotSize === null || p.lotSize === undefined
                          ? "—"
                          : typeof p.lotSize === "number"
                          ? `${formatNum(p.lotSize)} sqft`
                          : String(p.lotSize)
                      }
                    />
                    <Stat label="Year Built" value={formatNum(p.yearBuilt)} />
                    <Stat
                      label="Property Type"
                      value={p.propertyType ?? "—"}
                    />
                    <Stat
                      label="Last Sold"
                      value={
                        p.lastSoldPrice
                          ? `${formatCurrency(p.lastSoldPrice)}`
                          : "—"
                      }
                    />
                    <Stat
                      label="Last Sold Date"
                      value={formatDate(p.lastSoldDate)}
                    />
                    <Stat
                      label="Tax Assessed"
                      value={formatCurrency(p.taxAssessedValue)}
                    />
                  </div>
                </section>
              );
            })}
          </div>

          <footer className="border-t border-[hsl(220_16%_89%)] px-10 py-6 print:px-12">
            <p className="text-[11px] leading-relaxed text-[hsl(220_12%_46%)]">
              Data sourced from public listing data via Zillow. Zestimate® is an
              estimated market value and not an appraisal. This report is
              prepared by {agentName} for informational purposes only.
            </p>
          </footer>
        </article>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  large = false,
}: {
  label: string;
  value: React.ReactNode;
  large?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[hsl(220_12%_46%)]">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 tabular-nums text-[hsl(222_35%_12%)]",
          large ? "text-xl font-semibold" : "text-sm font-medium"
        )}
        style={large ? { fontFamily: "var(--font-display)" } : undefined}
      >
        {value}
      </p>
    </div>
  );
}

export { ClientReport };
export default ClientReport;
