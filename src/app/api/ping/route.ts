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
    const { api_key, favicon_url, favicon_color, bb_param } = await req.json();
    if (!api_key) return NextResponse.json({ error: 'api_key required' }, { status: 400, headers: CORS });

    const supabase = createServiceClient();
    const { data: project } = await supabase
      .from('projects')
      .select('id, name, is_active, last_seen_at, connected_domain, favicon_url, widget_password')
      .eq('api_key', api_key)
      .single();

    if (!project) return NextResponse.json({ error: 'Invalid api_key' }, { status: 401, headers: CORS });

    const originUrl = req.headers.get('origin') || req.headers.get('referer') || '';
    let domain = '';
    try { if (originUrl) domain = new URL(originUrl).host; } catch {}

    const isLocalhost = domain.includes('localhost') || domain.includes('127.0.0.1');

    const updates: any = { last_seen_at: new Date().toISOString() };
    if (
      domain && 
      domain !== project.connected_domain && 
      !isLocalhost
    ) {
      updates.connected_domain = domain;
    }
    // Widget reads its own favicon from the DOM and reports it here
    if (!isLocalhost) {
      if (typeof favicon_url === 'string' && favicon_url) {
        updates.favicon_url = favicon_url.slice(0, 2048);
      }
      if (typeof favicon_color === 'string' && favicon_color) {
        updates.favicon_color = favicon_color.slice(0, 16);
      }
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

    // Check if widget launch parameter matches
    let grant_access = false;
    if (bb_param) {
      const requiredPassword = project.widget_password || 'on';
      if (bb_param === requiredPassword) {
        grant_access = true;
      }
    }

    return NextResponse.json({ 
      ok: true, 
      project: project.name, 
      is_active: project.is_active, 
      last_seen_at: project.last_seen_at,
      grant_access 
    }, { status: 200, headers: CORS });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500, headers: CORS });
  }
}
