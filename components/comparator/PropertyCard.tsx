"use client";

import Image from "next/image";
import { AlertTriangle, WifiOff, Home, Bed, Bath, Ruler, Calendar, TrendingUp, Award, RefreshCw } from "lucide-react";
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

function PropertyCard({ property, isBestValue, isHighestValue, onRetry, retryCountdownSec }: PropertyCardProps) {
  if (property.status === "no_data") {
    return (
      <Card className="overflow-hidden border-[hsl(38_92%_75%)] bg-[hsl(48_100%_97%)]">
        <div className="p-5 flex flex-col items-start gap-2">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-[hsl(38_92%_88%)] text-[hsl(35_85%_35%)]">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          </div>
          <p className="font-display text-sm font-semibold text-foreground">No data found</p>
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
            {property.address}
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

  const headlinePrice = property.price ?? property.zestimate;
  const domHighlight = (property.daysOnMarket ?? 0) > 60;

  return (
    <Card className="overflow-hidden flex flex-col group hover:border-primary/40 hover:shadow-md transition-all duration-200">
      <div className="relative h-44 w-full bg-muted">
        {property.photo ? (
          <>
            <Image
              src={property.photo}
              alt={property.address}
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
              {property.address}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        {!property.photo && (
          <p className="font-display text-xs font-medium text-muted-foreground line-clamp-2 min-h-[2rem]">
            {property.address}
          </p>
        )}

        <div className={cn(!property.photo && "mt-2")}>
          <p className="font-display text-3xl font-semibold tracking-tight text-foreground tabular-nums">
            {formatCurrency(headlinePrice)}
          </p>
          {property.zestimate && property.price && property.zestimate !== property.price && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Zestimate: <span className="font-display font-medium text-foreground tabular-nums">{formatCurrency(property.zestimate)}</span>
            </p>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge icon={Bed}>{property.bedrooms ?? "\u2014"} bd</Badge>
          <Badge icon={Bath}>{property.bathrooms ?? "\u2014"} ba</Badge>
          <Badge icon={Ruler}>
            {property.livingArea ? `${property.livingArea.toLocaleString()} sqft` : "\u2014 sqft"}
          </Badge>
        </div>

        <div className="mt-4 divide-y divide-border border-t border-border">
          <MetricRow
            label="Price / sqft"
            displayValue
            value={
              property.pricePerSqft
                ? `$${property.pricePerSqft.toLocaleString()}`
                : "\u2014"
            }
          />
          <MetricRow
            label="Year built"
            value={property.yearBuilt ?? "\u2014"}
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
                "\u2014"
              )
            }
            highlight={domHighlight}
          />
          <MetricRow
            label="Last sold"
            displayValue
            value={
              property.lastSoldPrice
                ? `${formatCurrency(property.lastSoldPrice)}${
                    property.lastSoldDate ? ` \u00b7 ${formatDate(property.lastSoldDate)}` : ""
                  }`
                : "\u2014"
            }
          />
          <MetricRow
            label="Tax assessed"
            displayValue
            value={formatCurrency(property.taxAssessedValue)}
          />
          <MetricRow
            label="Property type"
            value={property.propertyType ?? "\u2014"}
          />
        </div>
      </div>
    </Card>
  );
}

export { PropertyCard };
export default PropertyCard;
