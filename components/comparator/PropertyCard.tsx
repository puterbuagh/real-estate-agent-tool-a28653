"use client";

import Image from "next/image";
import { AlertTriangle, WifiOff, Home, Bed, Bath, Ruler, TrendingUp, Award, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { ZillowProperty } from "@/types";

export interface PropertyCardProps {
  property: ZillowProperty;
  isBestValue?: boolean;
  isHighestValue?: boolean;
  onRetry?: () => void;
  retryCountdownSec?: number;
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
  displayValue = false,
}: {
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
  displayValue?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-medium tabular-nums",
          displayValue && "font-display",
          highlight ? "text-destructive" : "text-foreground"
        )}
      >
        {value}
      </span>
    </div>
  );
}

function formatAddress(address: string): string {
  const parts = address.split(',').map(p => p.trim()).filter(Boolean);
  const unique = parts.filter((part, index) => 
    parts.findIndex(p => p.toLowerCase() === part.toLowerCase()) === index
  );
  return unique.join(', ');
}

function cleanAddress(raw: string): { street: string; cityStateZip: string } {
  const cleaned = formatAddress(raw);
  const parts = cleaned.split(',').map(s => s.trim()).filter(Boolean);

  if (parts.length === 0) {
    return { street: raw, cityStateZip: "" };
  }

  const street = parts[0] ?? raw;
  const cityStateZip = parts.slice(1).join(", ");
  return { street, cityStateZip };
}

function PropertyCard({ property, isBestValue, isHighestValue, onRetry, retryCountdownSec }: PropertyCardProps) {
  if (property.status === "no_data") {
    const { street } = cleanAddress(property.address);
    return (
      <Card className="overflow-hidden border-[hsl(38_92%_75%)] bg-[hsl(48_100%_97%)]">
        <div className="p-5 flex flex-col items-start gap-2">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-[hsl(38_92%_88%)] text-[hsl(35_85%_35%)]">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          </div>
          <p className="font-display text-sm font-semibold text-foreground">No data found</p>
          <p className="text-xs text-muted-foreground break-words">
            We couldn&apos;t find a record for{" "}
            <span className="font-medium text-foreground">{street}</span>. Double-check the address and try again.
          </p>
        </div>
      </Card>
    );
  }

  if (property.status === "error") {
    const { street } = cleanAddress(property.address);
    return (
      <Card className="overflow-hidden border-destructive/40 bg-destructive/5">
        <div className="p-5 flex flex-col items-start gap-2">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-destructive/10 text-destructive">
            <WifiOff className="h-4 w-4" aria-hidden="true" />
          </div>
          <p className="font-display text-sm font-semibold text-foreground">Data unavailable</p>
          <p className="text-xs text-muted-foreground break-words">
            Check your connection and try again.
            {property.errorMessage ? (
              <span className="block mt-1 text-[11px] text-muted-foreground/80">
                {property.errorMessage}
              </span>
            ) : null}
          </p>
          <p className="text-[11px] text-muted-foreground/80 mt-1 break-words">
            {street}
          </p>
          {onRetry && (
            <Button size="sm" variant="outline" onClick={onRetry} className="mt-1">
              <RefreshCw className="h-3 w-3" aria-hidden="true" />
              Retry
            </Button>
          )}
          {!onRetry && typeof retryCountdownSec === "number" && retryCountdownSec > 0 && (
            <p className="text-[10px] text-muted-foreground mt-1 tabular-nums">
              Retry in {retryCountdownSec}s
            </p>
          )}
        </div>
      </Card>
    );
  }

  const headlinePrice = property.price ?? property.zestimate ?? property.lastSoldPrice;
  const { street: streetAddress, cityStateZip } = cleanAddress(property.address);

  // AVM fallback logic: show EITHER estimatedValue OR lastSoldPrice with date, not both
  const shouldShowEstimatedValue = property.estimatedValue !== null;
  const shouldShowLastSold = !shouldShowEstimatedValue && property.lastSoldPrice !== null;

  return (
    <Card className="overflow-hidden flex flex-col group hover:border-primary/40 hover:shadow-md transition-all duration-200">
      <div className="relative h-44 w-full bg-muted">
        {property.photo ? (
          <>
            <Image
              src={property.photo}
              alt={streetAddress}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover"
              unoptimized
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"
            />
          </>
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

        {property.photo && (
          <div className="absolute inset-x-0 bottom-0 p-3 pointer-events-none">
            <p className="font-display text-xs font-medium text-white/95 line-clamp-2 drop-shadow-md">
              {streetAddress}
            </p>
            {cityStateZip && (
              <p className="font-display text-[10px] font-normal text-white/80 mt-0.5 drop-shadow-md">
                {cityStateZip}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        {!property.photo && (
          <>
            <p className="font-display text-xs font-medium text-foreground line-clamp-2">
              {streetAddress}
            </p>
            {cityStateZip && (
              <p className="font-display text-[10px] font-normal text-muted-foreground mt-0.5">
                {cityStateZip}
              </p>
            )}
          </>
        )}

        <div className={cn(!property.photo && "mt-2")}>
          {headlinePrice !== null && (
            <p className="font-display text-3xl font-semibold tracking-tight text-foreground tabular-nums">
              {formatCurrency(headlinePrice)}
            </p>
          )}
          {property.zestimate && property.price && property.zestimate !== property.price && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Zestimate: <span className="font-display font-medium text-foreground tabular-nums">{formatCurrency(property.zestimate)}</span>
            </p>
          )}
        </div>

        {(property.bedrooms !== null || property.bathrooms !== null || property.livingArea !== null) && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {property.bedrooms !== null && <Badge icon={Bed}>{property.bedrooms} bd</Badge>}
            {property.bathrooms !== null && <Badge icon={Bath}>{property.bathrooms} ba</Badge>}
            {property.livingArea !== null && (
              <Badge icon={Ruler}>
                {property.livingArea.toLocaleString()} sqft
              </Badge>
            )}
          </div>
        )}

        <div className="mt-4 divide-y divide-border border-t border-border">
          {property.pricePerSqft !== null && (
            <MetricRow
              label="Price / sqft"
              displayValue
              value={`$${property.pricePerSqft.toLocaleString()}`}
            />
          )}
          {shouldShowEstimatedValue && (
            <MetricRow
              label="Est. value"
              displayValue
              value={formatCurrency(property.estimatedValue!)}
            />
          )}
          {shouldShowLastSold && (
            <MetricRow
              label="Last sold"
              displayValue
              value={
                property.lastSoldDate
                  ? `${formatCurrency(property.lastSoldPrice!)} \u00b7 ${formatDate(property.lastSoldDate)}`
                  : formatCurrency(property.lastSoldPrice!)
              }
            />
          )}
          {property.yearBuilt !== null && (
            <MetricRow
              label="Year built"
              value={property.yearBuilt}
            />
          )}
          {property.lotSize !== null && (
            <MetricRow
              label="Lot size"
              value={`${property.lotSize.toLocaleString()} sqft`}
            />
          )}
          {property.taxAssessedValue !== null && (
            <MetricRow
              label="Tax assessed"
              displayValue
              value={formatCurrency(property.taxAssessedValue)}
            />
          )}
          {property.propertyType !== null && (
            <MetricRow
              label="Property type"
              value={property.propertyType}
            />
          )}
        </div>
      </div>
    </Card>
  );
}

export { PropertyCard };
export default PropertyCard;
