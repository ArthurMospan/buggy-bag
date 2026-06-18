import { NextRequest, NextResponse } from 'next/server';
import { createAuthClient, createServiceClient } from '@/lib/supabase-server';
import { encrypt } from '@/lib/crypto';

// GET — list the current user's projects (owned + member)
export async function GET() {
  try {
    const supabase = await createAuthClient();
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const service = createServiceClient();

    // First try querying with members array
    let { data, error } = await service
      .from('projects')
      .select('*')
      .or(`user_id.eq.${user.id},members.cs.[{"user_id":"${user.id}"}]`)
      .order('created_at', { ascending: false });

    if (error && error.message.includes('members')) {
      console.warn('[GET /api/projects] "members" column missing, falling back to user_id only');
      const fallback = await service
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      console.error('[GET /api/projects] Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const projects = (data ?? []).map((p: any) => {
      if (p.github_token) p.github_token = 'ghp_***';
      return p;
    });

    return NextResponse.json({ projects });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST — create a new project for the current user
export async function POST(req: NextRequest) {
  try {
    const supabase = await createAuthClient();
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name } = body as { name: string };

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }

    // Use service client to insert so RLS insert check (auth.uid() = user_id)
    // is satisfied by explicitly setting user_id to the current user's id
    const { data, error } = await supabase
      .from('projects')
      .insert({ name: name.trim(), user_id: user.id })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (data?.github_token) {
      data.github_token = 'ghp_***';
    }

    return NextResponse.json({ project: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE — delete a project (verifies ownership via RLS)
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createAuthClient();
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await req.json() as { id: string };
    if (!id) return NextResponse.json({ error: 'Project id is required' }, { status: 400 });

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH — update a project (name, is_active, or regenerate api_key)
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createAuthClient();
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json() as { id: string; is_active?: boolean; name?: string; regenerate_api_key?: boolean; github_repo?: string; github_token?: string; widget_password?: string };
    const { id, is_active, name, regenerate_api_key, github_repo, github_token, widget_password } = body;
    if (!id) return NextResponse.json({ error: 'Project id is required' }, { status: 400 });

    const updateData: { is_active?: boolean; name?: string; api_key?: string; github_repo?: string; github_token?: string | null; widget_password?: string | null } = {};
    if (typeof is_active === 'boolean') updateData.is_active = is_active;
    if (name?.trim()) updateData.name = name.trim();
    if (regenerate_api_key) updateData.api_key = crypto.randomUUID();
    if (github_repo !== undefined) updateData.github_repo = github_repo;
    if (widget_password !== undefined) updateData.widget_password = widget_password ? widget_password.trim() : null;
    if (github_token !== undefined) {
      updateData.github_token = github_token ? encrypt(github_token) : null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (typeof is_active === 'boolean') {
      supabase.from('activity_logs').insert({
        project_id: id,
        action: is_active ? 'widget_enabled' : 'widget_disabled',
        details: {}
      }).then();
    }
    if (data?.github_token) {
      data.github_token = 'ghp_***';
    }

    return NextResponse.json({ project: data });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
