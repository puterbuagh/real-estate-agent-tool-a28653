"use client";

import Link from "next/link";
import * as React from "react";
import {
  AlertTriangle,
  WifiOff,
  KeyRound,
  Clock,
  Ban,
  Search,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ErrorVariant = "no_data" | "error";
type ErrorType =
  | "not_found"
  | "connection_error"
  | "rate_limited"
  | "missing_key"
  | "invalid_address"
  | "validation"
  | "unauthorized"
  | "timeout"
  | "unknown";

interface PropertyErrorCardProps {
  address: string;
  variant: ErrorVariant;
  message?: string;
  errorType?: ErrorType;
  /** When provided, shows a Retry button. Receives the cooldown-aware handler. */
  onRetry?: () => void;
  /** Number of retry attempts already made — drives exponential backoff cooldown. */
  retryAttempt?: number;
  /** Diagnostic details from the lookup flow — displayed in dev/debugging. */
  diagnosticDetails?: {
    coordinatesUsed?: { lat: number; lng: number };
    candidatesReturned?: number;
    bestConfidenceScore?: number;
  };
}

interface VariantPresentation {
  Icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  borderClass: string;
  headerClass: string;
  headerLabel: string;
  defaultMessage: string;
  tips: { label: string; detail: string }[];
  showZillowLink?: boolean;
  showRapidApiLink?: boolean;
  retryable?: boolean;
}

function getPresentation(
  variant: ErrorVariant,
  errorType: ErrorType | undefined
): VariantPresentation {
  if (
    variant === "no_data" ||
    errorType === "not_found" ||
    errorType === "invalid_address" ||
    errorType === "validation"
  ) {
    const isValidationOrInvalid =
      errorType === "invalid_address" || errorType === "validation";
    return {
      Icon: Search,
      borderClass: "border-[hsl(38_92%_50%/0.4)]",
      headerClass: "bg-[hsl(38_92%_50%/0.12)] text-[hsl(35_85%_35%)]",
      headerLabel: isValidationOrInvalid
        ? "Please refine the address"
        : "No data found",
      defaultMessage: isValidationOrInvalid
        ? "Please refine the address by selecting it from the Google Places dropdown. Manually typed addresses need coordinates to look up property data."
        : "Zillow has no record for this address.",
      tips: [
        {
          label: "Select from the dropdown",
          detail:
            "Start typing the address, then click a suggestion from the Google Places dropdown. This attaches the latitude/longitude needed for the lookup.",
        },
        {
          label: "Use the full USPS form",
          detail:
            'e.g. "123 Main St, Tampa, FL 33601" — include city, 2-letter state, and a 5-digit ZIP.',
        },
        {
          label: "Try common variations",
          detail:
            'Swap "St" ↔ "Street", drop unit/apt suffixes (#4B, Apt 2), or use the building\'s main address.',
        },
        {
          label: "Verify on zillow.com first",
          detail:
            "If Zillow's own search can't find it, the API won't either — new construction and off-market homes may not be indexed.",
        },
      ],
      showZillowLink: true,
      retryable: false,
    };
  }

  if (errorType === "missing_key") {
    return {
      Icon: KeyRound,
      borderClass: "border-[hsl(0_72%_50%/0.4)]",
      headerClass: "bg-[hsl(0_72%_50%/0.10)] text-[hsl(0_72%_42%)]",
      headerLabel: "API key not configured",
      defaultMessage:
        "RAPIDAPI_KEY is missing on the server. The comparator can't reach Zillow until it's set.",
      tips: [
        {
          label: "Add RAPIDAPI_KEY to Vercel",
          detail:
            "Project Settings → Environment Variables → add RAPIDAPI_KEY (server-only, no NEXT_PUBLIC_ prefix), then redeploy.",
        },
        {
          label: "Subscribe to the right host",
          detail:
            'On RapidAPI, subscribe to "Zillow.com Live Data Scraper" — that\'s the host this app calls.',
        },
      ],
      showRapidApiLink: true,
      retryable: false,
    };
  }

  if (errorType === "unauthorized") {
    return {
      Icon: Ban,
      borderClass: "border-[hsl(0_72%_50%/0.4)]",
      headerClass: "bg-[hsl(0_72%_50%/0.10)] text-[hsl(0_72%_42%)]",
      headerLabel: "RapidAPI rejected the request",
      defaultMessage:
        "Your RapidAPI key is missing, inactive, or not subscribed to the Zillow Live Data Scraper host.",
      tips: [
        {
          label: "Verify the subscription",
          detail:
            "On RapidAPI → My Apps, confirm the key is enabled and subscribed to the Zillow scraper host.",
        },
        {
          label: "Check the host name",
          detail:
            "This app calls zillow-com-live-data-scraper-api.p.rapidapi.com — your subscription must match exactly.",
        },
        {
          label: "Rotate the key",
          detail:
            "If you recently regenerated the key, redeploy so Vercel picks up the new value.",
        },
      ],
      showRapidApiLink: true,
      retryable: true,
    };
  }

  if (errorType === "rate_limited") {
    return {
      Icon: Clock,
      borderClass: "border-[hsl(0_72%_50%/0.4)]",
      headerClass: "bg-[hsl(0_72%_50%/0.10)] text-[hsl(0_72%_42%)]",
      headerLabel: "Rate limit hit",
      defaultMessage:
        "RapidAPI returned 429 — you've hit the per-minute or per-month cap.",
      tips: [
        {
          label: "Wait 30–60 seconds",
          detail: "Most caps are sliding windows. Retry shortly.",
        },
        {
          label: "Check monthly quota",
          detail:
            "On RapidAPI → My Apps → Usage, confirm you haven't exhausted the month.",
        },
        {
          label: "Upgrade the plan",
          detail:
            "Free tiers cap aggressively — paid tiers raise the per-minute and monthly limits.",
        },
      ],
      showRapidApiLink: true,
      retryable: true,
    };
  }

  if (errorType === "timeout") {
    return {
      Icon: Clock,
      borderClass: "border-[hsl(0_72%_50%/0.4)]",
      headerClass: "bg-[hsl(0_72%_50%/0.10)] text-[hsl(0_72%_42%)]",
      headerLabel: "Zillow timed out",
      defaultMessage:
        "The RapidAPI host took longer than 30 seconds to respond.",
      tips: [
        {
          label: "Retry now",
          detail:
            "Cold starts and upstream warm-ups commonly cause the first request to be slow. A second attempt typically succeeds.",
        },
        {
          label: "Check RapidAPI status",
          detail:
            "If multiple addresses time out in a row, the Zillow scraper host may be degraded.",
        },
        {
          label: "Simplify the address",
          detail:
            "Long addresses with unit suffixes can sometimes push the scraper into a slow path. Try the building's primary address.",
        },
      ],
      showRapidApiLink: true,
      retryable: true,
    };
  }

  return {
    Icon: WifiOff,
    borderClass: "border-[hsl(0_72%_50%/0.4)]",
    headerClass: "bg-[hsl(0_72%_50%/0.10)] text-[hsl(0_72%_42%)]",
    headerLabel: "Data unavailable",
    defaultMessage:
      "Couldn't reach Zillow. This is usually a transient RapidAPI / network issue.",
    tips: [
      {
        label: "Retry the lookup",
        detail:
          "Network blips and brief RapidAPI hiccups resolve on retry — the cooldown below grows exponentially to avoid hammering.",
      },
      {
        label: "Check the address format",
        detail:
          'Full USPS form works best: "123 Main St, Tampa, FL 33601". Avoid abbreviations like "Ohio" — use "OH".',
      },
      {
        label: "Confirm RAPIDAPI_KEY is set",
        detail:
          "On Vercel → Project Settings → Environment Variables. Redeploy after changes.",
      },
      {
        label: "Check RapidAPI quota",
        detail:
          "A 403/429 from quota exhaustion can surface here. Verify usage on RapidAPI.",
      },
    ],
    showRapidApiLink: true,
    retryable: true,
  };
}

function cooldownSecondsFor(attempt: number): number {
  if (attempt <= 0) return 0;
  return Math.min(30, Math.pow(2, attempt));
}

function PropertyErrorCard({
  address,
  variant,
  message,
  errorType,
  onRetry,
  retryAttempt = 0,
  diagnosticDetails,
}: PropertyErrorCardProps) {
  const pres = getPresentation(variant, errorType);
  const { Icon } = pres;
  const shownMessage = message?.trim() || pres.defaultMessage;

  const initialCooldown = cooldownSecondsFor(retryAttempt);
  const [cooldown, setCooldown] = React.useState(initialCooldown);

  React.useEffect(() => {
    setCooldown(cooldownSecondsFor(retryAttempt));
  }, [retryAttempt]);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => {
      setCooldown((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const zillowSearchUrl = address
    ? `https://www.zillow.com/homes/${encodeURIComponent(address)}_rb/`
    : "https://www.zillow.com";

  const canRetry = Boolean(onRetry) && pres.retryable !== false && cooldown === 0;

  const hasDiagnostics =
    diagnosticDetails &&
    (diagnosticDetails.coordinatesUsed ||
      diagnosticDetails.candidatesReturned !== undefined ||
      diagnosticDetails.bestConfidenceScore !== undefined);

  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-lg border bg-card overflow-hidden",
        pres.borderClass
      )}
      role="alert"
      aria-live="polite"
    >
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider",
          pres.headerClass
        )}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden={true} />
        {pres.headerLabel}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
            Address
          </p>
          <p className="text-sm font-medium text-foreground break-words mt-0.5">
            {address || "—"}
          </p>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">{shownMessage}</p>

        {hasDiagnostics && (
          <div className="rounded-md border border-border bg-muted/20 p-3 space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Lookup diagnostics
            </p>
            {diagnosticDetails?.coordinatesUsed && (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Coordinates:</span>{" "}
                {diagnosticDetails.coordinatesUsed.lat.toFixed(6)},{" "}
                {diagnosticDetails.coordinatesUsed.lng.toFixed(6)}
              </p>
            )}
            {diagnosticDetails?.candidatesReturned !== undefined && (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Candidates returned:</span>{" "}
                {diagnosticDetails.candidatesReturned}
              </p>
            )}
            {diagnosticDetails?.bestConfidenceScore !== undefined && (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Best confidence score:</span>{" "}
                {(diagnosticDetails.bestConfidenceScore * 100).toFixed(1)}% (threshold: 45%)
              </p>
            )}
          </div>
        )}

        <div className="rounded-md border border-border bg-muted/40 p-3">
          <p className="text-[11px] uppercase tracking-wider text-foreground font-semibold flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3" aria-hidden={true} />
            Try this
          </p>
          <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
            {pres.tips.map((t) => (
              <li key={t.label} className="leading-snug">
                <span className="font-medium text-foreground">{t.label}.</span> {t.detail}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-3 border-t border-border">
          {onRetry && pres.retryable !== false && (
            <button
              type="button"
              onClick={onRetry}
              disabled={!canRetry}
              className={cn(
                "inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors",
                canRetry
                  ? "hover:bg-accent"
                  : "opacity-60 cursor-not-allowed"
              )}
              aria-label={cooldown > 0 ? `Retry available in ${cooldown}s` : "Retry lookup"}
            >
              <RefreshCw className={cn("h-3 w-3", cooldown > 0 && "opacity-50")} aria-hidden={true} />
              {cooldown > 0 ? `Retry in ${cooldown}s` : "Retry"}
            </button>
          )}
          {pres.showZillowLink && (
            <a
              href={zillowSearchUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
            >
              Verify on Zillow
              <ExternalLink className="h-3 w-3" aria-hidden={true} />
            </a>
          )}
          {pres.showRapidApiLink && (
            <a
              href="https://rapidapi.com/api-vortex-api-vortex-default/api/zillow-com-live-data-scraper-api"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
            >
              Check RapidAPI
              <ExternalLink className="h-3 w-3" aria-hidden={true} />
            </a>
          )}
          <Link
            href="/property-comparator"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:underline"
          >
            Reset comparator
          </Link>
          <p className="ml-auto text-[10px] text-muted-foreground">
            Other properties in this comparison are unaffected.
          </p>
        </div>
      </div>
    </div>
  );
}

export { PropertyErrorCard };
export default PropertyErrorCard;
