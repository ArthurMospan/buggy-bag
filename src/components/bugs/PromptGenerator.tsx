'use client';
import { useState } from 'react';
import { Bug, BugStatus, BugSeverity, TechContext } from '@/lib/types';
import { Sparkles, Copy, Check, Code, Terminal, MessageSquare, Bot, Trash2 } from 'lucide-react';

interface PromptGeneratorProps {
  bugs: Bug[];
  selectedIds: Set<string>;
  onBulkAction?: (action: 'delete' | 'status' | 'severity', value?: string) => void;
}

type TemplateId = 'github' | 'antigravity' | 'cursor' | 'claude' | 'generic';

const GithubLogo = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>;
const CursorLogo = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16.9248 11.2334L5.64539 3.12574C4.30691 2.16361 2.39258 3.11942 2.39258 4.76189V18.1724C2.39258 19.8661 4.41725 20.7381 5.65651 19.5822L9.43572 16.0569L11.7584 21.6706C12.1812 22.6922 13.3931 23.181 14.464 22.761L16.2996 22.041C17.3705 21.621 17.8967 20.4497 17.474 19.4282L15.3533 14.3051L19.2319 13.9189C20.9167 13.751 21.6053 11.666 20.2504 10.6033L16.9248 11.2334Z"/></svg>;
const ClaudeLogo = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M22.063 15.65c-.093-.057-.183-.112-.276-.17-.18-.112-.358-.225-.536-.339-.187-.12-.373-.243-.559-.364-.176-.115-.352-.23-.526-.347-.215-.145-.432-.288-.646-.431-.223-.15-.445-.3-.666-.452-.224-.154-.447-.308-.668-.464-.265-.187-.528-.372-.789-.56a12.83 12.83 0 01-.643-.47c-.201-.153-.4-.306-.596-.461-.177-.14-.352-.28-.525-.421-.15-.122-.298-.246-.445-.37A6.47 6.47 0 0014 9.172c-.105-.114-.216-.226-.328-.336-.128-.125-.262-.249-.398-.369a8.6 8.6 0 00-.47-.41c-.139-.115-.283-.228-.431-.336-.168-.122-.34-.241-.518-.354-.251-.158-.51-.31-.773-.45-.487-.26-.989-.49-1.503-.687A8.13 8.13 0 006.18 5.617a7.92 7.92 0 00-2.404.382c-.381.127-.75.285-1.104.475-.325.174-.633.376-.924.606A6.99 6.99 0 00.323 8.636a6.56 6.56 0 00-.28 2.052 6.64 6.64 0 001.077 3.328 6.94 6.94 0 001.815 1.95c.348.241.722.451 1.115.626a8.4 8.4 0 001.32.46c.551.139 1.118.214 1.692.219a8.44 8.44 0 003.882-.89 8.28 8.28 0 003.023-2.392c.162-.213.315-.432.459-.658.077-.121.15-.246.223-.372.074-.127.146-.254.214-.383l.115-.218c.038-.073.075-.145.111-.218.033-.067.065-.133.097-.2l.092-.191.082-.178.074-.162c.023-.053.047-.105.07-.156.031-.072.062-.144.094-.216a4.8 4.8 0 01.199-.447 3.34 3.34 0 01.597-.887c.231-.24.512-.432.825-.561.353-.146.738-.21 1.126-.188.358.02.708.118 1.026.284.288.151.545.358.756.608.204.24.364.515.468.81.1.284.143.585.127.886-.017.33-.11.649-.271.932-.14.247-.323.468-.538.65-.211.178-.445.33-.69.46a8.03 8.03 0 01-.84.382c-.297.113-.604.21-.916.29a7.61 7.61 0 01-.984.195c-.347.042-.698.06-1.049.053-.298-.006-.596-.027-.892-.064a7.9 7.9 0 01-2.615-.658 8.35 8.35 0 01-2.18-1.289 8.65 8.65 0 01-1.636-1.782A8.65 8.65 0 013.2 8.337a8.79 8.79 0 01-.168-3.037 8.87 8.87 0 011.66-3.411A9.09 9.09 0 017.306.182 9.27 9.27 0 0111.45.023a9.42 9.42 0 014.07 1.603 9.49 9.49 0 012.923 3.011c.216.357.408.73.575 1.116.113.262.213.53.3.8.067.206.126.415.178.625.04.161.076.323.109.487l.044.225.022.115c.015.078.027.155.039.233.006.039.01.077.015.116l.012.117.008.118c.005.078.008.156.009.234 0 .079 0 .157-.003.236 0 .04-.002.079-.004.118l-.004.118c-.004.079-.011.157-.019.235-.01.078-.022.156-.036.233-.032.155-.069.308-.11.46-.056.2-.12.398-.192.593-.162.434-.361.85-.593 1.25a8.74 8.74 0 01-1.07 1.488 8.44 8.44 0 01-1.378 1.25c-.244.175-.5.335-.765.48a7.87 7.87 0 01-.817.395c-.382.158-.781.284-1.19.373a7.84 7.84 0 01-2.42.2 7.72 7.72 0 01-2.33-.501 7.6 7.6 0 01-2.1-.99 7.4 7.4 0 01-1.706-1.46c-.256-.289-.485-.6-.684-.928a6.52 6.52 0 01-.527-1.127c-.066-.184-.124-.372-.174-.564-.047-.184-.085-.37-.114-.56-.026-.174-.044-.35-.054-.526-.007-.156-.007-.314 0-.471.008-.175.026-.35.054-.522.03-.19.068-.376.115-.562.05-.192.108-.382.174-.567.147-.406.326-.798.536-1.173.23-.404.499-.785.801-1.14.32-.375.674-.72 1.055-1.034.398-.328.825-.623 1.274-.881.458-.264.939-.492 1.436-.683.473-.182.962-.323 1.46-.42a9.14 9.14 0 011.667-.17c.563-.008 1.125.04 1.681.144a9.18 9.18 0 011.64.444 9.3 9.3 0 011.536.702c.49.277.954.597 1.385.952.417.344.806.726 1.157 1.138.337.395.642.816.908 1.255.25.414.464.848.636 1.294.159.412.28.835.362 1.267.073.385.114.776.12 1.169.006.368-.018.736-.071 1.1-.051.353-.127.702-.228 1.043a8.9 8.9 0 01-.433 1.14c-.167.362-.36.711-.577 1.045-.23.35-.487.683-.768 1-.29.324-.602.628-.934.912-.328.28-.675.541-1.035.782-.363.243-.742.464-1.133.663a9.85 9.85 0 01-1.25.546 10.15 10.15 0 01-1.381.408c-.464.1-.935.163-1.409.185-.429.02-.86-.002-1.288-.066a9.54 9.54 0 01-1.284-.282 9.21 9.21 0 01-1.258-.458c-.417-.189-.821-.413-1.206-.669a8.97 8.97 0 01-1.096-.86 8.78 8.78 0 01-.933-.941c-.287-.337-.547-.695-.776-1.072a8.55 8.55 0 01-.646-1.246 8.44 8.44 0 01-.444-1.332 8.42 8.42 0 01-.212-1.42 8.46 8.46 0 01-.013-1.46c.045-.482.138-.958.277-1.42.133-.443.313-.872.535-1.28a8.23 8.23 0 01.815-1.229 8 8 0 011.055-1.079 7.82 7.82 0 011.242-.88 7.66 7.66 0 011.378-.636 7.55 7.55 0 011.458-.363 7.5 7.5 0 011.492-.081c.52.023 1.034.113 1.534.267.498.153.98.36 1.442.613.435.239.846.52 1.23.839.36.299.691.631.988.991.272.331.513.685.719 1.062.186.341.341.698.461 1.067.108.333.185.676.231 1.025.04.305.056.613.048.922a4.42 4.42 0 01-.06.829 3.52 3.52 0 01-.177.728 2.8 2.8 0 01-.336.666c-.146.208-.323.393-.526.547-.197.148-.418.265-.653.344-.265.09-.544.135-.826.136-.312 0-.619-.053-.913-.153a2.76 2.76 0 01-.84-.42 2.7 2.7 0 01-.643-.655 2.84 2.84 0 01-.39-.817c-.104-.3-.162-.614-.173-.934a4 4 0 01.01-.856 5.2 5.2 0 01.124-.87c.068-.316.162-.625.282-.924.126-.313.28-.616.457-.905.188-.306.402-.596.639-.868.246-.282.518-.544.811-.781.306-.247.635-.472.981-.67.359-.206.735-.386 1.124-.537.402-.156.815-.28 1.236-.37a8.73 8.73 0 011.354-.183c.475-.027.952-.016 1.425.034.453.048.902.131 1.343.25.438.118.868.271 1.286.456.405.18.799.395 1.176.639.362.235.708.5 1.033.788.31.276.6.577.864.896.248.303.473.626.67 .964.186.321.348.657.483 1.006.126.325.225.66.295 1.003a8.1 8.1 0 01.134 1.045c.026.353.024.707-.006 1.059a7.6 7.6 0 01-.157 1.01 7.24 7.24 0 01-.32.96 6.94 6.94 0 01-.502.915 6.64 6.64 0 01-.692.852 6.51 6.51 0 01-.885.76c-.32.228-.654.436-.998.623L22.063 15.65z"/></svg>;

