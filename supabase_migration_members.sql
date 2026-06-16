-- Run this in Supabase SQL Editor
-- Add invite_token and members to projects table

ALTER TABLE projects 
  ADD COLUMN IF NOT EXISTS invite_token UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS members JSONB DEFAULT '[]'::jsonb;

-- Make sure every existing project has a unique invite_token
UPDATE projects SET invite_token = gen_random_uuid() WHERE invite_token IS NULL;

-- Index for fast lookup by invite_token
CREATE INDEX IF NOT EXISTS projects_invite_token_idx ON projects(invite_token);
