import { NextRequest, NextResponse } from 'next/server';
import { createAuthClient, createServiceClient } from '@/lib/supabase-server';
import { decrypt } from '@/lib/crypto';
import { canAccessProject } from '@/lib/project';
import { Project } from '@/lib/types';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createAuthClient();
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;
    if (!projectId) return NextResponse.json({ error: 'Project id is required' }, { status: 400 });

    // Verify access
    const allowed = await canAccessProject(projectId, user.id);
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const service = createServiceClient();

    // Get project settings
    const { data: projData, error: projErr } = await service
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projErr || !projData) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    const project = projData as Project;

    if (!project.quickteam_token || !project.quickteam_organization_id) {
      return NextResponse.json({ error: 'QuickTeam is not configured for this project' }, { status: 400 });
    }

    const decryptedToken = decrypt(project.quickteam_token);
    const qtUrl = process.env.QUICKTEAM_API_URL || process.env.NEXT_PUBLIC_QUICKTEAM_URL || 'https://qt-workspace.vercel.app';
    const baseUrl = qtUrl.replace(/\/$/, '');
    
    // Fetch projects from QuickTeam API
    const qtResponse = await fetch(`${baseUrl}/api/v1/projects?organizationId=${project.quickteam_organization_id}`, {
      method: 'GET',
      headers: {
        'x-api-key': decryptedToken,
        'Accept': 'application/json',
      }
    });

    if (!qtResponse.ok) {
      const qtErr = await qtResponse.text();
      console.error('QuickTeam API error fetching projects:', qtErr);
      return NextResponse.json({ error: `Failed to fetch QuickTeam projects: ${qtResponse.status} ${qtResponse.statusText}.` }, { status: 502 });
    }

    const qtData = await qtResponse.json();
    
    return NextResponse.json({ success: true, projects: qtData.data || [] });
  } catch (error: any) {
    console.error('QuickTeam fetch projects error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