const TEMPLATES: { id: TemplateId; label: string; icon: React.ReactNode }[] = [
  { id: 'github',      label: 'GitHub Issue', icon: <GithubLogo /> },
  { id: 'antigravity', label: 'Antigravity',  icon: <Sparkles size={14} /> },
  { id: 'cursor',      label: 'Cursor',       icon: <CursorLogo /> },
  { id: 'claude',      label: 'Claude Code',  icon: <ClaudeLogo /> },
  { id: 'generic',     label: 'Generic',      icon: <Bot size={14} /> },
];

const SEV_ORDER: Record<BugSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };

function sortBySev(bugs: Bug[]): Bug[] {
  return [...bugs].sort((a, b) => (SEV_ORDER[a.severity ?? 'low'] ?? 3) - (SEV_ORDER[b.severity ?? 'low'] ?? 3));
}

// ── Quality Score 2.0 ────────────────────────────────────────────────────────

interface QualityFactor {
  label: string;
  points: number;
  earned: number;
}

function calcQuality(bugs: Bug[]): { score: number; hint: string; factors: QualityFactor[] } {
  if (bugs.length === 0) return { score: 0, hint: '', factors: [] };

  // Per-bug scoring, then average
  const perBug = bugs.map(bug => {
    const tc = bug.tech_context;
    const hasPinCtx = bug.json_shapes?.some(s => s.type === 'pin' && s.elementContext);
    const hasSourceFile = bug.json_shapes?.some(s => s.type === 'pin' && s.elementContext?.sourceFile);
    const hasDataSrc = bug.json_shapes?.some(s => s.type === 'pin' && s.elementContext?.dataSources?.length);
    const hasFilePath = tc?.component?.filePath || bug.json_shapes?.some(s => s.elementContext?.reactComponent?.filePath);
    const hasNetOrConsole = (tc?.networkRequests?.some(r => r.isError) || tc?.consoleErrors?.some(e => e.level === 'error'));
    const hasStoreDiff = tc?.storeDiff && Object.keys(tc.storeDiff).length > 0;

    const factors: QualityFactor[] = [
      { label: 'Опис',              points: 20, earned: bug.description ? 20 : 0 },
      { label: 'Скріншот',          points: 20, earned: bug.image_url    ? 20 : 0 },
      { label: 'Source file',       points: 15, earned: hasSourceFile     ? 15 : 0 },
      { label: 'DOM selector (pin)', points: 15, earned: hasPinCtx        ? 15 : 0 },
      { label: 'Кроки відтворення', points: 15, earned: (tc?.eventLog?.length ?? 0) > 0 ? 15 : 0 },
      { label: 'Файл компонента',   points: 10, earned: hasFilePath       ? 10 : 0 },
      { label: 'Мережа/консоль',    points: 10, earned: hasNetOrConsole   ? 10 : 0 },
      { label: 'Store diff',        points:  5, earned: hasStoreDiff      ?  5 : 0 },
      { label: 'Data sources',      points:  5, earned: hasDataSrc        ?  5 : 0 },
    ];
    return factors;
  });

  // Average across bugs
  const totalPoints = perBug[0].reduce((s, f) => s + f.points, 0);
  const avgFactors = perBug[0].map((f, i) => ({
    ...f,
    earned: Math.round(perBug.reduce((s, b) => s + b[i].earned, 0) / perBug.length),
  }));
  const score = Math.min(100, avgFactors.reduce((s, f) => s + f.earned, 0));

  // Find the most impactful missing factor
  const missing = avgFactors.filter(f => f.earned < f.points).sort((a, b) => (b.points - b.earned) - (a.points - a.earned));
  const hint = missing[0] ? `+${missing[0].points - missing[0].earned}pt: ${missing[0].label}` : '';

  return { score, hint, factors: avgFactors };
}

