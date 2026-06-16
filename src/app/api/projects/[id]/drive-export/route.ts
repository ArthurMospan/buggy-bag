import { NextRequest, NextResponse } from 'next/server';
import { createAuthClient, createServiceClient } from '@/lib/supabase-server';

async function refreshGoogleToken(projectId: string, refreshToken: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId!,
      client_secret: clientSecret!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || 'Failed to refresh token');

  const expiry = new Date(Date.now() + data.expires_in * 1000).toISOString();
  const service = createServiceClient();
  
  await service.from('projects').update({
    google_access_token: data.access_token,
    google_token_expiry: expiry
  }).eq('id', projectId);

  return data.access_token;
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const supabase = await createAuthClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const service = createServiceClient();
    const { data: project } = await service.from('projects').select('*').eq('id', params.id).single();
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    if (!project.google_access_token) {
      return NextResponse.json({ error: 'unauthorized_google' }, { status: 403 });
    }

    let accessToken = project.google_access_token;
    
    // Check expiry
    if (project.google_token_expiry && new Date(project.google_token_expiry).getTime() < Date.now() + 60000) {
      if (!project.google_refresh_token) {
        return NextResponse.json({ error: 'invalid_grant: no refresh token' }, { status: 401 });
      }
      try {
        accessToken = await refreshGoogleToken(params.id, project.google_refresh_token);
      } catch (e: any) {
        return NextResponse.json({ error: 'invalid_grant: ' + e.message }, { status: 401 });
      }
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const metadata = {
      name: file.name || `buggy-bag-export-${Date.now()}.zip`,
      mimeType: 'application/zip'
    };

    const googleForm = new FormData();
    googleForm.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    googleForm.append('file', file);

    const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      body: googleForm
    });

    const uploadData = await uploadRes.json();
    if (!uploadRes.ok) {
      return NextResponse.json({ error: uploadData.error?.message || 'Upload failed' }, { status: uploadRes.status });
    }

    return NextResponse.json({ 
      fileId: uploadData.id,
      webViewLink: `https://drive.google.com/file/d/${uploadData.id}/view`
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
