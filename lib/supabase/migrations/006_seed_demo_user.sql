-- AgentDesk: Seed demo user account
-- Run this migration manually in Supabase SQL Editor to create pre-populated demo account
-- This is a one-time admin operation, not exposed to public

-- Insert demo user authentication record
-- Note: This requires admin privileges in Supabase Auth
-- The password hash below is for 'demo123' (bcrypt hashed)
-- You must run this in the Supabase dashboard SQL editor with admin access

-- First, create the auth user (this part must be done via Supabase dashboard manually)
-- Go to Authentication > Users > Add User
-- Email: demo@agentdesk.app
-- Password: demo123
-- Auto Confirm User: Yes
-- Then run the below SQL to populate their profile data

-- Get the user_id for demo@agentdesk.app
-- Replace 'USER_ID_HERE' with the actual UUID from auth.users after creating the user

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
