'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Bug, BugStatus, BugSeverity, DrawShape, PinElementContext, Project } from '@/lib/types';
import Dialog from '@/components/ui/Dialog';
import BugScreenshot from './BugScreenshot';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import { ChevronDown, ChevronUp, Copy, Check, ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react';
import { STATUS_CFG, SEVERITY_CFG } from '@/lib/constants';
import { formatBugMarkdown } from '@/lib/markdownFormatter';

const STATUS_COLORS: Record<string, string> = {
  open: 'rgba(255, 96, 75, 0.8)',
  in_progress: 'rgba(249, 115, 22, 0.8)',
  resolved: 'rgba(100, 227, 94, 0.8)',
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

function CustomDropdown<T extends string>({ 
  value, 
  options, 
  onChange, 
  saving, 
  type = 'status' 
}: { 
  value: T; 
  options: { value: T; label: string; color: string; bg: string }[]; 
  onChange: (v: T) => void; 
  saving: boolean; 
  type?: 'status' | 'severity' 
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

  const current = options.find(o => o.value === value) || options[0];

  return (
    <div className="relative" ref={ref}>
      {type === 'status' ? (
        <button
          onClick={() => setOpen(!open)}
          disabled={saving}
          className="h-[20px] px-[6px] rounded-[6px] flex items-center justify-center text-[10px] font-semibold text-white backdrop-blur-[4px] border border-black/10 transition-transform hover:scale-105 active:scale-95 cursor-pointer disabled:cursor-default"
          style={{ 
            backgroundColor: current.color 
          }}
          title="Змінити статус"
        >
          {current.label}
        </button>
      ) : (
        <button
          onClick={() => setOpen(!open)}
          disabled={saving}
          className="w-[20px] h-[20px] rounded-[6px] flex items-center justify-center text-[10px] font-bold text-white backdrop-blur-[4px] border border-black/10 transition-transform hover:scale-105 active:scale-95 cursor-pointer disabled:cursor-default"
          style={{ backgroundColor: SEVERITY_COLORS[parseInt(value as string) || 1] || 'rgba(52, 211, 153, 0.85)' }}
          title={`Змінити критичність. Поточна: ${value}/10`}
        >
          {value}
        </button>
      )}
      
      {open && (
        type === 'status' ? (
          <div className="absolute top-[calc(100%+6px)] left-0 z-[1000] min-w-[140px] bg-[#1f1f1f] border border-[#3f3f46] rounded-[8px] shadow-xl py-[4px]">
            {options.map(o => {
              return (
                <button
                  key={o.value}
                  onClick={() => { onChange(o.value); setOpen(false); }}
                  className="w-full text-left px-[12px] py-[6px] text-[12px] font-medium text-white hover:bg-[#3f3f46] transition-colors flex items-center gap-[8px] cursor-pointer"
                >
                  <div className="w-[8px] h-[8px] rounded-full" style={{ backgroundColor: o.color }} />
                  {o.label}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="absolute top-[calc(100%+6px)] left-0 z-[1000] w-[148px] bg-[#1f1f1f] border border-[#3f3f46] rounded-[10px] shadow-xl p-[6px] grid grid-cols-5 gap-[4px]">
            {Array.from({ length: 10 }, (_, i) => {
              const num = i + 1;
              return (
                <button
                  key={num}
                  onClick={() => { onChange(num.toString() as T); setOpen(false); }}
                  className="w-[24px] h-[24px] rounded-[4px] text-[10px] font-bold text-white flex items-center justify-center hover:scale-115 active:scale-90 transition-transform cursor-pointer"
                  style={{ backgroundColor: SEVERITY_COLORS[num] }}
                >
                  {num}
                </button>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}

/** Fullscreen lightbox — click backdrop or Escape to close */
function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-[36px] h-[36px] rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
      >
        <X size={18} />
      </button>
      <img
        src={src}
        alt="Screenshot fullscreen"
        crossOrigin="anonymous"
        className="max-w-[95vw] max-h-[95vh] object-contain rounded-[8px] shadow-2xl"
        onClick={e => e.stopPropagation()}
      />
    </div>
  );
}

function formatSmartDescription(desc: string | null) {
  if (!desc) return <span className="text-[#9a9a9a]">Без опису</span>;
  const parts = desc.split(/[|\n]/).map(p => p.trim()).filter(Boolean);
  if (parts.length <= 1) {
    return <p className="text-[13px] text-[#1f1f1f] leading-relaxed whitespace-pre-wrap font-medium">{desc}</p>;
  }
  return (
    <div className="flex flex-col gap-[8px] mt-[4px]">
      {parts.map((part, index) => {
        const cleanPart = part.replace(/^[-•*\d+.]\s*/, '');
        return (
          <div key={index} className="flex items-start gap-[10px] py-[8px] bg-white border border-[#e9e9e9] px-[12px] rounded-[8px] shadow-sm">
            <span className="flex items-center justify-center w-[20px] h-[20px] rounded-full bg-[#f4f4f5] text-[10px] font-bold text-[#71717a] shrink-0 mt-[1px]">
              {index + 1}
            </span>
            <span className="flex-1 text-[12px] leading-relaxed font-medium text-[#1f1f1f]">{cleanPart}</span>
          </div>
        );
      })}
    </div>
  );
}

function Section({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-[#f4f4f5] rounded-[12px] overflow-hidden">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between px-[14px] py-[10px] hover:bg-[#ebebeb] transition-colors cursor-pointer rounded-[12px]">
        <span className="text-[11px] font-bold text-[#9a9a9a] uppercase tracking-wider">{title}</span>
        {open ? <ChevronUp size={14} className="text-[#9a9a9a]" /> : <ChevronDown size={14} className="text-[#9a9a9a]" />}
      </button>
      {open && <div className="px-[14px] pb-[14px]">{children}</div>}
    </div>
  );
}

function useCopyMarkdown(bug: Bug) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    const md = formatBugMarkdown(bug);
    navigator.clipboard.writeText(md).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }, [bug]);
  return { copy, copied };
}

interface BugDetailModalProps {
  bug: Bug | null;
  project?: Project | null;
  onClose: () => void;
  onStatusChange: (id: string, status: BugStatus) => Promise<void>;
  onSeverityChange?: (id: string, severity: BugSeverity) => Promise<void>;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

export default function BugDetailModal({ bug, project, onClose, onStatusChange, onSeverityChange, onPrev, onNext, hasPrev, hasNext }: BugDetailModalProps) {
  const [status,   setStatus]   = useState<BugStatus>('open');
  const [severity, setSeverity] = useState<BugSeverity>('low');
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const { copy, copied } = useCopyMarkdown(bug ?? ({} as Bug));

  useEffect(() => {
    if (bug) { setStatus(bug.status); setSeverity(bug.severity ?? 'low'); }
  }, [bug?.id]); // eslint-disable-line

  useEffect(() => {
    if (!bug) return;
    const onKey = (e: KeyboardEvent) => {
      if (['INPUT','TEXTAREA','SELECT'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'ArrowLeft'  && hasPrev && onPrev) { e.preventDefault(); onPrev(); }
      if (e.key === 'ArrowRight' && hasNext && onNext) { e.preventDefault(); onNext(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [bug, hasPrev, hasNext, onPrev, onNext]);

  if (!bug) return null;

  const tc = bug.tech_context;
  const hasAnnotations = (bug.json_annotations?.length ?? 0) > 0;
  const networkErrors  = tc?.networkRequests?.filter(r => r.isError) ?? [];
  const currentStatusCfg = STATUS_CFG.find(s => s.value === status);

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

  const titleSlot = (
    <div className="flex items-center gap-[8px] flex-1 min-w-0">
      {(onPrev || onNext) && (
        <div className="flex items-center gap-[2px] shrink-0">
          <button onClick={onPrev} disabled={!hasPrev} title="Попередній (←)"
            className="p-[4px] rounded-[6px] text-[#9a9a9a] hover:bg-[#f4f4f5] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer">
            <ChevronLeft size={16} />
          </button>
          <button onClick={onNext} disabled={!hasNext} title="Наступний (→)"
            className="p-[4px] rounded-[6px] text-[#9a9a9a] hover:bg-[#f4f4f5] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer">
            <ChevronRight size={16} />
          </button>
        </div>
      )}
      <span className="text-[12px] font-bold px-[8px] py-[3px] rounded-[6px] shrink-0"
        style={{ background: currentStatusCfg?.bg, color: currentStatusCfg?.color }}>
        {currentStatusCfg?.label}
      </span>
      {saved && (
        <span className="flex items-center gap-[4px] text-[11px] text-[#10b981] font-semibold shrink-0">
          <Check size={12} /> збережено
        </span>
      )}
      <div className="flex-1" />
      <button onClick={copy} title="Копіювати як Markdown"
        className="flex items-center gap-[5px] px-[8px] py-[4px] rounded-[8px] text-[11px] font-bold border transition-all shrink-0 cursor-pointer"
        style={copied ? { background: '#f0fdf4', color: '#10b981', borderColor: '#10b981' } : { background: 'transparent', color: '#9a9a9a', borderColor: '#e9e9e9' }}>
        {copied ? <Check size={12} /> : <Copy size={12} />}
        {copied ? 'Скопійовано' : 'Markdown'}
      </button>
    </div>
  );

  return (
    <>
      {/* Lightbox — renders on top of everything */}
      {lightbox && bug.image_url && (
        <Lightbox src={bug.image_url} onClose={() => setLightbox(false)} />
      )}

      <Dialog isOpen={!!bug} onClose={onClose} title="Деталі" size="lg" titleExtra={titleSlot as any}>
        <div className="flex flex-col gap-[16px]">

          {/* ── 1. Status / Severity / Meta ─────────────────────────── */}
          <div className="bg-[#f4f4f5] rounded-[12px] p-[14px] flex flex-col gap-[14px]">
            <div className="flex flex-wrap items-center gap-[16px]">
              <div className="flex items-center gap-[8px] shrink-0">
                <span className="text-[10px] font-bold text-[#9a9a9a] uppercase tracking-widest">Статус:</span>
                <CustomDropdown value={status} options={STATUS_CFG} onChange={handleStatusChange} saving={saving} type="status" />
              </div>
              <div className="w-px h-[16px] bg-[#e9e9e9] shrink-0" />
              <div className="flex items-center gap-[8px] shrink-0">
                <span className="text-[10px] font-bold text-[#9a9a9a] uppercase tracking-widest">Severity:</span>
                <CustomDropdown value={severity} options={SEVERITY_CFG} onChange={handleSeverityChange} saving={saving} type="severity" />
              </div>
            </div>
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-[#9a9a9a]">{format(new Date(bug.created_at), 'dd MMM yyyy, HH:mm', { locale: uk })}</span>
              {tc?.route && (
                <div className="flex items-center gap-[8px]">
                  <code className="text-[11px] font-mono text-[#1f1f1f] bg-[#f4f4f5] px-[6px] py-[2px] rounded-[4px]">{tc.route}</code>
                  {project?.connected_domain && (
                    <a href={`${project.connected_domain}${tc.route.startsWith('/') ? '' : '/'}${tc.route}`} target="_blank" rel="noopener noreferrer" className="text-[11px] font-semibold text-[#1f1f1f] hover:underline flex items-center gap-[4px]">
                      Відкрити сторінку
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── 2. Screenshot (clickable → lightbox) ────────────────── */}
          {bug.image_url && (
            <BugScreenshot bug={bug} variant="modal" onClick={() => setLightbox(true)}>
              {/* Expand button — appears on hover */}
              <button
                onClick={() => setLightbox(true)}
                className="absolute top-[8px] right-[8px] w-[30px] h-[30px] rounded-[8px] bg-black/40 hover:bg-black/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                title="Повний екран"
              >
                <Maximize2 size={14} />
              </button>
            </BugScreenshot>
          )}

          {/* ── 3. Pins list with DOM context ────────────────────────── */}
          {hasAnnotations && (
            <div className="flex flex-col gap-[6px]">
              <div className="text-[10px] font-bold text-[#9a9a9a] uppercase tracking-wider px-[2px]">
                Піни ({bug.json_annotations.length})
              </div>
              {bug.json_annotations.map((ann, i) => {
                // Find the matching raw shape with elementContext
                const rawShape = bug.json_shapes?.find(
                  (s: DrawShape) => s.type === 'pin' && (s.pinNumber === (ann.index ?? i + 1) || bug.json_shapes?.indexOf(s) === i)
                );
                const ctx: PinElementContext | undefined = rawShape?.elementContext;

                return (
                  <div key={i} className="flex flex-col gap-[6px] bg-[#f4f4f5] rounded-[10px] px-[10px] py-[10px]">
                    {/* Pin header: number + annotation text */}
                    <div className="flex items-start gap-[8px]">
                      <div className="w-[18px] h-[18px] bg-[#ef4444] text-white rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-[1px]">
                        {ann.index ?? i + 1}
                      </div>
                      <span className="text-[12px] text-[#1f1f1f] font-semibold">
                        {ann.text || <span className="text-[#cfcfcf] font-normal italic">без тексту</span>}
                      </span>
                    </div>

                    {/* DOM context — only shown if available */}
                    {ctx && (
                      <div className="ml-[26px] flex flex-col gap-[4px]">
                        {/* CSS Selector */}
                        <div className="flex items-center gap-[6px] flex-wrap">
                          <code className="text-[11px] font-mono text-[#1f1f1f] bg-[#ffffff] px-[6px] py-[1px] rounded-[4px] break-all">
                            {ctx.selector}
                          </code>
                          {ctx.id && (
                            <span className="text-[10px] text-[#9a9a9a]">#{ctx.id}</span>
                          )}
                        </div>

                        {/* React Component + file path */}
                        {ctx.reactComponent && (
                          <div className="flex items-center gap-[6px] flex-wrap">
                            <span className="text-[10px] font-bold text-[#9a9a9a] uppercase tracking-wider">Component</span>
                            <code className="text-[11px] font-mono text-[#1f1f1f] bg-[#ffffff] px-[5px] py-[1px] rounded-[3px]">
                              {ctx.reactComponent.name}
                            </code>
                            {ctx.reactComponent.filePath && (
                              <span className="text-[10px] font-mono text-[#9a9a9a] break-all">
                                {ctx.reactComponent.filePath}
                                {ctx.reactComponent.lineNumber ? `:${ctx.reactComponent.lineNumber}` : ''}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Data sources */}
                        {ctx.dataSources && ctx.dataSources.length > 0 && (
                          <div className="flex items-center gap-[6px] flex-wrap">
                            <span className="text-[10px] font-bold text-[#9a9a9a] uppercase tracking-wider">Data</span>
                            {ctx.dataSources.map((src, j) => (
                              <code key={j} className="text-[10px] font-mono text-[#1f1f1f] bg-[#ffffff] px-[5px] py-[1px] rounded-[3px]">
                                {src}
                              </code>
                            ))}
                          </div>
                        )}

                        {/* Inner text preview */}
                        {ctx.innerText && (
                          <div className="text-[10px] text-[#9a9a9a] italic truncate">
                            "{ctx.innerText}"
                          </div>
                        )}

                        {/* Additional attributes */}
                        <div className="flex items-center gap-[6px] flex-wrap">
                          {ctx.ariaLabel && (
                            <span className="text-[10px] text-[#9a9a9a]">aria: {ctx.ariaLabel}</span>
                          )}
                          {ctx.inputName && (
                            <span className="text-[10px] font-mono text-[#9a9a9a]">name={ctx.inputName}</span>
                          )}
                          {ctx.inputType && (
                            <span className="text-[10px] font-mono text-[#9a9a9a]">type={ctx.inputType}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── 4. Description ───────────────────────────────────────── */}
          {bug.description && (
            <div className="bg-[#f4f4f5] rounded-[10px] p-[12px]">
              <div className="text-[10px] font-bold text-[#9a9a9a] uppercase tracking-wider mb-[6px]">Опис</div>
              {formatSmartDescription(bug.description)}
            </div>
          )}

          {/* ── 5. Tech context sections ─────────────────────────────── */}
          {tc && (
            <>
              {(tc.component || tc.viewport || tc.userAgent) && (
                <Section title="Компонент та контекст" defaultOpen>
                  <div className="grid grid-cols-2 gap-[8px]">
                    {tc.component && (
                      <div>
                        <div className="text-[10px] font-bold text-[#9a9a9a] mb-[3px]">Компонент</div>
                        <code className="text-[12px] font-mono text-[#1f1f1f] bg-[#f4f4f5] px-[6px] py-[2px] rounded-[4px]">{tc.component.name}</code>
                        {tc.component.props && Object.keys(tc.component.props).length > 0 && (
                          <div className="mt-[6px] text-[11px] font-mono text-[#9a9a9a] bg-[#f4f4f5] rounded-[6px] p-[8px] leading-relaxed">
                            {Object.entries(tc.component.props).map(([k, v]) => (
                              <div key={k}><span className="text-[#1f1f1f]">{k}</span>: {String(v)}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex flex-col gap-[6px]">
                      {tc.viewport && <div><div className="text-[10px] font-bold text-[#9a9a9a] mb-[3px]">Viewport</div><code className="text-[11px] font-mono text-[#1f1f1f]">{tc.viewport}</code></div>}
                      {tc.userAgent && <div><div className="text-[10px] font-bold text-[#9a9a9a] mb-[3px]">Browser</div><span className="text-[11px] text-[#9a9a9a] break-all">{tc.userAgent.split(' ').slice(-2).join(' ')}</span></div>}
                    </div>
                  </div>
                </Section>
              )}

              {tc.networkRequests?.length > 0 && (
                <Section title={`Мережеві запити (${networkErrors.length > 0 ? networkErrors.length + ' помилок' : 'чисто'})`} defaultOpen={networkErrors.length > 0}>
                  <div className="flex flex-col gap-[4px]">
                    {tc.networkRequests.map((r, i) => (
                      <div key={i} className={`rounded-[8px] text-[11px] font-mono overflow-hidden ${r.isError ? 'bg-[#fff0f0]' : 'bg-[#f4f4f5]'}`}>
                        {/* Main row */}
                        <div className="flex items-center gap-[8px] px-[10px] py-[7px]">
                          <span className={`text-[10px] font-bold px-[6px] py-[2px] rounded-[4px] shrink-0 ${r.isError ? 'bg-[#fee2e2] text-[#991b1b]' : 'bg-[#dcfce7] text-[#166534]'}`}>{r.status || 'ERR'}</span>
                          <span className="text-[#9a9a9a] shrink-0">{r.method}</span>
                          <span className={`flex-1 truncate ${r.isError ? 'text-[#dc2626]' : 'text-[#1f1f1f]'}`}>{r.url}</span>
                          <span className="text-[#9a9a9a] shrink-0">{r.durationMs}ms</span>
                        </div>
                        {/* Body details — only for errors */}
                        {r.isError && (r.requestBody || r.responseBody || r.requestHeaders) && (
                          <div className="border-t border-[#fca5a5] mx-[0] px-[10px] pb-[8px] pt-[6px] flex flex-col gap-[6px]">
                            {r.requestHeaders && (
                              <div>
                                <div className="text-[9px] font-bold text-[#9a9a9a] mb-[2px] uppercase tracking-wider">Request Headers</div>
                                <pre className="text-[10px] text-[#1f1f1f] bg-[#fee2e2] rounded-[4px] px-[8px] py-[4px] overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                                  {Object.entries(r.requestHeaders).map(([k, v]) => `${k}: ${v}`).join('\n')}
                                </pre>
                              </div>
                            )}
                            {r.requestBody && (
                              <div>
                                <div className="text-[9px] font-bold text-[#9a9a9a] mb-[2px] uppercase tracking-wider">Request Body</div>
                                <pre className="text-[10px] text-[#1f1f1f] bg-[#fee2e2] rounded-[4px] px-[8px] py-[4px] overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">{r.requestBody}</pre>
                              </div>
                            )}
                            {r.responseBody && (
                              <div>
                                <div className="text-[9px] font-bold text-[#991b1b] mb-[2px] uppercase tracking-wider">Response Body</div>
                                <pre className="text-[10px] text-[#991b1b] bg-[#fee2e2] rounded-[4px] px-[8px] py-[4px] overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">{r.responseBody}</pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </Section>
              )}


              {tc.consoleErrors?.length > 0 && (
                <Section title={`Console (${tc.consoleErrors.length})`} defaultOpen>
                  <div className="flex flex-col gap-[4px]">
                    {tc.consoleErrors.map((e, i) => (
                      <div key={i} className={`px-[10px] py-[7px] rounded-[8px] ${e.level === 'error' ? 'bg-[#fff0f0]' : 'bg-[#fffbeb]'}`}>
                        <div className="flex items-center gap-[6px] mb-[2px]">
                          <span className={`text-[9px] font-bold uppercase px-[5px] py-[1px] rounded-[3px] ${e.level === 'error' ? 'bg-[#fee2e2] text-[#991b1b]' : 'bg-[#fef3c7] text-[#92400e]'}`}>{e.level}</span>
                          {e.source && <span className="text-[10px] text-[#9a9a9a] font-mono">{e.source}</span>}
                        </div>
                        <p className="text-[11px] font-mono text-[#1f1f1f] leading-relaxed break-all">{e.message}</p>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {tc.eventLog?.length > 0 && (
                <Section title={`Кроки відтворення (${tc.eventLog.length})`}>
                  <div className="flex flex-col gap-[3px]">
                    {tc.eventLog.map((e, i) => {
                      // Pick icon & color based on event type
                      const config: Record<string, { icon: string; color: string }> = {
                        navigation:    { icon: '🔀', color: '#1f1f1f' },
                        click:         { icon: '👆', color: '#1f1f1f' },
                        form_change:   { icon: '✏️', color: '#1f1f1f' },
                        focus:         { icon: '🎯', color: '#9a9a9a' },
                        scroll:        { icon: '↕️', color: '#9a9a9a' },
                        network_error: { icon: '🔴', color: '#dc2626' },
                        console_error: { icon: '⚠️', color: '#d97706' },
                        store_change:  { icon: '🗃️', color: '#059669' },
                      };
                      const { icon, color } = config[e.type] ?? { icon: '•', color: '#1f1f1f' };

                      // Format relative time
                      let relTime = '';
                      if (e.relativeMs != null) {
                        const totalSec = Math.round(e.relativeMs / 1000);
                        if (totalSec < 60) relTime = `${totalSec}с тому`;
                        else {
                          const m = Math.floor(totalSec / 60);
                          const s = totalSec % 60;
                          relTime = s > 0 ? `${m}хв ${s}с тому` : `${m}хв тому`;
                        }
                      }

                      return (
                        <div key={i} className="flex items-start gap-[8px] text-[12px]">
                          <span className="shrink-0 mt-[1px] w-[16px] text-center">{icon}</span>
                          <span style={{ color }} className="flex-1 leading-[1.4]">{e.description}</span>
                          {relTime && (
                            <span className="text-[10px] text-[#9a9a9a] shrink-0 mt-[1px] whitespace-nowrap">{relTime}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Section>
              )}


              {tc.storeDiff && Object.keys(tc.storeDiff).length > 0 && (
                <Section title={`Store diff (${Object.keys(tc.storeDiff).length} змін)`} defaultOpen>
                  <div className="flex flex-col gap-[4px]">
                    {Object.entries(tc.storeDiff).map(([key, { before, after }]) => (
                      <div key={key} className="rounded-[8px] overflow-hidden border border-[#e9e9e9]">
                        <div className="px-[10px] py-[5px] bg-[#f4f4f5] text-[10px] font-bold font-mono text-[#1f1f1f]">
                          {key}
                        </div>
                        <div className="grid grid-cols-2">
                          <div className="px-[10px] py-[6px] bg-[#fff0f0] border-r border-[#e9e9e9]">
                            <div className="text-[9px] font-bold text-[#991b1b] uppercase tracking-wider mb-[3px]">before</div>
                            <pre className="text-[10px] font-mono text-[#991b1b] whitespace-pre-wrap break-all leading-relaxed">
                              {JSON.stringify(before, null, 2)}
                            </pre>
                          </div>
                          <div className="px-[10px] py-[6px] bg-[#f0fdf4]">
                            <div className="text-[9px] font-bold text-[#166534] uppercase tracking-wider mb-[3px]">after</div>
                            <pre className="text-[10px] font-mono text-[#166534] whitespace-pre-wrap break-all leading-relaxed">
                              {JSON.stringify(after, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {tc.storeSnapshot && Object.keys(tc.storeSnapshot).length > 0 && (
                <Section title="Store snapshot (повний)">
                  <pre className="text-[11px] font-mono text-[#1f1f1f] leading-relaxed overflow-x-auto whitespace-pre-wrap bg-[#f4f4f5] rounded-[8px] p-[10px]">
                    {JSON.stringify(tc.storeSnapshot, null, 2)}
                  </pre>
                </Section>
              )}
            </>
          )}

          {(onPrev || onNext) && (
            <div className="flex justify-center pt-[4px]">
              <span className="text-[11px] text-[#cfcfcf]">← → для навігації між багами</span>
            </div>
          )}

        </div>
      </Dialog>
    </>
  );
}
