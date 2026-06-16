-- Favicon reported by the widget itself (client-side DOM read), so it works
-- for localhost/private dev domains too — the portal server never fetches
-- the connected_domain directly.
ALTER TABLE projects ADD COLUMN IF NOT EXISTS favicon_url text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS favicon_color text;
