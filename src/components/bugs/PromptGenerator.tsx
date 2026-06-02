'use client';
import { useState } from 'react';
import { Bug, BugStatus, BugSeverity, TechContext } from '@/lib/types';
import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import { Sparkles, Copy, Check } from 'lucide-react';

interface PromptGeneratorProps {
  bugs: Bug[];
  selectedIds: Set<string>;
  onSelectedIdsChange: (ids: Set<string>) => void;
  onStatusChange?: (id: string, status: BugStatus) => void;
}

type TemplateId = 'antigravity' | 'cursor' | 'claude' | 'generic';

const TEMPLATES: { id: TemplateId; label: string }[] = [
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

function techSummary(tc: TechContext | null): string {
  if (!tc) return '';
  const lines: string[] = [];
  if (tc.component) {
    lines.push(`Component: ${tc.component.name}`);
    if (tc.component.props && Object.keys(tc.component.props).length)
      lines.push(`Props: ${JSON.stringify(tc.component.props)}`);
  }
  if (tc.route) lines.push(`Route: ${tc.route}`);
  if (tc.viewport) lines.push(`Viewport: ${tc.viewport}`);
  const netErr = tc.networkRequests?.filter(r => r.isError) ?? [];
  if (netErr.length) {
    lines.push('Network errors:');
    netErr.forEach(r => lines.push(`  ${r.method} ${r.url} → ${r.status}`));
  }
  const consoleErr = tc.consoleErrors?.filter(e => e.level === 'error') ?? [];
  if (consoleErr.length) {
    lines.push('Console errors:');
    consoleErr.forEach(e => lines.push(`  ${e.message}${e.source ? ` [${e.source}]` : ''}`));
  }
  if (tc.eventLog?.length) {
    lines.push('Steps to reproduce:');
    tc.eventLog.forEach((e, i) => lines.push(`  ${i + 1}. ${e.description}`));
  }
  return lines.join('\n');
}

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
    if (tc?.component) lines.push(`@ ${tc.component.name}${tc.route ? ` (${tc.route})` : ''}`);
    tc?.networkRequests?.filter(r => r.isError).forEach(r => lines.push(`Network: ${r.method} ${r.url} → ${r.status}`));
    tc?.consoleErrors?.filter(e => e.level === 'error').forEach(e => lines.push(`Error: ${e.message}`));
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
    if (tc?.component) lines.push(`  <component>${tc.component.name}</component>`);
    if (tc?.route) lines.push(`  <route>${tc.route}</route>`);
    tc?.networkRequests?.filter(r => r.isError).forEach(r => lines.push(`  <network>${r.method} ${r.url} → ${r.status}</network>`));
    tc?.consoleErrors?.filter(e => e.level === 'error').forEach(e => lines.push(`  <error>${e.message}</error>`));
    tc?.eventLog?.forEach((e, j) => lines.push(`  <step>${j + 1}. ${e.description}</step>`));
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
    if (bug.image_url) lines.push(`Screenshot: ${bug.image_url}`);
    lines.push('');
  });
  return lines.join('\n');
}

const FORMATTERS: Record<TemplateId, (bugs: Bug[]) => string> = {
  antigravity: formatAntigravity, cursor: formatCursor, claude: formatClaude, generic: formatGeneric,
};

function calcQuality(bugs: Bug[]): { score: number; hint: string } {
  let score = 100;
  const hints: string[] = [];
  const noDesc = bugs.filter(b => !b.description).length;
  if (noDesc) { score -= noDesc * 10; hints.push(`${noDesc} без опису`); }
  const noTc = bugs.filter(b => !b.tech_context).length;
  if (noTc) { score -= noTc * 15; hints.push(`${noTc} без tech context`); }
  return { score: Math.max(0, score), hint: hints[0] ?? '' };
}

const STATUS_LABEL: Record<string, string> = {
  open: 'Новий', in_progress: 'В роботі', resolved: 'Виправлено', closed: 'Закрито',
};

const TOOL_OPTIONS: { id: TemplateId; label: string; desc: string }[] = [
  { id: 'antigravity', label: 'Antigravity', desc: 'Агент виправляє баги по черзі' },
  { id: 'cursor',      label: 'Cursor',      desc: 'AI-редактор з chat-режимом' },
  { id: 'claude',      label: 'Claude Code', desc: 'Claude у терміналі' },
  { id: 'generic',     label: 'Інший',       desc: 'Будь-який AI асистент' },
];

