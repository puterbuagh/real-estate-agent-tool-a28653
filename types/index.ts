export type PipelineStage = "Lead" | "Showing" | "Under Contract" | "Closed";

export interface PipelineItem {
  id: string;
  address: string;
  stage: PipelineStage;
  createdAt: string;
  stageEnteredAt: string;
  price?: number | null;
  clientName?: string | null;
  notes?: string;
}

export interface ZillowDiagnosticDetails {
  coordinatesUsed?: { lat: number; lng: number };
  candidatesReturned?: number;
  bestConfidenceScore?: number;
}

export interface ValuationResult {
  estimate: number;
  variancePct: number;
  varianceLow: number;
  varianceHigh: number;
  confidence: 'high' | 'medium' | 'low';
  compCount: number;
}

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

export interface PropertyOverrides {
  bedrooms?: number;
  bathrooms?: number;
  livingArea?: number;
  yearBuilt?: number;
  propertySubType?: string;
  lotSize?: number;
}

/**
 * Property record returned by lib/attom.ts.
 * Field name retained as `ZillowProperty` for backward compatibility with the
 * rest of the app (ComparisonTable, PropertyCard, ClientReport, etc.) — the
 * underlying data source is now ATTOM (Property + AVM + Sales History).
 *
 *  - `price` / `zestimate`: ATTOM AVM value (falls back to market assessed value).
 *  - `lastSoldPrice` / `lastSoldDate`: most recent record from saleshistory/detail.
 *  - `taxAssessedValue`: ATTOM assessment.assessed.assdttlvalue.
 *  - `estimatedValue`: ATTOM AVM amount.value (current estimated market value).
 *  - `yearBuilt`: mapped from building.summary.yearbuilt.
 *  - `lotSize`: mapped from lot.lotsize1 or lot.lotsize2 (numeric sqft).
 *  - `propertySubType`: mapped from summary.propsubtype.
 *  - `daysOnMarket` / `photo`: ATTOM does not provide active listing data, so
 *    these will be null. UI components should gracefully degrade.
 *  - `agentDeskValuation`: optional calculated estimate from lib/valuation.ts
 *  - `valuationInputs`: data needed for client-side recalculation
 *  - `overrides`: agent-edited values that override ATTOM data
 */
export interface ZillowProperty {
  zpid: string | null;
  address: string;
  price: number | null;
  zestimate: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  livingArea: number | null;
  lotSize: number | null;
  yearBuilt: number | null;
  propertyType: string | null;
  propertySubType: string | null;
  daysOnMarket: number | null;
  pricePerSqft: number | null;
  lastSoldPrice: number | null;
  lastSoldDate: string | null;
  taxAssessedValue: number | null;
  estimatedValue: number | null;
  photo: string | null;
  status: "ok" | "no_data" | "error";
  errorMessage?: string;
  errorType?:
    | "not_found"
    | "connection_error"
    | "rate_limited"
    | "missing_key"
    | "invalid_address"
    | "unauthorized"
    | "timeout"
    | "unknown";
  diagnosticDetails?: ZillowDiagnosticDetails;
  agentDeskValuation?: ValuationResult | null;
  valuationInputs?: ValuationInputs | null;
  overrides?: PropertyOverrides;
}

export interface ComparisonProperty {
  zpid: string | null;
  address: string;
  price: number | null;
  zestimate: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  livingArea: number | null;
  lotSize: number | null;
  yearBuilt: number | null;
  propertyType: string | null;
  propertySubType: string | null;
  daysOnMarket: number | null;
  pricePerSqft: number | null;
  lastSoldPrice: number | null;
  lastSoldDate: string | null;
  taxAssessedValue: number | null;
  estimatedValue: number | null;
  photo: string | null;
}

export type ComparisonResult =
  | { kind: "success"; address: string; property: ComparisonProperty }
  | { kind: "empty"; address: string; diagnosticDetails?: ZillowDiagnosticDetails }
  | { kind: "error"; address: string; message: string; errorType?: ZillowProperty["errorType"]; diagnosticDetails?: ZillowDiagnosticDetails };

export interface ComparedProperty {
  address: string;
  zestimate?: number | null;
}

export interface PropertyComparison {
  id: string;
  createdAt: string;
  label?: string;
  properties: ZillowProperty[];
  summary?: {
    bestValueAddress: string | null;
    highestValueAddress: string | null;
  };
}

export interface Comparison {
  id: string;
  createdAt: string;
  properties: ComparisonProperty[];
  winnerAddress: string | null;
  winnerZestimate: number | null;
  reportNotes?: Record<string, string>;
  clientName?: string | null;
  label?: string;
}

/**
 * Global Agent Branding — single source of truth used by Sidebar,
 * Profile page, Client Report, and printed reports.
 *
 * Google API keys are NOT stored in the user profile. The Google Maps
 * key is read directly from NEXT_PUBLIC_GOOGLE_MAPS_API_KEY by the client.
 */
export interface AgentBranding {
  name: string;
  brokerage: string;
  phone: string;
  email: string;
  logoUrl?: string | null;
  location?: string | null;
}

export interface FredObservation {
  date: string;
  value: string;
  realtime_start?: string;
  realtime_end?: string;
}

export interface FredResponse {
  observations: FredObservation[];
}

export interface MortgageRateResult {
  rate: number;
  date: string;
  seriesId: string;
}

export interface RatePoint {
  date: string;
  value: number;
}

export interface RateSeries {
  current: number;
  currentDate: string;
  history: RatePoint[];
}

export interface MortgageRatesPayload {
  thirtyYear: RateSeries;
  fifteenYear: RateSeries;
  asOf: string;
}

export interface LocalMarketInputs {
  medianSalePrice: number | null;
  avgDaysOnMarket: number | null;
  listToSaleRatio: number | null;
  activeListings: number | null;
  newListingsThisMonth: number | null;
  updatedAt: string | null;
}

export interface LocalMarketInputsData {
  medianSalePrice: number;
  avgDaysOnMarket: number;
  listToSaleRatio: number;
  activeListings: number;
  newListingsThisMonth: number;
  updatedAt: string;
}

export interface MortgageCalcInputs {
  homePrice: number;
  downPaymentPct: number;
  interestRate: number;
  termYears: number;
}

export interface MortgageCalcOutputs {
  monthlyPayment: number;
  totalInterest: number;
  totalCost: number;
  loanAmount: number;
}

// ---------------------------------------------------------------------------
// Google Places — used by the Property Comparator address autocomplete.
// ---------------------------------------------------------------------------

export interface GooglePlace {
  placeId: string;
  formattedAddress: string;
  addressComponents?: Array<{
    longName: string;
    shortName: string;
    types: string[];
  }>;
  location?: { lat: number; lng: number } | null;
}

export type AddressInputValue = string | GooglePlace;

export function isGooglePlace(v: AddressInputValue): v is GooglePlace {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as GooglePlace).formattedAddress === "string" &&
    typeof (v as GooglePlace).placeId === "string"
  );
}

export function isMLSId(v: AddressInputValue): v is string {
  return typeof v === "string";
}
