import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import type { Annotation, TechContext } from '@/lib/types';

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
    const body = await req.json() as {
      api_key: string;
      base64_image?: string;
      annotations?: Annotation[];
      description?: string;
      tech_context?: TechContext;
    };

    const { api_key, base64_image, annotations = [], description, tech_context } = body;
    const severity = tech_context?.autoSeverity ?? 'low';

    if (!api_key) {
      return NextResponse.json({ error: 'api_key is required' }, { status: 400, headers: CORS });
    }

    const supabase = createServiceClient();

    // Resolve project from api_key
    const { data: project, error: projectErr } = await supabase
      .from('projects')
      .select('id')
      .eq('api_key', api_key)
      .single();

    if (projectErr || !project) {
      return NextResponse.json({ error: 'Invalid api_key' }, { status: 401, headers: CORS });
    }

    const project_id: string = project.id;
    let image_url: string | null = null;

    if (base64_image) {
      const match = base64_image.match(/^data:(.+);base64,(.+)$/);
      if (!match) {
        return NextResponse.json({ error: 'Invalid base64_image format' }, { status: 400, headers: CORS });
      }
      const [, mimeType, b64data] = match;
      const ext = mimeType.split('/')[1] ?? 'png';
      const fileName = `${project_id}/${Date.now()}.${ext}`;

      const binary = atob(b64data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

      const { data: upload, error: uploadErr } = await supabase.storage
        .from('bug-screenshots')
        .upload(fileName, bytes, { contentType: mimeType, upsert: false });

      if (uploadErr) {
        return NextResponse.json({ error: uploadErr.message }, { status: 500, headers: CORS });
      }

      const { data: { publicUrl } } = supabase.storage
        .from('bug-screenshots')
        .getPublicUrl(upload.path);

      image_url = publicUrl;
    }

    const { data, error } = await supabase
      .from('bugs')
      .insert({
          project_id,
          image_url,
          json_annotations: annotations,
          description: description ?? null,
          severity,
          tech_context: tech_context ?? null,
        })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500, headers: CORS });
    }

    return NextResponse.json({ success: true, bug: data }, { status: 201, headers: CORS });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: CORS });
  }
}