// ── Prompt formatters ────────────────────────────────────────────────────────

function techSummary(tc: TechContext | null): string {
  if (!tc) return '';
  const lines: string[] = [];
  if (tc.component) {
    lines.push(`Component: ${tc.component.name}${tc.component.filePath ? ` (${tc.component.filePath}${tc.component.lineNumber ? `:${tc.component.lineNumber}` : ''})` : ''}`);
    if (tc.component.props && Object.keys(tc.component.props).length)
      lines.push(`Props: ${JSON.stringify(tc.component.props)}`);
  }
  if (tc.route) lines.push(`Route: ${tc.route}`);
  if (tc.viewport) lines.push(`Viewport: ${tc.viewport}`);
  const netErr = tc.networkRequests?.filter(r => r.isError) ?? [];
  if (netErr.length) {
    lines.push('Network errors:');
    netErr.forEach(r => {
      lines.push(`  ${r.method} ${r.url} → ${r.status || 'ERR'}`);
      if (r.requestBody) lines.push(`    Request body: ${r.requestBody}`);
      if (r.responseBody) lines.push(`    Response: ${r.responseBody}`);
    });
  }
  const consoleErr = tc.consoleErrors?.filter(e => e.level === 'error') ?? [];
  if (consoleErr.length) {
    lines.push('Console errors:');
    consoleErr.forEach(e => lines.push(`  ${e.message}${e.source ? ` [${e.source}]` : ''}`));
  }
  if (tc.eventLog?.length) {
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
  if (tc.storeDiff && Object.keys(tc.storeDiff).length > 0) {
    lines.push('State changes (page load → bug):');
    Object.entries(tc.storeDiff).forEach(([key, { before, after }]) => {
      lines.push(`  ${key}:`);
      lines.push(`    before: ${JSON.stringify(before)}`);
      lines.push(`    after:  ${JSON.stringify(after)}`);
    });
  }
  return lines.join('\n');
}

function pinContextSummary(jsonShapes: Bug['json_shapes'], annotations: Bug['json_annotations']): string {
  if (!jsonShapes || jsonShapes.length === 0) return '';
  // All annotated non-eraser shapes — pins, rects, arrows, measures
  const entries = jsonShapes
    .map((s, idx) => ({ shape: s, idx }))
    .filter(({ shape, idx }) =>
      shape.type !== 'eraser' && !!(annotations[idx]?.text || shape.elementContext)
    );
  if (entries.length === 0) return '';

  const lines: string[] = ['Annotation context:'];
  entries.forEach(({ shape, idx: shapeIdx }) => {
    const ctx = shape.elementContext;
    const ann = annotations[shapeIdx];
    const pinNum = ann?.index ?? (shapeIdx + 1);
    const label = ann?.text ? `"${ann.text}"` : `Pin ${pinNum}`;
    lines.push(`  ${label}:`);
    if (ctx) {
      lines.push(`    Element: ${ctx.selector}`);
      if (ctx.reactComponent) {
        const fp = ctx.reactComponent.filePath
          ? ` (${ctx.reactComponent.filePath}${ctx.reactComponent.lineNumber ? `:${ctx.reactComponent.lineNumber}` : ''})`
          : '';
        lines.push(`    Component: ${ctx.reactComponent.name}${fp}`);
      }
      if (ctx.dataSources?.length) {
        lines.push(`    Data sources: ${ctx.dataSources.join(', ')}`);
      }
      if (ctx.innerText) {
        lines.push(`    Text: "${ctx.innerText}"`);
      }
      if (ctx.ariaLabel) {
        lines.push(`    aria-label: ${ctx.ariaLabel}`);
      }
    } else if (ann) {
      lines.push(`    Position: ${ann.x}% × ${ann.y}% (no DOM context)`);
    }
  });
  return lines.join('\n');
}

// ── GitHub Issue template ────────────────────────────────────────────────────

function formatGitHub(bugs: Bug[]): string {
  const sorted = sortBySev(bugs);
  return sorted.map((bug, i) => {
    const tc = bug.tech_context;
    const sev = (bug.severity ?? 'low').toUpperCase();
    const allShapes = bug.json_shapes ?? [];
    // All annotated non-eraser shapes — pins, rects, arrows, measures
    const annotatedEntries = allShapes
      .map((s, idx) => ({ shape: s, idx }))
      .filter(({ shape, idx }) =>
        shape.type !== 'eraser' && !!(bug.json_annotations[idx]?.text || shape.elementContext)
      );
    const netErrors = tc?.networkRequests?.filter(r => r.isError) ?? [];
    const consoleErrors = tc?.consoleErrors?.filter(e => e.level === 'error') ?? [];

    // Primary component: prefer first shape's reactComponent, fall back to tc.component
    const primaryComp = annotatedEntries[0]?.shape?.elementContext?.reactComponent ?? tc?.component;
    const compLine = primaryComp
      ? `**Component:** \`${primaryComp.name}\`${primaryComp.filePath ? ` (\`${primaryComp.filePath}${primaryComp.lineNumber ? `:${primaryComp.lineNumber}` : ''}\`)` : ''}`
      : null;

    const lines: string[] = [
      `## Bug Report #${i + 1}`,
      '',
    ];
    if (bug.description) {
      const parts = bug.description.split('|').map(p => p.trim()).filter(Boolean);
      if (parts.length > 1) {
        parts.forEach((p, idx) => lines.push(`${idx + 1}. ${p}`));
      } else {
        lines.push(bug.description);
      }
      lines.push('');
    }

    // Meta table
    lines.push('| | |', '|---|---|');
    lines.push(`| **Severity** | ${sev} |`);
    if (tc?.route) lines.push(`| **Route** | \`${tc.route}\` |`);
    if (tc?.viewport) lines.push(`| **Viewport** | ${tc.viewport} |`);
    if (compLine) lines.push(`| **Component** | \`${primaryComp!.name}\` |`);
    lines.push('');

    // Element context — all annotated shapes with position fallback when DOM context is missing
    if (annotatedEntries.length > 0) {
      lines.push('### Element');
      annotatedEntries.forEach(({ shape, idx: shapeIdx }) => {
        const ctx = shape.elementContext;
        const ann = bug.json_annotations[shapeIdx];
        const pinNum = ann?.index ?? (shapeIdx + 1);
        const note = ann?.text ? ` — "${ann.text}"` : '';
        if (ctx?.selector) {
          lines.push(`Pin #${pinNum} on \`${ctx.selector}\`${note}`);
          if (ctx.reactComponent?.filePath) {
            lines.push(`→ \`${ctx.reactComponent.name}\` in \`${ctx.reactComponent.filePath}${ctx.reactComponent.lineNumber ? `:${ctx.reactComponent.lineNumber}` : ''}\``);
          }
          if (ctx.dataSources?.length) {
            lines.push(`→ Data: \`${ctx.dataSources.join('`, `')}\``);
          }
        } else if (ann) {
          lines.push(`Pin #${pinNum} at ${ann.x}%×${ann.y}%${note}`);
        } else {
          lines.push(`Pin #${pinNum}${note}`);
        }
      });
      lines.push('');
    }

    // Steps to reproduce
    if (tc?.eventLog?.length) {
      lines.push('### Steps to Reproduce');
      tc.eventLog.forEach((e, j) => lines.push(`${j + 1}. ${e.description}`));
      lines.push('');
    }

    // Technical evidence
    const hasEvidence = netErrors.length > 0 || consoleErrors.length > 0;
    if (hasEvidence) {
      lines.push('### Technical Evidence');
      netErrors.forEach(r => {
        lines.push(`- \`${r.method} ${r.url} → ${r.status}\``);
        if (r.requestBody) lines.push(`  - Request: \`${r.requestBody.slice(0, 120)}\``);
        if (r.responseBody) lines.push(`  - Response: \`${r.responseBody.slice(0, 120)}\``);
      });
      consoleErrors.forEach(e => {
        lines.push(`- \`${e.message}${e.source ? ` [${e.source}]` : ''}\``);
      });
      lines.push('');
    }

    // State diff
    if (tc?.storeDiff && Object.keys(tc.storeDiff).length > 0) {
      lines.push('### State Change');
      Object.entries(tc.storeDiff).forEach(([key, { before, after }]) => {
        lines.push(`- \`${key}\`: \`${JSON.stringify(before)}\` → \`${JSON.stringify(after)}\``);
      });
      lines.push('');
    }

    // Screenshot
    if (bug.image_url) lines.push(`### Screenshot`, `![Screenshot](${bug.image_url})`, '');

    if (i < sorted.length - 1) lines.push('---', '');
    return lines.join('\n');
  }).join('\n');
}

