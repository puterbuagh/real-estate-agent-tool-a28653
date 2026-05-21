-- AgentDesk: property_overrides table
-- Stores agent-edited property data that overrides ATTOM values

CREATE TABLE IF NOT EXISTS property_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  address_hash text NOT NULL,
  address text NOT NULL,
  overrides jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, address_hash)
);

ALTER TABLE property_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can manage own overrides"
  ON property_overrides
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_property_overrides_user_address
  ON property_overrides(user_id, address_hash);
