-- Add composite unique constraint to property_overrides table
-- This constraint is required for upsert operations using onConflict: 'user_id,address_hash'

-- Drop the table and recreate with the constraint if it exists without it
DROP TABLE IF EXISTS property_overrides CASCADE;

CREATE TABLE property_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  address_hash text NOT NULL,
  address text NOT NULL,
  overrides jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT property_overrides_user_address_unique UNIQUE(user_id, address_hash)
);

ALTER TABLE property_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can manage own overrides"
  ON property_overrides
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_property_overrides_user_address ON property_overrides(user_id, address_hash);