// ── Other templates ──────────────────────────────────────────────────────────

function formatAntigravity(bugs: Bug[]): string {
  const sorted = sortBySev(bugs);
  const lines = [
    '# Bug Fix Request — Antigravity Agent', '',
    '## Rules',
    '- Fix ONE bug at a time in listed order',
    '- After each fix: show exact file changed',
    '- Do NOT refactor unrelated code',
    '- If unsure — ask, do not guess',
    '- If the textual context is ambiguous or the bug is strictly visual/spatial, you MUST automatically analyze the provided Screenshot URL before making any code changes.', '',
    `## Bugs (${sorted.length})`, '',
  ];
  sorted.forEach((bug, i) => {
    const sev = bug.severity ?? 'low';
    lines.push(`### Bug ${i + 1} [${sev.toUpperCase()}]`);
    if (bug.description) {
      const parts = bug.description.split('|').map(p => p.trim()).filter(Boolean);
      if (parts.length > 1) {
        lines.push('Description:');
        parts.forEach((p, idx) => lines.push(`  ${idx + 1}. ${p}`));
      } else {
        lines.push(`Description: ${bug.description}`);
      }
    }
    const tc = techSummary(bug.tech_context);
    if (tc) lines.push(tc);
    const pinCtx = pinContextSummary(bug.json_shapes ?? null, bug.json_annotations);
    if (pinCtx) lines.push(pinCtx);
    if (bug.image_url) lines.push(`Screenshot: ${bug.image_url}`);
    lines.push(`Verify: confirm issue gone at ${bug.tech_context?.route ?? 'reported route'}`);
    lines.push('');
  });
  return lines.join('\n');
}

