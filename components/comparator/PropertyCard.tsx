"use client";

import Image from "next/image";
import { AlertTriangle, WifiOff, Home, Bed, Bath, Ruler, Calendar, TrendingUp, Award } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { ZillowProperty } from "@/types";

export interface PropertyCardProps {
  property: ZillowProperty;
  isBestValue?: boolean;
  isHighestValue?: boolean;
}

function Badge({
  children,
  variant = "default",
  icon: Icon,
}: {
  children: React.ReactNode;
  variant?: "default" | "success" | "primary";
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold",
        variant === "default" && "bg-muted text-foreground",
        variant === "success" && "bg-[hsl(150_50%_93%)] text-[hsl(155_55%_28%)]",
        variant === "primary" && "bg-primary/10 text-primary"
      )}
    >
      {Icon && <Icon className="h-3 w-3" aria-hidden="true" />}
      {children}
    </span>
  );
}

function MetricRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-medium tabular-nums",
          highlight ? "text-destructive" : "text-foreground"
        )}
      >
        {value}
      </span>
    </div>
  );
}

function PropertyCard({ property, isBestValue, isHighestValue }: PropertyCardProps) {
  if (property.status === "no_data") {
    return (
      <Card className="overflow-hidden border-[hsl(38_92%_75%)] bg-[hsl(48_100%_97%)]">
        <div className="p-5 flex flex-col items-start gap-2">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-[hsl(38_92%_88%)] text-[hsl(35_85%_35%)]">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold text-foreground">No data found</p>
          <p className="text-xs text-muted-foreground break-words">
            We couldn&apos;t find a Zillow record for{" "}
            <span className="font-medium text-foreground">{property.address}</span>. Double-check the address and try again.
          </p>
        </div>
      </Card>
    );
  }

  if (property.status === "error") {
    return (
      <Card className="overflow-hidden border-destructive/40 bg-destructive/5">
        <div className="p-5 flex flex-col items-start gap-2">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-destructive/10 text-destructive">
            <WifiOff className="h-4 w-4" aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold text-foreground">Data unavailable</p>
          <p className="text-xs text-muted-foreground break-words">
            Check your connection and try again.
            {property.errorMessage ? (
              <span className="block mt-1 text-[11px] text-muted-foreground/80">
                {property.errorMessage}
              </span>
            ) : null}
          </p>
          <p className="text-[11px] text-muted-foreground/80 mt-1 break-words">
            {property.address}
          </p>
        </div>
      </Card>
    );
  }

  const headlinePrice = property.price ?? property.zestimate;
  const domHighlight = (property.daysOnMarket ?? 0) > 60;

  return (
    <Card className="overflow-hidden flex flex-col group hover:border-primary/40 transition-colors">
      <div className="relative h-44 w-full bg-muted">
        {property.photo ? (
          <Image
            src={property.photo}
            alt={property.address}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Home className="h-10 w-10" aria-hidden="true" />
          </div>
        )}

        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {isBestValue && (
            <span className="inline-flex items-center gap-1 rounded-md bg-[hsl(150_55%_42%)] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
              <Award className="h-3 w-3" aria-hidden="true" /> Best Value
            </span>
          )}
          {isHighestValue && (
            <span className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-sm">
              <TrendingUp className="h-3 w-3" aria-hidden="true" /> Highest Value
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-medium text-muted-foreground line-clamp-2 min-h-[2rem]">
          {property.address}
        </p>

        <div className="mt-2">
          <p className="font-display text-3xl font-semibold tracking-tight text-foreground tabular-nums">
            {formatCurrency(headlinePrice)}
          </p>
          {property.zestimate && property.price && property.zestimate !== property.price && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Zestimate: <span className="font-medium text-foreground">{formatCurrency(property.zestimate)}</span>
            </p>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge icon={Bed}>{property.bedrooms ?? "—"} bd</Badge>
          <Badge icon={Bath}>{property.bathrooms ?? "—"} ba</Badge>
          <Badge icon={Ruler}>
            {property.livingArea ? `${property.livingArea.toLocaleString()} sqft` : "— sqft"}
          </Badge>
        </div>

        <div className="mt-4 divide-y divide-border border-t border-border">
          <MetricRow
            label="Price / sqft"
            value={
              property.pricePerSqft
                ? `$${property.pricePerSqft.toLocaleString()}`
                : "—"
            }
          />
          <MetricRow
            label="Year built"
            value={property.yearBuilt ?? "—"}
          />
          <MetricRow
            label="Days on market"
            value={
              property.daysOnMarket !== null && property.daysOnMarket !== undefined ? (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" aria-hidden="true" />
                  {property.daysOnMarket}
                </span>
              ) : (
                "—"
              )
            }
            highlight={domHighlight}
          />
          <MetricRow
            label="Last sold"
            value={
              property.lastSoldPrice
                ? `${formatCurrency(property.lastSoldPrice)}${
                    property.lastSoldDate ? ` · ${formatDate(property.lastSoldDate)}` : ""
                  }`
                : "—"
            }
          />
          <MetricRow
            label="Tax assessed"
            value={formatCurrency(property.taxAssessedValue)}
          />
          <MetricRow
            label="Property type"
            value={property.propertyType ?? "—"}
          />
        </div>
      </div>
    </Card>
  );
}

export { PropertyCard };
export default PropertyCard;
