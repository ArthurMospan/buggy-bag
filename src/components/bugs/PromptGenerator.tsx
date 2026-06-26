'use client';
import { useState, useRef, useEffect } from 'react';
import { Bug, BugStatus, BugSeverity, TechContext } from '@/lib/types';
import { STATUS_CFG, SEVERITY_CFG } from '@/lib/constants';
import { Sparkles, Copy, Check, Code, Terminal, MessageSquare, Bot, Trash2, ChevronDown } from 'lucide-react';
import { getUnifiedSeverityLabel } from '@/lib/markdownFormatter';
import Dialog from '@/components/ui/Dialog';

interface PromptGeneratorProps {
  bugs: Bug[];
  selectedIds: Set<string>;
  onBulkAction?: (action: 'delete' | 'status' | 'severity', value?: string, skipClear?: boolean) => void;
}

const GithubLogo = ({ color = 'currentColor' }: {color?: string}) => <svg width="14" height="14" viewBox="0 0 24 24" fill={color}><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>;

type TemplateId = 'antigravity' | 'claude' | 'cursor' | 'github';

const TEMPLATES: { id: TemplateId; label: string; icon: (selected: boolean) => React.ReactNode }[] = [
  { id: 'antigravity', label: 'Antigravity',  icon: (s) => <img src="/icons/antigravity-color.svg" alt="Antigravity" width={16} height={16} className={`transition-opacity ${s ? 'opacity-100' : 'opacity-60 grayscale'}`} /> },
  { id: 'claude',      label: 'Claude Code',  icon: (s) => <img src="/icons/claude-color.svg" alt="Claude" width={16} height={16} className={`transition-opacity ${s ? 'opacity-100' : 'opacity-60 grayscale'}`} /> },
  { id: 'cursor',      label: 'Cursor',       icon: (s) => <img src="/icons/cursor-color.svg" alt="Cursor" width={16} height={16} className={`transition-opacity ${s ? 'opacity-100' : 'opacity-60 grayscale'}`} /> },
  { id: 'github',      label: 'GitHub Issue', icon: (s) => <GithubLogo color={s ? '#1f1f1f' : 'currentColor'} /> },
];

function sortBySev(bugs: Bug[]): Bug[] {
  return [...bugs].sort((a, b) => {
    const sevA = parseInt(a.severity as string) || 1;
    const sevB = parseInt(b.severity as string) || 1;
    return sevB - sevA; // highest priority first
  });
}



// ── Prompt formatters ────────────────────────────────────────────────────────

// getRecentActions — filters & limits the event log before displaying.
// Removes generic "Navigated" entries (no meaningful info) and caps at 5 most recent.
// Purpose: surface only relevant context, not the full browsing history.
function getRecentActions(eventLog: TechContext['eventLog'] | undefined): NonNullable<TechContext['eventLog']> {
  if (!eventLog?.length) return [];
  return eventLog
    .filter(e => {
      const d = (e.description ?? '').trim().toLowerCase();
      return d && d !== 'navigated' && d !== 'navigate' && d !== 'navigation';
    })
    .slice(-5); // last 5 = closest to when the bug was reported
}