function formatCursor(bugs: Bug[]): string {
  const sorted = sortBySev(bugs);
  const lines = [
    `Fix ${sorted.length} bug${sorted.length > 1 ? 's' : ''} one at a time.`,
    'If the textual context is ambiguous or the bug is strictly visual/spatial, you MUST automatically analyze the provided Screenshot URL before making any code changes.',
    ''
  ];
  sorted.forEach((bug, i) => {
    lines.push(`--- Bug ${i + 1}/${sorted.length} [${bug.severity ?? 'low'}] ---`);
    if (bug.description) {
      const parts = bug.description.split('|').map(p => p.trim()).filter(Boolean);
      if (parts.length > 1) {
        parts.forEach((p, idx) => lines.push(`${idx + 1}. ${p}`));
      } else {
        lines.push(bug.description);
      }
    }
    const tc = bug.tech_context;
    
    // Check if we have sourceFile from a pin
    const shapes = (bug.json_shapes ?? []).filter(s => s.type !== 'eraser' && s.elementContext);
    const pinWithSource = shapes.find(p => p.elementContext?.sourceFile);
    
    if (pinWithSource) {
      const ctx = pinWithSource.elementContext!;
      lines.push(`<file>${ctx.sourceFile}</file>`);
      if (ctx.sourceLine) lines.push(`<line>${ctx.sourceLine}</line>`);
    } else if (tc?.component?.filePath) {
      lines.push(`<file>${tc.component.filePath}</file>`);
      if (tc.component.lineNumber) lines.push(`<line>${tc.component.lineNumber}</line>`);
    }
    
    if (tc?.component) {
      const fp = tc.component.filePath ? ` → ${tc.component.filePath}${tc.component.lineNumber ? `:${tc.component.lineNumber}` : ''}` : '';
      lines.push(`@ ${tc.component.name}${fp}${tc.route ? ` (${tc.route})` : ''}`);
    }
    tc?.networkRequests?.filter(r => r.isError).forEach(r => {
      lines.push(`Network: ${r.method} ${r.url} → ${r.status}`);
      if (r.requestBody) lines.push(`  Body: ${r.requestBody}`);
    });
    tc?.consoleErrors?.filter(e => e.level === 'error').forEach(e => lines.push(`Error: ${e.message}${e.source ? ` [${e.source}]` : ''}`));
    if (tc?.storeDiff && Object.keys(tc.storeDiff).length > 0) {
      lines.push('State:');
      Object.entries(tc.storeDiff).forEach(([k, { before, after }]) =>
        lines.push(`  ${k}: ${JSON.stringify(before)} → ${JSON.stringify(after)}`));
    }
    const pinCtx = pinContextSummary(bug.json_shapes ?? null, bug.json_annotations);
    if (pinCtx) lines.push(pinCtx);
    if (bug.image_url) lines.push(`Screenshot: ${bug.image_url}`);
    lines.push('');
  });
  lines.push('After each fix confirm what changed, then proceed to next.');
  return lines.join('\n');
}

