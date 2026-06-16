-- Add GitHub integration fields to projects
ALTER TABLE projects ADD COLUMN github_token TEXT;
ALTER TABLE projects ADD COLUMN github_repo TEXT;

-- Add GitHub issue URL to bugs
ALTER TABLE bugs ADD COLUMN github_issue_url TEXT;
