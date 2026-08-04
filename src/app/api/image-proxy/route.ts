import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const MAX_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 10_000;

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

/**
 * Blocks the obvious SSRF targets. The widget only ever asks for images its
 * own page already displays, so anything that resolves to the local network
 * is a sign the parameter was hand-crafted rather than collected.
 */
function isForbiddenHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');

  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  if (host.endsWith('.local') || host.endsWith('.internal')) return true;
  if (host === '::1' || host === '0.0.0.0') return true;
  // IPv4-mapped IPv6 and bare IPv6 private ranges
  if (host.startsWith('fe80:') || host.startsWith('fc') || host.startsWith('fd')) return true;

  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 169 && b === 254) return true; // cloud metadata
  }
  return false;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const rawUrl = searchParams.get('url');
  const apiKey = searchParams.get('api_key');

  if (!rawUrl || !apiKey) {
    return NextResponse.json({ error: 'url and api_key are required' }, { status: 400, headers: CORS });
  }

  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400, headers: CORS });
  }

  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    return NextResponse.json({ error: 'Unsupported protocol' }, { status: 400, headers: CORS });
  }
  if (isForbiddenHost(target.hostname)) {
    return NextResponse.json({ error: 'Host not allowed' }, { status: 403, headers: CORS });
  }

  const supabase = createServiceClient();
  const { data: project, error: projectErr } = await supabase
    .from('projects')
    .select('id, is_active')
    .eq('api_key', apiKey)
    .single();

  if (projectErr || !project || project.is_active === false) {
    return NextResponse.json({ error: 'Invalid api_key' }, { status: 401, headers: CORS });
  }

  try {
    const upstream = await fetch(target.toString(), {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { Accept: 'image/*' },
      redirect: 'follow',
    });

    if (!upstream.ok) {
      return NextResponse.json({ error: `Upstream ${upstream.status}` }, { status: 502, headers: CORS });
    }

    // Only images go back out. This is what keeps the endpoint from being a
    // general-purpose fetcher for whatever the caller points it at.
    const contentType = upstream.headers.get('content-type') ?? '';
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'Not an image' }, { status: 415, headers: CORS });
    }

    const declaredLength = Number(upstream.headers.get('content-length') ?? '0');
    if (declaredLength > MAX_BYTES) {
      return NextResponse.json({ error: 'Image too large' }, { status: 413, headers: CORS });
    }

    const buffer = await upstream.arrayBuffer();
    if (buffer.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: 'Image too large' }, { status: 413, headers: CORS });
    }

    return new Response(buffer, {
      status: 200,
      headers: {
        ...CORS,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Fetch failed' }, { status: 502, headers: CORS });
  }
}
