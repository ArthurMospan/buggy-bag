import { NextRequest, NextResponse } from 'next/server';
import { createAuthClient, createServiceClient } from '@/lib/supabase-server';
import { decrypt } from '@/lib/crypto';
import { canAccessProject } from '@/lib/project';
import { Bug, Project } from '@/lib/types';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import { formatBugMarkdown } from '@/lib/markdownFormatter';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createAuthClient();
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: bugId } = await params;
    if (!bugId) return NextResponse.json({ error: 'Bug id is required' }, { status: 400 });

    const service = createServiceClient();
    
    // Get bug
    const { data: bugData, error: bugErr } = await service
      .from('bugs')
      .select('*')
      .eq('id', bugId)
      .single();
      
    if (bugErr || !bugData) {
      return NextResponse.json({ error: 'Bug not found' }, { status: 404 });
    }
    const bug = bugData as Bug;

    // Verify access
    const allowed = await canAccessProject(bug.project_id, user.id);
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get project settings
    const { data: projData, error: projErr } = await service
      .from('projects')
      .select('*')
      .eq('id', bug.project_id)
      .single();

    if (projErr || !projData) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    const project = projData as Project;

    if (!project.github_repo || !project.github_token) {
      return NextResponse.json({ error: 'GitHub is not configured for this project' }, { status: 400 });
    }

    // Generate Markdown
    const md = formatBugMarkdown(bug);

    const title = `[BuggyBag] ${bug.description ? bug.description.substring(0, 60) : 'New Bug Report'}`;

    const decryptedToken = decrypt(project.github_token);

    // Create Issue via GitHub API
    const ghResponse = await fetch(`https://api.github.com/repos/${project.github_repo}/issues`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${decryptedToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        body: md,
        labels: ['bug', 'buggybag']
      })
    });

    if (!ghResponse.ok) {
      const ghErr = await ghResponse.text();
      console.error('GitHub API error:', ghErr);
      return NextResponse.json({ error: 'Failed to create GitHub issue' }, { status: 502 });
    }

    const ghData = await ghResponse.json();
    const issueUrl = ghData.html_url;

    // Save issue url to bug
    await service
      .from('bugs')
      .update({ github_issue_url: issueUrl })
      .eq('id', bugId);

    return NextResponse.json({ success: true, url: issueUrl });
  } catch (error: any) {
    console.error('GitHub integration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
