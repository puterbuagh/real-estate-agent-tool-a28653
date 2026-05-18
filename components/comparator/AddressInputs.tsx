"use client";

import * as React from "react";
import { Plus, X, MapPin, Info, Hash, Loader2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { loadGoogleMaps, type GoogleMapsLoadResult } from "@/lib/google-places";

export type AddressInputMode = "address" | "mlsid";

export interface AddressInputsProps {
  addresses: string[];
  onChange: (index: number, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  disabled?: boolean;
  max?: number;
  modes?: AddressInputMode[];
  onModeChange?: (index: number, mode: AddressInputMode) => void;
  onPlaceSelected?: (index: number, formattedAddress: string) => void;
}

const EXAMPLE_ADDRESSES = [
  "123 Main St, Tampa, FL 33601",
  "456 Oak Ave, Miami, FL 33101",
  "789 Pine Rd, Orlando, FL 32801",
  "1010 Beach Blvd, Jacksonville, FL 32202",
  "2020 Lake Dr, Naples, FL 34102",
];

const EXAMPLE_MLS_IDS = ["A4612345", "O6098765", "T3445566", "S5223344", "N6112233"];

const DEBUG =
  typeof window !== "undefined" &&
  (window.localStorage?.getItem("agentdesk:debug:gmaps") === "1" ||
    process.env.NODE_ENV !== "production");

function debug(...args: unknown[]) {
  if (DEBUG) {
    // eslint-disable-next-line no-console
    console.log("[AddressInputs]", ...args);
  }
}

function validateAddress(value: string): string | null {
  const s = value.trim();
  if (!s) return null;
  if (s.length < 8) return "Too short — include street, city, state, and ZIP.";
  if (!/\d/.test(s)) return "Missing street number.";
  if (!/[a-zA-Z]/.test(s)) return "Missing street name.";
  const hasComma = s.includes(",");
  const hasStateCode = /\b[A-Za-z]{2}\b\s+\d{5}/.test(s);
  if (!hasComma && !hasStateCode) return 'Add commas: "Street, City, ST ZIP".';
  if (!/\b\d{5}(-\d{4})?\b/.test(s)) return "Add a 5-digit ZIP code for best results.";
  const longStates =
    /\b(Florida|Ohio|California|Georgia|Texas|New York|Pennsylvania|Illinois|Michigan|Virginia|Washington|Arizona|Colorado|Nevada|Oregon|Tennessee|Kentucky|Alabama|Indiana|Missouri|Wisconsin|Minnesota|Maryland|Massachusetts|Connecticut)\b/i;
  if (longStates.test(s)) {
    return "Use the 2-letter state code (e.g. FL, OH) instead of the full name.";
  }
  return null;
}

function validateMlsId(value: string): string | null {
  const s = value.trim();
  if (!s) return null;
  if (s.length < 4) return "MLS IDs are usually 6–10 characters.";
  if (!/^[A-Za-z0-9-]+$/.test(s)) {
    return "MLS IDs are alphanumeric (letters, digits, dashes).";
  }
  return null;
}

function AddressInputs({
  addresses,
  onChange,
  onAdd,
  onRemove,
  disabled = false,
  max = 5,
  modes,
  onModeChange,
  onPlaceSelected,
}: AddressInputsProps) {
  const canAdd = addresses.length < max;
  const canRemove = addresses.length > 2;

  const [gmaps, setGmaps] = React.useState<GoogleMapsLoadResult>({
    status: "idle",
  });

  React.useEffect(() => {
    let cancelled = false;
    debug("mounting — kicking off loadGoogleMaps()");
    setGmaps({ status: "loading" });
    loadGoogleMaps()
      .then((result) => {
        if (cancelled) return;
        debug("loadGoogleMaps() resolved with status:", result.status);
        setGmaps(result);
      })
      .catch((err) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "Failed to load Google Maps";
        debug("loadGoogleMaps() threw:", msg);
        setGmaps({ status: "error", error: msg });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const inputRefs = React.useRef<Array<HTMLInputElement | null>>([]);
  const autocompleteRefs = React.useRef<
    Array<google.maps.places.Autocomplete | null>
  >([]);
  const [confirmedFromPlace, setConfirmedFromPlace] = React.useState<boolean[]>(
    () => addresses.map(() => false)
  );

  const [localModes, setLocalModes] = React.useState<AddressInputMode[]>(() =>
    addresses.map(() => "address")
  );
  React.useEffect(() => {
    setLocalModes((prev) => {
      if (prev.length === addresses.length) return prev;
      const next = [...prev];
      while (next.length < addresses.length) next.push("address");
      next.length = addresses.length;
      return next;
    });
    setConfirmedFromPlace((prev) => {
      if (prev.length === addresses.length) return prev;
      const next = [...prev];
      while (next.length < addresses.length) next.push(false);
      next.length = addresses.length;
      return next;
    });
  }, [addresses.length]);

  const effectiveModes: AddressInputMode[] = modes ?? localModes;

  function setMode(idx: number, mode: AddressInputMode) {
    if (mode === "mlsid" && autocompleteRefs.current[idx]) {
      try {
        const ac = autocompleteRefs.current[idx];
        if (ac && gmaps.status === "ready" && gmaps.google?.maps?.event) {
          gmaps.google.maps.event.clearInstanceListeners(ac);
        }
      } catch {
        /* ignore */
      }
      autocompleteRefs.current[idx] = null;
    }

    if (onModeChange) onModeChange(idx, mode);
    else
      setLocalModes((prev) => {
        const next = [...prev];
        next[idx] = mode;
        return next;
      });
  }

  React.useEffect(() => {
    if (gmaps.status !== "ready") return;
    const google = gmaps.google;
    if (!google?.maps?.places?.Autocomplete) return;

    const cleanups: Array<() => void> = [];

    addresses.forEach((_, idx) => {
      const mode = effectiveModes[idx] ?? "address";
      const input = inputRefs.current[idx];

      if (mode !== "address" || !input) {
        const existing = autocompleteRefs.current[idx];
        if (existing) {
          try {
            google.maps.event.clearInstanceListeners(existing);
          } catch {
            /* ignore */
          }
          autocompleteRefs.current[idx] = null;
        }
        return;
      }

      if (autocompleteRefs.current[idx]) return;

      try {
        const ac = new google.maps.places.Autocomplete(input, {
          types: ["address"],
          componentRestrictions: { country: ["us"] },
          fields: ["place_id", "formatted_address", "address_components", "geometry"],
        });

        const listener = ac.addListener("place_changed", () => {
          const place = ac.getPlace();
          const formatted = place?.formatted_address?.trim();
          if (formatted) {
            setConfirmedFromPlace((prev) => {
              const next = [...prev];
              next[idx] = true;
              return next;
            });
            if (onPlaceSelected) {
              onPlaceSelected(idx, formatted);
            } else {
              // Fallback: if no place-selected handler is wired up, still
              // propagate the formatted address via onChange so the parent
              // sees the canonical value. When onPlaceSelected IS provided,
              // the parent is expected to handle state updates itself to
              // avoid duplicate processing.
              onChange(idx, formatted);
            }
          }
        });

        autocompleteRefs.current[idx] = ac;
        cleanups.push(() => {
          try {
            listener.remove();
          } catch {
            /* ignore */
          }
          try {
            google.maps.event.clearInstanceListeners(ac);
          } catch {
            /* ignore */
          }
        });
      } catch (err) {
        debug(`row ${idx}: Autocomplete construction failed`, err);
      }
    });

    return () => {
      cleanups.forEach((fn) => fn());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gmaps.status, addresses.length, effectiveModes.join("|"), onChange, onPlaceSelected]);

  function handleManualChange(idx: number, value: string) {
    setConfirmedFromPlace((prev) => {
      if (!prev[idx]) return prev;
      const next = [...prev];
      next[idx] = false;
      return next;
    });
    onChange(idx, value);
  }

  const validations = React.useMemo(
    () =>
      addresses.map((a, i) =>
        effectiveModes[i] === "mlsid" ? validateMlsId(a) : validateAddress(a)
      ),
    [addresses, effectiveModes]
  );

  const tipBanner = (() => {
    if (gmaps.status === "loading" || gmaps.status === "idle") {
      return (
        <div className="rounded-md border border-border bg-muted/30 p-3 flex items-start gap-2">
          <Loader2
            className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0 animate-spin"
            aria-hidden="true"
          />
          <div className="text-[11px] leading-relaxed text-muted-foreground">
            Loading Google Places suggestions… you can start typing in the
            meantime.
          </div>
        </div>
      );
    }
    if (gmaps.status === "missing_key") {
      return (
        <div className="rounded-md border border-[hsl(38_92%_50%/0.5)] bg-[hsl(38_92%_50%/0.06)] p-3 flex items-start gap-2">
          <AlertCircle
            className="h-3.5 w-3.5 text-[hsl(35_85%_35%)] mt-0.5 shrink-0"
            aria-hidden="true"
          />
          <div className="text-[11px] leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">
              Google Maps is not configured. Contact your administrator.
            </span>{" "}
            You can still type full addresses manually, or switch any row to
            <span className="font-medium text-foreground"> MLS ID</span> mode.
          </div>
        </div>
      );
    }
    if (gmaps.status === "error") {
      return (
        <div className="rounded-md border border-[hsl(38_92%_50%/0.5)] bg-[hsl(38_92%_50%/0.06)] p-3 flex items-start gap-2">
          <AlertCircle
            className="h-3.5 w-3.5 text-[hsl(35_85%_35%)] mt-0.5 shrink-0"
            aria-hidden="true"
          />
          <div className="text-[11px] leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">
              Address autocomplete unavailable.
            </span>{" "}
            {gmaps.error ? (
              <span className="block mt-0.5 text-muted-foreground/80">
                {gmaps.error}
              </span>
            ) : null}
            You can still type addresses manually — use{" "}
            <span className="font-mono text-foreground">
              123 Main St, Tampa, FL 33601
            </span>
            .
          </div>
        </div>
      );
    }
    return (
      <div className="rounded-md border border-border bg-muted/30 p-3 flex items-start gap-2">
        <Info
          className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0"
          aria-hidden="true"
        />
        <div className="text-[11px] leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">Tip:</span> start typing
          an address and pick from the Google dropdown for best Zillow match
          rates. Toggle to{" "}
          <span className="font-medium text-foreground">MLS ID</span> on any row
          to bypass address parsing entirely.
        </div>
      </div>
    );
  })();

  return (
    <div className="space-y-3">
      {tipBanner}

      {addresses.map((value, idx) => {
        const error = validations[idx];
        const mode = effectiveModes[idx] ?? "address";
        const example =
          mode === "mlsid"
            ? EXAMPLE_MLS_IDS[idx % EXAMPLE_MLS_IDS.length]
            : EXAMPLE_ADDRESSES[idx % EXAMPLE_ADDRESSES.length];
        const inputId = `address-input-${idx}`;
        const errorId = `${inputId}-error`;
        const IconCmp = mode === "mlsid" ? Hash : MapPin;
        const isAutocompleteReady =
          gmaps.status === "ready" && mode === "address";
        const showSelectHint =
          mode === "address" &&
          isAutocompleteReady &&
          value.trim().length >= 6 &&
          !confirmedFromPlace[idx] &&
          !error;

        return (
          <div key={idx} className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <IconCmp
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id={inputId}
                  ref={(el) => {
                    inputRefs.current[idx] = el;
                  }}
                  value={value}
                  onChange={(e) => handleManualChange(idx, e.target.value)}
                  placeholder={
                    mode === "mlsid"
                      ? `MLS ID ${idx + 1} — ${example}`
                      : `Property ${idx + 1} — ${example}`
                  }
                  disabled={disabled}
                  autoComplete="off"
                  aria-label={
                    mode === "mlsid"
                      ? `Property ${idx + 1} MLS ID`
                      : `Property ${idx + 1} address`
                  }
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? errorId : undefined}
                  className={cn(
                    "pl-9",
                    error &&
                      "border-[hsl(38_92%_50%/0.6)] focus-visible:ring-[hsl(38_92%_50%/0.6)]"
                  )}
                />
                {mode === "address" && (gmaps.status === "loading" || gmaps.status === "idle") && (
                  <Loader2
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground animate-spin"
                    aria-hidden="true"
                  />
                )}
              </div>
              <button
                type="button"
                onClick={() =>
                  setMode(idx, mode === "mlsid" ? "address" : "mlsid")
                }
                disabled={disabled}
                aria-label={
                  mode === "mlsid"
                    ? `Switch property ${idx + 1} to address lookup`
                    : `Switch property ${idx + 1} to MLS ID lookup`
                }
                className={cn(
                  "inline-flex h-10 items-center gap-1 rounded-md border border-border bg-background px-2.5 text-[11px] font-medium text-muted-foreground transition-colors",
                  "hover:bg-accent hover:text-foreground",
                  "disabled:cursor-not-allowed disabled:opacity-40",
                  mode === "mlsid" && "bg-primary/10 text-primary border-primary/30"
                )}
                title={
                  mode === "mlsid"
                    ? "Currently looking up by MLS ID — click to switch back to address"
                    : "Search by MLS ID instead (bypasses address parsing)"
                }
              >
                {mode === "mlsid" ? "MLS" : "Use MLS"}
              </button>
              <button
                type="button"
                onClick={() => onRemove(idx)}
                disabled={disabled || !canRemove}
                aria-label={`Remove property ${idx + 1}`}
                className={cn(
                  "inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors",
                  "hover:bg-accent hover:text-foreground",
                  "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-background disabled:hover:text-muted-foreground"
                )}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="min-h-[1rem] pl-9">
              {error ? (
                <p
                  id={errorId}
                  className="text-[11px] text-[hsl(35_85%_35%)] font-medium"
                >
                  {error}
                </p>
              ) : showSelectHint ? (
                <p className="text-[11px] text-muted-foreground">
                  Tip: pick an address from the Google dropdown for the best
                  Zillow match.
                </p>
              ) : value.trim().length === 0 ? (
                <p className="text-[10px] text-muted-foreground/70">
                  Example: {example}
                </p>
              ) : null}
            </div>
          </div>
        );
      })}

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onAdd}
          disabled={disabled || !canAdd}
          className={cn(
            "inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors",
            "hover:text-primary/80",
            "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-primary"
          )}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add another property
          <span className="text-muted-foreground tabular-nums">
            ({addresses.length}/{max})
          </span>
        </button>
      </div>
    </div>
  );
}

export { AddressInputs };
export default AddressInputs;
