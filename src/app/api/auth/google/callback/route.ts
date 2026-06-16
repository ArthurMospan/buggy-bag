import { NextRequest, NextResponse } from 'next/server';
import { createAuthClient, createServiceClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const stateStr = req.nextUrl.searchParams.get('state');
  
  if (!code || !stateStr) {
    return NextResponse.json({ error: 'Missing code or state' }, { status: 400 });
  }

  let projectId;
  try {
    const state = JSON.parse(decodeURIComponent(stateStr));
    projectId = state.project_id;
  } catch {
    return NextResponse.json({ error: 'Invalid state' }, { status: 400 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId!,
      client_secret: clientSecret!,
      redirect_uri: redirectUri!,
      grant_type: 'authorization_code',
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) {
    return NextResponse.json({ error: tokenData.error_description || 'Token exchange failed' }, { status: 400 });
  }

  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const expiry = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
  
  const service = createServiceClient();
  const { error } = await service
    .from('projects')
    .update({
      google_access_token: tokenData.access_token,
      google_refresh_token: tokenData.refresh_token || null, // Might not be present if not first consent
      google_token_expiry: expiry
    })
    .eq('id', projectId);

  if (error) {
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }

  // Redirect back to project
  return NextResponse.redirect(new URL(`/projects/${projectId}`, req.url));
}
