import { NextRequest, NextResponse } from 'next/server';
import { createAuthClient, createServiceClient } from '@/lib/supabase-server';

// GET /api/projects/invite?token=<invite_token>
// Returns the project info for a given invite token (public — no auth required)
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 });

  const service = createServiceClient();
  const { data, error } = await service
    .from('projects')
    .select('id, name, user_id')
    .eq('invite_token', token)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Invalid or expired invite link' }, { status: 404 });

  return NextResponse.json({ project: data });
}

// POST /api/projects/invite
// Body: { project_id, action }
// action = 'regenerate' — generates a new invite token (owner only)
// action = 'join'       — adds current user to the project members list
export async function POST(req: NextRequest) {
  const supabase = await createAuthClient();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json() as { project_id: string; action: 'regenerate' | 'join'; token?: string };
  const { project_id, action, token } = body;

  const service = createServiceClient();

  // ── regenerate ──────────────────────────────────────────────
  if (action === 'regenerate') {
    // Only owner can regenerate
    const { data: proj } = await service
      .from('projects')
      .select('user_id')
      .eq('id', project_id)
      .single();

    if (!proj) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    if (proj.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data, error } = await service
      .from('projects')
      .update({ invite_token: crypto.randomUUID() })
      .eq('id', project_id)
      .select('invite_token')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ invite_token: data.invite_token });
  }

  // ── join ──────────────────────────────────────────────────────
  if (action === 'join') {
    if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 });

    // Find project by token
    const { data: proj, error: projErr } = await service
      .from('projects')
      .select('id, user_id, members')
      .eq('invite_token', token)
      .single();

    if (projErr || !proj) return NextResponse.json({ error: 'Invalid invite link' }, { status: 404 });

    // Owner can't join their own project as a member
    if (proj.user_id === user.id) {
      return NextResponse.json({ error: 'You are already the owner of this project', project_id: proj.id }, { status: 200 });
    }

    const members: { user_id: string; email: string; joined_at: string }[] = proj.members ?? [];

    // Idempotent — already a member
    if (members.some(m => m.user_id === user.id)) {
      return NextResponse.json({ project_id: proj.id, already_member: true });
    }

    members.push({
      user_id: user.id,
      email: user.email ?? '',
      joined_at: new Date().toISOString(),
    });

    const { error: updateErr } = await service
      .from('projects')
      .update({ members })
      .eq('id', proj.id);

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

    return NextResponse.json({ project_id: proj.id, joined: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