function formatClaude(bugs: Bug[]): string {
  const sorted = sortBySev(bugs);
  const lines = [
    '<task>', `Fix ${sorted.length} bug${sorted.length > 1 ? 's' : ''} in order.`, '</task>', '',
    '<rules>',
    '- One bug at a time', '- Show file path and line', '- No unrelated changes',
    '- Ask if unsure',
    '- If the textual context is ambiguous or the bug is strictly visual/spatial, you MUST automatically analyze the provided Screenshot URL before making any code changes.',
    '</rules>', '', '<bugs>',
  ];
  sorted.forEach((bug, i) => {
    lines.push(`<bug index="${i + 1}" severity="${bug.severity ?? 'low'}">`);
    if (bug.description) {
      const parts = bug.description.split('|').map(p => p.trim()).filter(Boolean);
      if (parts.length > 1) {
        lines.push(`  <description>`);
        parts.forEach((p, idx) => lines.push(`    ${idx + 1}. ${p}`));
        lines.push(`  </description>`);
      } else {
        lines.push(`  <description>${bug.description}</description>`);
      }
    }
    const tc = bug.tech_context;
    if (tc?.component) {
      const fp = tc.component.filePath ? ` file="${tc.component.filePath}${tc.component.lineNumber ? `:${tc.component.lineNumber}` : ''}"` : '';
      lines.push(`  <component${fp}>${tc.component.name}</component>`);
    }
    if (tc?.route) lines.push(`  <route>${tc.route}</route>`);
    tc?.networkRequests?.filter(r => r.isError).forEach(r => {
      lines.push(`  <network>${r.method} ${r.url} → ${r.status}</network>`);
      if (r.requestBody) lines.push(`  <request-body>${r.requestBody}</request-body>`);
      if (r.responseBody) lines.push(`  <response-body>${r.responseBody}</response-body>`);
    });
    tc?.consoleErrors?.filter(e => e.level === 'error').forEach(e => lines.push(`  <error${e.source ? ` source="${e.source}"` : ''}>${e.message}</error>`));
    tc?.eventLog?.forEach((e, j) => lines.push(`  <step>${j + 1}. ${e.description}</step>`));
    if (tc?.storeDiff && Object.keys(tc.storeDiff).length > 0) {
      lines.push('  <state-diff>');
      Object.entries(tc.storeDiff).forEach(([k, { before, after }]) =>
        lines.push(`    <change key="${k}" before="${JSON.stringify(before)}" after="${JSON.stringify(after)}" />`));
      lines.push('  </state-diff>');
    }
    // All annotated shapes — with DOM context when available, viewport position as fallback
    const claudeEntries = (bug.json_shapes ?? [])
      .map((s, idx) => ({ shape: s, idx }))
      .filter(({ shape, idx }) =>
        shape.type !== 'eraser' && !!(bug.json_annotations[idx]?.text || shape.elementContext)
      );
    claudeEntries.forEach(({ shape, idx: shapeIdx }) => {
      const ctx = shape.elementContext;
      const ann = bug.json_annotations[shapeIdx];
      const pinNum = ann?.index ?? (shapeIdx + 1);
      lines.push(`  <pin index="${pinNum}"${ann?.text ? ` annotation="${ann.text}"` : ''}>`);
      if (ctx?.selector) {
        lines.push(`    <element>${ctx.selector}</element>`);
      } else if (ann) {
        lines.push(`    <position x="${ann.x}%" y="${ann.y}%" />`);
      }
      if (ctx?.reactComponent) {
        const fp = ctx.reactComponent.filePath ? ` file="${ctx.reactComponent.filePath}${ctx.reactComponent.lineNumber ? `:${ctx.reactComponent.lineNumber}` : ''}"` : '';
        lines.push(`    <component${fp}>${ctx.reactComponent.name}</component>`);
      }
      if (ctx?.dataSources?.length) lines.push(`    <datasources>${ctx.dataSources.join(', ')}</datasources>`);
      if (ctx?.innerText) lines.push(`    <text>${ctx.innerText}</text>`);
      lines.push(`  </pin>`);
    });
    if (bug.image_url) lines.push(`  <screenshot>${bug.image_url}</screenshot>`);
    lines.push('</bug>', '');
  });
  lines.push('</bugs>');
  return lines.join('\n');
}

