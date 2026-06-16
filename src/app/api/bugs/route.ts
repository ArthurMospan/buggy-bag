import { NextRequest, NextResponse } from 'next/server';
import { createAuthClient, createServiceClient } from '@/lib/supabase-server';
import type { BugStatus, BugSeverity } from '@/lib/types';

/** Returns true if user is owner or member of the given project */
export async function canAccessProject(projectId: string, userId: string): Promise<boolean> {
  const service = createServiceClient();
  let { data, error } = await service
    .from('projects')
    .select('user_id, members')
    .eq('id', projectId)
    .single();

  if (error && error.message.includes('members')) {
    const fallback = await service
      .from('projects')
      .select('user_id')
      .eq('id', projectId)
      .single();
    data = fallback.data as any;
  }

  if (!data) return false;
  if (data.user_id === userId) return true;
  const members: { user_id: string }[] = data.members ?? [];
  return members.some(m => m.user_id === userId);
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createAuthClient();
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const project_id = searchParams.get('project_id');
    const status = searchParams.get('status');

    if (project_id) {
      // Verify the user has access to this specific project
      const allowed = await canAccessProject(project_id, user.id);
      if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const service = createServiceClient();
    let query = service
      .from('bugs')
      .select('*')
      .order('created_at', { ascending: false });

    if (project_id) query = query.eq('project_id', project_id);
    if (status)     query = query.eq('status', status);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ bugs: data ?? [] });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createAuthClient();
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, ids, status, severity } = body as { id?: string; ids?: string[]; status?: BugStatus; severity?: BugSeverity };

    const targetIds = ids ?? (id ? [id] : []);
    if (targetIds.length === 0 || (!status && !severity)) {
      return NextResponse.json({ error: 'id(s) and status or severity are required' }, { status: 400 });
    }

    const updates: Record<string, string> = {};
    if (status) {
      const validStatuses: BugStatus[] = ['open', 'in_progress', 'resolved', 'closed'];
      if (!validStatuses.includes(status)) return NextResponse.json({ error: `Invalid status` }, { status: 400 });
      updates.status = status;
    }
    if (severity) {
      const validSeverities: BugSeverity[] = ['low', 'medium', 'high', 'critical'];
      if (!validSeverities.includes(severity)) return NextResponse.json({ error: `Invalid severity` }, { status: 400 });
      updates.severity = severity;
    }

    const service = createServiceClient();

    // Check access for all target bugs
    const { data: bugs } = await service.from('bugs').select('project_id').in('id', targetIds);
    if (!bugs || bugs.length === 0) return NextResponse.json({ error: 'Bugs not found' }, { status: 404 });
    const projectIds = Array.from(new Set(bugs.map(b => b.project_id)));
    for (const pid of projectIds) {
      if (!(await canAccessProject(pid, user.id))) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const { data, error } = await service
      .from('bugs')
      .update(updates)
      .in('id', targetIds)
      .select();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ bug: data?.[0], bugs: data });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createAuthClient();
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { ids } = body as { ids?: string[] };
    if (!ids || ids.length === 0) return NextResponse.json({ error: 'ids are required' }, { status: 400 });

    const service = createServiceClient();
    const { data: bugs } = await service.from('bugs').select('project_id').in('id', ids);
    if (!bugs || bugs.length === 0) return NextResponse.json({ error: 'Bugs not found' }, { status: 404 });
    
    const projectIds = Array.from(new Set(bugs.map(b => b.project_id)));
    for (const pid of projectIds) {
      if (!(await canAccessProject(pid, user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await service.from('bugs').delete().in('id', ids);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}