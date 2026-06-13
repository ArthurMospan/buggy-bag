-- Migration: add json_shapes to bugs table to store raw shapes with DOM element context per pin
-- Run this in Supabase SQL Editor

ALTER TABLE bugs
  ADD COLUMN IF NOT EXISTS json_shapes JSONB DEFAULT NULL;
