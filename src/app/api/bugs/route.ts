import { NextRequest, NextResponse } from 'next/server';
import { createAuthClient, createServiceClient } from '@/lib/supabase-server';
import { canAccessProject } from '@/lib/project';

export const dynamic = 'force-dynamic';
import type { BugStatus, BugSeverity } from '@/lib/types';

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

    const service = createServiceClient();
    let allowedProjectIds: string[] = [];

    if (project_id) {
      // Verify the user has access to this specific project
      const allowed = await canAccessProject(project_id, user.id);
      if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      allowedProjectIds = [project_id];
    } else {
      // Fetch all projects user has access to
      let { data: projects, error: projErr } = await service
        .from('projects')
        .select('id')
        .or(`user_id.eq.${user.id},members.cs.[{"user_id":"${user.id}"}]`);

      if (projErr && projErr.message.includes('members')) {
        const fallback = await service.from('projects').select('id').eq('user_id', user.id);
        projects = fallback.data as any;
      }

      if (!projects || projects.length === 0) {
        return NextResponse.json({ bugs: [] });
      }
      allowedProjectIds = projects.map(p => p.id);
    }

    let query = service
      .from('bugs')
      .select('*')
      .order('created_at', { ascending: false })
      .in('project_id', allowedProjectIds);

    if (status) query = query.eq('status', status);

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
    const { id, ids, status, severity, description, json_annotations, json_shapes } = body as any;

    const targetIds = ids ?? (id ? [id] : []);
    if (targetIds.length === 0) {
      return NextResponse.json({ error: 'id(s) required' }, { status: 400 });
    }

    const updates: Record<string, any> = {};
    if (status) {
      const validStatuses: BugStatus[] = ['open', 'in_progress', 'resolved'];
      if (!validStatuses.includes(status)) return NextResponse.json({ error: `Invalid status` }, { status: 400 });
      updates.status = status;
    }
    if (severity) {
      const validSeverities: BugSeverity[] = ['low', 'medium', 'high', 'critical', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
      if (!validSeverities.includes(severity as any)) return NextResponse.json({ error: `Invalid severity` }, { status: 400 });
      updates.severity = severity;
    }
    if (description !== undefined) updates.description = description;
    if (json_annotations !== undefined) updates.json_annotations = json_annotations;
    if (json_shapes !== undefined) updates.json_shapes = json_shapes;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
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
    const { data: bugs } = await service.from('bugs').select('project_id, image_url, json_annotations').in('id', ids);
    if (!bugs || bugs.length === 0) return NextResponse.json({ success: true }); // Idempotent: already deleted
    
    const projectIds = Array.from(new Set(bugs.map(b => b.project_id)));
    for (const pid of projectIds) {
      if (!(await canAccessProject(pid, user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const storagePathsToDelete: string[] = [];
    for (const bug of bugs) {
      if (bug.image_url) {
        const match = bug.image_url.match(/bug-screenshots\/(.+)$/);
        if (match) storagePathsToDelete.push(match[1].split('?')[0]);
      }
      if (bug.json_annotations && Array.isArray(bug.json_annotations)) {
        for (const ann of bug.json_annotations) {
          if (ann.attachments && Array.isArray(ann.attachments)) {
            for (const att of ann.attachments) {
              if (att.url) {
                const match = att.url.match(/bug-screenshots\/(.+)$/);
                if (match) storagePathsToDelete.push(match[1].split('?')[0]);
              }
            }
          }
        }
      }
    }

    const { error } = await service.from('bugs').delete().in('id', ids);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (storagePathsToDelete.length > 0) {
      const { error: storageError } = await service.storage.from('bug-screenshots').remove(storagePathsToDelete);
      if (storageError) {
        console.error('[buggy-bag] Failed to delete some bug screenshots:', storageError);
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}