'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { Settings, Check, ArrowRight, Search, MoreVertical, LayoutGrid, List as ListIcon, Download, HardDrive, Trash } from 'lucide-react';
import Tabs from '@/components/ui/Tabs';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Bug as BugType, Project } from '@/lib/types';
import { useProjectContext } from '@/components/layout/ProjectContext';
import { formatDistanceToNow } from 'date-fns';
import { uk } from 'date-fns/locale';
import { generateProjectZip } from '@/lib/export';

const STATUS_COLOR: Record<string, string> = {
  open: '#71717a',
  in_progress: '#fb923c',
  resolved: '#34d399',
  closed: '#71717a',
};
const STATUS_BG: Record<string, string> = {
  open: 'rgba(113,113,122,0.12)',
  in_progress: 'rgba(234,88,12,0.12)',
  resolved: 'rgba(16,185,129,0.12)',
  closed: 'rgba(113,113,122,0.12)',
};
const STATUS_LABEL_UK: Record<string, string> = {
  open: 'Новий',
  in_progress: 'В роботі',
  resolved: 'Виправлено',
  closed: 'Закрито',
};

type FilterValue = '' | 'open' | 'in_progress' | 'resolved' | 'closed';

const FILTERS: { value: FilterValue; label: string; color: string }[] = [
  { value: '',            label: 'Всі',        color: '#9a9a9a' },
  { value: 'open',        label: 'Нові',       color: '#71717a' },
  { value: 'in_progress', label: 'В роботі',   color: '#fb923c' },
  { value: 'resolved',    label: 'Виправлено', color: '#34d399' },
];

const FILTER_TABS = FILTERS.map(f => ({ id: f.value, label: f.label }));

function bugLabel(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'баг';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'баги';
  return 'багів';
}

