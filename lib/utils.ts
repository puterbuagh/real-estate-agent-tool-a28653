import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatPercent(
  value: number | null | undefined,
  digits: number = 2
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

export function daysBetween(
  iso: string | Date | null | undefined,
  now: Date = new Date()
): number {
  if (!iso) return 0;
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return 0;
  const ms = now.getTime() - d.getTime();
  if (ms <= 0) return 0;
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/**
 * Standard mortgage monthly payment formula (principal & interest only).
 * principal: loan amount in dollars
 * annualRatePct: e.g. 6.83 for 6.83%
 * termYears: 15 or 30
 */
export function calcMonthlyPayment(
  principal: number,
  annualRatePct: number,
  termYears: number
): number {
  if (!Number.isFinite(principal) || principal <= 0) return 0;
  if (!Number.isFinite(termYears) || termYears <= 0) return 0;
  const n = termYears * 12;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / n;
  const payment = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return Number.isFinite(payment) ? payment : 0;
}

/**
 * 28% front-end DTI rule: monthly housing payment <= 28% of gross monthly income.
 * Solves for maximum home price assuming a given down payment % and 30yr term.
 */
export function maxHomePriceForIncome(
  annualIncome: number,
  annualRatePct: number,
  termYears: number = 30,
  downPaymentPct: number = 20
): number {
  if (!Number.isFinite(annualIncome) || annualIncome <= 0) return 0;
  const maxMonthly = (annualIncome / 12) * 0.28;
  const n = termYears * 12;
  const r = annualRatePct / 100 / 12;
  let maxLoan: number;
  if (r === 0) {
    maxLoan = maxMonthly * n;
  } else {
    maxLoan = (maxMonthly * (Math.pow(1 + r, n) - 1)) / (r * Math.pow(1 + r, n));
  }
  const downFraction = Math.min(Math.max(downPaymentPct, 0), 100) / 100;
  if (downFraction >= 1) return 0;
  return maxLoan / (1 - downFraction);
}
