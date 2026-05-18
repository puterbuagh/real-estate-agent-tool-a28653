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

export interface ZillowProperty {
  zpid: string | null;
  address: string;
  price: number | null;
  zestimate: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  livingArea: number | null;
  lotSize: number | string | null;
  yearBuilt: number | null;
  propertyType: string | null;
  daysOnMarket: number | null;
  pricePerSqft: number | null;
  lastSoldPrice: number | null;
  lastSoldDate: string | null;
  taxAssessedValue: number | null;
  photo: string | null;
  status: "ok" | "no_data" | "error";
  errorMessage?: string;
  errorType?: "not_found" | "connection_error" | "rate_limited" | "missing_key" | "unknown";
}

export interface ComparisonProperty {
  zpid: string | null;
  address: string;
  price: number | null;
  zestimate: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  livingArea: number | null;
  lotSize: number | string | null;
  yearBuilt: number | null;
  propertyType: string | null;
  daysOnMarket: number | null;
  pricePerSqft: number | null;
  lastSoldPrice: number | null;
  lastSoldDate: string | null;
  taxAssessedValue: number | null;
  photo: string | null;
}

export type ComparisonResult =
  | { kind: "success"; address: string; property: ComparisonProperty }
  | { kind: "empty"; address: string }
  | { kind: "error"; address: string; message: string };

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
  properties: ComparedProperty[];
  winnerAddress: string | null;
  winnerZestimate: number | null;
  reportNotes?: Record<string, string>;
  clientName?: string | null;
}

/**
 * Global Agent Branding — single source of truth used by Sidebar,
 * Profile page, Client Report, and printed reports.
 *
 * googleApiKey is an OPTIONAL per-user key the agent pastes into their
 * profile. Stored in localStorage alongside the rest of the branding so
 * an agent who brings their own Google Places key can light up
 * address-autocomplete features without us provisioning one server-side.
 * Server-side Google calls should still prefer process.env.GOOGLE_API_KEY.
 */
export interface AgentBranding {
  name: string;
  brokerage: string;
  phone: string;
  email: string;
  logoUrl?: string | null;
  avatarUrl?: string | null;
  googleApiKey?: string | null;
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
