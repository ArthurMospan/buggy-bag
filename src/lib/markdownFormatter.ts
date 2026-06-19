import { Bug, DrawShape, Annotation } from '@/lib/types';
import { STATUS_CFG, SEVERITY_CFG } from '@/lib/constants';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';

export function formatBugMarkdown(bug: Bug): string {
  const tc = bug.tech_context;
  
  // Process description
  let descSection = `## Bug Report\n\n`;
  if (bug.description) {
    const parts = bug.description.split('|').map(p => p.trim()).filter(Boolean);
    if (parts.length > 1) {
      descSection += parts.map((p, idx) => `${idx + 1}. ${p}`).join('\n');
    } else {
      descSection += bug.description;
    }
  } else {
    descSection += "Без опису";
  }

  const lines = [
    descSection, '',
    `| | |`, `|---|---|`,
    `| **Status** | ${STATUS_CFG.find(s => s.value === bug.status)?.label ?? bug.status} |`,
    `| **Severity** | ${SEVERITY_CFG.find(s => s.value === (bug.severity ?? 'low'))?.label ?? bug.severity} |`,
    `| **Route** | \`${tc?.route ?? '-'}\` |`,
    `| **Viewport** | ${tc?.viewport ?? '-'} |`,
  ];

  if (tc?.component) {
     lines.push(`| **Component** | \`${tc.component.name}\`${tc.component.filePath ? ` (\`${tc.component.filePath}${tc.component.lineNumber ? `:${tc.component.lineNumber}` : ''}\`)` : ''} |`);
  }

  lines.push(`| **Date** | ${format(new Date(bug.created_at), 'dd MMM yyyy, HH:mm', { locale: uk })} |`, '');

  // Parse shapes & annotations
  let rawAnns = bug.json_annotations;
  if (typeof rawAnns === 'string') {
    try { rawAnns = JSON.parse(rawAnns); } catch (e) { rawAnns = []; }
  }
  const annotations: Annotation[] = Array.isArray(rawAnns) ? rawAnns : [];

  let rawShapes = bug.json_shapes;
  if (typeof rawShapes === 'string') {
    try { rawShapes = JSON.parse(rawShapes); } catch (e) { rawShapes = []; }
  }
  const shapes: DrawShape[] = Array.isArray(rawShapes) ? rawShapes : [];

  const annotatedEntries = shapes
    .map((s, idx) => ({ shape: s, idx }))
    .filter(({ shape, idx }) =>
      shape.type !== 'eraser' && !!(annotations[idx]?.text || shape.elementContext)
    );

  if (annotatedEntries.length > 0) {
    lines.push('### Annotations');
    annotatedEntries.forEach(({ shape, idx: shapeIdx }) => {
      const ctx = shape.elementContext;
      const ann = annotations[shapeIdx];
      const pinNum = ann?.index ?? (shapeIdx + 1);
      const note = ann?.text ? ` — "${ann.text}"` : '';
      
      const attachmentsMd = ann?.attachments?.length 
        ? ' ' + ann.attachments.map(att => att.type.startsWith('image/') ? `![${att.name}](${att.url})` : `[${att.name}](${att.url})`).join(' ')
        : '';
        
      const finalNote = note + attachmentsMd;

      if (ctx?.selector) {
        lines.push(`- **Pin #${pinNum}** on \`${ctx.selector}\`${finalNote}`);
        if (ctx.reactComponent?.filePath) {
          lines.push(`  - Component: \`${ctx.reactComponent.name}\` in \`${ctx.reactComponent.filePath}${ctx.reactComponent.lineNumber ? `:${ctx.reactComponent.lineNumber}` : ''}\``);
        } else if (ctx.reactComponent?.name) {
           lines.push(`  - Component: \`${ctx.reactComponent.name}\``);
        }
        if (ctx.dataSources?.length) {
          lines.push(`  - Data sources: \`${ctx.dataSources.join('`, `')}\``);
        }
      } else if (ann) {
        lines.push(`- **Pin #${pinNum}** at ${ann.x}%×${ann.y}%${finalNote}`);
      } else {
        lines.push(`- **Pin #${pinNum}**${finalNote}`);
      }
    });
    lines.push('');
  }

  if (tc?.eventLog?.length) {
     lines.push('### Steps to reproduce');
     tc.eventLog.forEach((e, i) => lines.push(`${i + 1}. ${e.description}`));
     lines.push('');
  }
  
  if (tc?.storeDiff && Object.keys(tc.storeDiff).length > 0) {
     lines.push('### State changes');
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
     lines.push(`### Screenshot`, `![Screenshot](${bug.image_url})`);
  }

  return lines.join('\n');
}
