-- Додаємо поле для збереження домену сайту
ALTER TABLE projects ADD COLUMN IF NOT EXISTS connected_domain text;

-- Створюємо таблицю для історії дій
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  action text NOT NULL, -- 'widget_connected', 'bug_received', 'widget_disabled', 'widget_enabled'
  details jsonb,
  created_at timestamp with time zone DEFAULT now()
);
