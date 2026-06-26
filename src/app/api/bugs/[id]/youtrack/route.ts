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

    if (!project.youtrack_url || !project.youtrack_token || !project.youtrack_project) {
      return NextResponse.json({ error: 'YouTrack is not configured for this project' }, { status: 400 });
    }

    // Generate Markdown
    const md = formatBugMarkdown(bug);

    const summary = `[BuggyBag] ${bug.description ? bug.description.substring(0, 60) : 'New Bug Report'}`;

    const decryptedToken = decrypt(project.youtrack_token);
    const ytUrl = project.youtrack_url.replace(/\/$/, ''); // Remove trailing slash if any

    // 1. Fetch YouTrack internal project ID
    const projResponse = await fetch(`${ytUrl}/api/admin/projects?fields=id,shortName`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${decryptedToken}`,
        'Accept': 'application/json',
      }
    });

    if (!projResponse.ok) {
      const errText = await projResponse.text();
      console.error('YouTrack API error fetching projects:', errText);
      return NextResponse.json({ error: 'Failed to fetch YouTrack projects' }, { status: 502 });
    }

    const projects: { id: string, shortName: string }[] = await projResponse.json();
    const ytProject = projects.find(p => p.shortName === project.youtrack_project);

    if (!ytProject) {
      return NextResponse.json({ error: `YouTrack project '${project.youtrack_project}' not found` }, { status: 404 });
    }

    // 2. Create Issue via YouTrack API
    const ytResponse = await fetch(`${ytUrl}/api/issues?fields=id,idReadable`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${decryptedToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project: { id: ytProject.id },
        summary: summary,
        description: md
      })
    });

    if (!ytResponse.ok) {
      const ytErr = await ytResponse.text();
      console.error('YouTrack API error creating issue:', ytErr);
      return NextResponse.json({ error: 'Failed to create YouTrack issue' }, { status: 502 });
    }

    const ytData = await ytResponse.json();
    const issueUrl = `${ytUrl}/issue/${ytData.idReadable}`;

    // Save issue url to bug
    await service
      .from('bugs')
      .update({ youtrack_issue_url: issueUrl })
      .eq('id', bugId);

    return NextResponse.json({ success: true, url: issueUrl });
  } catch (error: any) {
    console.error('YouTrack integration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
