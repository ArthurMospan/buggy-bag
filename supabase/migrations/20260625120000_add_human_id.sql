-- Add human_id column to bugs table
ALTER TABLE bugs ADD COLUMN IF NOT EXISTS human_id VARCHAR(50);

-- Function to generate human_id for new bugs
CREATE OR REPLACE FUNCTION generate_bug_human_id()
RETURNS TRIGGER AS $$
DECLARE
    proj_name TEXT;
    prefix TEXT;
    bug_count INT;
BEGIN
    -- Get project name
    SELECT name INTO proj_name FROM projects WHERE id = NEW.project_id;
    
    -- Extract first 3 alphanumeric characters, uppercase them
    prefix := UPPER(SUBSTRING(REGEXP_REPLACE(proj_name, '[^a-zA-Z0-9]', '', 'g') FROM 1 FOR 3));
    
    -- Fallback if name is empty or no alphanumeric
    IF prefix IS NULL OR prefix = '' THEN
        prefix := 'BUG';
    END IF;
    
    -- Get current count of bugs in this project
    SELECT COUNT(*) INTO bug_count FROM bugs WHERE project_id = NEW.project_id;
    
    -- Assign human_id
    NEW.human_id := prefix || '-' || (bug_count + 1);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to execute the function before insert
DROP TRIGGER IF EXISTS trigger_generate_bug_human_id ON bugs;
CREATE TRIGGER trigger_generate_bug_human_id
BEFORE INSERT ON bugs
FOR EACH ROW
EXECUTE FUNCTION generate_bug_human_id();

-- Update existing bugs to have human_id
DO $$
DECLARE
    proj RECORD;
    b RECORD;
    counter INT;
    prefix TEXT;
BEGIN
    FOR proj IN SELECT id, name FROM projects LOOP
        prefix := UPPER(SUBSTRING(REGEXP_REPLACE(proj.name, '[^a-zA-Z0-9]', '', 'g') FROM 1 FOR 3));
        IF prefix IS NULL OR prefix = '' THEN
            prefix := 'BUG';
        END IF;
        
        counter := 1;
        FOR b IN SELECT id FROM bugs WHERE project_id = proj.id ORDER BY created_at ASC LOOP
            UPDATE bugs SET human_id = prefix || '-' || counter WHERE id = b.id;
            counter := counter + 1;
        END LOOP;
    END LOOP;
END;
$$;
