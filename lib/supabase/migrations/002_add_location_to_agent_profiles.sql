-- Add location column to agent_profiles table
-- This stores the user's market location (e.g., "Florida", "California", "Texas")
-- Used to display location-specific text in the UI (e.g., "Median Days on Market (Florida)")

ALTER TABLE agent_profiles
ADD COLUMN IF NOT EXISTS location TEXT;

COMMENT ON COLUMN agent_profiles.location IS 'User''s market location/state for display purposes';
