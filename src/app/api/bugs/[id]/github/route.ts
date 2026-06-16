import { NextRequest, NextResponse } from 'next/server';
import { createAuthClient, createServiceClient } from '@/lib/supabase-server';
import { decrypt } from '@/lib/crypto';
import { canAccessProject } from '@/app/api/bugs/route';
import { Bug, Project } from '@/lib/types';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';

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
    const tc = bug.tech_context;
    const steps = tc?.eventLog?.map((e, i) => `${i + 1}. ${e.description}`).join('\n') ?? 'N/A';
    const consoleErrs = tc?.consoleErrors?.map(e => `- [${e.level.toUpperCase()}] ${e.message}`).join('\n') ?? 'None';
    const netErrs = tc?.networkRequests?.filter(r => r.isError).map(r => `- ${r.method} ${r.url} -> ${r.status || 'ERR'}`).join('\n') ?? 'None';
    
    const md = [
      `## Bug: ${bug.description || 'Без опису'}`, '',
      `| | |`, `|---|---|`,
      `| **Severity** | ${bug.severity ?? 'low'} |`,
      `| **Route** | \`${tc?.route ?? '-'}\` |`,
      `| **Viewport** | ${tc?.viewport ?? '-'} |`,
      `| **Date** | ${format(new Date(bug.created_at), 'dd MMM yyyy, HH:mm', { locale: uk })} |`, '',
      '### Steps', steps, '', '### Console', consoleErrs, '', '### Network', netErrs,
      ...(bug.image_url ? ['', `### Screenshot`, `![](${bug.image_url})`] : []),
    ].join('\n');

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
