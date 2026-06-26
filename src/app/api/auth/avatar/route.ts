import { NextRequest, NextResponse } from 'next/server';
import { createAuthClient, createServiceClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const supabaseAuth = await createAuthClient();
    const { data: { user }, error: authErr } = await supabaseAuth.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { base64 } = await req.json();
    if (!base64) {
      return NextResponse.json({ error: 'Missing base64 image' }, { status: 400 });
    }

    const match = base64.match(/^data:(.+);base64,(.+)$/);
    if (!match) {
      return NextResponse.json({ error: 'Invalid base64 format' }, { status: 400 });
    }

    const [, mimeType, b64data] = match;
    const ext = mimeType.split('/')[1] || 'webp';
    const fileName = `avatars/${user.id}_${Date.now()}.${ext}`;

    const binary = atob(b64data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const supabaseService = createServiceClient();
    
    const { data: upload, error: uploadErr } = await supabaseService.storage
      .from('bug-screenshots')
      .upload(fileName, bytes, { contentType: mimeType, upsert: true });

    if (uploadErr) {
      console.error('[avatar upload error]:', uploadErr.message);
      return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
    }

    const { data: { publicUrl } } = supabaseService.storage
      .from('bug-screenshots')
      .getPublicUrl(upload.path);

    // Update user metadata directly in the database via Admin API
    const { error: updateErr } = await supabaseService.auth.admin.updateUserById(user.id, {
      user_metadata: { avatar_url: publicUrl, custom_avatar_url: publicUrl }
    });

    if (updateErr) {
      console.error('[avatar update error]:', updateErr.message);
    }

    // Note: We return the publicUrl. The client should still call supabase.auth.updateUser 
    // to force a session refresh, so the new JWT is saved in cookies.
    return NextResponse.json({ url: publicUrl });
  } catch (error: any) {
    console.error('Avatar upload exception:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
