import { NextRequest, NextResponse } from 'next/server';
import { createAuthClient, createServiceClient } from '@/lib/supabase-server';
import { decrypt } from '@/lib/crypto';
import { canAccessProject } from '@/lib/project';
import { Bug, Project } from '@/lib/types';
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

    let reqBody: any = {};
    try {
      reqBody = await req.json();
    } catch (e) {
      // Body might be empty
    }
    const quickteamProjectId = reqBody?.projectId || null;

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

    if (!project.quickteam_token || !project.quickteam_organization_id) {
      return NextResponse.json({ error: 'QuickTeam is not configured for this project' }, { status: 400 });
    }

    // Generate Markdown
    const md = formatBugMarkdown(bug);
    const summary = `[BuggyBag] ${bug.description ? bug.description.substring(0, 60) : 'New Bug Report'}`;

    const decryptedToken = decrypt(project.quickteam_token);
    const rawUrl = process.env.QUICKTEAM_API_URL || process.env.NEXT_PUBLIC_QUICKTEAM_URL || 'https://qt-workspace.vercel.app';
    const qtUrl = rawUrl.replace(/\/$/, ''); // Remove trailing slash if any
    
    // Convert bug severity to priority
    let priority = 'low';
    const severityNum = parseInt(bug.severity) || 1;
    if (severityNum >= 8) priority = 'high';
    else if (severityNum >= 5) priority = 'medium';

    // Create Task via QuickTeam API
    const qtResponse = await fetch(`${qtUrl}/api/v1/tasks`, {
      method: 'POST',
      headers: {
        'x-api-key': decryptedToken,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: summary,
        description: md,
        reporter: user.email || user.id,
        sourceUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/projects/${bug.project_id}/bugs/${bug.id}`,
        priority,
        type: 'bug',
        organizationId: project.quickteam_organization_id,
        projectId: quickteamProjectId,
        metadata: {
            buggyBagId: bug.id,
            projectId: bug.project_id
        }
      })
    });

    if (!qtResponse.ok) {
      const qtErr = await qtResponse.text();
      console.error('QuickTeam API error creating task:', qtErr);
      return NextResponse.json({ error: `Failed to create QuickTeam task: ${qtResponse.status} ${qtResponse.statusText}. Please check if the QuickTeam URL and Port in Settings is correct.` }, { status: 502 });
    }

    const qtData = await qtResponse.json();
    const relativeUrl = qtData.data?.taskUrl || qtData.data?.url;
    const taskUrl = relativeUrl ? `${qtUrl}${relativeUrl}` : `${qtUrl}/workspace`;

    // Save issue url to bug
    await service
      .from('bugs')
      .update({ quickteam_issue_url: taskUrl })
      .eq('id', bugId);

    return NextResponse.json({ success: true, url: taskUrl });
  } catch (error: any) {
    console.error('QuickTeam integration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
