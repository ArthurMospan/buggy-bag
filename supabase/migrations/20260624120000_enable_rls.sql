-- Enable Row-Level Security (RLS) on all public tables
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bugs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy for projects table:
-- Allow authenticated users to perform all operations on projects they own
CREATE POLICY "Allow owners full access to their projects" 
ON public.projects
FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Note: bugs and activity_logs tables do not need public policies
-- because they are only queried/modified via Next.js server-side API routes 
-- using the service_role key, which automatically bypasses RLS.
