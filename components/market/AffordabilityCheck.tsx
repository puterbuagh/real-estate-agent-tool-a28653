"use client";

import * as React from "react";
import { Wallet, Info, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import {
  cn,
  formatCurrency,
  formatPercent,
  maxHomePriceForIncome,
} from "@/lib/utils";

interface AffordabilityCheckProps {
  currentRate: number | null;
}

function AffordabilityCheck({ currentRate }: AffordabilityCheckProps) {
  const [incomeStr, setIncomeStr] = React.useState<string>("120000");
  const rate = currentRate ?? 7.0;
  const downPct = 20;
  const term = 30;

  const income = Number(incomeStr.replace(/[^0-9.]/g, "")) || 0;
  const maxPrice = maxHomePriceForIncome(income, rate, term, downPct);
  const monthlyBudget = (income / 12) * 0.28;

  return (
    <Card className="overflow-hidden">
      <header className="border-b border-border px-6 py-4 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Wallet className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight">
            Affordability Quick Check
          </h2>
          <p className="text-xs text-muted-foreground">
            28% front-end DTI rule — updates instantly
          </p>
        </div>
      </header>

      <div className="grid gap-6 p-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="aff-income"
              className="text-xs font-medium text-foreground"
            >
              Annual household income
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                $
              </span>
              <Input
                id="aff-income"
                inputMode="numeric"
                value={incomeStr}
                onChange={(e) => setIncomeStr(e.target.value)}
                placeholder="120000"
                className="pl-7"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Gross income before taxes
            </p>
          </div>

          <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground space-y-1.5">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <Info className="h-3.5 w-3.5" aria-hidden="true" />
              Assumptions
            </div>
            <ul className="space-y-0.5 pl-5 list-disc">
              <li>28% of monthly income → housing payment</li>
              <li>
                {term}-year fixed at{" "}
                <span className="tabular-nums font-medium text-foreground">
                  {formatPercent(rate)}
                </span>{" "}
                ({currentRate ? "live FRED rate" : "fallback estimate"})
              </li>
              <li>{downPct}% down payment</li>
              <li>Principal &amp; interest only (excludes taxes/insurance)</li>
            </ul>
          </div>
        </div>

        <div
          className={cn(
            "relative flex flex-col justify-center overflow-hidden rounded-lg p-6",
            "bg-gradient-to-br from-primary/15 via-primary/8 to-transparent",
            "border border-primary/30"
          )}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
              backgroundSize: "14px 14px",
            }}
          />
          <div className="relative">
            <div className="flex items-center gap-1.5 text-xs uppercase tracking-[0.14em] text-muted-foreground font-medium">
              <Sparkles className="h-3 w-3 text-primary" aria-hidden="true" />
              Maximum home price
            </div>
            <p
              className={cn(
                "font-display font-semibold tracking-tight tabular-nums mt-2",
                "text-5xl md:text-6xl text-primary"
              )}
            >
              {formatCurrency(maxPrice)}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 pt-4 border-t border-primary/20">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                  Monthly housing budget
                </p>
                <p className="font-display text-xl font-semibold tabular-nums mt-1">
                  {formatCurrency(monthlyBudget)}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                  At rate
                </p>
                <p className="font-display text-xl font-semibold tabular-nums mt-1">
                  {formatPercent(rate)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

export { AffordabilityCheck };
export default AffordabilityCheck;
