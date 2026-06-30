'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Bug, BugStatus, BugSeverity, DrawShape, PinElementContext, Project, Annotation } from '@/lib/types';
import BugScreenshot, { isMobileShaped } from './BugScreenshot';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import { ChevronDown, ChevronUp, Copy, Check, Maximize2, X, ArrowLeft, Monitor, Globe, Calendar, Terminal, Code2, ExternalLink, Plus, Link as LinkIcon, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { STATUS_CFG, SEVERITY_CFG } from '@/lib/constants';
import { formatBugMarkdown } from '@/lib/markdownFormatter';
import { useToast } from '@/components/ui/ToastContext';
import Dialog from '@/components/ui/Dialog';
const GithubIcon = ({ size = 16, className = '' }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
);

function pinLabel(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'пін';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'піни';
  return 'пінів';
}

function formatSmartDescription(desc: string | null) {
  if (!desc) return <span className="text-[#9a9a9a]">Без опису</span>;
  const parts = desc.split(/[|\n]/).map(p => p.trim()).filter(Boolean);
  if (parts.length <= 1) {
    return <p className="text-[14px] text-[#1f1f1f] leading-relaxed whitespace-pre-wrap font-medium">{desc}</p>;
  }
  return (
    <div className="flex flex-col gap-[8px] pl-[4px]">
      {parts.map((part, index) => {
        const cleanPart = part.replace(/^[-•*\d+.]\s*/, '');
        return (
          <div key={index} className="flex items-start gap-[10px] text-[13px] leading-relaxed font-medium text-[#1f1f1f]">
            <span className="text-[#9a9a9a] font-bold shrink-0 mt-[1px]">{index + 1}.</span>
            <span className="flex-1">{cleanPart}</span>
          </div>
        );
      })}
    </div>
  );
}

function CollapsibleSection({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-[#e9e9e9] w-full col-span-1 lg:col-span-2">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full flex items-center justify-between py-[20px] hover:text-black transition-colors cursor-pointer text-left focus:outline-none"
      >
        <span className="text-[12px] font-bold text-[#1f1f1f] uppercase tracking-wider">{title}</span>
        {isOpen ? <ChevronUp size={16} className="text-[#9a9a9a]" /> : <ChevronDown size={16} className="text-[#9a9a9a]" />}
      </button>
      {isOpen && <div className="mb-[16px] w-full">{children}</div>}
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  open: 'rgba(255, 96, 96, 0.8)', // Mapped to figma red below
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
          className="h-[26px] px-[10px] rounded-[8px] flex items-center justify-center text-[12px] font-semibold text-white backdrop-blur-[4px] border border-black/10 transition-transform hover:scale-105 active:scale-95 cursor-pointer disabled:cursor-default"
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
          className="w-[26px] h-[26px] rounded-[8px] flex items-center justify-center text-[12px] font-bold text-white backdrop-blur-[4px] border border-black/10 transition-transform hover:scale-105 active:scale-95 cursor-pointer disabled:cursor-default"
          style={{ backgroundColor: SEVERITY_COLORS[parseInt(value as string) || 1] || 'rgba(52, 211, 153, 0.85)' }}
          title={`Змінити критичність. Поточна: ${value}/10`}
        >
          {value}
        </button>
      )}
      
      {open && (
        type === 'status' ? (
          <div className="absolute top-[calc(100%+6px)] left-0 z-50 min-w-[140px] bg-[#1f1f1f] border border-[#3f3f46] rounded-[8px] shadow-xl py-[4px]">
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
          <div className="absolute top-[calc(100%+6px)] left-0 z-50 w-[148px] bg-[#1f1f1f] border border-[#3f3f46] rounded-[10px] shadow-xl p-[6px] grid grid-cols-5 gap-[4px]">
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
    const markdown = formatBugMarkdown(bug);
    navigator.clipboard.writeText(markdown).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }, [bug]);
  return { copy, copied };
}

interface BugDetailViewProps {
  bug: Bug | null;
  project?: Project | null;
  allBugs?: Bug[];
  onStatusChange: (id: string, status: BugStatus) => Promise<void>;
  onSeverityChange?: (id: string, severity: BugSeverity) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onUpdate?: (id: string, updates: Partial<Bug>) => Promise<void>;
}

export default function BugDetailView({ bug, project, allBugs = [], onStatusChange, onSeverityChange, onDelete, onUpdate }: BugDetailViewProps) {
  const router = useRouter();
  const [status,    setStatus]   = useState<BugStatus>('open');
  const [severity,  setSeverity] = useState<BugSeverity>('low');
  const [saving,    setSaving]   = useState(false);
  const [saved,     setSaved]    = useState(false);
  const [lightbox,  setLightbox] = useState<string | null>(null);
  const { copy, copied } = useCopyMarkdown(bug ?? ({} as Bug));
  const { toast, success, error } = useToast();

  const [issueUrl,  setIssueUrl]  = useState<string | null>(null);
  const [isPushing, setIsPushing] = useState(false);
  const [ytIssueUrl,  setYtIssueUrl]  = useState<string | null>(null);
  const [isPushingYt, setIsPushingYt] = useState(false);
  const [qtIssueUrl,  setQtIssueUrl]  = useState<string | null>(null);
  const [isPushingQt, setIsPushingQt] = useState(false);
  const [qtModalOpen, setQtModalOpen] = useState(false);
  const [qtProjects, setQtProjects] = useState<{id: string, name: string}[]>([]);
  const [selectedQtProject, setSelectedQtProject] = useState<string | null>(null);
  const [isLoadingQtProjects, setIsLoadingQtProjects] = useState(false);
  const [activePin, setActivePin] = useState<number | null>(null);

  const [editingAnnotationIndex, setEditingAnnotationIndex] = useState<number | null>(null);
  const [deleteAnnotationIndex, setDeleteAnnotationIndex] = useState<number | null>(null);
  const [deleteBugModalOpen, setDeleteBugModalOpen] = useState(false);
  const [localAnnotationText, setLocalAnnotationText] = useState('');
  const [kebabOpen, setKebabOpen] = useState(false);
  const kebabRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (kebabRef.current && !kebabRef.current.contains(event.target as Node)) {
        setKebabOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (bug) {
      setStatus(bug.status);
      let initialSev = bug.severity as string;
      if (['low', 'medium', 'high', 'critical'].includes(initialSev)) {
        if (initialSev === 'low') initialSev = '1';
        else if (initialSev === 'medium') initialSev = '5';
        else if (initialSev === 'high') initialSev = '8';
        else if (initialSev === 'critical') initialSev = '10';
      }
      setSeverity(initialSev ?? '1');
      setIssueUrl(bug.github_issue_url ?? null);
      setYtIssueUrl(bug.youtrack_issue_url ?? null);
      setQtIssueUrl(bug.quickteam_issue_url ?? null);
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
      success('Статус оновлено');
    } catch (e: any) {
      error(`Помилка: ${e.message}`);
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
      success('Критичність оновлено');
    } catch (e: any) {
      error(`Помилка: ${e.message}`);
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
        success('Issue створено в GitHub');
      } else {
        const errData = await res.json();
        error(errData.error || 'Помилка інтеграції з GitHub');
      }
    } catch (e) {
      console.error(e);
      error('Помилка при створенні Issue');
    } finally {
      setIsPushing(false);
    }
  };

  const pushToYoutrack = async () => {
    setIsPushingYt(true);
    try {
      const res = await fetch(`/api/bugs/${bug.id}/youtrack`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setYtIssueUrl(data.url);
        success('Issue створено в YouTrack');
      } else {
        const errData = await res.json();
        error(errData.error || 'Помилка інтеграції з YouTrack');
      }
    } catch (e) {
      console.error(e);
      error('Помилка при створенні Issue в YouTrack');
    } finally {
      setIsPushingYt(false);
    }
  };

  const openQtModal = async () => {
    setQtModalOpen(true);
    setIsLoadingQtProjects(true);
    try {
      const res = await fetch(`/api/projects/${bug.project_id}/quickteam/projects`);
      if (res.ok) {
        const data = await res.json();
        setQtProjects(data.projects || []);
      } else {
        error('Помилка завантаження проєктів з QuickTeam');
      }
    } catch (e) {
      error('Помилка завантаження проєктів');
    } finally {
      setIsLoadingQtProjects(false);
    }
  };

  const pushToQuickTeam = async () => {
    setIsPushingQt(true);
    try {
      const res = await fetch(`/api/bugs/${bug.id}/quickteam`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: selectedQtProject })
      });
      if (res.ok) {
        const data = await res.json();
        setQtIssueUrl(data.url);
        success('Задачу створено в QuickTeam');
        setQtModalOpen(false);
      } else {
        const errData = await res.json();
        error(errData.error || 'Помилка інтеграції з QuickTeam');
      }
    } catch (e) {
      console.error(e);
      error('Помилка при створенні задачі в QuickTeam');
    } finally {
      setIsPushingQt(false);
    }
  };

  const handleSaveAnnotation = async (index: number) => {
    if (index < 0 || index >= annotations.length) return;
    setSaving(true);
    try {
      const newAnns = [...annotations];
      newAnns[index] = { ...newAnns[index], text: localAnnotationText };
      await onUpdate?.(bug.id, { json_annotations: newAnns });
      setEditingAnnotationIndex(null);
      success('Мітку збережено');
    } catch (e: any) {
      error(`Помилка: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAnnotationConfirm = async () => {
    if (deleteAnnotationIndex === null) return;
    const index = deleteAnnotationIndex;
    setSaving(true);
    try {
      const ann = annotations[index];
      const pinNum = ann.index ?? index + 1;
      const newAnns = annotations.filter((_, i) => i !== index);
      const newShapes = shapes.filter(s => !(s.type === 'pin' && s.pinNumber === pinNum));
      
      await onUpdate?.(bug.id, { json_annotations: newAnns, json_shapes: newShapes });
      success('Мітку видалено');
    } catch (e: any) {
      error(`Помилка: ${e.message}`);
    } finally {
      setSaving(false);
      setDeleteAnnotationIndex(null);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await onDelete?.(bug.id);
    } catch (e: any) {
      error(`Помилка: ${e.message}`);
      setSaving(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-row bg-[#f4f4f5]">
      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
      
      {typeof document !== 'undefined' && createPortal(
        <Dialog isOpen={qtModalOpen} onClose={() => setQtModalOpen(false)} title="Експорт в QuickTeam">
          {isLoadingQtProjects ? (
            <div className="text-[13px] text-[#9a9a9a] py-[20px] text-center">Завантаження проєктів...</div>
          ) : (
            <div className="flex flex-col gap-[12px]">
              <p className="text-[13px] text-[#5d5d5d]">Оберіть проєкт, в який буде створено цю задачу:</p>
              <select 
                className="w-full text-[13px] bg-white border border-[#e9e9e9] rounded-[8px] px-[12px] py-[8px] outline-none focus:border-[#4F46E5]"
                value={selectedQtProject || ''}
                onChange={e => setSelectedQtProject(e.target.value)}
              >
                <option value="" disabled>Оберіть проєкт...</option>
                {qtProjects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <div className="flex justify-end gap-[8px] mt-[12px]">
                <button onClick={() => setQtModalOpen(false)} className="px-[16px] py-[8px] text-[13px] font-semibold text-[#5d5d5d] hover:bg-[#f4f4f5] rounded-[8px] transition-colors">Скасувати</button>
                <button onClick={pushToQuickTeam} disabled={isPushingQt || !selectedQtProject} className="px-[16px] py-[8px] text-[13px] font-bold bg-[#1f1f1f] text-white hover:bg-[#2a2a2a] rounded-[8px] transition-colors disabled:opacity-50">
                  {isPushingQt ? 'Створюємо...' : 'Експортувати'}
                </button>
              </div>
            </div>
          )}
        </Dialog>,
        document.body
      )}

      {/* ── Left Sidebar (Pins) — desktop only ── */}
      <div className="hidden md:flex w-[360px] shrink-0 bg-[#ffffff] border-r border-[#e9e9e9] flex-col h-full z-20">
        <div className="pt-[16px] md:pt-[24px] pb-[16px] px-[16px] md:px-[24px] shrink-0 flex items-center gap-[12px]">
          <Link
            href={`/projects/${bug.project_id}`}
            className="text-[#9a9a9a] hover:text-[#1f1f1f] transition-colors p-[8px] -ml-[8px] rounded-[8px] hover:bg-[#f4f4f5]"
          >
            <ArrowLeft size={20} strokeWidth={1.5} />
          </Link>
          <h2 className="text-[20px] font-bold text-[#1f1f1f]">Мітки ({annotations.length})</h2>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar px-[16px] md:px-[24px] pb-[32px] flex flex-col gap-[12px]">
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
                  {editingAnnotationIndex === i ? (
                    <div className="flex flex-col gap-[8px]">
                      <textarea 
                        className="w-full text-[13px] text-[#1f1f1f] font-medium leading-[20px] bg-white border border-[#e9e9e9] rounded-[6px] p-[8px] outline-none focus:border-[#4F46E5] resize-none"
                        rows={2}
                        value={localAnnotationText}
                        onChange={e => setLocalAnnotationText(e.target.value)}
                        autoFocus
                      />
                      <div className="flex items-center gap-[6px]">
                        <button onClick={(e) => { e.stopPropagation(); setEditingAnnotationIndex(null); }} className="text-[12px] px-[12px] py-[6px] rounded-[6px] hover:bg-[#e9e9e9] transition-colors">Скасувати</button>
                        <button onClick={(e) => { e.stopPropagation(); handleSaveAnnotation(i); }} disabled={saving} className="text-[12px] font-bold px-[12px] py-[6px] rounded-[6px] bg-[#1f1f1f] text-white hover:bg-[#3f3f46] transition-colors disabled:opacity-50">Зберегти</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-[8px]">
                      <p className="text-[13px] text-[#1f1f1f] font-medium leading-[20px] break-words flex-1 pt-[2px]">
                        {ann.text || <em className="text-[#9a9a9a] not-italic font-normal">Без тексту</em>}
                      </p>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-[4px] shrink-0">
                        <button onClick={(e) => { e.stopPropagation(); setLocalAnnotationText(ann.text || ''); setEditingAnnotationIndex(i); }} className="w-[28px] h-[28px] flex items-center justify-center rounded-[6px] hover:bg-white text-[#5d5d5d] hover:text-[#1f1f1f] shadow-sm transition-all border border-transparent hover:border-[#e9e9e9]" title="Редагувати">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteAnnotationIndex(i); }} className="w-[28px] h-[28px] flex items-center justify-center rounded-[6px] hover:bg-red-50 text-[#5d5d5d] hover:text-red-500 shadow-sm transition-all border border-transparent hover:border-red-100" title="Видалити">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {ann.attachments && ann.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-[8px] mt-[4px]">
                      {ann.attachments.map((att, attIdx) => {
                        const isImage = att.type.startsWith('image/');
                        return isImage ? (
                          <div key={attIdx} onClick={(e) => { e.stopPropagation(); setLightbox(att.url); }} className="w-[48px] h-[48px] rounded-[6px] overflow-hidden border border-[#e9e9e9] cursor-pointer hover:opacity-80 transition-opacity">
                            <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <a key={attIdx} href={att.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="flex items-center justify-center w-[48px] h-[48px] rounded-[6px] bg-[#f0f4ff] border border-[#e0e7ff] text-[#4F46E5] hover:bg-[#e0e7ff] transition-colors" title={att.name}>
                            <span className="text-[10px] font-bold tracking-wider">{att.name.split('.').pop()?.toUpperCase() || 'FILE'}</span>
                          </a>
                        );
                      })}
                    </div>
                  )}

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
        <div className="pt-[16px] md:pt-[24px] pb-[16px] shrink-0 flex flex-col md:flex-row md:items-center md:justify-between px-[16px] md:px-[32px] sticky top-0 z-50 bg-[#ffffff] gap-[8px] md:gap-0">
          <div className="flex items-center justify-between w-full md:w-auto gap-[16px]">
            <div className="flex items-center gap-[8px] min-w-0">
              <Link href={`/projects/${bug.project_id}`} className="md:hidden text-[#9a9a9a] hover:text-[#1f1f1f] transition-colors p-[8px] -ml-[8px] rounded-[8px] hover:bg-[#f4f4f5]">
                <ArrowLeft size={20} strokeWidth={1.5} />
              </Link>
              <h1 className="text-[24px] font-bold text-[#1f1f1f] tracking-tight truncate">
                {bug.human_id || bug.id.split('-')[0].toUpperCase()}
              </h1>
              <div className="relative" ref={kebabRef}>
                <button onClick={() => setKebabOpen(!kebabOpen)} className="w-[32px] h-[32px] flex items-center justify-center rounded-[8px] hover:bg-[#e9e9e9] text-[#5d5d5d] transition-colors">
                  <MoreVertical size={18} />
                </button>
                {kebabOpen && (
                  <div className="absolute top-[calc(100%+4px)] left-0 z-50 min-w-[160px] bg-white border border-[#e9e9e9] rounded-[8px] shadow-lg py-[4px]">
                    <button onClick={() => { setDeleteBugModalOpen(true); setKebabOpen(false); }} className="w-full text-left px-[12px] py-[8px] text-[13px] font-medium text-[#ef4444] hover:bg-[#fee2e2] flex items-center gap-[8px]">
                      <Trash2 size={14} /> Видалити баг
                    </button>
                  </div>
                )}
              </div>
              {saved && (
                <span className="hidden md:flex items-center gap-[4px] text-[12px] text-[#10b981] font-semibold bg-[#f0fdf4] px-[8px] py-[4px] rounded-[6px]">
                  <Check size={14} /> Збережено
                </span>
              )}
            </div>
            
            <div className="flex items-center shrink-0 bg-[#f4f4f5] rounded-[10px]">
              <button 
                onClick={() => {
                  const idx = allBugs.findIndex(b => b.id === bug.id);
                  if (idx > 0) router.push(`/projects/${bug.project_id}/bugs/${allBugs[idx - 1].id}`);
                }}
                disabled={allBugs.findIndex(b => b.id === bug.id) <= 0}
                className="w-[32px] shrink-0 h-[32px] flex items-center justify-center text-[#9a9a9a] hover:text-[#1f1f1f] hover:bg-[#e9e9e9] rounded-l-[10px] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronUp size={16} strokeWidth={2} />
              </button>
              <div className="w-px h-[16px] shrink-0 bg-[#e9e9e9]" />
              <button 
                onClick={() => {
                  const idx = allBugs.findIndex(b => b.id === bug.id);
                  if (idx >= 0 && idx < allBugs.length - 1) router.push(`/projects/${bug.project_id}/bugs/${allBugs[idx + 1].id}`);
                }}
                disabled={allBugs.findIndex(b => b.id === bug.id) === -1 || allBugs.findIndex(b => b.id === bug.id) === allBugs.length - 1}
                className="w-[32px] shrink-0 h-[32px] flex items-center justify-center text-[#9a9a9a] hover:text-[#1f1f1f] hover:bg-[#e9e9e9] rounded-r-[10px] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronDown size={16} strokeWidth={2} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-[16px]">
            {/* The "Збережено" badge on mobile should be below the title or somewhere visible, but for now we'll put it outside if it didn't fit, actually we moved it inside the title container */}
            {saved && (
              <span className="md:hidden flex items-center gap-[4px] text-[12px] text-[#10b981] font-semibold bg-[#f0fdf4] px-[8px] py-[4px] rounded-[6px] w-fit">
                <Check size={14} /> Збережено
              </span>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-[12px] w-full md:w-auto mt-[8px] md:mt-0">
            {project?.youtrack_url && project?.youtrack_token && project?.youtrack_project && (
              ytIssueUrl ? (
                  <a
                    href={ytIssueUrl}
                    target="_blank"
                    rel="noreferrer"
                    title="Переглянути в YouTrack"
                    className="flex items-center justify-center gap-[8px] px-[12px] md:px-[16px] h-[36px] rounded-[8px] text-[13px] font-bold transition-all bg-[#f0f4ff] text-[#4F46E5] hover:bg-[#e0e7ff]"
                  >
                    <img src="/icons/YouTrack_icon.svg" alt="YouTrack" width="16" height="16" />
                    <span className="hidden md:inline">YouTrack Issue</span>
                    <ExternalLink size={14} className="opacity-60 hidden md:block" />
                  </a>
              ) : (
                  <button
                    onClick={pushToYoutrack}
                    disabled={isPushingYt}
                    className="flex items-center justify-center gap-[8px] px-[12px] md:px-[16px] h-[36px] rounded-[8px] text-[13px] font-bold transition-all bg-[#f4f4f5] text-[#1f1f1f] hover:bg-[#e9e9e9] disabled:opacity-40"
                  >
                    <img src="/icons/YouTrack_icon.svg" alt="YouTrack" width="16" height="16" className="grayscale" />
                    <span className="hidden md:inline">{isPushingYt ? 'Створюємо...' : 'YouTrack Issue'}</span>
                  </button>
              )
            )}

            {project?.quickteam_token && project?.quickteam_organization_id && (
              qtIssueUrl ? (
                  <a
                    href={qtIssueUrl}
                    target="_blank"
                    rel="noreferrer"
                    title="Переглянути в QuickTeam"
                    className="flex items-center justify-center gap-[8px] px-[12px] md:px-[16px] h-[36px] rounded-[8px] text-[13px] font-bold transition-all bg-[#f0f4ff] text-[#4F46E5] hover:bg-[#e0e7ff]"
                  >
                    <img src="/logo-min.svg" alt="QuickTeam" width="16" height="16" />
                    <span className="hidden md:inline">QuickTeam Task</span>
                    <ExternalLink size={14} className="opacity-60 hidden md:block" />
                  </a>
              ) : (
                  <button
                    onClick={openQtModal}
                    disabled={isPushingQt}
                    className="flex items-center justify-center gap-[8px] px-[12px] md:px-[16px] h-[36px] rounded-[8px] text-[13px] font-bold transition-all bg-[#f4f4f5] text-[#1f1f1f] hover:bg-[#e9e9e9] disabled:opacity-40"
                  >
                    <img src="/logo-min.svg" alt="QuickTeam" width="16" height="16" className="grayscale" />
                    <span className="hidden md:inline">{isPushingQt ? 'Створюємо...' : 'QuickTeam Task'}</span>
                  </button>
              )
            )}

            {project?.github_repo && (
              issueUrl ? (
                  <a
                    href={issueUrl}
                    target="_blank"
                    rel="noreferrer"
                    title="Переглянути на GitHub"
                    className="flex items-center justify-center gap-[8px] px-[12px] md:px-[16px] h-[36px] rounded-[8px] text-[13px] font-bold transition-all bg-[#f0f4ff] text-[#4F46E5] hover:bg-[#e0e7ff]"
                  >
                    <GithubIcon size={16} />
                    <span className="hidden md:inline">Github Issue</span>
                    <ExternalLink size={14} className="opacity-60 hidden md:block" />
                  </a>
              ) : (
                  <button
                    onClick={pushToGithub}
                    disabled={isPushing}
                    className="flex items-center justify-center gap-[8px] px-[12px] md:px-[16px] h-[36px] rounded-[8px] text-[13px] font-bold transition-all bg-[#f4f4f5] text-[#1f1f1f] hover:bg-[#e9e9e9] disabled:opacity-40"
                  >
                    <GithubIcon size={16} />
                    <span className="hidden md:inline">{isPushing ? 'Створюємо...' : 'Github Issue'}</span>
                  </button>
              )
            )}

            <button
              onClick={copy}
              className="md:ml-0 ml-auto flex items-center justify-center gap-[8px] px-[16px] h-[36px] rounded-[8px] text-[13px] font-medium transition-colors bg-[#1f1f1f] text-white hover:bg-[#2a2a2a]"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span>{copied ? 'Скопійовано' : 'Копіювати MD'}</span>
            </button>
          </div>
        </div>

        {/* Metadata Strip */}
        <div className="flex flex-wrap items-center gap-[16px] px-[16px] md:px-[32px] py-[10px] bg-[#ffffff] border-y border-[#e9e9e9] shrink-0 w-full relative z-40">
          <div className="flex items-center gap-[8px] shrink-0">
            <span className="text-[12px] text-[#71717a] font-normal">Статус:</span>
            <CustomDropdown value={status} options={STATUS_CFG} onChange={handleStatusChange} saving={saving} type="status" />
          </div>
          <div className="w-px h-[16px] bg-[#e9e9e9] shrink-0" />
          <div className="flex items-center gap-[8px] shrink-0">
            <span className="text-[12px] text-[#71717a] font-normal">Критичність:</span>
            <CustomDropdown value={severity} options={SEVERITY_CFG} onChange={handleSeverityChange} saving={saving} type="severity" />
          </div>
          <div className="w-px h-[16px] bg-[#e9e9e9] shrink-0" />
          <div className="flex items-center gap-[6px] shrink-0 text-[#5d5d5d]">
            <Calendar size={14} className="text-[#9a9a9a]" />
            <span className="text-[13px] font-medium">
              {format(new Date(bug.created_at), 'dd.MM.yyyy HH:mm')}
            </span>
          </div>
          {tc?.viewport && (
            <>
              <div className="w-px h-[16px] bg-[#e9e9e9] shrink-0" />
              <div className="flex items-center gap-[6px] shrink-0 text-[#5d5d5d]">
                <Monitor size={14} className="text-[#9a9a9a]" />
                <span className="text-[13px] font-medium">{tc.viewport}</span>
              </div>
            </>
          )}
          {tc?.route && (() => {
            let domain = project?.connected_domain;
            if (domain && !domain.startsWith('http')) {
              domain = domain.includes('localhost') || domain.includes('127.0.0.1') ? `http://${domain}` : `https://${domain}`;
            }
            const routeHref = tc.route.startsWith('http') 
              ? tc.route 
              : domain 
                ? `${domain}${tc.route.startsWith('/') ? '' : '/'}${tc.route}` 
                : undefined;

            const content = (
              <div className="flex items-center gap-[6px] min-w-0">
                <Globe size={13} className="text-[#9a9a9a] shrink-0" />
                <span className="text-[12px] text-[#5d5d5d] group-hover:text-[#1f1f1f] truncate font-medium font-mono">
                  {tc.route}
                </span>
                <ExternalLink size={11} className="text-[#9a9a9a] group-hover:text-[#5d5d5d] shrink-0 transition-colors ml-[2px]" />
              </div>
            );

            return routeHref ? (
              <a
                href={routeHref}
                target="_blank"
                rel="noopener noreferrer"
                title={`Перейти на ${tc.route}`}
                className="group ml-auto flex items-center bg-[#f4f4f5] hover:bg-[#e9e9e9] border border-[#e9e9e9] hover:border-[#d4d4d8] rounded-[8px] py-[4px] px-[8px] gap-[8px] shrink-0 max-w-[320px] transition-all cursor-pointer"
              >
                {content}
              </a>
            ) : (
              <div className="ml-auto flex items-center bg-[#f4f4f5] border border-[#e9e9e9] rounded-[8px] py-[4px] px-[8px] gap-[8px] shrink-0 max-w-[320px]">
                {content}
              </div>
            );
          })()}
        </div>

        {/* Screenshot Container */}
        <div className={`w-full shrink-0 border-b border-[#e9e9e9] ${isMobileShaped(bug) ? 'bg-[#f8f8f9]' : 'bg-[#ffffff]'}`}>
          <div className={`flex items-center justify-center min-h-[300px] ${isMobileShaped(bug) ? 'py-[32px] px-[16px] md:px-[24px]' : 'py-0 px-0'}`}>
            {bug.image_url ? (
              <BugScreenshot bug={bug} variant="page">
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
                  onClick={() => { if (bug.image_url) setLightbox(bug.image_url); }}
                  className="absolute bottom-[24px] right-[24px] w-[40px] h-[40px] rounded-[10px] bg-black/60 hover:bg-black/80 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-md shadow-lg pointer-events-auto"
                  title="На весь екран"
                >
                  <Maximize2 size={18} />
                </button>
              </BugScreenshot>
            ) : (
              <div className="text-[#9a9a9a] text-[14px]">Без скріншоту</div>
            )}
          </div>
        </div>

        {/* Details Grid */}
        <div className="px-[16px] md:px-[24px] py-[12px] flex flex-col max-w-[1200px] mx-auto w-full">
          
          {/* Description Block — only show if there are no annotations to prevent duplicate text display */}
          {bug.description && annotations.length === 0 && (
            <CollapsibleSection title="Опис проблеми" defaultOpen>
              {formatSmartDescription(bug.description)}
            </CollapsibleSection>
          )}

          {/* Pins Block */}
          {annotations.length > 0 && (
            <CollapsibleSection title={`Розставлені піни (${annotations.length})`} defaultOpen>
              <div className="flex flex-col gap-[10px]">
                {annotations.map((ann, i) => {
                  const rawShape = shapes.find(
                    (s: DrawShape) => s.type === 'pin' && (s.pinNumber === (ann.index ?? i + 1) || shapes.indexOf(s) === i)
                  );
                  const ctx: PinElementContext | undefined = rawShape?.elementContext;
                  return (
                    <div key={i} className="border border-[#e9e9e9] rounded-[10px] p-[14px] flex flex-col gap-[8px]">
                      <div className="flex items-center gap-[10px]">
                        <div className="w-[18px] h-[18px] bg-[#ef4444] text-white rounded-full flex items-center justify-center text-[9px] font-bold shrink-0">
                          {ann.index ?? i + 1}
                        </div>
                        <span className="text-[13px] text-[#1f1f1f] font-semibold">
                          {ann.text || <span className="text-[#cfcfcf] font-normal italic">без коментаря</span>}
                        </span>
                      </div>
                      {ctx && (
                        <div className="pl-[28px] flex flex-col gap-[6px] text-[12px] text-[#555]">
                          <div className="flex items-center gap-[6px] flex-wrap">
                            <span className="text-[9px] font-bold text-[#9a9a9a] uppercase tracking-wider">Selector:</span>
                            <code className="text-[11px] font-mono text-[#1f1f1f] bg-[#f4f4f5] px-[5px] py-[1px] rounded-[3px] break-all">{ctx.selector}</code>
                            {ctx.id && <span className="text-[10px] text-[#9a9a9a]">#{ctx.id}</span>}
                          </div>
                          {ctx.reactComponent && (
                            <div className="flex items-center gap-[6px] flex-wrap">
                              <span className="text-[9px] font-bold text-[#9a9a9a] uppercase tracking-wider">Component:</span>
                              <code className="text-[11px] font-mono text-[#1f1f1f] bg-[#f4f4f5] px-[5px] py-[1px] rounded-[3px]">{ctx.reactComponent.name}</code>
                              {ctx.reactComponent.filePath && (
                                <span className="text-[10px] font-mono text-[#9a9a9a] break-all">
                                  ({ctx.reactComponent.filePath}{ctx.reactComponent.lineNumber ? `:${ctx.reactComponent.lineNumber}` : ''})
                                </span>
                              )}
                            </div>
                          )}
                          {ctx.dataSources && ctx.dataSources.length > 0 && (
                            <div className="flex items-center gap-[6px] flex-wrap">
                              <span className="text-[9px] font-bold text-[#9a9a9a] uppercase tracking-wider">Data:</span>
                              {ctx.dataSources.map((src, j) => (
                                <code key={j} className="text-[11px] font-mono text-[#1f1f1f] bg-[#f4f4f5] px-[5px] py-[1px] rounded-[3px]">{src}</code>
                              ))}
                            </div>
                          )}
                          {ctx.innerText && (
                            <div className="text-[11px] text-[#71717a] italic bg-[#fafafa] border-l-2 border-[#e9e9e9] pl-[8px] py-[3px] rounded-r-[4px]">
                              "{ctx.innerText}"
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CollapsibleSection>
          )}

          {/* Steps to reproduce */}
          {tc?.eventLog && tc.eventLog.length > 0 && (
            <CollapsibleSection title={`Кроки відтворення (${tc.eventLog.length})`}>
              <div className="flex flex-col gap-[6px]">
                {tc.eventLog.map((e, i) => {
                  const cfg: Record<string, { icon: string; color: string }> = {
                    navigation:    { icon: '🔀', color: '#1f1f1f' },
                    click:         { icon: '👆', color: '#1f1f1f' },
                    form_change:   { icon: '✏️', color: '#1f1f1f' },
                    focus:         { icon: '🎯', color: '#9a9a9a' },
                    scroll:        { icon: '↕️', color: '#9a9a9a' },
                    network_error: { icon: '🔴', color: '#dc2626' },
                    console_error: { icon: '⚠️', color: '#d97706' },
                    store_change:  { icon: '🗃️', color: '#059669' },
                  };
                  const { icon, color } = cfg[e.type] ?? { icon: '•', color: '#1f1f1f' };
                  
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
                    <div key={i} className="flex items-center justify-between gap-[12px] py-[8px] border-b border-[#f4f4f5] last:border-b-0 px-[4px]">
                      <div className="flex items-start gap-[10px]">
                        <span className="shrink-0 w-[18px] text-center text-[12px] pt-[1px]">{icon}</span>
                        <span className="flex-1 text-[13px] leading-relaxed font-medium" style={{ color }}>{e.description}</span>
                      </div>
                      {relTime && (
                        <span className="text-[11px] text-[#9a9a9a] shrink-0 font-medium">{relTime}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </CollapsibleSection>
          )}

          {/* Network requests */}
          {tc?.networkRequests && tc.networkRequests.length > 0 && (
            <CollapsibleSection title={`Мережеві запити (${tc.networkRequests.length})`}>
              <div className="flex flex-col gap-[6px]">
                {tc.networkRequests.map((r, i) => {
                  return (
                    <div key={i} className={`rounded-[8px] border text-[11px] font-mono overflow-hidden bg-white ${r.isError ? 'border-red-200' : 'border-[#e9e9e9]'}`}>
                      <div className="flex items-center gap-[10px] px-[12px] py-[8px] flex-wrap">
                        <span className={`text-[9px] font-bold px-[6px] py-[2px] rounded-[4px] shrink-0 ${r.isError ? 'bg-[#fee2e2] text-[#991b1b]' : 'bg-[#dcfce7] text-[#166534]'}`}>
                          {r.status || 'ERR'}
                        </span>
                        <span className="text-[#9a9a9a] shrink-0 font-bold">{r.method}</span>
                        <span className={`flex-1 truncate ${r.isError ? 'text-[#dc2626]' : 'text-[#1f1f1f]'}`} title={r.url}>
                          {r.url}
                        </span>
                        <span className="text-[#9a9a9a] shrink-0">{r.durationMs}ms</span>
                      </div>
                      {r.isError && (r.requestBody || r.responseBody || r.requestHeaders) && (
                        <div className="border-t border-red-100 bg-[#fffbfc] px-[12px] py-[8px] flex flex-col gap-[6px]">
                          {r.requestHeaders && (
                            <div>
                              <div className="text-[9px] font-bold text-[#9a9a9a] mb-[2px] uppercase tracking-wider">Headers</div>
                              <pre className="text-[10px] text-[#1f1f1f] bg-[#fee2e2]/40 rounded-[4px] px-[8px] py-[4px] overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                                {Object.entries(r.requestHeaders).map(([k, v]) => `${k}: ${v}`).join('\n')}
                              </pre>
                            </div>
                          )}
                          {r.requestBody && (
                            <div>
                              <div className="text-[9px] font-bold text-[#9a9a9a] mb-[2px] uppercase tracking-wider">Payload</div>
                              <pre className="text-[10px] text-[#1f1f1f] bg-[#fee2e2]/40 rounded-[4px] px-[8px] py-[4px] overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">{r.requestBody}</pre>
                            </div>
                          )}
                          {r.responseBody && (
                            <div>
                              <div className="text-[9px] font-bold text-[#991b1b] mb-[2px] uppercase tracking-wider">Response</div>
                              <pre className="text-[10px] text-[#991b1b] bg-[#fee2e2]/40 rounded-[4px] px-[8px] py-[4px] overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">{r.responseBody}</pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CollapsibleSection>
          )}

          {/* Console errors */}
          {tc?.consoleErrors && tc.consoleErrors.length > 0 && (
            <CollapsibleSection title={`Консоль (${tc.consoleErrors.length})`}>
              <div className="flex flex-col gap-[6px]">
                {tc.consoleErrors.map((e, i) => (
                  <div
                    key={i}
                    className={`px-[12px] py-[8px] rounded-[8px] border text-[11px] font-mono ${
                      e.level === 'error' ? 'bg-[#fffcfc] border-[#fee2e2]' : 'bg-[#fffdfa] border-[#fef3c7]'
                    }`}
                  >
                    <div className="flex items-center gap-[6px] mb-[4px]">
                      <Terminal size={12} className={e.level === 'error' ? 'text-[#ef4444]' : 'text-[#f59e0b]'} />
                      <span className={`text-[9px] font-bold uppercase px-[6px] py-[1.5px] rounded-[4px] tracking-wider ${
                        e.level === 'error' ? 'bg-[#fee2e2] text-[#ef4444]' : 'bg-[#fef3c7] text-[#f59e0b]'
                      }`}>
                        {e.level}
                      </span>
                    </div>
                    <p className="text-[#1f1f1f] leading-relaxed break-all font-medium">{e.message}</p>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Store Diff (State changes) */}
          {tc?.storeDiff && Object.keys(tc.storeDiff).length > 0 && (
            <CollapsibleSection title="Зміни стану (Store Diff)">
              <div className="flex flex-col gap-[8px]">
                {Object.entries(tc.storeDiff).map(([key, { before, after }]) => (
                  <div key={key} className="border border-[#e9e9e9] rounded-[10px] overflow-hidden">
                    <div className="px-[12px] py-[6px] bg-[#f4f4f5] text-[10px] font-bold font-mono text-[#1f1f1f] border-b border-[#e9e9e9]">
                      {key}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2">
                      <div className="px-[12px] py-[8px] bg-[#fffbfb] border-r border-[#e9e9e9]">
                        <div className="text-[9px] font-bold text-[#991b1b] uppercase tracking-wider mb-[3px]">Before</div>
                        <pre className="text-[10px] font-mono text-[#991b1b] whitespace-pre-wrap break-all leading-relaxed">
                          {JSON.stringify(before, null, 2)}
                        </pre>
                      </div>
                      <div className="px-[12px] py-[8px] bg-[#fcfdfc]">
                        <div className="text-[9px] font-bold text-[#166534] uppercase tracking-wider mb-[3px]">After</div>
                        <pre className="text-[10px] font-mono text-[#166534] whitespace-pre-wrap break-all leading-relaxed">
                          {JSON.stringify(after, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* React Component and Context */}
          {tc && (tc.component || tc.viewport || tc.userAgent) && (
            <CollapsibleSection title="React Компонент та контекст">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-[12px] text-[12px]">
                {tc.component && (
                  <div className="border border-[#e9e9e9] rounded-[10px] p-[12px] flex flex-col gap-[4px]">
                    <span className="text-[9px] font-bold text-[#9a9a9a] uppercase tracking-wider">Компонент:</span>
                    <code className="text-[12px] font-mono text-[#1f1f1f] bg-[#f4f4f5] px-[6px] py-[2px] rounded-[4px] inline-block w-fit font-bold">{tc.component.name}</code>
                    {tc.component.filePath && (
                      <span className="text-[11px] font-mono text-[#71717a] break-all">
                        {tc.component.filePath}{tc.component.lineNumber ? `:${tc.component.lineNumber}` : ''}
                      </span>
                    )}
                    {tc.component.props && Object.keys(tc.component.props).length > 0 && (
                      <div className="mt-[4px]">
                        <span className="text-[9px] font-bold text-[#9a9a9a] uppercase tracking-wider">Props:</span>
                        <pre className="mt-[2px] text-[10px] font-mono text-[#71717a] bg-[#fafafa] rounded-[4px] p-[6px] border border-[#e9e9e9] leading-relaxed overflow-x-auto">
                          {JSON.stringify(tc.component.props, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
                <div className="border border-[#e9e9e9] rounded-[10px] p-[12px] flex flex-col gap-[8px]">
                  {tc.viewport && (
                    <div className="flex flex-col gap-[2px]">
                      <span className="text-[9px] font-bold text-[#9a9a9a] uppercase tracking-wider">Viewport:</span>
                      <code className="text-[11px] font-mono text-[#1f1f1f] bg-[#f4f4f5] px-[6px] py-[2px] rounded-[4px] inline-block w-fit">{tc.viewport}</code>
                    </div>
                  )}
                  {tc.userAgent && (
                    <div className="flex flex-col gap-[2px]">
                      <span className="text-[9px] font-bold text-[#9a9a9a] uppercase tracking-wider">User Agent:</span>
                      <span className="text-[11px] text-[#555] break-all bg-[#fafafa] p-[6px] rounded-[4px] border border-[#e9e9e9]">{tc.userAgent}</span>
                    </div>
                  )}
                </div>
              </div>
            </CollapsibleSection>
          )}

          {/* Design Audit */}
          {tc?.designAudit && (
            <CollapsibleSection title="Аудит дизайну (Design Audit)">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-[10px] text-[11px]">
                {tc.designAudit.fonts && tc.designAudit.fonts.length > 0 && (
                  <div className="border border-[#e9e9e9] rounded-[10px] p-[10px]">
                    <span className="text-[9px] font-bold text-[#9a9a9a] uppercase tracking-wider block mb-[4px]">Шрифти</span>
                    <ul className="text-[#1f1f1f] space-y-[3px]">
                      {tc.designAudit.fonts.map((f, idx) => <li key={idx} className="font-medium truncate">{f.value} <span className="text-[#9a9a9a]">({f.count})</span></li>)}
                    </ul>
                  </div>
                )}
                {tc.designAudit.colors && tc.designAudit.colors.length > 0 && (
                  <div className="border border-[#e9e9e9] rounded-[10px] p-[10px]">
                    <span className="text-[9px] font-bold text-[#9a9a9a] uppercase tracking-wider block mb-[4px]">Кольори</span>
                    <div className="flex flex-wrap gap-[4px]">
                      {tc.designAudit.colors.map((c, idx) => (
                        <span key={idx} className="font-mono bg-[#f4f4f5] px-[5px] py-[1px] rounded-[3px] flex items-center gap-[3px] font-medium">
                          <span className="w-[8px] h-[8px] rounded-full border border-black/10 inline-block shrink-0" style={{ backgroundColor: c.value }} />
                          {c.value} ({c.count})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {tc.designAudit.fontSizes && tc.designAudit.fontSizes.length > 0 && (
                  <div className="border border-[#e9e9e9] rounded-[10px] p-[10px]">
                    <span className="text-[9px] font-bold text-[#9a9a9a] uppercase tracking-wider block mb-[4px]">Розміри шрифтів</span>
                    <div className="flex flex-wrap gap-[4px]">
                      {tc.designAudit.fontSizes.map((fs, idx) => (
                        <span key={idx} className="font-mono bg-[#f4f4f5] px-[5px] py-[1px] rounded-[3px] font-medium">
                          {fs.value} ({fs.count})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleSection>
          )}


        </div>
      </div>

      <Dialog
        isOpen={deleteAnnotationIndex !== null}
        onClose={() => setDeleteAnnotationIndex(null)}
        title="Підтвердження видалення мітки"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <p className="text-[14px] text-[#5d5d5d]">
            Ви впевнені, що хочете видалити цю мітку? Цю дію неможливо скасувати, і вона також зникне зі скріншоту та промпту.
          </p>
          <div className="flex justify-end gap-[8px] mt-2">
            <button
              onClick={() => setDeleteAnnotationIndex(null)}
              className="px-[16px] py-[8px] text-[13px] font-medium text-[#5d5d5d] hover:text-[#1f1f1f] hover:bg-[#f4f4f5] rounded-[8px] transition-colors cursor-pointer"
            >
              Скасувати
            </button>
            <button
              onClick={handleDeleteAnnotationConfirm}
              disabled={saving}
              className="px-[16px] py-[8px] text-[13px] font-bold text-white bg-red-500 hover:bg-red-600 rounded-[8px] transition-colors cursor-pointer disabled:opacity-50"
            >
              Видалити
            </button>
          </div>
        </div>
      </Dialog>

      <Dialog
        isOpen={deleteBugModalOpen}
        onClose={() => setDeleteBugModalOpen(false)}
        title="Підтвердження видалення багу"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <p className="text-[14px] text-[#5d5d5d]">
            Ви впевнені, що хочете видалити цей баг? Цю дію неможливо скасувати.
          </p>
          <div className="flex justify-end gap-[8px] mt-2">
            <button
              onClick={() => setDeleteBugModalOpen(false)}
              className="px-[16px] py-[8px] text-[13px] font-medium text-[#5d5d5d] hover:text-[#1f1f1f] hover:bg-[#f4f4f5] rounded-[8px] transition-colors cursor-pointer"
            >
              Скасувати
            </button>
            <button
              onClick={() => {
                setDeleteBugModalOpen(false);
                handleDelete();
              }}
              disabled={saving}
              className="px-[16px] py-[8px] text-[13px] font-bold text-white bg-red-500 hover:bg-red-600 rounded-[8px] transition-colors cursor-pointer disabled:opacity-50"
            >
              Видалити
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
