-- Migration: add severity and tech_context to bugs table
-- Run this in Supabase SQL Editor

ALTER TABLE bugs
  ADD COLUMN IF NOT EXISTS severity TEXT NOT NULL DEFAULT 'low'
    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  ADD COLUMN IF NOT EXISTS tech_context JSONB DEFAULT NULL;

-- Index for severity filtering
CREATE INDEX IF NOT EXISTS bugs_severity_idx ON bugs (severity);
