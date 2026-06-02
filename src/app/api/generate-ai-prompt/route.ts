import { NextRequest, NextResponse } from 'next/server';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

interface BugPayload {
  id: string;
  screenshotDataUrl?: string;
  annotations: Record<string, string>;
  shapes: Array<{ id: string; type: string; pinNumber?: number }>;
  createdAt: number;
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  try {
    const { bugs } = (await req.json()) as { bugs: BugPayload[] };

    if (!bugs || !Array.isArray(bugs) || bugs.length === 0) {
      return NextResponse.json({ error: 'No bugs provided' }, { status: 400, headers: CORS });
    }

    const sections = bugs.map((bug, i) => {
      const annotationLines = Object.entries(bug.annotations ?? {})
        .map(([, text], j) => `  ${j + 1}. ${text}`)
        .join('\n');

      const pinCount = (bug.shapes ?? []).filter((s) => s.type === 'pin').length;
      const rectCount = (bug.shapes ?? []).filter((s) => s.type === 'rect').length;
      const arrowCount = (bug.shapes ?? []).filter((s) => s.type === 'arrow').length;

      const shapeDesc = [
        rectCount > 0 && `${rectCount} highlighted zone${rectCount > 1 ? 's' : ''}`,
        arrowCount > 0 && `${arrowCount} arrow${arrowCount > 1 ? 's' : ''}`,
        pinCount > 0 && `${pinCount} pin${pinCount > 1 ? 's' : ''}`,
      ]
        .filter(Boolean)
        .join(', ');

      return [
        `=== Bug #${i + 1} ===`,
        `Captured at: ${new Date(bug.createdAt).toLocaleString('uk-UA')}`,
        shapeDesc ? `Visual markers: ${shapeDesc}` : null,
        annotationLines ? `Annotations:\n${annotationLines}` : '  (no annotations)',
        bug.screenshotDataUrl
          ? `Screenshot: [base64 PNG, ${Math.round(bug.screenshotDataUrl.length / 1024)} KB]`
          : null,
      ]
        .filter(Boolean)
        .join('\n');
    });

    const prompt = [
      'You are a QA engineer. Below are bug reports captured from a web application using the Buggy Bag widget.',
      'Each bug includes a screenshot and user annotations.',
      'For each bug provide: a clear title, description, steps to reproduce, expected vs actual result, and suggested severity (low/medium/high/critical).',
      '',
      sections.join('\n\n'),
      '',
      'Write a professional, structured bug report for each issue.',
    ].join('\n');

    return NextResponse.json({ prompt }, { headers: CORS });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: CORS });
  }
}
