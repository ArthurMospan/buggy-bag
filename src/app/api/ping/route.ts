import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  try {
    const { api_key } = await req.json();
    if (!api_key) return NextResponse.json({ error: 'api_key required' }, { status: 400, headers: CORS });

    const supabase = createServiceClient();
    const { data: project } = await supabase
      .from('projects')
      .select('id, name, is_active, last_seen_at, connected_domain')
      .eq('api_key', api_key)
      .single();

    if (!project) return NextResponse.json({ error: 'Invalid api_key' }, { status: 401, headers: CORS });

    const originUrl = req.headers.get('origin') || req.headers.get('referer') || '';
    let domain = '';
    try { if (originUrl) domain = new URL(originUrl).host; } catch {}

    const updates: any = { last_seen_at: new Date().toISOString() };
    if (domain && domain !== project.connected_domain) {
      updates.connected_domain = domain;
    }

    // Update project
    supabase.from('projects').update(updates).eq('id', project.id).then();

    // If first time connecting, log it
    if (!project.last_seen_at) {
      supabase.from('activity_logs').insert({
        project_id: project.id,
        action: 'widget_connected',
        details: { domain }
      }).then();
    }

    return NextResponse.json({ ok: true, project: project.name, is_active: project.is_active, last_seen_at: project.last_seen_at }, { status: 200, headers: CORS });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500, headers: CORS });
  }
}
