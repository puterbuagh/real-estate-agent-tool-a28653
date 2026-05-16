"use client";

import { Plus, X, MapPin } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

export interface AddressInputsProps {
  addresses: string[];
  onChange: (index: number, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  disabled?: boolean;
  max?: number;
}

function AddressInputs({
  addresses,
  onChange,
  onAdd,
  onRemove,
  disabled = false,
  max = 5,
}: AddressInputsProps) {
  const canAdd = addresses.length < max;
  const canRemove = addresses.length > 2;

  return (
    <div className="space-y-3">
      {addresses.map((value, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <div className="relative flex-1">
            <MapPin
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={value}
              onChange={(e) => onChange(idx, e.target.value)}
              placeholder={`Property ${idx + 1} — 123 Main St, Tampa FL 33601`}
              disabled={disabled}
              autoComplete="street-address"
              aria-label={`Property ${idx + 1} address`}
              className="pl-9"
            />
          </div>
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
      ))}

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
  );
}

export { AddressInputs };
export default AddressInputs;
