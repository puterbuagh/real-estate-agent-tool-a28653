-- AgentDesk: property_valuations table
-- Stores cached AgentDesk estimate calculations with 7-day expiration
-- Uses address_hash (SHA-256) as unique key to prevent recalculation

CREATE TABLE IF NOT EXISTS property_valuations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  address_hash text UNIQUE NOT NULL,
  address text NOT NULL,
  agentdesk_estimate numeric,
  variance_pct numeric,
  variance_low numeric,
  variance_high numeric,
  confidence text CHECK (confidence IN ('high', 'medium', 'low')),
  comp_count integer,
  inputs jsonb,
  calculated_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '7 days')
);

ALTER TABLE property_valuations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated users can read valuations"
  ON property_valuations FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "service role can insert valuations"
  ON property_valuations FOR INSERT
  TO service_role WITH CHECK (true);

CREATE INDEX idx_property_valuations_address_hash ON property_valuations(address_hash);
CREATE INDEX idx_property_valuations_expires_at ON property_valuations(expires_at);
