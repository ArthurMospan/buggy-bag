'use client';
import { useState, useEffect, useCallback } from 'react';
import { Bug, BugStatus, BugSeverity, DrawShape, PinElementContext, Project, Annotation } from '@/lib/types';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import { ChevronDown, Copy, Check, Maximize2, X, ArrowLeft, Monitor, Globe, Calendar, Terminal, Code2, ExternalLink } from 'lucide-react';
import Link from 'next/link';

const STATUS_CFG: { value: BugStatus; label: string; color: string; bg: string }[] = [
  { value: 'open',        label: 'Новий',      color: '#71717a', bg: '#f4f4f5' },
  { value: 'in_progress', label: 'В роботі',   color: '#f97316', bg: '#fff7ed' },
  { value: 'resolved',    label: 'Виправлено', color: '#10b981', bg: '#f0fdf4' },
  { value: 'closed',      label: 'Закрито',    color: '#71717a', bg: '#f4f4f5' },
];

function getSeverityColor(num: number) {
  if (num >= 8) return { color: '#ef4444', bg: 'rgba(239,68,68,0.1)' };
  if (num >= 5) return { color: '#f97316', bg: 'rgba(249,115,22,0.1)' };
  if (num >= 3) return { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' };
  return { color: '#34d399', bg: 'rgba(52,211,153,0.1)' };
}

const SEVERITY_CFG: { value: BugSeverity; label: string; color: string; bg: string }[] = Array.from({ length: 10 }, (_, i) => {
  const num = i + 1;
  const { color, bg } = getSeverityColor(num);
  return { value: num.toString(), label: num.toString(), color, bg };
});

function pinLabel(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'пін';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'піни';
  return 'пінів';
}

function CustomDropdown<T extends string>({ value, options, onChange, saving, type = 'status' }: { value: T; options: { value: T; label: string; color: string; bg: string }[]; onChange: (v: T) => void; saving: boolean; type?: 'status' | 'severity' }) {
  const [open, setOpen] = useState(false);
  const current = options.find(o => o.value === value) || options[0];
  return (
    <div className="relative">
      {type === 'status' ? (
        <button
          onClick={() => setOpen(!open)}
          disabled={saving}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          className="text-[10px] font-bold uppercase tracking-wider px-[8px] h-[24px] rounded-[6px] shrink-0 border border-transparent hover:brightness-95 transition-all flex items-center justify-center cursor-pointer"
          style={{ color: current.color, backgroundColor: current.bg }}
          title="Змінити статус"
        >
          {current.label}
        </button>
      ) : (
        <button
          onClick={() => setOpen(!open)}
          disabled={saving}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          className="w-[24px] h-[24px] rounded-[6px] flex items-center justify-center text-[12px] font-bold border shrink-0 hover:brightness-95 transition-all cursor-pointer"
          style={{ color: current.color, backgroundColor: current.bg, borderColor: current.color + '40' }}
          title={`Змінити критичність. Поточна: ${current.value}/10`}
        >
          {current.value}
        </button>
      )}
      {open && (
        <div className="absolute top-full mt-[6px] left-0 w-[160px] bg-[#ffffff] border border-[#e9e9e9] rounded-[10px] py-[4px] z-50 shadow-[0_8px_30px_rgba(0,0,0,0.08)] max-h-[300px] overflow-y-auto custom-scrollbar">
          {options.map(o => (
            <button
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false); }}
              className="flex items-center gap-[10px] w-full px-[12px] py-[9px] text-[12px] font-bold hover:bg-[#f4f4f5] transition-colors"
            >
              {type === 'status' ? (
                <div className="w-[7px] h-[7px] rounded-full" style={{ background: o.color }} />
              ) : (
                <div className="w-[18px] h-[18px] rounded-[4px] flex items-center justify-center text-[10px] border shrink-0" style={{ color: o.color, backgroundColor: o.bg, borderColor: o.color + '40' }}>{o.value}</div>
              )}
              <span style={{ color: o.color }}>{type === 'status' ? o.label : `Критичність ${o.label}`}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 w-[36px] h-[36px] rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
        <X size={18} />
      </button>
      <img src={src} alt="Screenshot fullscreen" crossOrigin="anonymous" className="max-w-[95vw] max-h-[95vh] object-contain rounded-[8px]" onClick={e => e.stopPropagation()} />
    </div>
  );
}

function useCopyMarkdown(bug: Bug) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
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
        if (ctx?.selector) {
          lines.push(`- **Pin #${pinNum}** on \`${ctx.selector}\`${note}`);
          if (ctx.reactComponent?.filePath) {
            lines.push(`  - Component: \`${ctx.reactComponent.name}\` in \`${ctx.reactComponent.filePath}${ctx.reactComponent.lineNumber ? `:${ctx.reactComponent.lineNumber}` : ''}\``);
          } else if (ctx.reactComponent?.name) {
             lines.push(`  - Component: \`${ctx.reactComponent.name}\``);
          }
          if (ctx.dataSources?.length) {
            lines.push(`  - Data sources: \`${ctx.dataSources.join('`, `')}\``);
          }
        } else if (ann) {
          lines.push(`- **Pin #${pinNum}** at ${ann.x}%×${ann.y}%${note}`);
        } else {
          lines.push(`- **Pin #${pinNum}**${note}`);
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

    navigator.clipboard.writeText(lines.join('\n')).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }, [bug]);
  return { copy, copied };
}

interface BugDetailViewProps {
  bug: Bug | null;
  project?: Project | null;
  onStatusChange: (id: string, status: BugStatus) => Promise<void>;
  onSeverityChange?: (id: string, severity: BugSeverity) => Promise<void>;
}

export default function BugDetailView({ bug, project, onStatusChange, onSeverityChange }: BugDetailViewProps) {
  const [status,    setStatus]   = useState<BugStatus>('open');
  const [severity,  setSeverity] = useState<BugSeverity>('low');
  const [saving,    setSaving]   = useState(false);
  const [saved,     setSaved]    = useState(false);
  const [lightbox,  setLightbox] = useState(false);
  const { copy, copied } = useCopyMarkdown(bug ?? ({} as Bug));

  const [issueUrl,  setIssueUrl]  = useState<string | null>(null);
  const [isPushing, setIsPushing] = useState(false);

  useEffect(() => {
    if (bug) {
      setStatus(bug.status);
      let initialSev = bug.severity as string;
      if (['low', 'medium', 'high', 'critical'].includes(initialSev)) {
        if (initialSev === 'low') initialSev = '2';
        else if (initialSev === 'medium') initialSev = '5';
        else if (initialSev === 'high') initialSev = '8';
        else if (initialSev === 'critical') initialSev = '10';
      }
      setSeverity(initialSev ?? '1');
      setIssueUrl(bug.github_issue_url ?? null);
    }
  }, [bug?.id, bug?.status, bug?.severity, bug?.github_issue_url]);

  if (!bug) return null;

  const tc = bug.tech_context;
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

  const handleStatusChange = async (newStatus: BugStatus) => {
    setStatus(newStatus); setSaving(true);
    await onStatusChange(bug.id, newStatus);
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 1500);
  };

  const handleSeverityChange = async (newSev: BugSeverity) => {
    setSeverity(newSev);
    if (!onSeverityChange) return;
    setSaving(true);
    await onSeverityChange(bug.id, newSev);
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 1500);
  };

  const pushToGithub = async () => {
    setIsPushing(true);
    try {
      const res = await fetch(`/api/bugs/${bug.id}/github`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setIssueUrl(data.url);
      } else {
        const error = await res.json();
        alert(error.error || 'Помилка інтеграції з GitHub');
      }
    } catch (e) {
      console.error(e);
      alert('Помилка при створенні Issue');
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#f4f4f5]">
      {lightbox && bug.image_url && <Lightbox src={bug.image_url} onClose={() => setLightbox(false)} />}

      {/* ── Header ── */}
      <div className="h-[52px] flex items-center justify-between px-[40px] shrink-0 bg-[#ffffff]">
        <div className="flex items-center gap-[12px]">
          <Link
            href={`/projects/${bug.project_id}`}
            className="text-[#9a9a9a] hover:text-[#1f1f1f] p-[7px] -ml-[7px] rounded-[8px] hover:bg-[#f4f4f5] transition-colors"
            title="Назад"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-[10px]">
            <span className="text-[12px] font-bold text-[#9a9a9a] tracking-widest font-mono">
              BUG-{bug.id.split('-')[0].toUpperCase()}
            </span>
            <div className="w-[1px] h-[16px] bg-[#e9e9e9]" />
            <div className="flex items-center gap-[6px]">
              <CustomDropdown value={status} options={STATUS_CFG} onChange={handleStatusChange} saving={saving} type="status" />
              <CustomDropdown value={severity} options={SEVERITY_CFG} onChange={handleSeverityChange} saving={saving} type="severity" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-[8px]">
          {saved && (
            <span className="flex items-center gap-[4px] text-[12px] text-[#10b981] font-semibold">
              <Check size={14} />
            </span>
          )}

          {project?.github_repo && (
            issueUrl ? (
              <a
                href={issueUrl}
                target="_blank"
                rel="noreferrer"
                title="Переглянути на GitHub"
                className="flex items-center gap-[7px] px-[12px] py-[7px] rounded-[8px] text-[12px] font-semibold transition-all bg-[#1f1f1f] text-[#ffffff] hover:bg-[#303030] border border-transparent"
              >
                <Code2 size={14} />
                <span className="hidden sm:inline">Відкрити Issue</span>
                <ExternalLink size={12} className="opacity-60" />
              </a>
            ) : (
              <button
                onClick={pushToGithub}
                disabled={isPushing}
                title="Створити Issue в GitHub"
                className="flex items-center gap-[7px] px-[12px] py-[7px] rounded-[8px] text-[12px] font-semibold border transition-all bg-[#f4f4f5] text-[#1f1f1f] hover:bg-[#e9e9e9] border-transparent disabled:opacity-40"
              >
                <Code2 size={14} />
                <span className="hidden sm:inline">{isPushing ? 'Створюємо...' : 'Додати в GitHub'}</span>
              </button>
            )
          )}

          <button
            onClick={copy}
            title="Копіювати як Markdown"
            className="flex items-center gap-[7px] px-[12px] py-[7px] rounded-[8px] text-[12px] font-semibold transition-all cursor-pointer border border-transparent"
            style={copied
              ? { background: 'rgba(16,185,129,0.12)', color: '#34d399', borderColor: 'rgba(52,211,153,0.3)' }
              : { background: '#f4f4f5', color: '#1f1f1f' }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span className="hidden sm:inline">{copied ? 'Скопійовано' : 'Копіювати MD'}</span>
          </button>
        </div>
      </div>

      {/* ── Two-column body ── */}
      <div className="flex-1 flex min-h-0 bg-[#f4f4f5]">

        {/* ── Left: Pins panel ── */}
        <div className="w-[360px] shrink-0 flex flex-col bg-[#ffffff]">

          {/* Pin count sub-bar */}
          <div className="h-[32px] flex items-center px-[24px] bg-[#ffffff] shrink-0">
            <span className="text-[10.5px] text-[#9a9a9a]">
              {annotations.length} {pinLabel(annotations.length)}
            </span>
          </div>

          {/* Pin list */}
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-[12px] p-[24px] pt-0">
            {annotations.length === 0 ? (
              <div className="text-[13px] text-center text-[#9a9a9a] py-[24px]">Пінів немає</div>
            ) : (
              annotations.map((ann, i) => {
                const shape: DrawShape | undefined = shapes.find(
                  (s: DrawShape) => s.type === 'pin' && (s.pinNumber === (ann.index ?? i + 1) || shapes.indexOf(s) === i)
                );
                const ctx: PinElementContext | undefined = shape?.elementContext;
                const pinNum = ann.index ?? i + 1;

                return (
                  <div
                    key={i}
                    className="flex flex-col bg-[#f4f4f5] rounded-[10px] p-[16px] gap-[10px] hover:bg-[#e9e9e9] transition-colors"
                  >
                    {/* Pin number + text */}
                    <div className="flex items-start gap-[10px]">
                      <div className="w-[22px] h-[22px] bg-[#ef4444] text-white rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-[1px]">
                        {pinNum}
                      </div>
                      <p className="text-[13px] text-[#1f1f1f] leading-snug flex-1 min-w-0 font-medium">
                        {ann.text || <em className="text-[#9a9a9a] not-italic font-normal">без тексту</em>}
                      </p>
                    </div>

                    {/* Element context */}
                    {ctx && (
                      <div className="ml-[32px] flex flex-col gap-[5px]">
                        {ctx.selector && (
                          <code
                            className="text-[10px] font-mono text-[#1f1f1f] bg-[#ffffff] px-[6px] py-[2px] rounded-[4px] truncate block"
                            title={ctx.selector}
                          >
                            {ctx.selector}
                          </code>
                        )}
                        {ctx.reactComponent && (
                          <code
                            className="text-[10px] font-mono text-[#ef4444] bg-[rgba(239,68,68,0.05)] px-[6px] py-[2px] rounded-[4px] truncate block"
                            title={`${ctx.reactComponent.name}${ctx.reactComponent.filePath ? ` · ${ctx.reactComponent.filePath}` : ''}`}
                          >
                            {ctx.reactComponent.name}
                            {ctx.reactComponent.filePath && (
                              <span className="text-[#9a9a9a]"> · {ctx.reactComponent.filePath}{ctx.reactComponent.lineNumber ? `:${ctx.reactComponent.lineNumber}` : ''}</span>
                            )}
                          </code>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right: screenshot + all info ── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#f4f4f5]">

          {/* Screenshot */}
          {bug.image_url && (
            <div className="relative bg-white group">
              <img
                src={bug.image_url}
                alt="Screenshot"
                crossOrigin="anonymous"
                className="w-full object-contain cursor-zoom-in"
                onClick={() => setLightbox(true)}
              />
              <button
                onClick={() => setLightbox(true)}
                className="absolute bottom-[12px] right-[12px] w-[32px] h-[32px] rounded-[8px] bg-black/50 hover:bg-black/70 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
                title="На весь екран"
              >
                <Maximize2 size={14} />
              </button>
            </div>
          )}

          {/* Content sections */}
          <div className="px-[48px] py-[40px] flex flex-col gap-[36px] max-w-[900px] mx-auto bg-transparent">

            {/* Description */}
            {bug.description && (
              <div className="bg-[#ffffff] rounded-[16px] p-[24px] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <h2 className="text-[10px] font-bold text-[#9a9a9a] uppercase tracking-widest mb-[12px]">Опис проблеми</h2>
                <p className="text-[14px] text-[#1f1f1f] leading-loose whitespace-pre-wrap font-medium">{bug.description}</p>
              </div>
            )}

            {/* Metadata details */}
            <div className="bg-[#ffffff] rounded-[16px] p-[24px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex flex-col gap-[12px]">
              <h2 className="text-[10px] font-bold text-[#9a9a9a] uppercase tracking-widest mb-[4px]">Деталі</h2>
              <div className="flex flex-col gap-[12px]">
                <div className="flex items-center gap-[12px]">
                  <Calendar size={14} className="text-[#9a9a9a] shrink-0" />
                  <span className="text-[13px] text-[#1f1f1f] font-medium">
                    {format(new Date(bug.created_at), 'dd MMMM yyyy, HH:mm', { locale: uk })}
                  </span>
                </div>

                {tc?.route && (
                  <div className="flex items-start gap-[12px]">
                    <Globe size={14} className="text-[#9a9a9a] mt-[2px] shrink-0" />
                    <div className="flex-1 min-w-0 flex items-center gap-[10px] flex-wrap">
                      <code className="text-[12px] font-mono text-[#1f1f1f] bg-[#f4f4f5] px-2 py-0.5 rounded-[4px]">{tc.route}</code>
                      {project?.connected_domain && (
                        <a
                          href={`${project.connected_domain}${tc.route.startsWith('/') ? '' : '/'}${tc.route}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-semibold text-[#9a9a9a] hover:text-[#1f1f1f] transition-colors inline-flex items-center gap-[3px]"
                        >
                          Відкрити ↗
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {tc?.viewport && (
                  <div className="flex items-center gap-[12px]">
                    <Monitor size={14} className="text-[#9a9a9a] shrink-0" />
                    <span className="text-[13px] font-mono text-[#1f1f1f] font-semibold">{tc.viewport}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Steps to reproduce */}
            {tc?.eventLog && tc.eventLog.length > 0 && (
              <div className="bg-[#ffffff] rounded-[16px] p-[24px] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <h2 className="text-[10px] font-bold text-[#9a9a9a] uppercase tracking-widest mb-[12px]">
                  Кроки відтворення
                </h2>
                <div className="flex flex-col gap-[8px]">
                  {tc.eventLog.map((e, i) => {
                    const cfg: Record<string, { icon: string; color: string }> = {
                      navigation: { icon: '🔀', color: '#1f1f1f' },
                      click:      { icon: '👆', color: '#1f1f1f' },
                    };
                    const { icon, color } = cfg[e.type] ?? { icon: '•', color: '#1f1f1f' };
                    return (
                      <div key={i} className="flex items-start gap-[12px] py-[10px] bg-[#f4f4f5] px-[16px] rounded-[10px]">
                        <span className="shrink-0 w-[20px] text-center text-[14px] pt-[1px]">{icon}</span>
                        <span className="flex-1 text-[13px] leading-relaxed font-medium" style={{ color }}>{e.description}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Console errors */}
            {tc?.consoleErrors && tc.consoleErrors.length > 0 && (
              <div className="bg-[#ffffff] rounded-[16px] p-[24px] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <h2 className="text-[10px] font-bold text-[#9a9a9a] uppercase tracking-widest mb-[12px]">
                  Консоль ({tc.consoleErrors.length})
                </h2>
                <div className="flex flex-col gap-[10px]">
                  {tc.consoleErrors.map((e, i) => (
                    <div
                      key={i}
                      className={`px-[14px] py-[11px] rounded-[9px] ${
                        e.level === 'error'
                          ? 'bg-[#fff0f0]'
                          : 'bg-[#fffbeb]'
                      }`}
                    >
                      <div className="flex items-center gap-[8px] mb-[7px]">
                        <Terminal size={13} className={e.level === 'error' ? 'text-[#ef4444]' : 'text-[#f59e0b]'} />
                        <span className={`text-[9px] font-bold uppercase px-[6px] py-[2px] rounded-[5px] tracking-wider ${
                          e.level === 'error'
                            ? 'bg-[#fee2e2] text-[#ef4444]'
                            : 'bg-[#fef3c7] text-[#f59e0b]'
                        }`}>
                          {e.level}
                        </span>
                      </div>
                      <p className="text-[12px] font-mono text-[#1f1f1f] leading-relaxed break-all font-medium">{e.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* React component */}
            {tc?.component && (
              <div className="bg-[#ffffff] rounded-[16px] p-[24px] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <h2 className="text-[10px] font-bold text-[#9a9a9a] uppercase tracking-widest mb-[10px]">React Компонент</h2>
                <code className="text-[13px] font-mono text-[#1f1f1f] bg-[#f4f4f5] px-[9px] py-[5px] rounded-[7px] inline-block font-semibold">
                  {tc.component.name}
                </code>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
