'use client';
import { useState } from 'react';
import { Bug, BugStatus, BugSeverity, TechContext } from '@/lib/types';
import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import { Sparkles, Copy, Check, Image as ImageIcon } from 'lucide-react';

interface PromptGeneratorProps {
  bugs: Bug[];
  selectedIds: Set<string>;
  onSelectedIdsChange: (ids: Set<string>) => void;
  onStatusChange?: (id: string, status: BugStatus) => void;
}

type TemplateId = 'github' | 'antigravity' | 'cursor' | 'claude' | 'generic';

const TEMPLATES: { id: TemplateId; label: string }[] = [
  { id: 'github',      label: 'GitHub Issue' },
  { id: 'antigravity', label: 'Antigravity' },
  { id: 'cursor',      label: 'Cursor' },
  { id: 'claude',      label: 'Claude Code' },
  { id: 'generic',     label: 'Generic' },
];

const SEV_ORDER: Record<BugSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const SEV_COLOR: Record<BugSeverity, string> = { critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#9a9a9a' };

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
    const hasDataSrc = bug.json_shapes?.some(s => s.type === 'pin' && s.elementContext?.dataSources?.length);
    const hasFilePath = tc?.component?.filePath || bug.json_shapes?.some(s => s.elementContext?.reactComponent?.filePath);
    const hasNetOrConsole = (tc?.networkRequests?.some(r => r.isError) || tc?.consoleErrors?.some(e => e.level === 'error'));
    const hasStoreDiff = tc?.storeDiff && Object.keys(tc.storeDiff).length > 0;

    const factors: QualityFactor[] = [
      { label: 'Опис',              points: 20, earned: bug.description ? 20 : 0 },
      { label: 'Скріншот',          points: 20, earned: bug.image_url    ? 20 : 0 },
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
  const pins = jsonShapes.filter(s => s.type === 'pin' && s.elementContext);
  if (pins.length === 0) return '';

  const lines: string[] = ['Pin element context:'];
  pins.forEach((pin, i) => {
    const ctx = pin.elementContext!;
    const ann = annotations[i];
    const label = ann?.text ? `"${ann.text}"` : `Pin ${i + 1}`;
    lines.push(`  ${label}:`);
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
  });
  return lines.join('\n');
}

// ── GitHub Issue template ────────────────────────────────────────────────────

function formatGitHub(bugs: Bug[]): string {
  const sorted = sortBySev(bugs);
  return sorted.map((bug, i) => {
    const tc = bug.tech_context;
    const sev = (bug.severity ?? 'low').toUpperCase();
    const pins = (bug.json_shapes ?? []).filter(s => s.type === 'pin' && s.elementContext);
    const netErrors = tc?.networkRequests?.filter(r => r.isError) ?? [];
    const consoleErrors = tc?.consoleErrors?.filter(e => e.level === 'error') ?? [];

    // Primary component: prefer pin's reactComponent, fall back to tc.component
    const primaryComp = pins[0]?.elementContext?.reactComponent ?? tc?.component;
    const compLine = primaryComp
      ? `**Component:** \`${primaryComp.name}\`${primaryComp.filePath ? ` (\`${primaryComp.filePath}${primaryComp.lineNumber ? `:${primaryComp.lineNumber}` : ''}\`)` : ''}`
      : null;

    const lines: string[] = [
      `## Bug Report #${i + 1}: ${bug.description || 'Без опису'}`,
      '',
    ];

    // Meta table
    lines.push('| | |', '|---|---|');
    lines.push(`| **Severity** | ${sev} |`);
    if (tc?.route) lines.push(`| **Route** | \`${tc.route}\` |`);
    if (tc?.viewport) lines.push(`| **Viewport** | ${tc.viewport} |`);
    if (compLine) lines.push(`| **Component** | \`${primaryComp!.name}\` |`);
    lines.push('');

    // Element / Pin context
    if (pins.length > 0) {
      lines.push('### Element');
      pins.forEach((pin, j) => {
        const ctx = pin.elementContext!;
        const ann = bug.json_annotations[j];
        const note = ann?.text ? ` — "${ann.text}"` : '';
        lines.push(`Pin #${j + 1} on \`${ctx.selector}\`${note}`);
        if (ctx.reactComponent?.filePath) {
          lines.push(`→ \`${ctx.reactComponent.name}\` in \`${ctx.reactComponent.filePath}${ctx.reactComponent.lineNumber ? `:${ctx.reactComponent.lineNumber}` : ''}\``);
        }
        if (ctx.dataSources?.length) {
          lines.push(`→ Data: \`${ctx.dataSources.join('`, `')}\``);
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
    '- If unsure — ask, do not guess', '',
    `## Bugs (${sorted.length})`, '',
  ];
  sorted.forEach((bug, i) => {
    const sev = bug.severity ?? 'low';
    lines.push(`### Bug ${i + 1} [${sev.toUpperCase()}]`);
    if (bug.description) lines.push(`Description: ${bug.description}`);
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
  const lines = [`Fix ${sorted.length} bug${sorted.length > 1 ? 's' : ''} one at a time.`, ''];
  sorted.forEach((bug, i) => {
    lines.push(`--- Bug ${i + 1}/${sorted.length} [${bug.severity ?? 'low'}] ---`);
    if (bug.description) lines.push(bug.description);
    const tc = bug.tech_context;
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
    '- Ask if unsure', '</rules>', '', '<bugs>',
  ];
  sorted.forEach((bug, i) => {
    lines.push(`<bug index="${i + 1}" severity="${bug.severity ?? 'low'}">`);
    if (bug.description) lines.push(`  <description>${bug.description}</description>`);
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
    // Pin element context
    const pins = (bug.json_shapes ?? []).filter(s => s.type === 'pin' && s.elementContext);
    pins.forEach((pin, j) => {
      const ctx = pin.elementContext!;
      const ann = bug.json_annotations[j];
      lines.push(`  <pin index="${j + 1}"${ann?.text ? ` annotation="${ann.text}"` : ''}>`);
      lines.push(`    <element>${ctx.selector}</element>`);
      if (ctx.reactComponent) {
        const fp = ctx.reactComponent.filePath ? ` file="${ctx.reactComponent.filePath}${ctx.reactComponent.lineNumber ? `:${ctx.reactComponent.lineNumber}` : ''}"` : '';
        lines.push(`    <component${fp}>${ctx.reactComponent.name}</component>`);
      }
      if (ctx.dataSources?.length) lines.push(`    <datasources>${ctx.dataSources.join(', ')}</datasources>`);
      if (ctx.innerText) lines.push(`    <text>${ctx.innerText}</text>`);
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
    if (bug.description) lines.push(`Description: ${bug.description}`);
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

function Onboarding({ onConfirm }: { onConfirm: (template: TemplateId) => void }) {
  const [choice, setChoice] = useState<TemplateId>('github');
  return (
    <div className="flex flex-col gap-[20px] py-[8px]">
      <div>
        <p className="text-[13px] font-semibold text-[#1f1f1f] mb-[4px]">Який формат використовувати?</p>
        <p className="text-[12px] text-[#9a9a9a]">Промпт адаптується під стиль і можливості кожного.</p>
      </div>
      <div className="flex flex-col gap-[8px]">
        {TOOL_OPTIONS.map(opt => (
          <button
            key={opt.id}
            onClick={() => setChoice(opt.id)}
            className={`flex items-center gap-[12px] px-[14px] py-[12px] rounded-[12px] border-2 text-left transition-colors ${choice === opt.id ? 'border-[#1f1f1f] bg-[#f9f9f9]' : 'border-[#e9e9e9] hover:border-[#cfcfcf]'}`}
          >
            <div className={`w-[16px] h-[16px] rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${choice === opt.id ? 'border-[#1f1f1f]' : 'border-[#d1d5db]'}`}>
              {choice === opt.id && <div className="w-[8px] h-[8px] rounded-full bg-[#1f1f1f]" />}
            </div>
            <div>
              <div className="text-[13px] font-bold text-[#1f1f1f]">{opt.label}</div>
              <div className="text-[11px] text-[#9a9a9a]">{opt.desc}</div>
            </div>
          </button>
        ))}
      </div>
      <button
        onClick={() => onConfirm(choice)}
        className="w-full py-[12px] rounded-[12px] bg-[#1f1f1f] text-white text-[13px] font-bold hover:bg-[#303030] transition-colors"
      >
        Далі →
      </button>
    </div>
  );
}

// ── Quality Score bar ────────────────────────────────────────────────────────

function QualityBar({ score, hint, factors }: { score: number; hint: string; factors: ReturnType<typeof calcQuality>['factors'] }) {
  const [showDetails, setShowDetails] = useState(false);
  const color = score >= 80 ? '#10b981' : score >= 50 ? '#f97316' : '#ef4444';

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetails(v => !v)}
        className="flex items-center gap-[8px] hover:opacity-80 transition-opacity"
        title="Деталі якості промпту"
      >
        <div className="w-[60px] h-[3px] bg-[#e9e9e9] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: color }} />
        </div>
        <span className="text-[11px] font-bold" style={{ color }}>{score}/100</span>
        {hint && <span className="text-[10px] text-[#f97316]">{hint}</span>}
      </button>

      {showDetails && (
        <div className="absolute right-0 top-[22px] z-10 bg-white border border-[#e9e9e9] rounded-[12px] shadow-lg p-[12px] w-[220px]">
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

export default function PromptGenerator({ bugs, selectedIds, onSelectedIdsChange, onStatusChange }: PromptGeneratorProps) {
  const [open, setOpen]             = useState(false);
  const [onboarded, setOnboarded]   = useState(false);
  const [copied, setCopied]         = useState(false);
  const [template, setTemplate]     = useState<TemplateId>('github');
  const [markedDone, setMarkedDone] = useState(false);
  const [previewBug, setPreviewBug] = useState<Bug | null>(null);

  const selected = sortBySev(bugs.filter(b => selectedIds.has(b.id)));
  const prompt   = selected.length > 0 ? FORMATTERS[template](selected) : '';
  const { score, hint, factors } = calcQuality(selected);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMarkResolved = () => {
    if (!onStatusChange) return;
    selectedIds.forEach(id => onStatusChange(id, 'resolved'));
    setMarkedDone(true);
    onSelectedIdsChange(new Set());
  };

  const toggleBug = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    onSelectedIdsChange(next);
  };

  const handleOpen = () => {
    setMarkedDone(false);
    setOnboarded(false);
    setOpen(true);
  };

  // Bug to show screenshot preview for (first selected with image)
  const previewTarget = previewBug ?? selected.find(b => b.image_url) ?? null;

  return (
    <>
      <Button style="secondary" size="lg" icon={Sparkles} onClick={handleOpen}>
        Промпт {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
      </Button>

      <Dialog isOpen={open} onClose={() => setOpen(false)} title={onboarded ? 'Генератор промпту' : 'Формат промпту'} size={onboarded ? 'xl' : 'sm'}>
        {!onboarded ? (
          <Onboarding onConfirm={(t) => { setTemplate(t); setOnboarded(true); }} />
        ) : (
        <div className="flex gap-0 h-[580px] -mx-[24px] -mb-[24px] overflow-hidden rounded-b-[20px]">

          {/* LEFT — bug list */}
          <div className="w-[260px] shrink-0 border-r border-[#e9e9e9] flex flex-col">
            <div className="flex items-center justify-between px-[14px] py-[10px] border-b border-[#e9e9e9]">
              <span className="text-[11px] font-bold text-[#9a9a9a] uppercase tracking-wider">
                Баги ({bugs.length})
              </span>
              <div className="flex gap-[10px]">
                <button onClick={() => onSelectedIdsChange(new Set(bugs.map(b => b.id)))} className="text-[11px] text-[#6366f1] hover:underline font-bold">Всі</button>
                <button onClick={() => onSelectedIdsChange(new Set())} className="text-[11px] text-[#9a9a9a] hover:underline">Зняти</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {bugs.length === 0 ? (
                <div className="flex items-center justify-center h-full text-[12px] text-[#9a9a9a]">Багів немає</div>
              ) : (
                bugs.map(bug => {
                  const isSelected = selectedIds.has(bug.id);
                  const sev = (bug.severity ?? 'low') as BugSeverity;
                  return (
                    <div key={bug.id} className={`w-full border-b border-[#f4f4f5] transition-colors ${isSelected ? 'bg-[#eef2ff]' : 'hover:bg-[#f9f9f9]'}`}>
                      <div className="flex items-start gap-[8px] px-[14px] py-[10px]">
                        <button
                          onClick={() => toggleBug(bug.id)}
                          className={`mt-[2px] w-[16px] h-[16px] rounded-[4px] border-2 shrink-0 flex items-center justify-center transition-colors ${isSelected ? 'bg-[#6366f1] border-[#6366f1]' : 'border-[#d1d5db]'}`}
                        >
                          {isSelected && <Check size={10} color="white" strokeWidth={3} />}
                        </button>
                        <div className="flex flex-col gap-[2px] min-w-0 flex-1">
                          <button onClick={() => toggleBug(bug.id)} className="text-left text-[12px] font-semibold text-[#1f1f1f] truncate leading-tight">
                            {bug.description || 'Без опису'}
                          </button>
                          <div className="flex items-center gap-[6px]">
                            <span className="text-[10px] font-bold" style={{ color: SEV_COLOR[sev] }}>{sev}</span>
                            <span className="text-[10px] text-[#9a9a9a]">·</span>
                            <span className="text-[10px] text-[#9a9a9a]">{STATUS_LABEL[bug.status] ?? bug.status}</span>
                          </div>
                        </div>
                        {/* Screenshot preview toggle */}
                        {bug.image_url && (
                          <button
                            onClick={() => setPreviewBug(prev => prev?.id === bug.id ? null : bug)}
                            title="Переглянути скріншот"
                            className={`shrink-0 w-[22px] h-[22px] rounded-[5px] flex items-center justify-center transition-colors ${previewBug?.id === bug.id ? 'bg-[#6366f1] text-white' : 'text-[#cfcfcf] hover:bg-[#f4f4f5] hover:text-[#6366f1]'}`}
                          >
                            <ImageIcon size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT — prompt + optional screenshot preview */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Template tabs + quality */}
            <div className="flex items-center gap-[4px] px-[14px] py-[10px] border-b border-[#e9e9e9] flex-wrap">
              {TEMPLATES.map(t => (
                <button key={t.id} onClick={() => setTemplate(t.id)}
                  className={`px-[10px] py-[5px] rounded-[8px] text-[11px] font-bold transition-colors ${template === t.id ? 'bg-[#1f1f1f] text-white' : 'text-[#9a9a9a] hover:bg-[#f4f4f5] hover:text-[#1f1f1f]'}`}>
                  {t.label}
                </button>
              ))}
              {selected.length > 0 && (
                <div className="ml-auto">
                  <QualityBar score={score} hint={hint} factors={factors} />
                </div>
              )}
            </div>

            {/* Screenshot preview strip (when active) */}
            {previewTarget?.image_url && (
              <div className="border-b border-[#e9e9e9] bg-[#f9f9f9] px-[14px] py-[10px] flex gap-[10px] items-start">
                <img
                  src={previewTarget.image_url}
                  alt="Screenshot preview"
                  className="max-h-[100px] max-w-[200px] object-contain rounded-[6px] border border-[#e9e9e9] shrink-0"
                />
                <div className="flex flex-col gap-[4px] min-w-0">
                  <div className="text-[10px] font-bold text-[#9a9a9a] uppercase tracking-wider">Screenshot</div>
                  <p className="text-[11px] text-[#1f1f1f] truncate">{previewTarget.description || 'Без опису'}</p>
                  <code className="text-[10px] font-mono text-[#6366f1] break-all leading-relaxed line-clamp-2">
                    {previewTarget.image_url}
                  </code>
                </div>
              </div>
            )}

            {/* Prompt textarea */}
            <div className="flex-1 overflow-hidden p-[14px]">
              <textarea
                readOnly
                value={selected.length === 0
                  ? 'Оберіть баги зліва — промпт згенерується автоматично...'
                  : prompt}
                className="w-full h-full resize-none font-mono text-[11px] leading-relaxed bg-[#f9f9f9] border border-[#e9e9e9] rounded-[12px] p-[14px] text-[#1f1f1f] outline-none"
              />
            </div>

            {/* Footer */}
            <div className="flex items-center gap-[8px] px-[14px] pb-[14px]">
              <span className="text-[12px] text-[#9a9a9a] mr-auto">
                <strong className="text-[#1f1f1f]">{selected.length}</strong> вибрано · за severity
              </span>
              {onStatusChange && selected.length > 0 && !markedDone && (
                <Button style="secondary" size="md" onClick={handleMarkResolved}>Закрити вибрані</Button>
              )}
              {markedDone && (
                <span className="flex items-center gap-[6px] text-[12px] font-bold text-[#10b981]">
                  <Check size={13} /> Закрито
                </span>
              )}
              <Button style="primary" size="md" icon={copied ? Check : Copy} onClick={handleCopy} disabled={selected.length === 0}>
                {copied ? 'Скопійовано!' : 'Копіювати'}
              </Button>
            </div>
          </div>

        </div>
        )}
      </Dialog>
    </>
  );
}
