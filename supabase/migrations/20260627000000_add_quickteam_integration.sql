-- Add QuickTeam integration fields to projects
ALTER TABLE projects ADD COLUMN quickteam_url text;
ALTER TABLE projects ADD COLUMN quickteam_token text;
ALTER TABLE projects ADD COLUMN quickteam_organization_id text;

-- Add QuickTeam issue url to bugs
ALTER TABLE bugs ADD COLUMN quickteam_issue_url text;
