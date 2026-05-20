"use client";

import * as React from "react";
import { z } from "zod";
import { toast } from "sonner";
import {
  Home,
  Clock,
  Percent,
  ListChecks,
  Sparkles,
  Pencil,
  Save,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { cn, formatCurrency, formatNumber, formatDate } from "@/lib/utils";
import { useAgentBranding } from "@/context/AgentBrandingContext";
import type { LocalMarketInputsData } from "@/types";

const STORAGE_KEY = "agentdesk:localMarket:v1";

const PLACEHOLDER_DATA: LocalMarketInputsData = {
  medianSalePrice: 0,
  avgDaysOnMarket: 0,
  listToSaleRatio: 0,
  activeListings: 0,
  newListingsThisMonth: 0,
  updatedAt: "",
};

const schema = z.object({
  medianSalePrice: z
    .number({ invalid_type_error: "Required" })
    .min(0, "Must be ≥ 0"),
  avgDaysOnMarket: z
    .number({ invalid_type_error: "Required" })
    .min(0, "Must be ≥ 0")
    .max(3650, "Too large"),
  listToSaleRatio: z
    .number({ invalid_type_error: "Required" })
    .min(0, "Must be ≥ 0")
    .max(200, "Must be ≤ 200"),
  activeListings: z
    .number({ invalid_type_error: "Required" })
    .min(0, "Must be ≥ 0"),
  newListingsThisMonth: z
    .number({ invalid_type_error: "Required" })
    .min(0, "Must be ≥ 0"),
});

type FormState = {
  medianSalePrice: string;
  avgDaysOnMarket: string;
  listToSaleRatio: string;
  activeListings: string;
  newListingsThisMonth: string;
};

const EMPTY_FORM: FormState = {
  medianSalePrice: "",
  avgDaysOnMarket: "",
  listToSaleRatio: "",
  activeListings: "",
  newListingsThisMonth: "",
};

function toForm(data: LocalMarketInputsData): FormState {
  return {
    medianSalePrice: String(data.medianSalePrice),
    avgDaysOnMarket: String(data.avgDaysOnMarket),
    listToSaleRatio: String(data.listToSaleRatio),
    activeListings: String(data.activeListings),
    newListingsThisMonth: String(data.newListingsThisMonth),
  };
}

function loadFromStorage(): LocalMarketInputsData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalMarketInputsData;
    if (typeof parsed?.medianSalePrice !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function LocalMarketInputs() {
  const { branding } = useAgentBranding();
  const [data, setData] = React.useState<LocalMarketInputsData | null>(null);
  const [editing, setEditing] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = React.useState<Partial<Record<keyof FormState, string>>>({});
  const [hydrated, setHydrated] = React.useState(false);

  const locationLabel = branding.location || "your market";

  React.useEffect(() => {
    const stored = loadFromStorage();
    if (stored) {
      setData(stored);
      setForm(toForm(stored));
    } else {
      setEditing(true);
    }
    setHydrated(true);
  }, []);

  function handleChange(key: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({
      medianSalePrice: Number(form.medianSalePrice),
      avgDaysOnMarket: Number(form.avgDaysOnMarket),
      listToSaleRatio: Number(form.listToSaleRatio),
      activeListings: Number(form.activeListings),
      newListingsThisMonth: Number(form.newListingsThisMonth),
    });

    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof FormState, string>> = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as keyof FormState;
        if (k && !fieldErrors[k]) fieldErrors[k] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    const next: LocalMarketInputsData = {
      ...parsed.data,
      updatedAt: new Date().toISOString(),
    };

    if (typeof window === "undefined") {
      setData(next);
      setEditing(false);
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setData(next);
      setEditing(false);
      toast.success("Local market data saved");
    } catch {
      toast.error("Couldn't save — localStorage unavailable");
    }
  }

  function handleCancel() {
    if (data) {
      setForm(toForm(data));
      setErrors({});
      setEditing(false);
    }
  }

  if (!hydrated) {
    return (
      <Card className="p-6">
        <div className="h-32 animate-pulse rounded-md bg-muted" />
      </Card>
    );
  }

  if (!editing && data) {
    const cards = [
      {
        label: "Median Sale Price",
        value: formatCurrency(data.medianSalePrice),
        icon: Home,
      },
      {
        label: `Median DOM (${locationLabel})`,
        value: `${formatNumber(data.avgDaysOnMarket)} days`,
        icon: Clock,
      },
      {
        label: "List-to-Sale Ratio",
        value: `${data.listToSaleRatio.toFixed(1)}%`,
        icon: Percent,
      },
      {
        label: "Active Listings",
        value: formatNumber(data.activeListings),
        icon: ListChecks,
      },
      {
        label: "New Listings (Month)",
        value: formatNumber(data.newListingsThisMonth),
        icon: Sparkles,
      },
    ];

    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            Last updated {formatDate(data.updatedAt)} · update weekly
          </p>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            Update
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <Card key={c.label} className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                    {c.label}
                  </span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                </div>
                <p className="font-display text-2xl font-semibold tracking-tight mt-3 tabular-nums">
                  {c.value}
                </p>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  const fields: Array<{
    key: keyof FormState;
    label: string;
    placeholder: string;
    prefix?: string;
    suffix?: string;
  }> = [
    {
      key: "medianSalePrice",
      label: "Median sale price",
      placeholder: "245000",
      prefix: "$",
    },
    {
      key: "avgDaysOnMarket",
      label: `Median days on market (${locationLabel})`,
      placeholder: "28",
      suffix: "days",
    },
    {
      key: "listToSaleRatio",
      label: "List-to-sale ratio",
      placeholder: "99.1",
      suffix: "%",
    },
    {
      key: "activeListings",
      label: "Active listings",
      placeholder: "24180",
    },
    {
      key: "newListingsThisMonth",
      label: "New listings this month",
      placeholder: "3120",
    },
  ];

  return (
    <Card className="p-6">
      <form onSubmit={handleSave} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map((f) => (
            <div key={f.key} className="flex flex-col gap-1.5">
              <label
                htmlFor={`lm-${f.key}`}
                className="text-xs font-medium text-foreground"
              >
                {f.label}
              </label>
              <div className="relative">
                {f.prefix && (
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    {f.prefix}
                  </span>
                )}
                <Input
                  id={`lm-${f.key}`}
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="0"
                  value={form[f.key]}
                  onChange={(e) => handleChange(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className={cn(
                    f.prefix && "pl-7",
                    f.suffix && "pr-12",
                    errors[f.key] && "border-destructive focus-visible:ring-destructive"
                  )}
                  aria-invalid={!!errors[f.key]}
                />
                {f.suffix && (
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    {f.suffix}
                  </span>
                )}
              </div>
              {errors[f.key] && (
                <p className="text-xs text-destructive">{errors[f.key]}</p>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">
            These values are stored locally on this device.
          </p>
          <div className="flex items-center gap-2">
            {data && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCancel}
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                Cancel
              </Button>
            )}
            <Button type="submit" size="sm">
              <Save className="h-3.5 w-3.5" aria-hidden="true" />
              Save
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}

export { LocalMarketInputs, PLACEHOLDER_DATA };
export default LocalMarketInputs;