function Onboarding({ onConfirm }: { onConfirm: (template: TemplateId) => void }) {
  const [choice, setChoice] = useState<TemplateId>('antigravity');
  return (
    <div className="flex flex-col gap-[20px] py-[8px]">
      <div>
        <p className="text-[13px] font-semibold text-[#1f1f1f] mb-[4px]">Який AI інструмент будеш використовувати?</p>
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

export default function PromptGenerator({ bugs, selectedIds, onSelectedIdsChange, onStatusChange }: PromptGeneratorProps) {
  const [open, setOpen]         = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [copied, setCopied]     = useState(false);
  const [template, setTemplate] = useState<TemplateId>('antigravity');
  const [markedDone, setMarkedDone] = useState(false);

  const selected = sortBySev(bugs.filter(b => selectedIds.has(b.id)));
  const prompt   = selected.length > 0 ? FORMATTERS[template](selected) : '';
  const { score, hint } = calcQuality(selected);

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
    setOnboarded(false); // reset onboarding each time
    setOpen(true);
  };

  return (
    <>
      <Button style="secondary" size="lg" icon={Sparkles} onClick={handleOpen}>
        Промпт {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
      </Button>

      <Dialog isOpen={open} onClose={() => setOpen(false)} title={onboarded ? 'Генератор промпту' : 'Налаштування промпту'} size={onboarded ? 'xl' : 'sm'}>
        {!onboarded ? (
          <Onboarding onConfirm={(t) => { setTemplate(t); setOnboarded(true); }} />
        ) : (
        <div className="flex gap-0 h-[560px] -mx-[24px] -mb-[24px] overflow-hidden rounded-b-[20px]">

          {/* LEFT — bug list */}
          <div className="w-[280px] shrink-0 border-r border-[#e9e9e9] flex flex-col">
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
                    <button
                      key={bug.id}
                      onClick={() => toggleBug(bug.id)}
                      className={`w-full text-left px-[14px] py-[10px] border-b border-[#f4f4f5] transition-colors flex items-start gap-[10px] ${isSelected ? 'bg-[#eef2ff]' : 'hover:bg-[#f9f9f9]'}`}
                    >
                      <div className={`mt-[2px] w-[16px] h-[16px] rounded-[4px] border-2 shrink-0 flex items-center justify-center transition-colors ${isSelected ? 'bg-[#6366f1] border-[#6366f1]' : 'border-[#d1d5db]'}`}>
                        {isSelected && <Check size={10} color="white" strokeWidth={3} />}
                      </div>
                      <div className="flex flex-col gap-[2px] min-w-0">
                        <div className="text-[12px] font-semibold text-[#1f1f1f] truncate leading-tight">
                          {bug.description || 'Без опису'}
                        </div>
                        <div className="flex items-center gap-[6px]">
                          <span className="text-[10px] font-bold" style={{ color: SEV_COLOR[sev] }}>{sev}</span>
                          <span className="text-[10px] text-[#9a9a9a]">·</span>
                          <span className="text-[10px] text-[#9a9a9a]">{STATUS_LABEL[bug.status] ?? bug.status}</span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT — prompt */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Template tabs + quality */}
            <div className="flex items-center gap-[4px] px-[14px] py-[10px] border-b border-[#e9e9e9]">
              {TEMPLATES.map(t => (
                <button key={t.id} onClick={() => setTemplate(t.id)}
                  className={`px-[10px] py-[5px] rounded-[8px] text-[11px] font-bold transition-colors ${template === t.id ? 'bg-[#1f1f1f] text-white' : 'text-[#9a9a9a] hover:bg-[#f4f4f5] hover:text-[#1f1f1f]'}`}>
                  {t.label}
                </button>
              ))}
              {selected.length > 0 && (
                <div className="ml-auto flex items-center gap-[8px]">
                  <div className="w-[60px] h-[3px] bg-[#e9e9e9] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${score}%`, background: score >= 80 ? '#10b981' : score >= 50 ? '#f97316' : '#ef4444' }} />
                  </div>
                  <span className="text-[11px] font-bold" style={{ color: score >= 80 ? '#10b981' : score >= 50 ? '#f97316' : '#ef4444' }}>
                    {score}/100
                  </span>
                  {hint && <span className="text-[10px] text-[#f97316]">{hint}</span>}
                </div>
              )}
            </div>

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

