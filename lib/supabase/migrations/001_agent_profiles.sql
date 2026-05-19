-- AgentDesk: agent_profiles table
-- Run inside the dedicated schema (set via NEXT_PUBLIC_SUPABASE_SCHEMA, e.g. 'agentdesk').
-- This migration is idempotent and safe to re-run.

SET search_path TO "agentdesk", public;

-- ---------------------------------------------------------------------------
-- Table: agent_profiles
-- One row per authenticated agent. PK references auth.users(id) so the row is
-- automatically tied to the Supabase auth user.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agent_profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name         text NOT NULL DEFAULT '',
  email        text NOT NULL DEFAULT '',
  brokerage    text NOT NULL DEFAULT '',
  phone        text NOT NULL DEFAULT '',
  logo_url     text,
  avatar_url   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_profiles_email_idx ON agent_profiles (email);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION agent_profiles_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS agent_profiles_updated_at ON agent_profiles;
CREATE TRIGGER agent_profiles_updated_at
  BEFORE UPDATE ON agent_profiles
  FOR EACH ROW
  EXECUTE FUNCTION agent_profiles_set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: each user can only read/update/insert their own row.
-- ---------------------------------------------------------------------------
ALTER TABLE agent_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_profiles_select_own" ON agent_profiles;
CREATE POLICY "agent_profiles_select_own"
  ON agent_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "agent_profiles_insert_own" ON agent_profiles;
CREATE POLICY "agent_profiles_insert_own"
  ON agent_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "agent_profiles_update_own" ON agent_profiles;
CREATE POLICY "agent_profiles_update_own"
  ON agent_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "agent_profiles_delete_own" ON agent_profiles;
CREATE POLICY "agent_profiles_delete_own"
  ON agent_profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- Auto-create an agent_profiles row whenever a new auth.users row is inserted.
-- The signup form may also explicitly upsert into this table with the name
-- captured at signup, which will overwrite this default empty row.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION agentdesk.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO agentdesk.agent_profiles (id, email, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION agentdesk.handle_new_user();
