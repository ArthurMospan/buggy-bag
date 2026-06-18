'use client';
import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Bug, BugStatus, BugSeverity, DrawShape, PinElementContext, Project, Annotation } from '@/lib/types';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import { ChevronDown, ChevronUp, Copy, Check, Maximize2, X, ArrowLeft, Monitor, Globe, Calendar, Terminal, Code2, ExternalLink, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { STATUS_CFG, SEVERITY_CFG } from '@/lib/constants';

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

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/90 backdrop-blur-sm" onClick={onClose}>
      <button onClick={onClose} className="absolute top-[24px] right-[24px] w-[48px] h-[48px] rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-[2147483647]">
        <X size={24} />
      </button>
      <div className="bg-white p-[8px] rounded-[16px] max-w-[95vw] max-h-[95vh] flex items-center justify-center shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <img src={src} alt="Screenshot fullscreen" crossOrigin="anonymous" className="max-w-full max-h-[calc(95vh-16px)] object-contain rounded-[8px]" />
      </div>
    </div>,
    document.body
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
  allBugs?: Bug[];
  onStatusChange: (id: string, status: BugStatus) => Promise<void>;
  onSeverityChange?: (id: string, severity: BugSeverity) => Promise<void>;
}

export default function BugDetailView({ bug, project, allBugs = [], onStatusChange, onSeverityChange }: BugDetailViewProps) {
  const router = useRouter();
  const [status,    setStatus]   = useState<BugStatus>('open');
  const [severity,  setSeverity] = useState<BugSeverity>('low');
  const [saving,    setSaving]   = useState(false);
  const [saved,     setSaved]    = useState(false);
  const [lightbox,  setLightbox] = useState(false);
  const { copy, copied } = useCopyMarkdown(bug ?? ({} as Bug));

  const [issueUrl,  setIssueUrl]  = useState<string | null>(null);
  const [isPushing, setIsPushing] = useState(false);
  const [activePin, setActivePin] = useState<number | null>(null);

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
    try {
      await onStatusChange(bug.id, newStatus);
      setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 1500);
    } catch (e: any) {
      alert(`Помилка: ${e.message}`);
      setStatus(bug.status);
      setSaving(false);
    }
  };

  const handleSeverityChange = async (newSev: BugSeverity) => {
    setSeverity(newSev);
    if (!onSeverityChange) return;
    setSaving(true);
    try {
      await onSeverityChange(bug.id, newSev);
      setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 1500);
    } catch (e: any) {
      alert(`Помилка: ${e.message}`);
      setSeverity(bug.severity ?? '1');
      setSaving(false);
    }
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
    <div className="h-full w-full flex flex-row bg-[#f4f4f5]">
      {lightbox && bug.image_url && <Lightbox src={bug.image_url} onClose={() => setLightbox(false)} />}

      {/* ── Left Sidebar (Pins) ── */}
      <div className="w-[360px] shrink-0 bg-[#ffffff] border-r border-[#e9e9e9] flex flex-col h-full z-20">
        <div className="pt-[24px] pb-[16px] px-[24px] shrink-0 flex items-center gap-[12px]">
          <Link
            href={`/projects/${bug.project_id}`}
            className="text-[#9a9a9a] hover:text-[#1f1f1f] transition-colors p-[8px] -ml-[8px] rounded-[8px] hover:bg-[#f4f4f5]"
          >
            <ArrowLeft size={20} strokeWidth={1.5} />
          </Link>
          <h2 className="text-[20px] font-bold text-[#1f1f1f]">Мітки ({annotations.length})</h2>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar px-[24px] pb-[32px] flex flex-col gap-[12px]">
          {annotations.length === 0 && (
            <p className="text-[14px] text-[#9a9a9a]">Немає міток</p>
          )}
          {annotations.map((ann, i) => {
            const pinNum = ann.index ?? i + 1;
            const shape = bug.json_shapes?.find(s => s.type === 'pin' && s.pinNumber === pinNum);
            const el = shape?.elementContext;

            return (
              <div
                key={i}
                onMouseEnter={() => setActivePin(i)}
                onMouseLeave={() => setActivePin(null)}
                className={`group flex items-start gap-[12px] px-[16px] py-[12px] rounded-[12px] cursor-pointer transition-colors ${activePin === i ? 'bg-[#f0f4ff]' : 'bg-[#f4f4f5] hover:bg-[#e9e9e9]'}`}
              >
                <div className="bg-[#ef4444] text-white rounded-[50px] w-[28px] h-[28px] flex items-center justify-center text-[13px] font-bold shrink-0 mt-[2px]">
                  {pinNum}
                </div>
                <div className="flex flex-col gap-[8px] min-w-0 flex-1">
                  <p className="text-[13px] text-[#1f1f1f] font-medium leading-[20px] break-words">
                    {ann.text || <em className="text-[#9a9a9a] not-italic font-normal">Без тексту</em>}
                  </p>
                  
                  {el && (
                    <div className="flex flex-col gap-[4px]">
                      <div className="flex flex-wrap gap-[6px]">
                        {el.reactComponent?.name ? (
                          <span className="text-[10px] font-mono bg-[#f0fdf4] text-[#10b981] px-[6px] py-[2px] rounded border border-[#bbf7d0]">
                            {el.reactComponent.name}
                          </span>
                        ) : el.tagName ? (
                          <span className="text-[10px] font-mono bg-white px-[6px] py-[2px] rounded border border-[#e9e9e9] text-[#5d5d5d]">
                            {el.tagName.toLowerCase()}
                          </span>
                        ) : null}
                        
                        {el.classes && el.classes.length > 0 && (
                          <span className="text-[10px] font-mono bg-white px-[6px] py-[2px] rounded border border-[#e9e9e9] text-[#3b82f6] truncate max-w-[120px]">
                            .{el.classes[0]}
                          </span>
                        )}
                      </div>
                      {el.innerText && (
                        <p className="text-[11px] text-[#9a9a9a] truncate italic">"{el.innerText.substring(0, 40)}{el.innerText.length > 40 ? '...' : ''}"</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right Content Area ── */}
      <div className="flex-1 flex flex-col h-full bg-[#ffffff] overflow-y-auto custom-scrollbar relative">
        
        {/* Header */}
        <div className="pt-[24px] pb-[16px] shrink-0 flex items-center justify-between px-[32px] sticky top-0 z-50 bg-[#ffffff]">
          <div className="flex items-center gap-[16px]">
            <h1 className="text-[24px] font-bold text-[#1f1f1f] tracking-tight">
              BUG-{bug.id.split('-')[0].toUpperCase()}
            </h1>
            
            <div className="flex items-center bg-[#f4f4f5] rounded-[10px] ml-[8px]">
              <button 
                onClick={() => {
                  const idx = allBugs.findIndex(b => b.id === bug.id);
                  if (idx > 0) router.push(`/projects/${bug.project_id}/bugs/${allBugs[idx - 1].id}`);
                }}
                disabled={allBugs.findIndex(b => b.id === bug.id) <= 0}
                className="w-[32px] h-[32px] flex items-center justify-center text-[#9a9a9a] hover:text-[#1f1f1f] hover:bg-[#e9e9e9] rounded-l-[10px] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronUp size={16} strokeWidth={2} />
              </button>
              <div className="w-px h-[16px] bg-[#e9e9e9]" />
              <button 
                onClick={() => {
                  const idx = allBugs.findIndex(b => b.id === bug.id);
                  if (idx >= 0 && idx < allBugs.length - 1) router.push(`/projects/${bug.project_id}/bugs/${allBugs[idx + 1].id}`);
                }}
                disabled={allBugs.findIndex(b => b.id === bug.id) === -1 || allBugs.findIndex(b => b.id === bug.id) === allBugs.length - 1}
                className="w-[32px] h-[32px] flex items-center justify-center text-[#9a9a9a] hover:text-[#1f1f1f] hover:bg-[#e9e9e9] rounded-r-[10px] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronDown size={16} strokeWidth={2} />
              </button>
            </div>

            {saved && (
              <span className="flex items-center gap-[4px] text-[12px] text-[#10b981] font-semibold ml-2 bg-[#f0fdf4] px-[8px] py-[4px] rounded-[6px]">
                <Check size={14} /> Збережено
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-[12px]">
            {project?.github_repo && (
              issueUrl ? (
                <a
                  href={issueUrl}
                  target="_blank"
                  rel="noreferrer"
                  title="Переглянути на GitHub"
                  className="flex items-center gap-[8px] px-[16px] h-[36px] rounded-[8px] text-[13px] font-medium transition-all bg-white text-[#1f1f1f] hover:bg-[#f4f4f5] shadow-sm border border-[#e9e9e9]"
                >
                  <Code2 size={16} />
                  <span>Відкрити Issue</span>
                  <ExternalLink size={14} className="opacity-60" />
                </a>
              ) : (
                <button
                  onClick={pushToGithub}
                  disabled={isPushing}
                  className="flex items-center gap-[8px] px-[16px] h-[36px] rounded-[8px] text-[13px] font-medium transition-all bg-white text-[#1f1f1f] hover:bg-[#f4f4f5] shadow-sm border border-[#e9e9e9] disabled:opacity-40"
                >
                  <Plus size={16} />
                  <span>{isPushing ? 'Створюємо...' : 'Github Issue'}</span>
                </button>
              )
            )}

            <button
              onClick={copy}
              className="flex items-center gap-[8px] px-[16px] h-[36px] rounded-[8px] text-[13px] font-medium transition-all shadow-sm"
              style={copied
                ? { background: 'rgba(16,185,129,0.12)', color: '#34d399' }
                : { background: '#1f1f1f', color: '#ffffff' }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span>{copied ? 'Скопійовано' : 'Копіювати MD'}</span>
            </button>
          </div>
        </div>

        {/* Metadata Strip */}
        <div className="flex flex-wrap items-center gap-[16px] px-[32px] py-[10px] bg-[#f9f9fa] border-b border-[#e9e9e9] shrink-0">
          <div className="flex items-center gap-[8px] shrink-0">
            <span className="text-[10px] font-bold text-[#9a9a9a] uppercase tracking-widest">Статус:</span>
            <CustomDropdown value={status} options={STATUS_CFG} onChange={handleStatusChange} saving={saving} type="status" />
          </div>
          <div className="w-px h-[16px] bg-[#e9e9e9] shrink-0" />
          <div className="flex items-center gap-[8px] shrink-0">
            <span className="text-[10px] font-bold text-[#9a9a9a] uppercase tracking-widest">Критичність:</span>
            <CustomDropdown value={severity} options={SEVERITY_CFG} onChange={handleSeverityChange} saving={saving} type="severity" />
          </div>
          <div className="w-px h-[16px] bg-[#e9e9e9] shrink-0" />
          <div className="flex items-center gap-[6px] shrink-0">
            <Calendar size={14} className="text-[#9a9a9a]" />
            <span className="text-[13px] text-[#1f1f1f] font-medium">
              {format(new Date(bug.created_at), 'dd.MM.yyyy HH:mm')}
            </span>
          </div>
          {tc?.viewport && (
            <>
              <div className="w-px h-[16px] bg-[#e9e9e9] shrink-0" />
              <div className="flex items-center gap-[6px] shrink-0">
                <Monitor size={14} className="text-[#9a9a9a]" />
                <span className="text-[13px] font-mono text-[#1f1f1f] font-semibold">{tc.viewport}</span>
              </div>
            </>
          )}
          {tc?.route && (
            <>
              <div className="w-px h-[16px] bg-[#e9e9e9] shrink-0" />
              <div className="flex items-center gap-[6px] shrink-0">
                <Globe size={14} className="text-[#9a9a9a] mt-[1px]" />
                <code className="text-[12px] font-mono text-[#1f1f1f] bg-[#ffffff] border border-[#e9e9e9] px-2 py-0.5 rounded-[4px] truncate max-w-[200px]">
                  {tc.route}
                </code>
                {(() => {
                  let domain = project?.connected_domain;
                  if (domain && !domain.startsWith('http')) {
                    domain = domain.includes('localhost') || domain.includes('127.0.0.1') ? `http://${domain}` : `https://${domain}`;
                  }
                  const routeHref = tc.route.startsWith('http') 
                    ? tc.route 
                    : domain 
                      ? `${domain}${tc.route.startsWith('/') ? '' : '/'}${tc.route}` 
                      : undefined;
                  return routeHref ? (
                    <a
                      href={routeHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-[6px] px-[10px] py-[4px] bg-[#e9e9e9] hover:bg-[#d4d4d8] text-[#1f1f1f] text-[11px] font-semibold rounded-[6px] transition-colors ml-2"
                    >
                      <span>Перейти</span>
                      <ExternalLink size={12} className="opacity-60" />
                    </a>
                  ) : null;
                })()}
              </div>
            </>
          )}
        </div>

        {/* Screenshot Container */}
        <div className="w-full shrink-0 border-b border-[#e9e9e9] bg-[#ffffff]">
          <div className="flex items-center justify-center min-h-[300px]">
            {bug.image_url ? (
              <div className="relative inline-block group w-full">
                <img
                  src={bug.image_url}
                  alt="Screenshot"
                  crossOrigin="anonymous"
                  className="w-full h-auto object-cover block"
                />
                
                {/* Pin Overlays */}
                <div className="absolute inset-0 pointer-events-none">
                  {annotations.map((ann, i) => {
                    const isActive = activePin === i;
                    return (
                      <div
                        key={i}
                        className={`absolute w-[40px] h-[40px] -ml-[20px] -mt-[20px] rounded-full border-[3px] transition-all duration-300 pointer-events-auto cursor-pointer flex items-center justify-center ${isActive ? 'border-white scale-125 shadow-[0_0_20px_rgba(0,0,0,0.5)]' : 'border-transparent'}`}
                        style={{ left: `${ann.x}%`, top: `${ann.y}%` }}
                        onMouseEnter={() => setActivePin(i)}
                        onMouseLeave={() => setActivePin(null)}
                      >
                         {isActive && <div className="absolute inset-0 rounded-full bg-white/30 animate-pulse" />}
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => setLightbox(true)}
                  className="absolute bottom-[24px] right-[24px] w-[40px] h-[40px] rounded-[10px] bg-black/60 hover:bg-black/80 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-md shadow-lg pointer-events-auto"
                  title="На весь екран"
                >
                  <Maximize2 size={18} />
                </button>
              </div>
            ) : (
              <div className="text-[#9a9a9a] text-[14px]">Без скріншоту</div>
            )}
          </div>
        </div>

        {/* Details Grid */}
        <div className="px-[24px] py-[24px] grid grid-cols-1 lg:grid-cols-2 gap-[16px] max-w-[1200px] mx-auto w-full">
          
          {/* Metadata Block */}
          {/* Metadata Block (Moved to Strip above) */}

          {/* Description Block */}
          {bug.description && (
            <div className="bg-[#f9f9fa] rounded-[16px] p-[24px]">
              <h2 className="text-[11px] font-bold text-[#9a9a9a] uppercase tracking-widest mb-[12px]">Опис проблеми</h2>
              <p className="text-[14px] text-[#1f1f1f] leading-relaxed whitespace-pre-wrap font-medium">{bug.description}</p>
            </div>
          )}

          {/* Steps to reproduce */}
          {tc?.eventLog && tc.eventLog.length > 0 && (
            <div className="bg-[#f9f9fa] rounded-[16px] p-[24px] col-span-1 lg:col-span-2">
              <h2 className="text-[11px] font-bold text-[#9a9a9a] uppercase tracking-widest mb-[12px]">Кроки відтворення</h2>
              <div className="flex flex-col gap-[8px]">
                {tc.eventLog.map((e, i) => {
                  const cfg: Record<string, { icon: string; color: string }> = {
                    navigation: { icon: '🔀', color: '#1f1f1f' },
                    click:      { icon: '👆', color: '#1f1f1f' },
                  };
                  const { icon, color } = cfg[e.type] ?? { icon: '•', color: '#1f1f1f' };
                  return (
                    <div key={i} className="flex items-start gap-[12px] py-[10px] bg-[#ffffff] border border-[#e9e9e9] px-[16px] rounded-[10px]">
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
            <div className="bg-[#f9f9fa] rounded-[16px] p-[24px] col-span-1 lg:col-span-2">
              <h2 className="text-[11px] font-bold text-[#9a9a9a] uppercase tracking-widest mb-[12px]">Консоль ({tc.consoleErrors.length})</h2>
              <div className="flex flex-col gap-[10px]">
                {tc.consoleErrors.map((e, i) => (
                  <div
                    key={i}
                    className={`px-[16px] py-[12px] rounded-[10px] border ${
                      e.level === 'error'
                        ? 'bg-[#ffffff] border-[#fecaca]'
                        : 'bg-[#ffffff] border-[#fde68a]'
                    }`}
                  >
                    <div className="flex items-center gap-[8px] mb-[8px]">
                      <Terminal size={14} className={e.level === 'error' ? 'text-[#ef4444]' : 'text-[#f59e0b]'} />
                      <span className={`text-[10px] font-bold uppercase px-[8px] py-[3px] rounded-[6px] tracking-wider ${
                        e.level === 'error'
                          ? 'bg-[#fee2e2] text-[#ef4444]'
                          : 'bg-[#fef3c7] text-[#f59e0b]'
                      }`}>
                        {e.level}
                      </span>
                    </div>
                    <p className="text-[13px] font-mono text-[#1f1f1f] leading-relaxed break-all font-medium">{e.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* React component */}
          {tc?.component && (
            <div className="bg-[#f9f9fa] rounded-[16px] p-[24px] col-span-1 lg:col-span-2">
              <h2 className="text-[11px] font-bold text-[#9a9a9a] uppercase tracking-widest mb-[12px]">React Компонент</h2>
              <code className="text-[13px] font-mono text-[#1f1f1f] bg-[#ffffff] border border-[#e9e9e9] px-[12px] py-[6px] rounded-[8px] inline-block font-semibold">
                {tc.component.name}
              </code>
            </div>
          )}

          {/* Design Audit */}
          {tc?.designAudit && (
            <div className="bg-[#f9f9fa] rounded-[16px] p-[24px] col-span-1 lg:col-span-2">
              <h2 className="text-[11px] font-bold text-[#9a9a9a] uppercase tracking-widest mb-[12px]">Дизайн-аудит</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[24px]">
                {/* Fonts */}
                <div>
                  <h3 className="text-[12px] font-bold text-[#1f1f1f] mb-[8px]">Шрифти ({tc.designAudit.fonts.length})</h3>
                  <div className="flex flex-col gap-[6px]">
                    {tc.designAudit.fonts.map((f, i) => (
                      <div key={i} className="flex items-center justify-between bg-white border border-[#e9e9e9] rounded-[6px] px-[8px] py-[4px]">
                        <span className="text-[12px] text-[#1f1f1f] truncate font-medium max-w-[140px]">{f.value}</span>
                        <span className="text-[11px] font-mono text-[#9a9a9a] bg-[#f4f4f5] px-[4px] rounded-[4px]">{f.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Colors */}
                <div>
                  <h3 className="text-[12px] font-bold text-[#1f1f1f] mb-[8px]">Кольори ({tc.designAudit.colors.length})</h3>
                  <div className="flex flex-col gap-[6px]">
                    {tc.designAudit.colors.map((c, i) => (
                      <div key={i} className="flex items-center justify-between bg-white border border-[#e9e9e9] rounded-[6px] px-[8px] py-[4px]">
                        <div className="flex items-center gap-[6px]">
                          <div className="w-[12px] h-[12px] rounded-[3px] border border-[#e9e9e9]" style={{ backgroundColor: c.value }} />
                          <span className="text-[12px] text-[#1f1f1f] font-mono">{c.value}</span>
                        </div>
                        <span className="text-[11px] font-mono text-[#9a9a9a] bg-[#f4f4f5] px-[4px] rounded-[4px]">{c.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Spacing & Typography Details */}
                <div className="flex flex-col gap-[16px]">
                  <div>
                    <h3 className="text-[12px] font-bold text-[#1f1f1f] mb-[8px]">Відступи ({tc.designAudit.spacings.length})</h3>
                    <div className="flex flex-wrap gap-[6px]">
                      {tc.designAudit.spacings.map((s, i) => (
                        <div key={i} className="flex items-center gap-[4px] bg-white border border-[#e9e9e9] rounded-[6px] px-[6px] py-[2px]">
                          <span className="text-[11px] text-[#1f1f1f]">{s.value}</span>
                          <span className="text-[10px] text-[#9a9a9a] bg-[#f4f4f5] px-[3px] rounded-[4px]">{s.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-[12px] font-bold text-[#1f1f1f] mb-[8px]">Розміри шрифту ({tc.designAudit.fontSizes.length})</h3>
                    <div className="flex flex-wrap gap-[6px]">
                      {tc.designAudit.fontSizes.map((s, i) => (
                        <div key={i} className="flex items-center gap-[4px] bg-white border border-[#e9e9e9] rounded-[6px] px-[6px] py-[2px]">
                          <span className="text-[11px] text-[#1f1f1f]">{s.value}</span>
                          <span className="text-[10px] text-[#9a9a9a] bg-[#f4f4f5] px-[3px] rounded-[4px]">{s.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-[12px] font-bold text-[#1f1f1f] mb-[8px]">Border-radius ({tc.designAudit.borderRadii.length})</h3>
                    <div className="flex flex-wrap gap-[6px]">
                      {tc.designAudit.borderRadii.map((b, i) => (
                        <div key={i} className="flex items-center gap-[4px] bg-white border border-[#e9e9e9] rounded-[6px] px-[6px] py-[2px]">
                          <span className="text-[11px] text-[#1f1f1f]">{b.value}</span>
                          <span className="text-[10px] text-[#9a9a9a] bg-[#f4f4f5] px-[3px] rounded-[4px]">{b.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