// techSummary — intentionally omits the top-level Component.
// Component context belongs per-pin (inside pinnedIssuesSummary), not at bug level.
// Showing a single "Component" at the top misleads AI into thinking all issues relate to one component.
function techSummary(tc: TechContext | null): string {
  if (!tc) return '';
  const lines: string[] = [];
  if (tc.route) lines.push(`Route: ${tc.route}`);
  if (tc.viewport) lines.push(`Viewport: ${tc.viewport}`);
  const netErr = tc.networkRequests?.filter(r => r.isError) ?? [];
  if (netErr.length) {
    lines.push('Console errors:');
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
  const recentActions = getRecentActions(tc.eventLog);
  if (recentActions.length) {
    lines.push('Recent user actions (context only — not a reproduction recipe; use only if needed to understand UI state):');
    recentActions.forEach((e, i) => {
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
    lines.push('State changes:');
    Object.entries(tc.storeDiff).forEach(([key, { before, after }]) => {
      lines.push(`  ${key}: ${JSON.stringify(before)} → ${JSON.stringify(after)}`);
    });
  }
  return lines.join('\n');
}

// pinnedIssuesSummary — replaces the old pinContextSummary.
// Structure per pin: annotation text → DOM element → Component (file:line)
// This makes each pin self-contained: AI knows exactly what to look at and where in code.
function pinnedIssuesSummary(jsonShapes: Bug['json_shapes'], annotations: Bug['json_annotations']): string {
  if (!jsonShapes || jsonShapes.length === 0) return '';
  const entries = jsonShapes
    .map((s, idx) => ({ shape: s, idx }))
    .filter(({ shape, idx }) =>
      shape.type !== 'eraser' && !!(annotations[idx]?.text || shape.elementContext)
    );
  if (entries.length === 0) return '';

  const lines: string[] = ['Pinned issues (refer to screenshot for pin positions):'];
  entries.forEach(({ shape, idx: shapeIdx }) => {
    const ctx = shape.elementContext;
    const ann = annotations[shapeIdx];
    const pinNum = ann?.index ?? (shapeIdx + 1);
    const text = ann?.text ?? '';
    const attachmentsText = ann?.attachments?.length
      ? ` [Attachments: ${ann.attachments.map(a => a.url).join(', ')}]`
      : '';

    lines.push(`  Pin #${pinNum}: "${text}"${attachmentsText}`);
    if (ctx?.selector) {
      lines.push(`    Element: ${ctx.selector}`);
    } else if (ann) {
      lines.push(`    Position: ${ann.x}% × ${ann.y}% (no DOM context)`);
    }
    if (ctx?.reactComponent) {
      const fp = ctx.reactComponent.filePath
        ? ` (${ctx.reactComponent.filePath}${ctx.reactComponent.lineNumber ? `:${ctx.reactComponent.lineNumber}` : ''})`
        : '';
      lines.push(`    Component: ${ctx.reactComponent.name}${fp}`);
    }
    if (ctx?.dataSources?.length) {
      lines.push(`    Data sources: ${ctx.dataSources.join(', ')}`);
    }
    if (ctx?.innerText) {
      lines.push(`    Text content: "${ctx.innerText}"`);
    }
    if (ctx?.ariaLabel) {
      lines.push(`    aria-label: ${ctx.ariaLabel}`);
    }
  });
  return lines.join('\n');
}

// ── GitHub Issue template ────────────────────────────────────────────────────

function formatGitHub(bugs: Bug[]): string {
  const sorted = sortBySev(bugs);
  return sorted.map((bug, i) => {
    const tc = bug.tech_context;
    const allShapes = bug.json_shapes ?? [];
    const annotatedEntries = allShapes
      .map((s, idx) => ({ shape: s, idx }))
      .filter(({ shape, idx }) =>
        shape.type !== 'eraser' && !!(bug.json_annotations[idx]?.text || shape.elementContext)
      );
    const netErrors = tc?.networkRequests?.filter(r => r.isError) ?? [];
    const consoleErrors = tc?.consoleErrors?.filter(e => e.level === 'error') ?? [];
    const hasAnnotations = annotatedEntries.length > 0;

    const lines: string[] = [
      `## Bug "${bug.human_id || bug.id.split('-')[0]}" (${tc?.route || 'No route'})`,
      '',
    ];


    // Meta table — Component intentionally omitted; shown per-pin in Pinned Issues section.
    lines.push('| | |', '|---|---|');
    lines.push(`| **Severity** | ${getUnifiedSeverityLabel(bug.severity)} |`);
    if (tc?.route) lines.push(`| **Route** | \`${tc.route}\` |`);
    if (tc?.viewport) lines.push(`| **Viewport** | ${tc.viewport} |`);
    lines.push('');

    // Pinned issues — each pin: annotation text → DOM element → Component (file:line)
    if (hasAnnotations) {
      lines.push('### Pinned Issues');
      annotatedEntries.forEach(({ shape, idx: shapeIdx }) => {
        const ctx = shape.elementContext;
        const ann = bug.json_annotations[shapeIdx];
        const pinNum = ann?.index ?? (shapeIdx + 1);
        const text = ann?.text ? `"${ann.text}"` : `(no annotation)`;

        const attachmentsMd = ann?.attachments?.length
          ? ' ' + ann.attachments.map(att => att.type.startsWith('image/')
              ? `![${att.name}](${att.url})`
              : `[${att.name}](${att.url})`).join(' ')
          : '';

        lines.push(`- **Pin #${pinNum}**: ${text}${attachmentsMd}`);
        if (ctx?.selector) {
          lines.push(`  - Element: \`${ctx.selector}\``);
        } else if (ann) {
          lines.push(`  - Position: ${ann.x}% × ${ann.y}%`);
        }
        if (ctx?.reactComponent) {
          const fp = ctx.reactComponent.filePath
            ? ` (\`${ctx.reactComponent.filePath}${ctx.reactComponent.lineNumber ? `:${ctx.reactComponent.lineNumber}` : ''}\`)`
            : '';
          lines.push(`  - Component: \`${ctx.reactComponent.name}\`${fp}`);
        }
        if (ctx?.dataSources?.length) {
          lines.push(`  - Data: \`${ctx.dataSources.join('\`, \`')}\``);
        }
      });
      lines.push('');
    }

    // Recent user actions — filtered & capped at 5
    const ghActions = getRecentActions(tc?.eventLog);
    if (ghActions.length) {
      lines.push('### Recent User Actions');
      lines.push('> Context only — not a step-by-step reproduction recipe. Use only if needed to understand the UI state.');
      ghActions.forEach((e, j) => lines.push(`${j + 1}. ${e.description}`));
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
      lines.push('### State Changes');
      Object.entries(tc.storeDiff).forEach(([key, { before, after }]) => {
        lines.push(`- \`${key}\`: \`${JSON.stringify(before)}\` → \`${JSON.stringify(after)}\``);
      });
      lines.push('');
    }

    // Screenshot
    if (bug.image_url) lines.push('### Screenshot', `![Screenshot](${bug.image_url})`, '');

    if (i < sorted.length - 1) lines.push('---', '');
    return lines.join('\n');
  }).join('\n');
}

// ── Other templates ──────────────────────────────────────────────────────────

function formatAntigravity(bugs: Bug[]): string {
  const sorted = sortBySev(bugs);
  const lines = [
    '# Bug Fix Request — Antigravity Agent', '',
    '## Workflow (follow in order)',
    '1. Open the Screenshot URL for EACH bug — examine it before reading anything else',
    '2. Match each Pin # on the screenshot to its description in "Pinned issues" below',
    '3. Write a brief action plan (one step per bug/pin) before touching any code',
    '4. Ask clarifying questions if anything remains ambiguous after examining the screenshot',
    '5. Fix ONE bug at a time — do not jump ahead', '',
    '## Rules',
    '- Fix bugs in listed order (highest severity first)',
    '- After each fix: show exact file path and lines changed',
    '- Provide your action plan and final report ONLY in Ukrainian language',
    '- Report format MUST start with: Bug "{ID}" (/route)',
    '- Final report MUST be a table with emojis:',
    '  | 🐛 Що було | 🛠️ Що виправлено |',
    '  | --- | --- |',
    '  | (Короткий опис) | (Короткий опис) |',
    '- Do NOT refactor unrelated code',
    '- If unsure about visual details — re-examine the screenshot, then ask',
    '- Do NOT start coding before you have a clear plan', '',
    `## Bugs (${sorted.length})`, '',
  ];
  sorted.forEach((bug, i) => {
    const tc = bug.tech_context;
    const sev = getUnifiedSeverityLabel(bug.severity);
    lines.push(`### Bug "${bug.human_id || bug.id.split('-')[0]}" (${tc?.route || 'No route'}) [Severity: ${sev}]`);


    // Route + Viewport — Component intentionally omitted at bug level; shown per-pin below
    if (tc?.route) lines.push(`Route: ${tc.route}`);
    if (tc?.viewport) lines.push(`Viewport: ${tc.viewport}`);

    const consoleErr = tc?.consoleErrors?.filter(e => e.level === 'error') ?? [];
    if (consoleErr.length) {
      lines.push('Console errors:');
      consoleErr.forEach(e => lines.push(`  ${e.message}${e.source ? ` [${e.source}]` : ''}`) );
    }

    const netErr = tc?.networkRequests?.filter(r => r.isError) ?? [];
    if (netErr.length) {
      lines.push('Network errors:');
      netErr.forEach(r => {
        lines.push(`  ${r.method} ${r.url} → ${r.status || 'ERR'}`);
        if (r.requestBody) lines.push(`    Request body: ${r.requestBody}`);
        if (r.responseBody) lines.push(`    Response: ${r.responseBody}`);
      });
    }

    const agActions = getRecentActions(tc?.eventLog);
    if (agActions.length) {
      lines.push('Recent user actions (context only — not a reproduction recipe; use only if needed to understand UI state):');
      agActions.forEach((e, j) => {
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
        lines.push(`  ${j + 1}. ${e.description}${relStr}`);
      });
    }

    if (tc?.storeDiff && Object.keys(tc.storeDiff).length > 0) {
      lines.push('State changes:');
      Object.entries(tc.storeDiff).forEach(([key, { before, after }]) => {
        lines.push(`  ${key}: ${JSON.stringify(before)} → ${JSON.stringify(after)}`);
      });
    }

    const pinCtx = pinnedIssuesSummary(bug.json_shapes ?? null, bug.json_annotations);
    if (pinCtx) lines.push(pinCtx);



    if (bug.image_url) lines.push(`Screenshot: ${bug.image_url}`);
    lines.push(`Verify: confirm issue is gone at ${tc?.route ?? 'reported route'}`);
    lines.push('');
  });
  return lines.join('\n');
}

function formatCursor(bugs: Bug[]): string {
  const sorted = sortBySev(bugs);
  const lines = [
    `Fix ${sorted.length} bug${sorted.length > 1 ? 's' : ''} one at a time.`,
    'Workflow: (1) Open screenshot URL and examine it. (2) Match each Pin # to its description. (3) Write a plan before coding. (4) Fix one bug, show changed lines, proceed.',
    'IMPORTANT: Provide your action plan and final report ONLY in Ukrainian language.',
    'Report format after fix MUST include: Bug "{ID}" (/route)',
    'And MUST include a neat table with emojis:',
    '| 🐛 Що було | 🛠️ Що виправлено |',
    '| --- | --- |',
    '| (Короткий опис) | (Короткий опис) |',
    ''
  ];
  sorted.forEach((bug, i) => {
    const tc = bug.tech_context;
    lines.push(`--- Bug "${bug.human_id || bug.id.split('-')[0]}" (${tc?.route || 'No route'}) [Severity: ${getUnifiedSeverityLabel(bug.severity)}] ---`);


    if (tc?.route) lines.push(`Route: ${tc.route}`);
    if (tc?.viewport) lines.push(`Viewport: ${tc.viewport}`);

    // Source file hint — from first pin that has it (no top-level component)
    const shapes = (bug.json_shapes ?? []).filter(s => s.type !== 'eraser' && s.elementContext);
    const pinWithSource = shapes.find(p => p.elementContext?.sourceFile);
    if (pinWithSource) {
      const ctx = pinWithSource.elementContext!;
      lines.push(`<file>${ctx.sourceFile}</file>`);
      if (ctx.sourceLine) lines.push(`<line>${ctx.sourceLine}</line>`);
    }

    tc?.networkRequests?.filter(r => r.isError).forEach(r => {
      lines.push(`Network: ${r.method} ${r.url} → ${r.status}`);
      if (r.requestBody) lines.push(`  Body: ${r.requestBody}`);
    });
    tc?.consoleErrors?.filter(e => e.level === 'error').forEach(e =>
      lines.push(`Error: ${e.message}${e.source ? ` [${e.source}]` : ''}`)
    );
    if (tc?.storeDiff && Object.keys(tc.storeDiff).length > 0) {
      lines.push('State:');
      Object.entries(tc.storeDiff).forEach(([k, { before, after }]) =>
        lines.push(`  ${k}: ${JSON.stringify(before)} → ${JSON.stringify(after)}`)
      );
    }
    const cursorActions = getRecentActions(tc?.eventLog);
    if (cursorActions.length) {
      lines.push('Recent user actions (context only — not a reproduction recipe):');
      cursorActions.forEach((e, j) => lines.push(`  ${j + 1}. ${e.description}`));
    }
    const pinCtx = pinnedIssuesSummary(bug.json_shapes ?? null, bug.json_annotations);
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
    '<task>', `Fix ${sorted.length} bug${sorted.length > 1 ? 's' : ''} in listed order.`, '</task>', '',
    '<workflow>',
    '  1. Open the Screenshot URL for each bug — examine it before reading anything else',
    '  2. Match each pin number on the screenshot to its annotation below',
    '  3. Write a numbered action plan before touching any code',
    '  4. Ask clarifying questions if anything is still ambiguous after examining the screenshot',
    '  5. Fix ONE bug at a time — confirm what changed, then proceed to next',
    '</workflow>', '',
    '<rules>',
    '  - Fix bugs in listed order (highest severity first)',
    '  - After each fix: show exact file path and lines changed',
    '  - Provide your action plan and final report ONLY in Ukrainian language',
    '  - Report format MUST start with: Bug "{ID}" (/route)',
    '  - Final report MUST be a table with emojis:',
    '    | 🐛 Що було | 🛠️ Що виправлено |',
    '    | --- | --- |',
    '    | (Короткий опис) | (Короткий опис) |',
    '  - Do NOT refactor unrelated code',
    '  - Do NOT start coding before you have a clear plan',
    '  - If unsure about visual details — re-examine the screenshot, then ask',
    '</rules>', '',
    '<bugs>',
  ];
  sorted.forEach((bug, i) => {
    const tc = bug.tech_context;
    lines.push(`<bug id="${bug.human_id || bug.id.split('-')[0]}" route="${tc?.route || ''}" index="${i + 1}" severity="${getUnifiedSeverityLabel(bug.severity)}">`);


    const claudeEntries = (bug.json_shapes ?? [])
      .map((s, idx) => ({ shape: s, idx }))
      .filter(({ shape, idx }) =>
        shape.type !== 'eraser' && !!(bug.json_annotations[idx]?.text || shape.elementContext)
      );
    const hasAnnotations = claudeEntries.length > 0;

    // Route + Viewport — Component intentionally omitted at bug level; shown per-pin inside <pins>
    if (tc?.route) lines.push(`  <route>${tc.route}</route>`);
    if (tc?.viewport) lines.push(`  <viewport>${tc.viewport}</viewport>`);

    tc?.networkRequests?.filter(r => r.isError).forEach(r => {
      lines.push(`  <network>${r.method} ${r.url} → ${r.status}</network>`);
      if (r.requestBody) lines.push(`  <request-body>${r.requestBody}</request-body>`);
      if (r.responseBody) lines.push(`  <response-body>${r.responseBody}</response-body>`);
    });
    tc?.consoleErrors?.filter(e => e.level === 'error').forEach(e =>
      lines.push(`  <error${e.source ? ` source="${e.source}"` : ''}>${e.message}</error>`)
    );
    const claudeActions = getRecentActions(tc?.eventLog);
    if (claudeActions.length) {
      lines.push('  <recent-actions note="context only — not a reproduction recipe; use only if needed to understand the UI state">');
      claudeActions.forEach((e, j) => lines.push(`    <action>${j + 1}. ${e.description}</action>`));
      lines.push('  </recent-actions>');
    }
    if (tc?.storeDiff && Object.keys(tc.storeDiff).length > 0) {
      lines.push('  <state-diff>');
      Object.entries(tc.storeDiff).forEach(([k, { before, after }]) =>
        lines.push(`    <change key="${k}" before="${JSON.stringify(before)}" after="${JSON.stringify(after)}" />`)
      );
      lines.push('  </state-diff>');
    }

    // Pins wrapped in <pins> container — each pin is self-contained:
    // annotation text → DOM element → Component (file:line)
    if (hasAnnotations) {
      lines.push('  <pins>');
      claudeEntries.forEach(({ shape, idx: shapeIdx }) => {
        const ctx = shape.elementContext;
        const ann = bug.json_annotations[shapeIdx];
        const pinNum = ann?.index ?? (shapeIdx + 1);
        lines.push(`    <pin index="${pinNum}"${ann?.text ? ` annotation="${ann.text}"` : ''}>`);

        if (ann?.attachments?.length) {
          lines.push('      <attachments>');
          ann.attachments.forEach(att => {
            lines.push(`        <attachment type="${att.type}" url="${att.url}" name="${att.name}" />`);
          });
          lines.push('      </attachments>');
        }

        if (ctx?.selector) {
          lines.push(`      <element>${ctx.selector}</element>`);
        } else if (ann) {
          lines.push(`      <position x="${ann.x}%" y="${ann.y}%" />`);
        }
        if (ctx?.reactComponent) {
          const fp = ctx.reactComponent.filePath
            ? ` file="${ctx.reactComponent.filePath}${ctx.reactComponent.lineNumber ? `:${ctx.reactComponent.lineNumber}` : ''}"`
            : '';
          lines.push(`      <component${fp}>${ctx.reactComponent.name}</component>`);
        }
        if (ctx?.dataSources?.length) lines.push(`      <datasources>${ctx.dataSources.join(', ')}</datasources>`);
        if (ctx?.innerText) lines.push(`      <text>${ctx.innerText}</text>`);
        lines.push('    </pin>');
      });
      lines.push('  </pins>');
    }



    if (bug.image_url) lines.push(`  <screenshot>${bug.image_url}</screenshot>`);
    lines.push('</bug>', '');
  });
  lines.push('</bugs>');
  return lines.join('\n');
}

const FORMATTERS: Record<TemplateId, (bugs: Bug[]) => string> = {
  antigravity: formatAntigravity, claude: formatClaude, cursor: formatCursor, github: formatGitHub,
};

// ── UI helpers ───────────────────────────────────────────────────────────────

const TOOL_OPTIONS: { id: TemplateId; label: string; desc: string }[] = [
  { id: 'antigravity', label: 'Antigravity',   desc: 'Агент виправляє баги по черзі' },
  { id: 'claude',      label: 'Claude Code',   desc: 'Claude у терміналі' },
  { id: 'cursor',      label: 'Cursor',        desc: 'AI-редактор з chat-режимом' },
  { id: 'github',      label: 'GitHub Issue',  desc: 'Структурований звіт для GitHub/Jira' },
];




// ── Dropdown Helper ──────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  open: 'rgba(255, 96, 75, 0.8)',
  in_progress: 'rgba(249, 115, 22, 0.8)',
  resolved: 'rgba(100, 22, 94, 0.8)', // Fallback resolved color, mapped to figma green below
};

const SEVERITY_COLORS: Record<number, string> = {
  1: 'rgba(52, 211, 153, 0.85)',
  2: 'rgba(16, 185, 129, 0.85)',
  3: 'rgba(14, 165, 233, 0.85)',
  4: 'rgba(59, 130, 246, 0.85)',
  5: 'rgba(99, 102, 241, 0.85)',
  6: 'rgba(168, 85, 247, 0.85)',
  7: 'rgba(236, 72, 153, 0.85)',
  8: 'rgba(245, 158, 11, 0.85)',
  9: 'rgba(249, 115, 22, 0.85)',
  10: 'rgba(255, 96, 75, 0.85)',
};

function BulkActionDropdown({ 
  label, 
  type,
  onSelect 
}: { 
  label: string; 
  type: 'status' | 'severity';
  onSelect: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button 
        onClick={() => setOpen(!open)}
        className="flex items-center gap-[6px] text-[12px] font-semibold text-[#5d5d5d] hover:text-[#1f1f1f] hover:bg-black/5 px-[8px] py-[4px] rounded-[6px] transition-colors cursor-pointer"
      >
        {label}
        <ChevronDown size={14} className={`transition-transform text-[#9a9a9a] ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="md:hidden fixed inset-0 z-[150] bg-black/40" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
          {type === 'status' ? (
            <div className="fixed md:absolute bottom-0 md:bottom-auto left-0 right-0 md:right-auto md:top-[calc(100%+4px)] z-[200] w-full md:min-w-[140px] md:w-auto bg-[#1f1f1f] border-t md:border border-[#3f3f46] rounded-t-[20px] md:rounded-[8px] shadow-[0_-8px_30px_rgba(0,0,0,0.5)] md:shadow-xl pt-[24px] pb-[40px] md:py-[4px] px-[16px] md:px-0 flex flex-col gap-[8px] md:gap-0 animate-in slide-in-from-bottom-full md:slide-in-from-top-[10px] duration-200">
              {/* Mobile Drag Handle */}
              <div className="md:hidden w-[40px] h-[4px] bg-[#3f3f46] rounded-full mx-auto mb-[8px]" />
              {STATUS_CFG.map(opt => {
                return (
                  <button
                    key={opt.value}
                    onClick={(e) => { e.stopPropagation(); onSelect(opt.value); setOpen(false); }}
                    className="w-full text-left px-[16px] md:px-[12px] py-[12px] md:py-[6px] text-[14px] md:text-[12px] font-medium text-white hover:bg-[#3f3f46] transition-colors flex items-center gap-[12px] md:gap-[8px] cursor-pointer rounded-[10px] md:rounded-none"
                  >
                    <div className="w-[10px] md:w-[8px] h-[10px] md:h-[8px] rounded-full" style={{ backgroundColor: opt.color }} />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="fixed md:absolute bottom-0 md:bottom-auto left-0 right-0 md:right-auto md:top-[calc(100%+4px)] z-[200] w-full md:w-[148px] bg-[#1f1f1f] border-t md:border border-[#3f3f46] rounded-t-[20px] md:rounded-[10px] shadow-[0_-8px_30px_rgba(0,0,0,0.5)] md:shadow-xl pt-[24px] pb-[40px] md:py-[6px] md:px-[6px] px-[24px] animate-in slide-in-from-bottom-full md:slide-in-from-top-[10px] duration-200">
              {/* Mobile Drag Handle */}
              <div className="md:hidden w-[40px] h-[4px] bg-[#3f3f46] rounded-full mx-auto mb-[16px]" />
              <div className="grid grid-cols-5 md:grid-cols-5 gap-[12px] md:gap-[4px]">
                {Array.from({ length: 10 }, (_, i) => {
                  const num = i + 1;
                  return (
                    <button
                      key={num}
                      onClick={(e) => { e.stopPropagation(); onSelect(num.toString()); setOpen(false); }}
                      className="aspect-square md:w-[24px] md:h-[24px] rounded-[8px] md:rounded-[4px] text-[14px] md:text-[10px] font-bold text-white flex items-center justify-center hover:scale-110 active:scale-90 transition-transform cursor-pointer"
                      style={{ backgroundColor: SEVERITY_COLORS[num] }}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function PromptGenerator({ bugs, selectedIds, onBulkAction }: PromptGeneratorProps) {
  const [copied, setCopied]         = useState(false);
  const [template, setTemplate]     = useState<TemplateId>('antigravity');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const selected = sortBySev(bugs.filter(b => selectedIds.has(b.id)));
  const prompt   = selected.length > 0 ? FORMATTERS[template](selected) : '';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    if (onBulkAction) {
      onBulkAction('status', 'in_progress', true);
    }
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-white md:bg-[#2a2a2a] md:rounded-r-[24px] overflow-hidden md:clip-rounded">
        <div className="flex flex-1 overflow-hidden">
          {/* Main prompt area */}
          <div className="flex-1 flex flex-col min-w-0 bg-transparent rounded-br-[24px] overflow-hidden">
            {/* Bulk Actions Toolbar */}
            {selected.length > 0 && onBulkAction && (
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between px-[16px] md:px-[32px] py-[12px] bg-[#ffffff] border-b border-[#e9e9e9] gap-[12px] md:gap-0">
                <div className="flex items-center bg-[#f4f4f5] rounded-[10px] p-[4px] w-fit max-w-full overflow-x-auto md:overflow-visible custom-scrollbar">
                  <div className="px-[8px] flex items-center gap-[6px] shrink-0">
                    <span className="text-[12px] font-medium text-[#9a9a9a]">Вибрано:</span>
                    <span className="text-[12px] font-bold text-[#1f1f1f] bg-white px-[6px] py-[2px] rounded-[6px]">{selected.length}</span>
                  </div>
                  
                  <div className="w-[1px] h-[16px] bg-[#d4d4d8] mx-[4px]" />
                  
                  <div className="shrink-0">
                    <BulkActionDropdown
                      label="Статус"
                      type="status"
                      onSelect={(v) => onBulkAction('status', v)}
                    />
                  </div>
                  
                  <div className="w-[1px] h-[16px] shrink-0 bg-[#d4d4d8] mx-[4px]" />
                  
                  <div className="shrink-0">
                    <BulkActionDropdown
                      label="Критичність"
                      type="severity"
                      onSelect={(v) => onBulkAction('severity', v)}
                    />
                  </div>
                  
                  <div className="w-[1px] h-[16px] shrink-0 bg-[#d4d4d8] mx-[4px]" />
                  
                  <button 
                    onClick={() => setShowDeleteModal(true)} 
                    className="flex items-center gap-[4px] shrink-0 text-[12px] font-semibold text-red-500/80 hover:text-red-500 hover:bg-red-500/10 px-[8px] py-[4px] rounded-[6px] transition-colors cursor-pointer" 
                    title="Видалити вибрані"
                  >
                    <Trash2 size={14} />
                    <span className="hidden md:inline">Видалити</span>
                  </button>
                </div>
              </div>
            )}

            {/* Template tabs + quality */}
            <div className="h-[48px] md:h-[52px] flex items-center gap-[16px] md:gap-[24px] px-[16px] md:px-[32px] bg-[#ffffff] shrink-0 relative z-20 overflow-x-auto custom-scrollbar border-b-0">
              {TEMPLATES.map(t => (
                <button key={t.id} onClick={() => setTemplate(t.id)}
                  className={`relative shrink-0 flex items-center gap-[8px] h-[52px] text-[13px] font-medium transition-all cursor-pointer ${
                    template === t.id ? 'text-[#1f1f1f]' : 'text-[#9a9a9a] hover:text-[#5d5d5d]'
                  }`}>
                  <span className={template === t.id ? 'text-[#1f1f1f]' : 'text-[#9a9a9a]'}>{t.icon(template === t.id)}</span>
                  {t.label}
                  {template === t.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#1f1f1f] rounded-t-full" />
                  )}
                </button>
              ))}
              {selected.length > 0 && (
                <div className="hidden md:flex ml-auto mt-[4px] md:mt-0 justify-end shrink-0">
                  <button 
                    onClick={handleCopy} 
                    className="flex items-center gap-[6px] text-[13px] font-bold bg-[#1f1f1f] text-white hover:bg-[#2a2a2a] transition-colors cursor-pointer px-[16px] py-[8px] rounded-[10px]"
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    {copied ? 'Скопійовано' : 'Копіювати промпт'}
                  </button>
                </div>
              )}
            </div>

            {/* Prompt textarea / Viewer */}
            <div className="flex-1 overflow-hidden relative bg-[#2a2a2a] md:rounded-br-[24px] md:clip-rounded border-t border-[#3f3f46]">
              {selected.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-[#9a9a9a] font-medium text-[14px] bg-[#2a2a2a] md:rounded-br-[24px] text-center px-4">
                  Оберіть баги зі списку ліворуч — промпт згенерується автоматично...
                </div>
              ) : (
                <div className="w-full h-full font-mono text-[13px] leading-relaxed bg-[#2a2a2a] p-[16px] pb-[80px] md:pb-[32px] md:p-[32px] text-white/90 overflow-y-auto custom-scrollbar whitespace-pre-wrap select-text rounded-br-[24px]">
                  {(() => {
                    let inIntro = true;
                    return prompt.split('\n').map((line, i) => {
                      if (line.match(/^## Bugs/i) || line.match(/^<bugs>/i) || line.match(/^(###|##|---) Bug "/i) || line.match(/^<bug /i)) {
                        inIntro = false;
                      }

                      if (inIntro) {
                        let className = "text-[#71717a]"; // Intro color: dark grey
                        if (line.startsWith('# ')) className = "text-white font-bold text-[14px] mt-2";
                        return <div key={i} className={className}>{line || ' '}</div>;
                      }

                      let className = "text-[#d4d4d8]"; // Default light gray
                      
                      if (line.match(/^\s*(-\s\*\*)?Pin #\d+(:|\*\*:)|\s*<pin /i)) {
                        className = "text-[#fef08a] font-black text-[14px] bg-[#eab308]/20 px-[6px] py-[2px] rounded inline-block mt-1 mb-1 shadow-sm"; 
                      }
                      else if (line.match(/^#{1,3}\s/)) className = "text-white font-bold text-[14px] mt-2";
                      else if (line.match(/Bug "/i) || line.match(/^<bug /i) || line.match(/^<\/bug>/i)) className = "text-[#f87171] font-bold text-[14px] mt-2";
                      else if (line.match(/(Severity:|\[Severity:)/i)) className = "text-[#fb923c] font-bold";
                      else if (line.match(/(Route:|Viewport:|<route>|<viewport>)/i)) className = "text-[#60a5fa]";
                      else if (line.match(/(Error|Console errors:|<error)/i)) className = "text-[#ef4444]";
                      else if (line.match(/(Network|→|<network>)/i)) className = "text-[#38bdf8]";
                      else if (line.match(/(State changes:|State:|<state-diff>)/i)) className = "text-[#a78bfa]";
                      else if (line.match(/(Component:|Element:|<component>|<element>)/i)) className = "text-[#86efac] font-mono";
                      else if (line.match(/(Position:|Text content:|aria-label:)/i)) className = "text-[#a3e635]";
                      else if (line.match(/(Request body:|Response:|Body:)/i)) className = "text-[#f472b6]";
                      else if (line.match(/(Screenshot:|!\[Screenshot\]|<screenshot>)/i)) className = "text-[#c084fc]";
                      else if (line.match(/^<[\w-]+.*>$/) || line.match(/^<\/[\w-]+>$/)) className = "text-[#5eead4]";
                      else if (line.includes('`')) className = "text-[#93c5fd]";
                      else if (line.match(/^\|.*\|$/)) className = "text-[#94a3b8] font-mono";

                      return <div key={i} className={className}>{line || ' '}</div>;
                    });
                  })()}
                </div>
              )}
            </div>
          </div>
          
          {/* Mobile Floating Copy Button */}
          {selected.length > 0 && (
            <div className="md:hidden fixed bottom-[24px] left-[50%] -translate-x-1/2 z-[100] w-[calc(100%-32px)]">
              <button 
                onClick={handleCopy} 
                className="w-full flex items-center justify-center gap-[8px] h-[48px] bg-[#1f1f1f] text-white rounded-[12px] shadow-[0_8px_30px_rgba(0,0,0,0.2)] text-[15px] font-bold hover:scale-[1.02] active:scale-[0.98] transition-transform"
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
                {copied ? 'Скопійовано' : 'Копіювати промпт'}
              </button>
            </div>
          )}
        </div>

        <Dialog
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Підтвердження видалення"
          size="sm"
        >
          <div className="flex flex-col gap-4">
            <p className="text-[14px] text-[#5d5d5d]">
              Ви впевнені, що хочете видалити обрані баги ({selected.length})? Цю дію неможливо скасувати.
            </p>
            <div className="flex justify-end gap-[8px] mt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-[16px] py-[8px] text-[13px] font-medium text-[#5d5d5d] hover:text-[#1f1f1f] hover:bg-[#f4f4f5] rounded-[8px] transition-colors cursor-pointer"
              >
                Скасувати
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  onBulkAction && onBulkAction('delete');
                }}
                className="px-[16px] py-[8px] text-[13px] font-bold text-white bg-red-500 hover:bg-red-600 rounded-[8px] transition-colors cursor-pointer"
              >
                Видалити
              </button>
            </div>
          </div>
        </Dialog>
      </div>
  );
}
