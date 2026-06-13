import { NextRequest, NextResponse } from 'next/server';
import type { Bug, TechContext, DrawShape } from '@/lib/types';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

// ── Prompt builder ───────────────────────────────────────────────────────────

function buildBugSection(bug: Bug, index: number): string {
  const tc: TechContext | null = bug.tech_context ?? null;
  const lines: string[] = [];

  lines.push(`=== Bug #${index + 1} [${(bug.severity ?? 'low').toUpperCase()}] ===`);
  if (bug.description) lines.push(`Description: ${bug.description}`);
  lines.push(`Status: ${bug.status}`);
  lines.push(`Reported: ${new Date(bug.created_at).toLocaleString('uk-UA')}`);

  if (!tc) {
    if (bug.image_url) lines.push(`Screenshot: ${bug.image_url}`);
    return lines.join('\n');
  }

  // Route + environment
  lines.push('');
  lines.push(`Route: ${tc.route}`);
  lines.push(`Viewport: ${tc.viewport}`);
  if (tc.userAgent) lines.push(`Browser: ${tc.userAgent.split(' ').slice(-2).join(' ')}`);

  // React component context
  if (tc.component) {
    const fp = tc.component.filePath
      ? ` (${tc.component.filePath}${tc.component.lineNumber ? `:${tc.component.lineNumber}` : ''})`
      : '';
    lines.push(`Component: ${tc.component.name}${fp}`);
    if (tc.component.props && Object.keys(tc.component.props).length > 0) {
      lines.push(`Props: ${JSON.stringify(tc.component.props)}`);
    }
  }

  // Pin element context (DOM selectors, React components per-pin)
  const pins = (bug.json_shapes ?? []).filter(
    (s: DrawShape) => s.type === 'pin' && s.elementContext
  );
  if (pins.length > 0) {
    lines.push('');
    lines.push('Pin element context:');
    pins.forEach((pin, i) => {
      const ctx = pin.elementContext!;
      const ann = bug.json_annotations?.[i];
      const label = ann?.text ? `"${ann.text}"` : `Pin ${i + 1}`;
      lines.push(`  ${label}: ${ctx.selector}`);
      if (ctx.reactComponent) {
        const fp = ctx.reactComponent.filePath
          ? ` (${ctx.reactComponent.filePath}${ctx.reactComponent.lineNumber ? `:${ctx.reactComponent.lineNumber}` : ''})`
          : '';
        lines.push(`    Component: ${ctx.reactComponent.name}${fp}`);
      }
      if (ctx.dataSources?.length) {
        lines.push(`    Data sources: ${ctx.dataSources.join(', ')}`);
      }
      if (ctx.innerText) lines.push(`    Text: "${ctx.innerText}"`);
      if (ctx.ariaLabel) lines.push(`    aria-label: ${ctx.ariaLabel}`);
    });
  }

  // Network errors
  const netErrors = tc.networkRequests?.filter(r => r.isError) ?? [];
  if (netErrors.length > 0) {
    lines.push('');
    lines.push('Network errors:');
    netErrors.forEach(r => {
      lines.push(`  ${r.method} ${r.url} → ${r.status || 'ERR'} (${r.durationMs}ms)`);
      if (r.requestBody) lines.push(`    Request body: ${r.requestBody}`);
      if (r.responseBody) lines.push(`    Response body: ${r.responseBody}`);
      if (r.requestHeaders && Object.keys(r.requestHeaders).length > 0) {
        lines.push(`    Headers: ${Object.entries(r.requestHeaders).map(([k, v]) => `${k}: ${v}`).join(', ')}`);
      }
    });
  }

  // Console errors
  const consoleErrors = tc.consoleErrors?.filter(e => e.level === 'error') ?? [];
  if (consoleErrors.length > 0) {
    lines.push('');
    lines.push('Console errors:');
    consoleErrors.forEach(e => {
      lines.push(`  ${e.message}${e.source ? ` [${e.source}]` : ''}`);
    });
  }

  // Event log (steps to reproduce)
  if (tc.eventLog?.length > 0) {
    lines.push('');
    lines.push('Steps to reproduce (chronological, newest last):');
    tc.eventLog.forEach((e, i) => {
      let relStr = '';
      if (e.relativeMs != null) {
        const totalSec = Math.round(e.relativeMs / 1000);
        if (totalSec < 60) relStr = ` [${totalSec}s before report]`;
        else {
          const m = Math.floor(totalSec / 60);
          const s = totalSec % 60;
          relStr = ` [${m}m${s > 0 ? ` ${s}s` : ''} before report]`;
        }
      }
      lines.push(`  ${i + 1}. ${e.description}${relStr}`);
    });
  }

  // Store diff (Task 6)
  if (tc.storeDiff && Object.keys(tc.storeDiff).length > 0) {
    lines.push('');
    lines.push('State changes (page load → bug):');
    Object.entries(tc.storeDiff).forEach(([key, { before, after }]) => {
      lines.push(`  ${key}:`);
      lines.push(`    before: ${JSON.stringify(before)}`);
      lines.push(`    after:  ${JSON.stringify(after)}`);
    });
  }

  // Screenshot URL
  if (bug.image_url) {
    lines.push('');
    lines.push(`Screenshot: ${bug.image_url}`);
  }

  return lines.join('\n');
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { bugs?: Bug[] };

    if (!body.bugs || !Array.isArray(body.bugs) || body.bugs.length === 0) {
      return NextResponse.json({ error: 'No bugs provided' }, { status: 400, headers: CORS });
    }

    const sections = body.bugs.map((bug, i) => buildBugSection(bug, i));

    const prompt = [
      'You are a senior software engineer reviewing bug reports captured by the BuggyBag widget.',
      'Each report contains: screenshot URL, DOM element context (CSS selector, React component, file path),',
      'network errors (with request/response bodies), console errors, user interaction steps, and state changes.',
      '',
      'For each bug provide:',
      '1. A clear, concise title',
      '2. Root cause analysis based on the technical evidence',
      '3. Exact file(s) and line(s) to fix (use the component filePath and selector info)',
      '4. Suggested code fix',
      '5. How to verify the fix',
      '',
      sections.join('\n\n'),
      '',
      'Be specific. Reference exact selectors, component names, file paths, and error messages from the data above.',
    ].join('\n');

    return NextResponse.json({ prompt }, { headers: CORS });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: CORS });
  }
}
