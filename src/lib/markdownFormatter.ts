import { Bug, DrawShape, Annotation } from '@/lib/types';
import { STATUS_CFG } from '@/lib/constants';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';

export function getUnifiedSeverityLabel(sev: string | undefined | null): string {
  if (!sev) return 'Low (1/10)';
  const val = sev.toLowerCase().trim();
  if (val === 'low') return 'Low (1/10)';
  if (val === 'medium') return 'Medium (5/10)';
  if (val === 'high') return 'High (8/10)';
  if (val === 'critical') return 'Critical (10/10)';

  const num = parseInt(val, 10);
  if (isNaN(num)) return 'Low (1/10)';
  if (num <= 2) return `Low (${num}/10)`;
  if (num <= 4) return `Low-Medium (${num}/10)`;
  if (num <= 6) return `Medium (${num}/10)`;
  if (num <= 8) return `High (${num}/10)`;
  return `Critical (${num}/10)`;
}

export function getSeverityNumber(sev: string | undefined | null): string {
  if (!sev) return '1';
  let s = sev;
  if (s === 'low') s = '1';
  else if (s === 'medium') s = '5';
  else if (s === 'high') s = '8';
  else if (s === 'critical') s = '10';
  return s;
}

export function formatBugMarkdown(bug: Bug): string {
  const tc = bug.tech_context;

  // Parse shapes & annotations
  let rawAnns = bug.json_annotations;
  if (typeof rawAnns === 'string') {
    try { rawAnns = JSON.parse(rawAnns); } catch { rawAnns = []; }
  }
  const annotations: Annotation[] = Array.isArray(rawAnns) ? rawAnns : [];

  let rawShapes = bug.json_shapes;
  if (typeof rawShapes === 'string') {
    try { rawShapes = JSON.parse(rawShapes); } catch { rawShapes = []; }
  }
  const shapes: DrawShape[] = Array.isArray(rawShapes) ? rawShapes : [];

  const annotatedEntries = shapes
    .map((s, idx) => ({ shape: s, idx }))
    .filter(({ shape, idx }) =>
      shape.type !== 'eraser' && !!(annotations[idx]?.text || shape.elementContext)
    );

  const hasAnnotations = annotatedEntries.length > 0;

  const lines: string[] = ['## Bug Report', ''];



  // Meta table — Component intentionally omitted here; it is shown per-pin below.
  lines.push('| | |', '|---|---|');
  lines.push(`| **Status** | ${STATUS_CFG.find(s => s.value === bug.status)?.label ?? bug.status} |`);
  lines.push(`| **Severity** | ${getUnifiedSeverityLabel(bug.severity)} |`);
  lines.push(`| **Route** | \`${tc?.route ?? '-'}\` |`);
  lines.push(`| **Viewport** | ${tc?.viewport ?? '-'} |`);
  lines.push(`| **Date** | ${format(new Date(bug.created_at), 'dd MMM yyyy, HH:mm', { locale: uk })} |`);
  lines.push('');

  // Pinned issues — each pin shows: annotation text → DOM element → component (file:line)
  if (hasAnnotations) {
    lines.push('### Pinned Issues');
    annotatedEntries.forEach(({ shape, idx: shapeIdx }) => {
      const ctx = shape.elementContext;
      const ann = annotations[shapeIdx];
      const pinNum = ann?.index ?? (shapeIdx + 1);
      const text = ann?.text ?? '';

      const attachmentsMd = ann?.attachments?.length
        ? ' ' + ann.attachments
            .map(att => att.type.startsWith('image/')
              ? `![${att.name}](${att.url})`
              : `[${att.name}](${att.url})`)
            .join(' ')
        : '';

      lines.push(`- **Pin #${pinNum}**: "${text}"${attachmentsMd}`);

      if (ctx?.selector) {
        lines.push(`  - Element: \`${ctx.selector}\``);
      } else if (ann) {
        lines.push(`  - Position: ${ann.x}% × ${ann.y}% (no DOM context)`);
      }
      if (ctx?.reactComponent) {
        const fp = ctx.reactComponent.filePath
          ? ` (\`${ctx.reactComponent.filePath}${ctx.reactComponent.lineNumber ? `:${ctx.reactComponent.lineNumber}` : ''}\`)`
          : '';
        lines.push(`  - Component: \`${ctx.reactComponent.name}\`${fp}`);
      }
      if (ctx?.dataSources?.length) {
        lines.push(`  - Data sources: \`${ctx.dataSources.join('`, `')}\``);
      }
    });
    lines.push('');
  }

  const recentActions = (tc?.eventLog ?? [])
    .filter(e => {
      const d = (e.description ?? '').trim().toLowerCase();
      return d && d !== 'navigated' && d !== 'navigate' && d !== 'navigation';
    })
    .slice(-5);
  if (recentActions.length > 0) {
    lines.push('### Recent User Actions');
    lines.push('> Context only — not a step-by-step reproduction recipe. Use only if needed to understand the UI state.');
    recentActions.forEach((e, i) => lines.push(`${i + 1}. ${e.description}`));
    lines.push('');
  }

  if (tc?.storeDiff && Object.keys(tc.storeDiff).length > 0) {
    lines.push('### State Changes');
    Object.entries(tc.storeDiff).forEach(([key, { before, after }]) => {
      lines.push(`- \`${key}\`: \`${JSON.stringify(before)}\` → \`${JSON.stringify(after)}\``);
    });
    lines.push('');
  }

  const consoleErrs = tc?.consoleErrors?.filter(e => e.level === 'error') ?? [];
  if (consoleErrs.length > 0) {
    lines.push('### Console Errors');
    consoleErrs.forEach(e => lines.push(`- \`${e.message}${e.source ? ` [${e.source}]` : ''}\``));
    lines.push('');
  }

  const netErrs = tc?.networkRequests?.filter(r => r.isError) ?? [];
  if (netErrs.length > 0) {
    lines.push('### Network Errors');
    netErrs.forEach(r => {
      lines.push(`- \`${r.method} ${r.url} → ${r.status || 'ERR'}\``);
      if (r.requestBody) lines.push(`  - Request: \`${r.requestBody}\``);
      if (r.responseBody) lines.push(`  - Response: \`${r.responseBody}\``);
    });
    lines.push('');
  }

  if (bug.image_url) {
    lines.push('### Screenshot', `![Screenshot](${bug.image_url})`);
  }

  return lines.join('\n');
}