export default function ProjectSidebar() {
  const { id } = useParams<{ id: string }>();
  const pathname = usePathname();
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [bugs, setBugs]   = useState<BugType[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<FilterValue>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showKebab, setShowKebab] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { selectedBugIds, toggleSelectBug, clearSelectedBugs, selectAllBugs, refreshTrigger } = useProjectContext();
  const kebabRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const v = localStorage.getItem(`BUGGY_BAG_VIEW_${id}`);
    if (v === 'list') setViewMode('list');
    
    fetch('/api/projects')
      .then(res => res.json())
      .then(data => {
         const p = (data.projects || []).find((p: any) => p.id === id);
         setProject(p);
      });
  }, [id]);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchQuery), 150);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/bugs?project_id=${id}${filter ? `&status=${filter}` : ''}`);
      const data = await res.json();
      setBugs(data.bugs ?? []);
    } finally {
      setLoading(false);
    }
  }, [id, filter, refreshTrigger]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (kebabRef.current && !kebabRef.current.contains(e.target as Node)) {
        setShowKebab(false);
      }
    };
    if (showKebab) document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [showKebab]);

  const handleDownloadZip = async () => {
    if (!project) return;
    setExporting(true);
    setShowKebab(false);
    try {
      const blob = await generateProjectZip(project, bugs);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `buggy-bag-${project.name.replace(/[^a-z0-9]/gi, '_')}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const handleDriveExport = async () => {
    if (!project) return;
    setShowKebab(false);
    if (!project.google_access_token) {
      window.location.href = `/api/auth/google?project_id=${project.id}`;
      return;
    }
    
    setExporting(true);
    try {
      const blob = await generateProjectZip(project, bugs);
      const formData = new FormData();
      formData.append('file', blob, `buggy-bag-${project.name.replace(/[^a-z0-9]/gi, '_')}.zip`);
      const res = await fetch(`/api/projects/${id}/drive-export`, {
         method: 'POST',
         body: formData
      });
      const data = await res.json();
      if (data.webViewLink) {
         alert('Збережено на Google Drive!');
         window.open(data.webViewLink, '_blank');
      } else {
         alert('Помилка завантаження: ' + data.error);
         if (data.error.includes('unauthorized') || data.error.includes('invalid_grant')) {
           window.location.href = `/api/auth/google?project_id=${project.id}`;
         }
      }
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!confirm('Видалити проєкт назавжди?')) return;
    setShowKebab(false);
    try {
      await fetch('/api/projects', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      router.push('/');
    } catch (e) {
      alert('Помилка видалення');
    }
  };

  const toggleView = () => {
    const n = viewMode === 'grid' ? 'list' : 'grid';
    setViewMode(n);
    localStorage.setItem(`BUGGY_BAG_VIEW_${id}`, n);
  };

  const filteredBugs = bugs.filter(b => {
    if (!debouncedSearch) return true;
    const q = debouncedSearch.toLowerCase();
    const desc = b.description?.toLowerCase() || '';
    const route = b.tech_context?.route?.toLowerCase() || '';
    const comp = b.tech_context?.component?.name?.toLowerCase() || '';
    const sev = (b.severity as string)?.toLowerCase() || '';
    return desc.includes(q) || route.includes(q) || comp.includes(q) || sev.includes(q);
  });

  return (
    <div className="w-[360px] bg-[#ffffff] flex flex-col shrink-0 relative z-20">

      {/* ── Header ── */}
      <div className="h-[52px] flex items-center justify-between px-[20px] shrink-0 bg-[#ffffff]">
        <div className="flex items-center gap-[8px] min-w-0 flex-1">
          {project?.connected_domain ? (
            <img 
              src={`/api/favicon?domain=${project.connected_domain}`}
              className="w-[20px] h-[20px] rounded-[4px] bg-[#f4f4f5]"
              alt="favicon"
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div className="w-[20px] h-[20px] rounded-[4px] bg-[#f4f4f5] flex items-center justify-center text-[10px] font-bold text-[#1f1f1f]">
              {project?.name?.charAt(0).toUpperCase() || '?'}
            </div>
          )}
          <span className="text-[14px] font-semibold text-[#1f1f1f] truncate">
            {project?.name || 'Завантаження...'}
          </span>
          {project?.connected_domain && (
            <a href={project.connected_domain} target="_blank" rel="noopener noreferrer" className="text-[#9a9a9a] hover:text-[#1f1f1f] transition-colors">
              <ArrowRight size={14} className="-rotate-45" />
            </a>
          )}
        </div>

        <div className="flex items-center gap-[4px] ml-[8px]">
          {/* Kebab Menu */}
          <div className="relative" ref={kebabRef}>
            <Button
              style="ghost"
              size="icon-sm"
              icon={MoreVertical}
              onClick={() => setShowKebab(!showKebab)}
            >
              Меню
            </Button>
            {showKebab && (
              <div className="absolute right-0 top-[36px] w-[220px] bg-[#ffffff] border border-[#f0f0f0] rounded-[12px] shadow-[0_8px_30px_rgba(0,0,0,0.08)] py-[6px] z-50 overflow-hidden">
                <button onClick={handleDownloadZip} disabled={exporting} className="w-full px-[12px] h-[36px] text-left flex items-center gap-[8px] text-[13px] font-medium text-[#1f1f1f] hover:bg-[#f4f4f5] transition-colors disabled:opacity-50">
                  <Download size={14} className="shrink-0" /> {exporting ? 'Генерація...' : 'Завантажити архів ZIP'}
                </button>
                <button onClick={handleDriveExport} disabled={exporting} className="w-full px-[12px] h-[36px] text-left flex items-center gap-[8px] text-[13px] font-medium text-[#1f1f1f] hover:bg-[#f4f4f5] transition-colors disabled:opacity-50">
                  <HardDrive size={14} className="shrink-0" /> {exporting ? 'Генерація...' : 'Зберегти на Google Drive'}
                </button>
                <div className="h-[1px] bg-[#f0f0f0] my-[4px] mx-[6px]" />
                <button onClick={() => { setShowKebab(false); router.push(`/projects/${id}/integration`); }} className="w-full px-[12px] h-[36px] text-left flex items-center gap-[8px] text-[13px] font-medium text-[#1f1f1f] hover:bg-[#f4f4f5] transition-colors">
                  <Settings size={14} className="shrink-0" /> Налаштування
                </button>
                <button onClick={handleDeleteProject} className="w-full px-[12px] h-[36px] text-left flex items-center gap-[8px] text-[13px] font-medium text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors">
                  <Trash size={14} className="shrink-0" /> Видалити проєкт
                </button>
              </div>
            )}
          </div>

          <Button style="ghost" size="icon-sm" icon={viewMode === 'grid' ? ListIcon : LayoutGrid} onClick={toggleView}>
            {viewMode === 'grid' ? 'Список' : 'Сітка'}
          </Button>
          
          <Link href={`/projects/${id}/integration`}>
            <Button style="ghost" size="icon-sm" icon={Settings}>Налаштування</Button>
          </Link>
        </div>
      </div>

      {/* ── Filter tabs ── */}
      <div className="px-[12px] py-[10px] shrink-0 bg-[#ffffff]">
        <Tabs
          tabs={FILTER_TABS}
          activeTab={filter}
          onTabChange={(id: string) => setFilter(id as FilterValue)}
          className="w-full"
        />
      </div>

      {/* ── Search Input ── */}
      <div className="px-[12px] pb-[10px] bg-[#ffffff] shrink-0">
        <Input
          icon={Search}
          type="text"
          value={searchQuery}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
          placeholder="Пошук..."
        />
      </div>

      {/* ── Sub-bar: bug count + "Виділити всі" ── */}
      <div className="h-[32px] flex items-center justify-between px-[12px] bg-[#ffffff] shrink-0">
        <span className="text-[10.5px] text-[#9a9a9a]">
          {!loading && `${filteredBugs.length} ${bugLabel(filteredBugs.length)}`}
        </span>
        {selectedBugIds.size > 0 ? (
          <button
            onClick={clearSelectedBugs}
            className="text-[10.5px] font-semibold text-[#ef4444] hover:text-[#dc2626] transition-colors"
          >
            Зняти ({selectedBugIds.size})
          </button>
        ) : filteredBugs.length > 0 ? (
          <button
            onClick={() => selectAllBugs(filteredBugs.map(b => b.id))}
            className="text-[10.5px] font-semibold text-[#9a9a9a] hover:text-[#1f1f1f] transition-colors"
          >
            Виділити всі
          </button>
        ) : null}
      </div>

      {/* ── Bug list ── */}
      <div className="flex-1 overflow-y-auto flex flex-col custom-scrollbar pb-[20px] bg-[#ffffff]">
        {loading ? (
          <div className="text-[13px] text-center text-[#9a9a9a] py-[24px]">Завантаження...</div>
        ) : filteredBugs.length === 0 ? (
          <div className="text-[13px] text-center text-[#9a9a9a] py-[24px]">
            {debouncedSearch ? 'Нічого не знайдено' : 'Багів не знайдено'}
          </div>
        ) : (
          filteredBugs.map(bug => {
            const isChecked = selectedBugIds.has(bug.id);
            
            let num = parseInt(bug.severity as string, 10);
            if (isNaN(num)) {
              if (bug.severity === 'low') num = 2;
              else if (bug.severity === 'medium') num = 5;
              else if (bug.severity === 'high') num = 8;
              else if (bug.severity === 'critical') num = 10;
              else num = 1;
            }
            let color = '#94a3b8'; let bg = 'rgba(148,163,184,0.15)';
            if (num >= 8) { color = '#ef4444'; bg = 'rgba(239,68,68,0.15)'; }
            else if (num >= 5) { color = '#f97316'; bg = 'rgba(249,115,22,0.15)'; }
            else if (num >= 3) { color = '#fbbf24'; bg = 'rgba(251,191,36,0.15)'; }
            else { color = '#34d399'; bg = 'rgba(52,211,153,0.15)'; }

            if (viewMode === 'list') {
              return (
                <div
                  key={bug.id}
                  onClick={() => toggleSelectBug(bug.id)}
                  className={`group/card flex items-center shrink-0 cursor-pointer h-[40px] px-[10px] gap-[10px] transition-all mx-[8px] rounded-[10px] ${
                    isChecked ? 'bg-[#f4f4f5]' : 'hover:bg-[#f4f4f5]'
                  }`}
                >
                  <div className={`w-[14px] h-[14px] shrink-0 rounded-full border-[2px] transition-all flex items-center justify-center ${
                    isChecked ? 'bg-[#1f1f1f] border-[#1f1f1f]' : 'border-[#cfcfcf]'
                  }`}>
                    {isChecked && <Check size={8} strokeWidth={3} className="text-white" />}
                  </div>
                  
                  {/* colored dot for severity instead of full badge */}
                  <div className="w-[8px] h-[8px] rounded-full shrink-0" style={{ backgroundColor: color }} title={`Severity: ${num}`} />

                  <div className="flex-1 min-w-0 flex items-center gap-[10px]">
                    <span className="text-[12px] text-[#1f1f1f] truncate leading-tight flex-1">
                      {bug.description || 'Без опису'}
                    </span>
                    <span className="text-[10px] text-[#9a9a9a] whitespace-nowrap shrink-0">
                      {formatDistanceToNow(new Date(bug.created_at), { addSuffix: false, locale: uk })}
                    </span>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={bug.id}
                onClick={() => toggleSelectBug(bug.id)}
                className={`group/card flex flex-col shrink-0 cursor-pointer overflow-hidden transition-all mx-[8px] rounded-[16px] border ${
                  isChecked
                    ? 'bg-[#f4f4f5] border-[#1f1f1f]/15'
                    : 'border-transparent hover:bg-[#f4f4f5] hover:border-[#1f1f1f]/10'
                }`}
              >
                {/* Screenshot — white bg for transparent PNGs */}
                {bug.image_url && (
                  <div className={`w-full aspect-video bg-white relative overflow-hidden transition-colors ${
                    isChecked ? 'bg-[#f4f4f5]' : ''
                  }`}>
                    <img
                      src={bug.image_url}
                      alt="Screenshot"
                      crossOrigin="anonymous"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover/card:scale-[1.03]"
                    />

                    {/* Dark overlay: subtle on hover, tint when selected */}
                    <div className={`absolute inset-0 pointer-events-none transition-all duration-200 ${
                      isChecked
                        ? 'bg-black/[0.04]'
                        : 'bg-black/0 group-hover/card:bg-black/[0.04]'
                    }`} />

                    {/* Selection circle — top-right, appears on hover, fills on select */}
                    <div className={`absolute top-[8px] right-[8px] w-[22px] h-[22px] rounded-full flex items-center justify-center transition-all duration-200 ${
                      isChecked
                        ? 'bg-[#1f1f1f] opacity-100 scale-100'
                        : 'bg-black/10 backdrop-blur-sm border border-white/0 group-hover/card:border-white/50 opacity-0 group-hover/card:opacity-90 scale-75 group-hover/card:scale-100'
                    }`}>
                      <Check
                        size={12}
                        strokeWidth={2.5}
                        className={`text-white transition-opacity duration-100 ${isChecked ? 'opacity-100' : 'opacity-0 group-hover/card:opacity-40'}`}
                      />
                    </div>
                  </div>
                )}

                <div className="px-[20px] py-[12px] flex flex-col gap-[8px]">
                  {/* Top row: checkbox (if no screenshot) + severity + status */}
                  <div className="flex items-center justify-between gap-[8px]">
                    <div className="flex items-center gap-[6px]">
                      {!bug.image_url && (
                        <div className={`w-[17px] h-[17px] shrink-0 rounded-full border-[2px] transition-all flex items-center justify-center ${
                          isChecked ? 'bg-[#1f1f1f] border-[#1f1f1f]' : 'border-[#cfcfcf]'
                        }`}>
                          {isChecked && <Check size={10} strokeWidth={3} className="text-white" />}
                        </div>
                      )}
                      
                      <div
                        className="w-[16px] h-[16px] rounded-[4px] flex items-center justify-center text-[9px] font-bold border shrink-0"
                        style={{ color, backgroundColor: bg, borderColor: color + '40' }}
                        title={`Критичність: ${num}/10`}
                      >
                        {num}
                      </div>
                      <span
                        className="text-[9px] font-bold uppercase tracking-wider px-[5px] py-[1px] rounded-[4px] shrink-0"
                        style={{ color: STATUS_COLOR[bug.status], background: STATUS_BG[bug.status] }}
                      >
                        {STATUS_LABEL_UK[bug.status] ?? bug.status}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#9a9a9a] whitespace-nowrap">
                      {formatDistanceToNow(new Date(bug.created_at), { addSuffix: true, locale: uk })}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-[13px] font-medium text-[#1f1f1f] line-clamp-3 leading-relaxed">
                    {bug.description || 'Без опису'}
                  </p>

                  {/* Bottom row: route + Деталі button */}
                  <div className="flex items-center justify-between gap-[8px] mt-[4px]">
                    <div className="min-w-0 flex-1 flex items-center h-[24px]">
                      {bug.tech_context?.route && (
                        <div
                          className="inline-flex items-center text-[10px] font-mono bg-[#f4f4f5] text-[#1f1f1f] rounded-[5px] px-[6px] h-full truncate max-w-full"
                          title={bug.tech_context.route}
                        >
                          {bug.tech_context.route}
                        </div>
                      )}
                    </div>
                    <Link
                      href={`/projects/${id}/bugs/${bug.id}`}
                      onClick={e => e.stopPropagation()}
                      className="group/btn shrink-0 flex items-center justify-center gap-[4px] text-[11px] font-semibold text-[#1f1f1f] hover:text-white bg-[#f4f4f5] hover:bg-[#1f1f1f] transition-all px-[9px] h-[24px] rounded-[5px]"
                    >
                      Деталі
                      <ArrowRight size={11} className="transition-transform group-hover/btn:translate-x-[2px]" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