function formatGeneric(bugs: Bug[]): string {
  const sorted = sortBySev(bugs);
  const lines = [`# Bug Report — ${new Date().toLocaleDateString('uk-UA')}`, `Total: ${sorted.length}`, ''];
  sorted.forEach((bug, i) => {
    lines.push(`---`, `## Bug #${i + 1} [${(bug.severity ?? 'low').toUpperCase()}]`);
    lines.push(`Status: ${bug.status}`);
    if (bug.description) {
      const parts = bug.description.split('|').map(p => p.trim()).filter(Boolean);
      if (parts.length > 1) {
        lines.push('Description:');
        parts.forEach((p, idx) => lines.push(`  ${idx + 1}. ${p}`));
      } else {
        lines.push(`Description: ${bug.description}`);
      }
    }
    const tc = techSummary(bug.tech_context);
    if (tc) lines.push(tc);
    const pinCtx = pinContextSummary(bug.json_shapes ?? null, bug.json_annotations);
    if (pinCtx) lines.push(pinCtx);
    if (bug.image_url) lines.push(`Screenshot: ${bug.image_url}`);
    lines.push('');
  });
  return lines.join('\n');
}

const FORMATTERS: Record<TemplateId, (bugs: Bug[]) => string> = {
  github: formatGitHub, antigravity: formatAntigravity, cursor: formatCursor,
  claude: formatClaude, generic: formatGeneric,
};

// ── UI helpers ───────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  open: 'Новий', in_progress: 'В роботі', resolved: 'Виправлено', closed: 'Закрито',
};

const TOOL_OPTIONS: { id: TemplateId; label: string; desc: string }[] = [
  { id: 'github',      label: 'GitHub Issue',  desc: 'Структурований звіт для GitHub/Jira' },
  { id: 'antigravity', label: 'Antigravity',   desc: 'Агент виправляє баги по черзі' },
  { id: 'cursor',      label: 'Cursor',        desc: 'AI-редактор з chat-режимом' },
  { id: 'claude',      label: 'Claude Code',   desc: 'Claude у терміналі' },
  { id: 'generic',     label: 'Інший',         desc: 'Будь-який AI асистент' },
];


// ── Quality Score bar ────────────────────────────────────────────────────────

