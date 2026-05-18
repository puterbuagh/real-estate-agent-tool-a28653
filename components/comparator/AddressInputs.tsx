"use client";

import * as React from "react";
import { Plus, X, MapPin, Info, Hash } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

export type AddressInputMode = "address" | "mlsid";

export interface AddressInputsProps {
  addresses: string[];
  onChange: (index: number, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  disabled?: boolean;
  max?: number;
  /** Optional: per-row input mode toggle (address vs MLS ID). */
  modes?: AddressInputMode[];
  onModeChange?: (index: number, mode: AddressInputMode) => void;
}

const EXAMPLE_ADDRESSES = [
  "123 Main St, Tampa, FL 33601",
  "456 Oak Ave, Miami, FL 33101",
  "789 Pine Rd, Orlando, FL 32801",
  "1010 Beach Blvd, Jacksonville, FL 32202",
  "2020 Lake Dr, Naples, FL 34102",
];

const EXAMPLE_MLS_IDS = ["A4612345", "O6098765", "T3445566", "S5223344", "N6112233"];

/** Lightweight client-side validation — surfaces format problems before burning a quota call. */
function validateAddress(value: string): string | null {
  const s = value.trim();
  if (!s) return null;
  if (s.length < 8) {
    return "Too short — include street, city, state, and ZIP.";
  }
  if (!/\d/.test(s)) {
    return "Missing street number.";
  }
  if (!/[a-zA-Z]/.test(s)) {
    return "Missing street name.";
  }
  const hasComma = s.includes(",");
  const hasStateCode = /\b[A-Za-z]{2}\b\s+\d{5}/.test(s);
  if (!hasComma && !hasStateCode) {
    return 'Add commas: "Street, City, ST ZIP".';
  }
  if (!/\b\d{5}(-\d{4})?\b/.test(s)) {
    return "Add a 5-digit ZIP code for best results.";
  }
  // Warn on full state names — Zillow does much better with 2-letter codes.
  const longStates = /\b(Florida|Ohio|California|Georgia|Texas|New York|Pennsylvania|Illinois|Michigan|Virginia|Washington|Arizona|Colorado|Nevada|Oregon|Tennessee|Kentucky|Alabama|Indiana|Missouri|Wisconsin|Minnesota|Maryland|Massachusetts|Connecticut)\b/i;
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
}: AddressInputsProps) {
  const canAdd = addresses.length < max;
  const canRemove = addresses.length > 2;

  // Local mode state when no controlled `modes` prop is supplied — keeps the
  // toggle functional even if the parent hasn't wired it up yet.
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
  }, [addresses.length]);

  const effectiveModes: AddressInputMode[] = modes ?? localModes;

  function setMode(idx: number, mode: AddressInputMode) {
    if (onModeChange) onModeChange(idx, mode);
    else
      setLocalModes((prev) => {
        const next = [...prev];
        next[idx] = mode;
        return next;
      });
  }

  const validations = React.useMemo(
    () =>
      addresses.map((a, i) =>
        effectiveModes[i] === "mlsid" ? validateMlsId(a) : validateAddress(a)
      ),
    [addresses, effectiveModes]
  );

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-border bg-muted/30 p-3 flex items-start gap-2">
        <Info
          className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0"
          aria-hidden="true"
        />
        <div className="text-[11px] leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">Tip:</span> use the full
          USPS form —{" "}
          <span className="font-mono text-foreground">
            123 Main St, Tampa, FL 33601
          </span>{" "}
          — with 2-letter state code and 5-digit ZIP. Toggle to{" "}
          <span className="font-medium text-foreground">MLS ID</span> on any row
          to bypass address parsing entirely.
        </div>
      </div>

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
                  value={value}
                  onChange={(e) => onChange(idx, e.target.value)}
                  placeholder={
                    mode === "mlsid"
                      ? `MLS ID ${idx + 1} — ${example}`
                      : `Property ${idx + 1} — ${example}`
                  }
                  disabled={disabled}
                  autoComplete={mode === "mlsid" ? "off" : "street-address"}
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
