"use client";

import Image from "next/image";
import { AlertTriangle, WifiOff, Home, Bed, Bath, Ruler, TrendingUp, Award, RefreshCw, Edit2, Check, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { ZillowProperty } from "@/types";
import { useState, useEffect } from "react";
import { calculateAgentDeskEstimate } from "@/lib/valuation";
import type { ValuationResult } from "@/types";
import { toast } from "sonner";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

if (!GOOGLE_MAPS_API_KEY) {
  console.warn(
    "[PropertyCard] NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not defined. Street View images will fail with 403 errors. Add the key to your .env.local file."
  );
}

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
  isEdited = false,
}: {
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
  displayValue?: boolean;
  isEdited?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-xs">
      <span className="text-muted-foreground flex items-center gap-1.5">
        {label}
        {isEdited && (
          <span
            className="w-1.5 h-1.5 rounded-full bg-primary inline-block"
            title="Manually edited"
          />
        )}
      </span>
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

function getStreetViewUrl(address: string): string {
  const encoded = encodeURIComponent(address);
  return `https://maps.googleapis.com/maps/api/streetview?size=600x300&location=${encoded}&key=${GOOGLE_MAPS_API_KEY}&fov=90&pitch=0`;
}

function formatLotSize(lotSize: number): string {
  if (lotSize > 100) {
    const acres = lotSize / 43560;
    return `${acres.toFixed(2)} acres`;
  }
  return `${lotSize.toFixed(2)} acres`;
}

function PropertyCard({ property, isBestValue, isHighestValue, onRetry, retryCountdownSec }: PropertyCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editValues, setEditValues] = useState<{
    bedrooms?: number | string;
    bathrooms?: number | string;
    livingArea?: number | string;
    yearBuilt?: number | string;
    lotSize?: number | string;
    propertySubType?: string;
  }>({});
  const [overrides, setOverrides] = useState<Record<string, unknown>>({});
  const [liveValuation, setLiveValuation] = useState<ValuationResult | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (property.overrides) {
      setOverrides(property.overrides);
    }
  }, [property.overrides]);

  useEffect(() => {
    if (!editMode) {
      setEditValues({});
      setLiveValuation(null);
    }
  }, [editMode]);

  const recalculateValuation = () => {
    if (!property.valuationInputs) return;
    try {
      const updated = calculateAgentDeskEstimate({
        ...property.valuationInputs,
        subjectSqft: typeof editValues.livingArea === 'number' ? editValues.livingArea : (property.livingArea ?? property.valuationInputs.subjectSqft),
      });
      setLiveValuation(updated);
    } catch (err) {
      console.error("[PropertyCard] recalculation failed:", err);
    }
  };

  useEffect(() => {
    if (editMode) {
      recalculateValuation();
    }
  }, [editValues.livingArea, editMode]);

  const handleFieldChange = (field: string, value: number | string) => {
    setEditValues((prev) => ({ ...prev, [field]: value === '' ? '' : value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const changes: Record<string, unknown> = {};
      if (editValues.bedrooms !== undefined && editValues.bedrooms !== property.bedrooms) {
        changes.bedrooms = editValues.bedrooms === '' ? null : Number(editValues.bedrooms);
      }
      if (editValues.bathrooms !== undefined && editValues.bathrooms !== property.bathrooms) {
        changes.bathrooms = editValues.bathrooms === '' ? null : Number(editValues.bathrooms);
      }
      if (editValues.livingArea !== undefined && editValues.livingArea !== property.livingArea) {
        changes.livingArea = editValues.livingArea === '' ? null : Number(editValues.livingArea);
      }
      if (editValues.yearBuilt !== undefined && editValues.yearBuilt !== property.yearBuilt) {
        changes.yearBuilt = editValues.yearBuilt === '' ? null : Number(editValues.yearBuilt);
      }
      if (editValues.lotSize !== undefined && editValues.lotSize !== property.lotSize) {
        changes.lotSize = editValues.lotSize === '' ? null : Number(editValues.lotSize);
      }
      if (editValues.propertySubType !== undefined && editValues.propertySubType !== property.propertySubType) {
        changes.propertySubType = editValues.propertySubType || null;
      }

      const res = await fetch("/api/property-overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: property.address,
          overrides: changes,
        }),
      });

      if (!res.ok) {
        let errorData;
        const contentType = res.headers.get("content-type");
        
        if (contentType && contentType.includes("application/json")) {
          errorData = await res.json().catch(() => ({ error: 'Failed to parse error response' }));
        } else {
          const textBody = await res.text().catch(() => 'No response body');
          errorData = { 
            error: `Server returned ${res.status}: ${res.statusText}`,
            details: textBody.substring(0, 200)
          };
        }
        
        console.error('[PropertyCard] save failed details:', {
          status: res.status,
          statusText: res.statusText,
          error: errorData.error,
          code: errorData.code,
          details: errorData.details,
          hint: errorData.hint,
        });
        throw new Error(errorData.error || `Save failed with status ${res.status}`);
      }

      setOverrides(changes);
      setEditMode(false);
      toast.success("Property details saved");
    } catch (err) {
      console.error("[PropertyCard] save failed:", err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save changes';
      toast.error(`Save failed: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      const res = await fetch(
        `/api/property-overrides?address=${encodeURIComponent(property.address)}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        let errorData;
        const contentType = res.headers.get("content-type");
        
        if (contentType && contentType.includes("application/json")) {
          errorData = await res.json().catch(() => ({ error: 'Failed to parse error response' }));
        } else {
          const textBody = await res.text().catch(() => 'No response body');
          errorData = { 
            error: `Server returned ${res.status}: ${res.statusText}`,
            details: textBody.substring(0, 200)
          };
        }
        
        console.error('[PropertyCard] reset failed details:', {
          status: res.status,
          error: errorData.error,
        });
        throw new Error(errorData.error || `Reset failed with status ${res.status}`);
      }

      setOverrides({});
      setEditValues({});
      setEditMode(false);
      toast.success("Reset to original data");
    } catch (err) {
      console.error("[PropertyCard] reset failed:", err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset';
      toast.error(`Reset failed: ${errorMessage}`);
    }
  };

  if (property.status === "no_data") {
    const { street } = cleanAddress(property.address);
    return (
      <Card className="overflow-hidden border-[hsl(38_92%_75%)] bg-[hsl(48_100%_97%)]">
        <div className="p-6 text-center">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-[hsl(38_92%_88%)] text-[hsl(35_85%_35%)] mb-2">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          </div>
          <p className="font-display text-sm font-semibold text-foreground">No data available</p>
          <p className="text-xs text-muted-foreground break-words mt-1">
            ATTOM has no record for this address.
          </p>
          <p className="text-xs text-muted-foreground/80 mt-2 break-words">
            {street}
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

  const shouldShowEstimatedValue = property.estimatedValue !== null;
  const shouldShowLastSold = property.lastSoldPrice !== null;

  const streetViewUrl = getStreetViewUrl(property.address);
  const imageSource = streetViewUrl || property.photo;
  const shouldShowImage = !imageError;

  const displayBedrooms = editValues.bedrooms !== undefined ? editValues.bedrooms : property.bedrooms;
  const displayBathrooms = editValues.bathrooms !== undefined ? editValues.bathrooms : property.bathrooms;
  const displayLivingArea = editValues.livingArea !== undefined ? editValues.livingArea : property.livingArea;
  const displayYearBuilt = editValues.yearBuilt !== undefined ? editValues.yearBuilt : property.yearBuilt;
  const displayLotSize = editValues.lotSize !== undefined ? editValues.lotSize : property.lotSize;
  const displayPropertySubType = editValues.propertySubType !== undefined ? editValues.propertySubType : property.propertySubType;

  const currentValuation = liveValuation ?? property.agentDeskValuation;
  const originalValuation = property.agentDeskValuation;

  return (
    <Card className="overflow-hidden flex flex-col group hover:border-primary/40 hover:shadow-md transition-all duration-200">
      <div className="relative h-44 w-full bg-muted">
        {shouldShowImage ? (
          <>
            <Image
              src={imageSource}
              alt={streetAddress}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover"
              onError={() => setImageError(true)}
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

        {isClient && (
          <div className="absolute right-3 top-3">
            <button
              onClick={() => setEditMode(!editMode)}
              className="inline-flex items-center justify-center rounded-md bg-white/90 hover:bg-white p-2 text-foreground shadow-sm transition-colors"
              title={editMode ? "Cancel editing" : "Edit property details"}
            >
              {editMode ? (
                <X className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Edit2 className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
        )}

        {shouldShowImage && (
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
        {!shouldShowImage && (
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

        <div className={cn(!shouldShowImage && "mt-2")}>
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

        {!editMode && (displayBedrooms !== null || displayBathrooms !== null || displayLivingArea !== null) && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {displayBedrooms !== null && <Badge icon={Bed}>{displayBedrooms} bd</Badge>}
            {displayBathrooms !== null && <Badge icon={Bath}>{displayBathrooms} ba</Badge>}
            {displayLivingArea !== null && (
              <Badge icon={Ruler}>
                {Number(displayLivingArea).toLocaleString()} sqft
              </Badge>
            )}
          </div>
        )}

        <div className="mt-4 divide-y divide-border border-t border-border">
          {isClient && editMode ? (
            <>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  Beds
                  {overrides.bedrooms !== undefined && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                  )}
                </span>
                <input
                  type="number"
                  value={editValues.bedrooms !== undefined ? editValues.bedrooms : (property.bedrooms ?? '')}
                  onChange={(e) => handleFieldChange("bedrooms", e.target.value)}
                  placeholder="Add beds"
                  className="w-20 text-right text-xs border border-border rounded px-2 py-1 bg-background"
                  min={0}
                  max={20}
                />
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  Baths
                  {overrides.bathrooms !== undefined && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                  )}
                </span>
                <input
                  type="number"
                  value={editValues.bathrooms !== undefined ? editValues.bathrooms : (property.bathrooms ?? '')}
                  onChange={(e) => handleFieldChange("bathrooms", e.target.value)}
                  placeholder="Add baths"
                  className="w-20 text-right text-xs border border-border rounded px-2 py-1 bg-background"
                  min={0}
                  max={20}
                  step={0.5}
                />
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  Sqft
                  {overrides.livingArea !== undefined && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                  )}
                </span>
                <input
                  type="number"
                  value={editValues.livingArea !== undefined ? editValues.livingArea : (property.livingArea ?? '')}
                  onChange={(e) => handleFieldChange("livingArea", e.target.value)}
                  placeholder="Add sqft"
                  className="w-24 text-right text-xs border border-border rounded px-2 py-1 bg-background"
                  min={0}
                  max={50000}
                />
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  Year built
                  {overrides.yearBuilt !== undefined && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                  )}
                </span>
                <input
                  type="number"
                  value={editValues.yearBuilt !== undefined ? editValues.yearBuilt : (property.yearBuilt ?? '')}
                  onChange={(e) => handleFieldChange("yearBuilt", e.target.value)}
                  placeholder="Add year"
                  className="w-20 text-right text-xs border border-border rounded px-2 py-1 bg-background"
                  min={1800}
                  max={new Date().getFullYear() + 5}
                />
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  Lot size
                  {overrides.lotSize !== undefined && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                  )}
                </span>
                <input
                  type="number"
                  value={editValues.lotSize !== undefined ? editValues.lotSize : (property.lotSize ?? '')}
                  onChange={(e) => handleFieldChange("lotSize", e.target.value)}
                  placeholder="Add lot size"
                  className="w-24 text-right text-xs border border-border rounded px-2 py-1 bg-background"
                  min={0}
                  step={0.01}
                />
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  Property type
                  {overrides.propertySubType !== undefined && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                  )}
                </span>
                <select
                  value={editValues.propertySubType !== undefined ? editValues.propertySubType : (property.propertySubType ?? '')}
                  onChange={(e) => handleFieldChange("propertySubType", e.target.value)}
                  className="text-right text-xs border border-border rounded px-2 py-1 bg-background"
                >
                  <option value="">Select type</option>
                  <option value="Single Family Residence">Single Family</option>
                  <option value="Condominium">Condo</option>
                  <option value="Townhouse">Townhouse</option>
                  <option value="Multi-Family">Multi-Family</option>
                  <option value="Land">Land</option>
                </select>
              </div>
            </>
          ) : (
            <>
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
              {displayBedrooms !== null && (
                <MetricRow
                  label="Beds"
                  value={displayBedrooms}
                  isEdited={overrides.bedrooms !== undefined}
                />
              )}
              {displayBathrooms !== null && (
                <MetricRow
                  label="Baths"
                  value={displayBathrooms}
                  isEdited={overrides.bathrooms !== undefined}
                />
              )}
              {displayLivingArea !== null && (
                <MetricRow
                  label="Sqft"
                  value={Number(displayLivingArea).toLocaleString()}
                  isEdited={overrides.livingArea !== undefined}
                />
              )}
              {displayYearBuilt !== null && (
                <MetricRow
                  label="Year built"
                  value={displayYearBuilt}
                  isEdited={overrides.yearBuilt !== undefined}
                />
              )}
              {displayLotSize !== null && (
                <MetricRow
                  label="Lot size"
                  value={formatLotSize(Number(displayLotSize))}
                  isEdited={overrides.lotSize !== undefined}
                />
              )}
              {property.taxAssessedValue !== null && (
                <MetricRow
                  label="Tax assessed"
                  displayValue
                  value={formatCurrency(property.taxAssessedValue)}
                />
              )}
              {displayPropertySubType !== null && (
                <MetricRow
                  label="Property type"
                  value={displayPropertySubType}
                  isEdited={overrides.propertySubType !== undefined}
                />
              )}
            </>
          )}

          {currentValuation && (
            <>
              <div className="border-t border-border my-2" />

              <div className="flex justify-between items-center py-1.5">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  {editMode && liveValuation ? "AgentDesk Estimate (edited)" : "AgentDesk Estimate"}
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                      currentValuation.confidence === "high" &&
                        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                      currentValuation.confidence === "medium" &&
                        "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
                      currentValuation.confidence === "low" &&
                        "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    )}
                  >
                    {currentValuation.confidence}
                  </span>
                </span>
                <span className="text-xs font-semibold font-display tabular-nums">
                  {formatCurrency(currentValuation.estimate)}
                  {editMode && liveValuation && originalValuation && liveValuation.estimate !== originalValuation.estimate && (
                    <span className="ml-1 text-[10px] text-muted-foreground">
                      {liveValuation.estimate > originalValuation.estimate ? "↑" : "↓"}
                    </span>
                  )}
                </span>
              </div>

              {editMode && liveValuation && originalValuation && liveValuation.estimate !== originalValuation.estimate && (
                <div className="flex justify-between py-1">
                  <span className="text-[10px] text-muted-foreground">Original estimate</span>
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {formatCurrency(originalValuation.estimate)}
                  </span>
                </div>
              )}

              <div className="flex justify-between py-1.5">
                <span className="text-xs text-muted-foreground">Estimate range</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatCurrency(currentValuation.varianceLow)}
                  {" — "}
                  {formatCurrency(currentValuation.varianceHigh)}
                </span>
              </div>
            </>
          )}
        </div>

        {isClient && editMode && (
          <div className="flex gap-2 mt-3 pt-3 border-t border-border">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 text-sm bg-primary text-primary-foreground rounded-md py-1.5 font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Check className="h-3 w-3" aria-hidden="true" />
              {saving ? "Saving..." : "Save changes"}
            </button>
            <button
              onClick={handleReset}
              className="text-sm text-muted-foreground hover:text-foreground px-3"
            >
              Reset
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}

export { PropertyCard };
export default PropertyCard;