function QualityBar({ score, hint, factors }: { score: number; hint: string; factors: ReturnType<typeof calcQuality>['factors'] }) {
  const [showDetails, setShowDetails] = useState(false);
  const color = score >= 80 ? '#10b981' : score >= 50 ? '#f97316' : '#ef4444';

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetails(v => !v)}
        className="flex items-center gap-[8px] hover:opacity-80 transition-opacity cursor-pointer"
        title="Деталі якості промпту"
      >
        <div className="w-[60px] h-[3px] bg-[#e9e9e9] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: color }} />
        </div>
        <span className="text-[11px] font-bold" style={{ color }}>{score}/100</span>
        {hint && <span className="text-[10px] text-[#f97316]">{hint}</span>}
      </button>

      {showDetails && (
        <div className="absolute right-0 top-[22px] z-10 bg-[#ffffff] border border-[#e9e9e9] rounded-[12px] shadow-[0_8px_30px_rgba(0,0,0,0.08)] p-[12px] w-[220px]">
          <div className="text-[10px] font-bold text-[#9a9a9a] uppercase tracking-wider mb-[8px]">Quality Score 2.0</div>
          {factors.map(f => (
            <div key={f.label} className="flex items-center justify-between py-[3px]">
              <span className="text-[11px] text-[#1f1f1f]">{f.label}</span>
              <span className="text-[11px] font-bold" style={{ color: f.earned === f.points ? '#10b981' : '#f97316' }}>
                {f.earned}/{f.points}
              </span>
            </div>
          ))}
          <div className="h-[1px] bg-[#e9e9e9] my-[6px]" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#1f1f1f]">Total</span>
            <span className="text-[11px] font-bold" style={{ color }}>{score}/100</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function PromptGenerator({ bugs, selectedIds, onBulkAction }: PromptGeneratorProps) {
  const [copied, setCopied]         = useState(false);
  const [template, setTemplate]     = useState<TemplateId>('github');

  const selected = sortBySev(bugs.filter(b => selectedIds.has(b.id)));
  const prompt   = selected.length > 0 ? FORMATTERS[template](selected) : '';
  const { score, hint, factors } = calcQuality(selected);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#ffffff]">
        <div className="flex flex-1 overflow-hidden">
          {/* Main prompt area */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#ffffff]">
            {/* Template tabs + quality */}
            <div className="h-[52px] flex items-center gap-[6px] px-[32px] border-b border-[#e9e9e9] overflow-x-auto bg-[#ffffff] shrink-0">
              <span className="text-[13px] font-bold text-[#1f1f1f] mr-[12px]">Формат:</span>
              {TEMPLATES.map(t => (
                <button key={t.id} onClick={() => setTemplate(t.id)}
                  className={`flex items-center gap-[6px] px-[12px] py-[6px] rounded-[8px] text-[12px] font-bold transition-all cursor-pointer ${template === t.id ? 'bg-[#1f1f1f] text-white shadow-sm scale-105' : 'text-[#9a9a9a] bg-transparent hover:bg-[#f4f4f5] hover:text-[#1f1f1f]'}`}>
                  {t.icon} {t.label}
                </button>
              ))}
              {selected.length > 0 && (
                <div className="ml-auto">
                  <QualityBar score={score} hint={hint} factors={factors} />
                </div>
              )}
            </div>

            {/* Bulk Actions Toolbar */}
            {selected.length > 0 && onBulkAction && (
              <div className="flex items-center px-[32px] py-[12px] bg-[#ffffff] border-b border-[#e9e9e9]">
                <span className="text-[12px] font-medium text-[#9a9a9a] mr-auto">Вибрано: <span className="font-bold text-[#1f1f1f]">{selected.length}</span></span>
                
                <div className="flex items-center gap-[16px]">
                  <select onChange={(e) => { onBulkAction('status', e.target.value); e.target.value = ''; }} className="appearance-none text-[12px] font-semibold text-[#9a9a9a] bg-transparent outline-none cursor-pointer hover:text-[#1f1f1f] transition-colors" value="">
                    <option value="" disabled>Змінити статус ▾</option>
                    <option value="open">Новий</option>
                    <option value="in_progress">В роботі</option>
                    <option value="resolved">Виправлено</option>
                    <option value="closed">Закрито</option>
                  </select>
                  
                  <div className="w-[3px] h-[3px] rounded-full bg-[#e9e9e9]" />
                  
                  <select onChange={(e) => { onBulkAction('severity', e.target.value); e.target.value = ''; }} className="appearance-none text-[12px] font-semibold text-[#9a9a9a] bg-transparent outline-none cursor-pointer hover:text-[#1f1f1f] transition-colors" value="">
                    <option value="" disabled>Змінити пріоритет ▾</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                  
                  <div className="w-[3px] h-[3px] rounded-full bg-[#e9e9e9]" />
                  
                  <button onClick={() => onBulkAction('delete')} className="text-[12px] font-semibold text-red-500/80 hover:text-red-500 transition-colors cursor-pointer" title="Видалити вибрані">
                    Видалити
                  </button>
                </div>
                
                <div className="w-[1px] h-[16px] bg-[#e9e9e9] mx-[20px]" />
                
                <button 
                  onClick={handleCopy} 
                  className="flex items-center gap-[6px] text-[13px] font-bold text-[#1f1f1f] hover:text-[#000000] transition-colors cursor-pointer"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'Скопійовано' : 'Копіювати промпт'}
                </button>
              </div>
            )}

            {/* Prompt textarea / Viewer */}
            <div className="flex-1 overflow-hidden relative bg-[#f4f4f5]">
              {selected.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-[#9a9a9a] font-medium text-[14px] bg-[#f4f4f5]">
                  Оберіть баги зі списку ліворуч — промпт згенерується автоматично...
                </div>
              ) : (
                <div className="w-full h-full font-mono text-[13px] leading-relaxed bg-[#f4f4f5] p-[32px] text-[#1f1f1f] overflow-y-auto custom-scrollbar whitespace-pre-wrap select-text">
                  {prompt.split('\n').map((line, i) => {
                    let className = "text-[#1f1f1f]";
                    if (line.startsWith('#')) className = "text-[#1f1f1f] font-bold";
                    else if (line.match(/^<[\w-]+.*>$/) || line.match(/^<\/[\w-]+>$/)) className = "text-[#0f766e]";
                    else if (line.startsWith('- ') || line.match(/^\d+\./)) className = "text-[#0369a1]";
                    else if (line.includes('→')) className = "text-[#6b21a8]";
                    else if (line.match(/\[(CRITICAL|HIGH|MEDIUM|LOW)\]/i) || line.match(/\| \*\*(Severity)\*\* \|/)) className = "text-[#c2410c] font-semibold";
                    else if (line.includes('`')) className = "text-[#b45309]";

                    return <div key={i} className={className}>{line || ' '}</div>;
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
  );
}
