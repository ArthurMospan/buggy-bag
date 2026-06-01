import { NextRequest, NextResponse } from 'next/server';
import { createAuthClient } from '@/lib/supabase-server';
import type { BugStatus } from '@/lib/types';

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

    // RLS already filters to user's own projects, but we can also filter by project_id
    let query = supabase
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
    const { id, status } = body as { id: string; status: BugStatus };

    if (!id || !status) {
      return NextResponse.json({ error: 'id and status are required' }, { status: 400 });
    }

    const validStatuses: BugStatus[] = ['open', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // RLS on bugs table enforces ownership through the projects relationship
    const { data, error } = await supabase
      .from('bugs')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ bug: data });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
