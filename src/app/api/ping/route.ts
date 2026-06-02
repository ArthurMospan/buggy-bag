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
      .select('id, name')
      .eq('api_key', api_key)
      .single();

    if (!project) return NextResponse.json({ error: 'Invalid api_key' }, { status: 401, headers: CORS });

    return NextResponse.json({ ok: true, project: project.name }, { status: 200, headers: CORS });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500, headers: CORS });
  }
}
