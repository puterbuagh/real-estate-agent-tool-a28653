"use client";

import * as React from "react";
import { Calculator } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { cn, formatCurrency } from "@/lib/utils";

export interface MortgageCalculatorProps {
  prefillRate?: number | null;
}

function calcMonthlyPayment(
  principal: number,
  annualRatePct: number,
  termYears: number
): number {
  if (!Number.isFinite(principal) || principal <= 0) return 0;
  if (!Number.isFinite(termYears) || termYears <= 0) return 0;
  const n = termYears * 12;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / n;
  const factor = Math.pow(1 + r, n);
  return (principal * r * factor) / (factor - 1);
}

function MortgageCalculator({ prefillRate }: MortgageCalculatorProps) {
  const defaultRate = React.useMemo(
    () =>
      typeof prefillRate === "number" && Number.isFinite(prefillRate)
        ? prefillRate.toFixed(2)
        : "7.00",
    [prefillRate]
  );

  const [homePrice, setHomePrice] = React.useState("400000");
  const [downPct, setDownPct] = React.useState("20");
  const [rate, setRate] = React.useState(defaultRate);
  const [term, setTerm] = React.useState("30");
  const [rateTouched, setRateTouched] = React.useState(false);

  // If live rate arrives after mount and user hasn't touched, prefill it
  React.useEffect(() => {
    if (!rateTouched && typeof prefillRate === "number" && Number.isFinite(prefillRate)) {
      setRate(prefillRate.toFixed(2));
    }
  }, [prefillRate, rateTouched]);

  const price = Number(homePrice) || 0;
  const down = Math.min(Math.max(Number(downPct) || 0, 0), 100);
  const annualRate = Math.max(Number(rate) || 0, 0);
  const years = Number(term) || 30;

  const downAmount = (price * down) / 100;
  const principal = Math.max(price - downAmount, 0);
  const monthly = calcMonthlyPayment(principal, annualRate, years);
  const totalCost = monthly * years * 12;
  const totalInterest = Math.max(totalCost - principal, 0);

  return (
    <Card className="overflow-hidden">
      <div className="grid gap-0 md:grid-cols-[1.1fr_1fr]">
        <div className="p-6 border-b md:border-b-0 md:border-r border-border">
          <div className="flex items-center gap-2 mb-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Calculator className="h-4 w-4" aria-hidden="true" />
            </span>
            <h3 className="font-display text-base font-semibold tracking-tight">
              Loan Inputs
            </h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="mc-price" className="text-xs font-medium text-foreground">
                Home price
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  id="mc-price"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="1000"
                  value={homePrice}
                  onChange={(e) => setHomePrice(e.target.value)}
                  className="pl-7"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="mc-down" className="text-xs font-medium text-foreground">
                Down payment
              </label>
              <div className="relative">
                <Input
                  id="mc-down"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="100"
                  step="0.5"
                  value={downPct}
                  onChange={(e) => setDownPct(e.target.value)}
                  className="pr-8"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  %
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground tabular-nums">
                {formatCurrency(downAmount)} down · {formatCurrency(principal)} financed
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="mc-rate" className="text-xs font-medium text-foreground">
                Interest rate
              </label>
              <div className="relative">
                <Input
                  id="mc-rate"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={rate}
                  onChange={(e) => {
                    setRate(e.target.value);
                    setRateTouched(true);
                  }}
                  className="pr-8"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  %
                </span>
              </div>
              {!rateTouched && typeof prefillRate === "number" && (
                <p className="text-[11px] text-muted-foreground">
                  Prefilled from live FRED 30yr rate
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="mc-term" className="text-xs font-medium text-foreground">
                Loan term
              </label>
              <Select
                id="mc-term"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
              >
                <option value="30">30 years</option>
                <option value="15">15 years</option>
              </Select>
            </div>
          </div>
        </div>

        <div className={cn("p-6 bg-muted/40")}>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Monthly Payment
          </p>
          <p className="font-display text-4xl font-semibold tracking-tight mt-2 tabular-nums text-foreground">
            {formatCurrency(monthly)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Principal &amp; interest only — taxes &amp; insurance not included
          </p>

          <dl className="mt-6 grid grid-cols-2 gap-4">
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                Total interest
              </dt>
              <dd className="font-display text-xl font-semibold tracking-tight mt-1 tabular-nums">
                {formatCurrency(totalInterest)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                Total cost
              </dt>
              <dd className="font-display text-xl font-semibold tracking-tight mt-1 tabular-nums">
                {formatCurrency(totalCost)}
              </dd>
            </div>
            <div className="col-span-2 pt-3 border-t border-border">
              <dt className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                Loan summary
              </dt>
              <dd className="text-xs text-foreground mt-1 tabular-nums">
                {formatCurrency(principal)} financed at {annualRate.toFixed(2)}% over {years} years
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </Card>
  );
}

export { MortgageCalculator };
export default MortgageCalculator;
