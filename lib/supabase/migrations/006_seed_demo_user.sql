-- AgentDesk: Seed demo user account
-- Run this migration manually in Supabase SQL Editor to create pre-populated demo account
-- This is a one-time admin operation, not exposed to public

-- ⚠️ CRITICAL SETUP INSTRUCTIONS — READ CAREFULLY ⚠️
--
-- This migration creates profile data for demo@agentdesk.app in the agentdesk schema,
-- but it does NOT create the Supabase Auth user itself.
--
-- You MUST manually create the auth.users record via Supabase Dashboard BEFORE running this migration:
--
-- 1. In Supabase Dashboard, go to Authentication → Users → Add User:
--    - Email: demo@agentdesk.app
--    - Password: demo2024 (or your preferred password)
--    - Auto Confirm User: Yes
--
-- 2. Set DEMO_PASSWORD environment variable in Vercel/your hosting provider:
--    - This password is ONLY used for /demo page access control validation
--    - It does NOT need to match the Supabase Auth password
--    - The /api/demo-auth route only checks if the user entered the correct access code
--    - Actual authentication happens client-side using the real Supabase password
--
-- 3. Then run this SQL migration to populate agentdesk schema tables
--
-- WHAT THIS MIGRATION DOES:
-- - Inserts agent_profiles record for demo@agentdesk.app (if auth.users record exists)
-- - Inserts sample pipeline_properties records
-- - Inserts sample property_valuations records
--
-- WHAT THIS MIGRATION DOES NOT DO:
-- - It does NOT create the auth.users record (you must do that manually in Dashboard)
-- - It does NOT set or validate any passwords
-- - It does NOT configure authentication

-- Insert agent profile for demo user
INSERT INTO agentdesk.agent_profiles (
  user_id,
  name,
  email,
  phone,
  brokerage,
  license_number,
  bio,
  location,
  created_at,
  updated_at
)
SELECT
  id,
  'Alex Morgan',
  'demo@agentdesk.app',
  '(614) 555-0123',
  'Premier Realty Ohio',
  'OH-2024-98765',
  'Experienced real estate professional specializing in residential properties in the Columbus metro area. Committed to helping clients find their perfect home with data-driven insights and personalized service.',
  'Columbus, OH',
  NOW(),
  NOW()
FROM auth.users
WHERE email = 'demo@agentdesk.app'
ON CONFLICT (user_id) DO NOTHING;

-- Insert sample pipeline properties for demo user
INSERT INTO agentdesk.pipeline_properties (
  user_id,
  stage,
  address,
  city,
  state,
  zip_code,
  price,
  bedrooms,
  bathrooms,
  square_feet,
  lot_size,
  year_built,
  property_type,
  notes,
  client_name,
  client_email,
  created_at,
  updated_at
)
SELECT
  id,
  'Lead',
  '123 Oak Street',
  'Columbus',
  'OH',
  '43215',
  425000,
  3,
  2.5,
  2100,
  0.25,
  2018,
  'Single Family',
  'Interested buyer from open house - follow up scheduled',
  'Sarah Johnson',
  'sarah.j@example.com',
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '2 days'
FROM auth.users
WHERE email = 'demo@agentdesk.app'
ON CONFLICT DO NOTHING;

INSERT INTO agentdesk.pipeline_properties (
  user_id,
  stage,
  address,
  city,
  state,
  zip_code,
  price,
  bedrooms,
  bathrooms,
  square_feet,
  lot_size,
  year_built,
  property_type,
  notes,
  client_name,
  client_email,
  created_at,
  updated_at
)
SELECT
  id,
  'Showing',
  '456 Maple Avenue',
  'Dublin',
  'OH',
  '43017',
  550000,
  4,
  3,
  2800,
  0.35,
  2020,
  'Single Family',
  'Second showing scheduled for this weekend',
  'Michael Chen',
  'mchen@example.com',
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '1 day'
FROM auth.users
WHERE email = 'demo@agentdesk.app'
ON CONFLICT DO NOTHING;

INSERT INTO agentdesk.pipeline_properties (
  user_id,
  stage,
  address,
  city,
  state,
  zip_code,
  price,
  bedrooms,
  bathrooms,
  square_feet,
  lot_size,
  year_built,
  property_type,
  notes,
  client_name,
  client_email,
  created_at,
  updated_at
)
SELECT
  id,
  'Under Contract',
  '789 Elm Court',
  'Westerville',
  'OH',
  '43081',
  380000,
  3,
  2,
  1850,
  0.20,
  2015,
  'Single Family',
  'Inspection scheduled - waiting on appraisal',
  'Jennifer Martinez',
  'jmartinez@example.com',
  NOW() - INTERVAL '12 days',
  NOW() - INTERVAL '3 hours'
FROM auth.users
WHERE email = 'demo@agentdesk.app'
ON CONFLICT DO NOTHING;

-- Insert sample property valuations for demo user
INSERT INTO agentdesk.property_valuations (
  user_id,
  address,
  city,
  state,
  zip_code,
  avm_value,
  confidence_score,
  data_source,
  created_at
)
SELECT
  id,
  '123 Oak Street',
  'Columbus',
  'OH',
  '43215',
  432000,
  0.85,
  'demo_seed',
  NOW() - INTERVAL '2 days'
FROM auth.users
WHERE email = 'demo@agentdesk.app'
ON CONFLICT DO NOTHING;

INSERT INTO agentdesk.property_valuations (
  user_id,
  address,
  city,
  state,
  zip_code,
  avm_value,
  confidence_score,
  data_source,
  created_at
)
SELECT
  id,
  '456 Maple Avenue',
  'Dublin',
  'OH',
  '43017',
  565000,
  0.92,
  'demo_seed',
  NOW() - INTERVAL '5 days'
FROM auth.users
WHERE email = 'demo@agentdesk.app'
ON CONFLICT DO NOTHING;
