ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS last_seen_at timestamp with time zone;
