import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { decrypt } from '@/lib/crypto';
import type { Annotation, TechContext, DrawShape } from '@/lib/types';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Simple in-memory rate limiter: max 30 submissions per api_key per hour
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 30) return false;
  entry.count++;
  return true;
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      api_key: string;
      base64_image?: string;
      shapes?: DrawShape[];
      annotations?: Record<string, string>;
      shape_attachments?: Record<string, { name: string; type: string; base64: string }[]>;
      description?: string;
      tech_context?: TechContext;
    };

    const { api_key, base64_image, shapes = [], annotations = {}, shape_attachments = {}, description, tech_context } = body;
    const severity = tech_context?.autoSeverity ?? 'low';

    if (!api_key) {
      return NextResponse.json({ error: 'api_key is required' }, { status: 400, headers: CORS });
    }

    if (!checkRateLimit(api_key)) {
      return NextResponse.json({ error: 'Rate limit exceeded (30/hour)' }, { status: 429, headers: CORS });
    }

    const supabase = createServiceClient();

    const { data: project, error: projectErr } = await supabase
      .from('projects')
      .select('id, is_active, telegram_chat_id, telegram_bot_token, name')
      .eq('api_key', api_key)
      .single();

    if (projectErr || !project) {
      return NextResponse.json({ error: 'Invalid api_key' }, { status: 401, headers: CORS });
    }

    if (project.is_active === false) {
      return NextResponse.json({ error: 'Widget is disabled for this project' }, { status: 403, headers: CORS });
    }

    const project_id: string = project.id;

    // Parse viewport dimensions for coordinate conversion
    const viewport = tech_context?.viewport ?? '1280x800';
    const [vw, vh] = viewport.split('x').map(Number);
    const screenW = vw || 1280;
    const screenH = vh || 800;

    // Convert shapes + annotations into Annotation[] with percentage coordinates and attachments
    const json_annotations: Annotation[] = await Promise.all(shapes.map(async (shape, idx) => {
      let cx = shape.x;
      let cy = shape.y;
      if (shape.type === 'rect') {
        cx = shape.x + (shape.width ?? 0) / 2;
        cy = shape.y + (shape.height ?? 0) / 2;
      } else if ((shape.type === 'arrow' || shape.type === 'measure') && shape.points) {
        cx = (shape.points[0] + shape.points[2]) / 2;
        cy = (shape.points[1] + shape.points[3]) / 2;
      }

      const rawAtts = shape_attachments[shape.id] || [];
      const uploadedAtts = [];

      for (const att of rawAtts) {
        const match = att.base64.match(/^data:(.+);base64,(.+)$/);
        if (match) {
          const [, mimeType, b64data] = match;
          const safeName = att.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
          const fileName = `${project_id}/attachments/${Date.now()}_${idx}_${safeName}`;
          const binary = atob(b64data);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

          const { data: upload, error: uploadErr } = await supabase.storage
            .from('bug-screenshots')
            .upload(fileName, bytes, { contentType: mimeType, upsert: false });

          if (!uploadErr && upload) {
            const { data: { publicUrl } } = supabase.storage
              .from('bug-screenshots')
              .getPublicUrl(upload.path);
            uploadedAtts.push({ name: att.name, type: att.type, url: publicUrl });
          } else if (uploadErr) {
            console.error('[buggy-bag] attachment upload error:', uploadErr.message);
          }
        }
      }

      return {
        x: Math.round((cx / screenW) * 1000) / 10,
        y: Math.round((cy / screenH) * 1000) / 10,
        text: annotations[shape.id] ?? '',
        index: idx + 1,
        ...(uploadedAtts.length > 0 ? { attachments: uploadedAtts } : {})
      };
    }));
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
        console.error('[buggy-bag] screenshot upload failed, saving bug without image:', uploadErr.message);
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from('bug-screenshots')
          .getPublicUrl(upload.path);
        image_url = publicUrl;
      }
    }

    // Try inserting with json_shapes first (requires migration add_json_shapes.sql)
    // If column doesn't exist yet, fall back to inserting without it
    let data, error;
    ({ data, error } = await supabase
      .from('bugs')
      .insert({
        project_id,
        image_url,
        json_annotations,
        json_shapes: shapes.length > 0 ? shapes : null,
        description: description ?? null,
        severity,
        tech_context: tech_context ?? null,
      })
      .select()
      .single());

    // If json_shapes column doesn't exist yet, retry without it
    if (error && error.message?.includes('json_shapes')) {
      console.warn('[buggy-bag] json_shapes column missing — run migration add_json_shapes.sql. Saving without shapes.');
      ({ data, error } = await supabase
        .from('bugs')
        .insert({
          project_id,
          image_url,
          json_annotations,
          description: description ?? null,
          severity,
          tech_context: tech_context ?? null,
        })
        .select()
        .single());
    }

    if (error) {
      console.error('[buggy-bag] DB insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500, headers: CORS });
    }

    // Log the bug reception in activity_logs
    supabase.from('activity_logs').insert({
      project_id,
      action: 'bug_received',
      details: { bug_id: data.id, severity: data.severity }
    }).then();

    // Send Telegram Notification
    if (project.telegram_chat_id && project.telegram_bot_token) {
      try {
        const botToken = decrypt(project.telegram_bot_token);
        const chatId = project.telegram_chat_id;
        if (botToken && chatId) {

          const portalUrl = (req.headers.get('origin') || 'https://buggybag.com');
          const bugLink = `${portalUrl}/projects/${project_id}/bugs/${data.id}`;
          
          const title = `🚨 Новий баг у ${project.name || 'проєкті'}`;
          const sevMap: Record<string, string> = { low: '🟢 Низький', medium: '🟡 Середній', high: '🟠 Високий', critical: '🔴 Критичний' };
          let msg = `<b>${title}</b>\n\n`;
          msg += `<b>Пріоритет:</b> ${sevMap[severity] || severity}\n`;
          if (description) msg += `<b>Опис:</b> ${description.replace(/</g, '&lt;').replace(/>/g, '&gt;')}\n`;
          if (tech_context?.route) msg += `<b>Сторінка:</b> <code>${tech_context.route.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code>\n`;
          if (tech_context?.viewport) msg += `<b>Екран:</b> <code>${tech_context.viewport}</code>\n`;
          msg += `\n<a href="${bugLink}">Відкрити в BuggyBag</a>`;

          let url = `https://api.telegram.org/bot${botToken}/sendMessage`;
          const body: any = { chat_id: chatId, parse_mode: 'HTML', text: msg };
          
          if (image_url) {
            url = `https://api.telegram.org/bot${botToken}/sendPhoto`;
            body.photo = image_url;
            body.caption = msg;
            delete body.text;
          }
          
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });
          
          if (!res.ok) {
            console.error('[buggy-bag] telegram API error:', await res.text());
          }
        }
      } catch (e) {
        console.error('[buggy-bag] telegram send error:', e);
      }
    }

    return NextResponse.json({ success: true, bug: data }, { status: 201, headers: CORS });
  } catch (err) {
    console.error('[buggy-bag] submit error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: CORS });
  }
}
