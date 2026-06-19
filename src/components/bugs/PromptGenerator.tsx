'use client';
import { useState, useRef, useEffect } from 'react';
import { Bug, BugStatus, BugSeverity, TechContext } from '@/lib/types';
import { STATUS_CFG, SEVERITY_CFG } from '@/lib/constants';
import { Sparkles, Copy, Check, Code, Terminal, MessageSquare, Bot, Trash2, ChevronDown } from 'lucide-react';

interface PromptGeneratorProps {
  bugs: Bug[];
  selectedIds: Set<string>;
  onBulkAction?: (action: 'delete' | 'status' | 'severity', value?: string) => void;
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
    const attachmentsText = ann?.attachments?.length ? ` [Attachments: ${ann.attachments.map(a => a.url).join(', ')}]` : '';
    const label = ann?.text ? `"${ann.text}"${attachmentsText}` : `Pin ${pinNum}${attachmentsText}`;
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
    const sev = bug.severity ?? '1';
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
        
        const attachmentsMd = ann?.attachments?.length 
          ? ' ' + ann.attachments.map(att => att.type.startsWith('image/') ? `![${att.name}](${att.url})` : `[${att.name}](${att.url})`).join(' ')
          : '';
          
        const note = ann?.text ? ` — "${ann.text}"` : '';
        const finalNote = note + attachmentsMd;
        
