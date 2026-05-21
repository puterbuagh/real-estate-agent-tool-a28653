/**
 * AgentDesk Proprietary Valuation Engine
 *
 * Calculates property estimates using:
 * - Time-adjusted appreciation from last sale
 * - Comp-derived median price per sqft
 * - Mortgage rate impact adjustment
 *
 * Confidence levels based on comp count:
 * - High (10+ comps): ±5% variance
 * - Medium (5-9 comps): ±8% variance
 * - Low (<5 comps): ±12% variance
 */

export interface ValuationInputs {
  lastSalePrice: number;
  lastSaleDate: string;
  subjectSqft: number;
  comps: Array<{
    salePrice: number;
    saleDate: string;
    sqft: number;
  }>;
  currentMortgageRate: number;
}

export interface ValuationResult {
  estimate: number;
  variancePct: number;
  varianceLow: number;
  varianceHigh: number;
  confidence: "high" | "medium" | "low";
  compCount: number;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function calculateAgentDeskEstimate(
  inputs: ValuationInputs
): ValuationResult {
  const {
    lastSalePrice,
    lastSaleDate,
    subjectSqft,
    comps,
    currentMortgageRate,
  } = inputs;

  const yearsSinceSale =
    (Date.now() - new Date(lastSaleDate).getTime()) /
    (1000 * 60 * 60 * 24 * 365);

  // Derive local appreciation rate from comps
  const recentComps = comps.filter((c) => {
    const age =
      (Date.now() - new Date(c.saleDate).getTime()) /
      (1000 * 60 * 60 * 24 * 365);
    return age <= 2;
  });

  const olderComps = comps.filter((c) => {
    const age =
      (Date.now() - new Date(c.saleDate).getTime()) /
      (1000 * 60 * 60 * 24 * 365);
    return age > 2 && age <= 4;
  });

  let appreciationRate = 0.03;
  if (recentComps.length >= 2 && olderComps.length >= 2) {
    const recentMedianPsf = median(
      recentComps.map((c) => c.salePrice / c.sqft)
    );
    const olderMedianPsf = median(olderComps.map((c) => c.salePrice / c.sqft));
    appreciationRate = Math.max(
      -0.1,
      Math.min(0.2, (recentMedianPsf - olderMedianPsf) / olderMedianPsf / 2)
    );
  }

  const timeAdjusted =
    lastSalePrice * Math.pow(1 + appreciationRate, yearsSinceSale);

  // Comp anchor
  const allCompPsf = comps
    .map((c) => c.salePrice / c.sqft)
    .filter((v) => v > 0 && isFinite(v));
  const medianPsf =
    allCompPsf.length > 0 ? median(allCompPsf) : timeAdjusted / (subjectSqft || 1);
  const compAnchor = medianPsf * (subjectSqft || 1);

  // Mortgage rate adjustment
  const baselineRate = 6.5;
  const rateDelta = currentMortgageRate - baselineRate;
  const mortgageAdjustment = 1 - rateDelta * 0.08;

  // Weighted blend
  const rawEstimate =
    timeAdjusted * 0.4 + compAnchor * 0.45 + compAnchor * mortgageAdjustment * 0.15;

  // Round to nearest $500
  const estimate = Math.round(rawEstimate / 500) * 500;

  // Confidence and variance
  const compCount = comps.length;
  let variancePct: number;
  let confidence: "high" | "medium" | "low";

  if (compCount >= 10) {
    variancePct = 0.05;
    confidence = "high";
  } else if (compCount >= 5) {
    variancePct = 0.08;
    confidence = "medium";
  } else {
    variancePct = 0.12;
    confidence = "low";
  }

  const varianceLow = Math.round((estimate * (1 - variancePct)) / 500) * 500;
  const varianceHigh = Math.round((estimate * (1 + variancePct)) / 500) * 500;

  return {
    estimate,
    variancePct,
    varianceLow,
    varianceHigh,
    confidence,
    compCount,
  };
}
