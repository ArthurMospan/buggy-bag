import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get('project_id');
  if (!projectId) {
    return NextResponse.json({ error: 'project_id required' }, { status: 400 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: 'Google OAuth not configured' }, { status: 500 });
  }

  const state = encodeURIComponent(JSON.stringify({ project_id: projectId }));

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.append('client_id', clientId);
  url.searchParams.append('redirect_uri', redirectUri);
  url.searchParams.append('response_type', 'code');
  url.searchParams.append('scope', 'https://www.googleapis.com/auth/drive.file');
  url.searchParams.append('access_type', 'offline');
  url.searchParams.append('prompt', 'consent');
  url.searchParams.append('state', state);

  return NextResponse.redirect(url.toString());
}