        if (ctx?.selector) {
          lines.push(`Pin #${pinNum} on \`${ctx.selector}\`${finalNote}`);
          if (ctx.reactComponent?.filePath) {
            lines.push(`→ \`${ctx.reactComponent.name}\` in \`${ctx.reactComponent.filePath}${ctx.reactComponent.lineNumber ? `:${ctx.reactComponent.lineNumber}` : ''}\``);
          }
          if (ctx.dataSources?.length) {
            lines.push(`→ Data: \`${ctx.dataSources.join('`, `')}\``);
          }
        } else if (ann) {
          lines.push(`Pin #${pinNum} at ${ann.x}%×${ann.y}%${finalNote}`);
        } else {
          lines.push(`Pin #${pinNum}${finalNote}`);
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
    const sev = bug.severity ?? '1';
    lines.push(`### Bug ${i + 1} [${sev}]`);
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
    lines.push(`--- Bug ${i + 1}/${sorted.length} [${bug.severity ?? '1'}] ---`);
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
    lines.push(`<bug index="${i + 1}" severity="${bug.severity ?? '1'}">`);
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
      
      if (ann?.attachments?.length) {
        lines.push(`    <attachments>`);
        ann.attachments.forEach(att => {
          lines.push(`      <attachment type="${att.type}" url="${att.url}" name="${att.name}" />`);
        });
        lines.push(`    </attachments>`);
      }

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

function ActionDropdown({ 
  label, 
  options, 
  onSelect 
}: { 
  label: React.ReactNode; 
  options: { value: string, label: string }[]; 
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
        <div className="absolute top-[calc(100%+4px)] left-0 z-[100] min-w-[140px] bg-white border border-[#e9e9e9] rounded-[12px] shadow-[0_10px_30px_rgba(0,0,0,0.08)] py-[6px] animate-in fade-in zoom-in-95 duration-200">
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onSelect(opt.value); setOpen(false); }}
              className="w-full text-left px-[12px] py-[8px] text-[12px] font-medium text-[#1f1f1f] hover:bg-[#f4f4f5] transition-colors cursor-pointer"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function PromptGenerator({ bugs, selectedIds, onBulkAction }: PromptGeneratorProps) {
  const [copied, setCopied]         = useState(false);
  const [template, setTemplate]     = useState<TemplateId>('antigravity');

  const selected = sortBySev(bugs.filter(b => selectedIds.has(b.id)));
  const prompt   = selected.length > 0 ? FORMATTERS[template](selected) : '';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#2a2a2a] rounded-r-[24px] overflow-hidden clip-rounded">
        <div className="flex flex-1 overflow-hidden">
          {/* Main prompt area */}
          <div className="flex-1 flex flex-col min-w-0 bg-transparent rounded-br-[24px] overflow-hidden">
            {/* Bulk Actions Toolbar */}
            {selected.length > 0 && onBulkAction && (
              <div className="flex items-center justify-between px-[32px] py-[12px] bg-[#ffffff] border-b border-[#e9e9e9]">
                <div className="flex items-center bg-[#f4f4f5] rounded-[10px] p-[4px]">
                  <div className="px-[8px] flex items-center gap-[6px]">
                    <span className="text-[12px] font-medium text-[#9a9a9a]">Вибрано:</span>
                    <span className="text-[12px] font-bold text-[#1f1f1f] bg-white px-[6px] py-[2px] rounded-[6px] shadow-sm">{selected.length}</span>
                  </div>
                  
                  <div className="w-[1px] h-[16px] bg-[#d4d4d8] mx-[4px]" />
                  
                  <ActionDropdown
                    label="Статус"
                    options={STATUS_CFG}
                    onSelect={(v) => onBulkAction('status', v)}
                  />
                  
                  <div className="w-[1px] h-[16px] bg-[#d4d4d8] mx-[4px]" />
                  
                  <ActionDropdown
                    label="Пріоритет"
                    options={SEVERITY_CFG}
                    onSelect={(v) => onBulkAction('severity', v)}
                  />
                  
                  <div className="w-[1px] h-[16px] bg-[#d4d4d8] mx-[4px]" />
                  
                  <button 
                    onClick={() => onBulkAction('delete')} 
                    className="flex items-center gap-[4px] text-[12px] font-semibold text-red-500/80 hover:text-red-500 hover:bg-red-500/10 px-[8px] py-[4px] rounded-[6px] transition-colors cursor-pointer" 
                    title="Видалити вибрані"
                  >
                    <Trash2 size={14} />
                    Видалити
                  </button>
                </div>
              </div>
            )}

            {/* Template tabs + quality */}
            <div className="h-[52px] flex items-center gap-[24px] px-[32px] border-b border-[#e9e9e9] bg-[#ffffff] shrink-0 relative z-20">
              {TEMPLATES.map(t => (
                <button key={t.id} onClick={() => setTemplate(t.id)}
                  className={`relative flex items-center gap-[8px] h-[52px] text-[13px] font-medium transition-all cursor-pointer ${
                    template === t.id ? 'text-[#1f1f1f]' : 'text-[#9a9a9a] hover:text-[#5d5d5d]'
                  }`}>
                  <span className={template === t.id ? 'text-[#1f1f1f]' : 'text-[#9a9a9a]'}>{t.icon(template === t.id)}</span>
                  {t.label}
                  {template === t.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#1f1f1f] rounded-t-full" />
                  )}
                </button>
              ))}
              {selected.length > 0 && (
                <div className="ml-auto">
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
            <div className="flex-1 overflow-hidden relative bg-[#2a2a2a] rounded-br-[24px] clip-rounded border-l border-t border-[#3f3f46]">
              {selected.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-[#9a9a9a] font-medium text-[14px] bg-[#2a2a2a] rounded-br-[24px]">
                  Оберіть баги зі списку ліворуч — промпт згенерується автоматично...
                </div>
              ) : (
                <div className="w-full h-full font-mono text-[13px] leading-relaxed bg-[#2a2a2a] p-[32px] text-white/90 overflow-y-auto custom-scrollbar whitespace-pre-wrap select-text rounded-br-[24px]">
                  {prompt.split('\n').map((line, i) => {
                    let className = "text-white/90";
                    if (line.startsWith('#')) className = "text-white font-bold";
                    else if (line.match(/^<[\w-]+.*>$/) || line.match(/^<\/[\w-]+>$/)) className = "text-[#2dd4bf]";
                    else if (line.startsWith('- ') || line.match(/^\d+\./)) className = "text-[#38bdf8]";
                    else if (line.includes('→')) className = "text-[#c084fc]";
                    else if (line.match(/\[(CRITICAL|HIGH|MEDIUM|LOW)\]/i) || line.match(/\| \*\*(Severity)\*\* \|/)) className = "text-[#fb923c] font-semibold";
                    else if (line.includes('`')) className = "text-[#fcd34d]";

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
