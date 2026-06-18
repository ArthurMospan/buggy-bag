ALTER TABLE projects ADD COLUMN youtrack_url TEXT;
ALTER TABLE projects ADD COLUMN youtrack_token TEXT;
ALTER TABLE projects ADD COLUMN youtrack_project TEXT;

ALTER TABLE bugs ADD COLUMN youtrack_issue_url TEXT;
