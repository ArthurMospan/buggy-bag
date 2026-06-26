'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Settings, Check, ArrowRight, ExternalLink, Search, MoreHorizontal, LayoutGrid, List as ListIcon, Download, HardDrive, Trash, ChevronDown, ArrowLeft } from 'lucide-react';
import Tabs from '@/components/ui/Tabs';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Bug as BugType, Project } from '@/lib/types';
import { useProjectContext } from '@/components/layout/ProjectContext';
import { formatDistanceToNow } from 'date-fns';
import { uk } from 'date-fns/locale';
import AnimatedLogo from '@/components/ui/AnimatedLogo';
import { generateProjectZip } from '@/lib/export';
import BugCard from '@/components/bugs/BugCard';
import { createClient } from '@/lib/supabase';
import { useToast } from '@/components/ui/ToastContext';

import { STATUS_CFG, SEVERITY_CFG } from '@/lib/constants';

type FilterValue = 'active' | 'open' | 'in_progress' | 'resolved';

const FILTERS: { value: FilterValue; label: string; color: string }[] = [
  { value: 'active',      label: 'Тільки активні', color: '#9a9a9a' },
  { value: 'open',        label: 'Нові',           color: '#71717a' },
  { value: 'in_progress', label: 'В роботі',       color: '#fb923c' },
  { value: 'resolved',    label: 'Виправлено',     color: '#34d399' },
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
  const [filter, setFilter]   = useState<FilterValue>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showKebab, setShowKebab] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const { selectedBugIds, toggleSelectBug, clearSelectedBugs, selectAllBugs, refreshTrigger } = useProjectContext();
  const kebabRef = useRef<HTMLDivElement>(null);
  const { success, error } = useToast();

  const fetchProjectInfo = useCallback(() => {
    fetch('/api/projects')
      .then(res => res.json())
      .then(data => {
         const p = (data.projects || []).find((p: any) => p.id === id);
         setProject(p);
      });
  }, [id]);

  useEffect(() => {
    const v = localStorage.getItem(`BUGGY_BAG_VIEW_${id}`);
    if (v === 'list') setViewMode('list');
    
    fetchProjectInfo();

    window.addEventListener('projects-updated', fetchProjectInfo);
    return () => {
      window.removeEventListener('projects-updated', fetchProjectInfo);
    };
  }, [id, fetchProjectInfo]);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchQuery), 150);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res  = await fetch(`/api/bugs?project_id=${id}${filter && filter !== 'active' ? `&status=${filter}` : ''}&_t=${refreshTrigger}&_nocache=${Date.now()}`);
      const data = await res.json();
      setBugs(data.bugs ?? []);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [id, filter, refreshTrigger]);

  useEffect(() => { 
    fetchData(); 
    
    // Polling fallback: fetch new bugs every 5 seconds in case postgres_changes 
    // doesn't fire due to RLS policies or missing realtime publication
    const pollInterval = setInterval(() => {
      fetchData(false);
    }, 5000);

    const supabase = createClient();
    const channelId = `bugs_sidebar_${id}_${Math.random()}`;
    const channel = supabase.channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bugs', filter: `project_id=eq.${id}` }, () => {
        fetchData(false);
      })
      .subscribe();
      
    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [fetchData, id]);

  const handleInlineUpdate = async (bugId: string, field: 'status' | 'severity', value: string) => {
    setBugs(prev => prev.map(b => b.id === bugId ? { ...b, [field]: value } : b));
    try {
      await fetch('/api/bugs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [bugId], [field]: value })
      });
      success(field === 'status' ? 'Статус оновлено' : 'Критичність оновлено');
    } catch (e) {
      error('Помилка оновлення');
      fetchData(false);
    }
  };

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
      success('Архів успішно завантажено');
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
         success('Збережено на Google Drive!');
         window.open(data.webViewLink, '_blank');
      } else {
         error('Помилка завантаження: ' + data.error);
         if (data.error.includes('unauthorized') || data.error.includes('invalid_grant')) {
           window.location.href = `/api/auth/google?project_id=${project.id}`;
         }
      }
    } finally {
      setExporting(false);
    }
  };


  const toggleView = () => {
    const n = viewMode === 'grid' ? 'list' : 'grid';
    setViewMode(n);
    localStorage.setItem(`BUGGY_BAG_VIEW_${id}`, n);
  };

  const filteredBugs = bugs.filter(b => {
    if (filter === 'active' && b.status !== 'open' && b.status !== 'in_progress') return false;

    if (!debouncedSearch) return true;
    const q = debouncedSearch.toLowerCase();
    const desc = b.description?.toLowerCase() || '';
    const route = b.tech_context?.route?.toLowerCase() || '';
    const comp = b.tech_context?.component?.name?.toLowerCase() || '';
    const sev = (b.severity as string)?.toLowerCase() || '';
    const idStr = b.id.toLowerCase();
    const statusStr = b.status?.toLowerCase() || '';
    const file = b.tech_context?.component?.filePath?.toLowerCase() || '';
    return desc.includes(q) || route.includes(q) || comp.includes(q) || sev.includes(q) || idStr.includes(q) || statusStr.includes(q) || file.includes(q);
  }).sort((a, b) => {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  if (pathname.includes('/bugs/') || pathname.includes('/integration')) return null;

  return (
    <div className="w-full md:w-[360px] bg-[#ffffff] flex flex-col shrink-0 relative z-20 md:border-r md:border-[#e9e9e9]">

      {/* ── Header ── */}
      <div className="pt-[16px] md:pt-[24px] pb-[16px] flex flex-row items-center justify-between px-[16px] md:px-[24px] shrink-0 bg-[#ffffff] gap-[12px] md:gap-0">
        <div className="flex items-center gap-[10px] min-w-0 flex-1">
          <Link href="/" className="md:hidden text-[#9a9a9a] hover:text-[#1f1f1f] transition-colors p-[4px] -ml-[4px] rounded-[8px] hover:bg-[#f4f4f5]">
            <ArrowLeft size={20} strokeWidth={1.5} />
          </Link>
          <span className="text-[20px] font-bold text-[#1f1f1f] truncate">
            {project?.name || 'Завантаження...'}
          </span>
        </div>

        <div className="flex items-center ml-[8px] bg-[#f4f4f5] rounded-[10px] shrink-0">
          {project?.connected_domain && (
            <a href={project.connected_domain} target="_blank" rel="noopener noreferrer" className="w-[36px] h-[36px] flex items-center justify-center text-[#1f1f1f] hover:bg-[#e9e9e9] transition-colors rounded-l-[10px]">
              <ExternalLink size={16} />
            </a>
          )}

          {/* Kebab Menu */}
          <div className="relative" ref={kebabRef}>
            <button
              onClick={() => setShowKebab(!showKebab)}
              className={`w-[36px] h-[36px] flex items-center justify-center text-[#1f1f1f] hover:bg-[#e9e9e9] transition-colors rounded-r-[10px] ${!project?.connected_domain ? 'rounded-l-[10px]' : ''}`}
            >
              <MoreHorizontal size={16} />
            </button>
            {showKebab && (
              <div className="absolute right-0 top-[40px] w-[220px] bg-[#ffffff] border border-[#f0f0f0] rounded-[12px] shadow-[0_8px_30px_rgba(0,0,0,0.08)] py-[6px] z-50">
                <button onClick={handleDownloadZip} disabled={exporting} className="w-full px-[12px] h-[36px] text-left flex items-center gap-[8px] text-[13px] font-medium text-[#1f1f1f] hover:bg-[#f4f4f5] transition-colors disabled:opacity-50">
                  <Download size={14} className="shrink-0" /> {exporting ? 'Генерація...' : 'Завантажити архів ZIP'}
                </button>
                <button onClick={handleDriveExport} disabled={exporting} className="w-full px-[12px] h-[36px] text-left flex items-center gap-[8px] text-[13px] font-medium text-[#1f1f1f] hover:bg-[#f4f4f5] transition-colors disabled:opacity-50">
                  <HardDrive size={14} className="shrink-0" /> {exporting ? 'Генерація...' : 'Зберегти на Google Drive'}
                </button>
                <div className="h-[1px] bg-[#f0f0f0] my-[4px] mx-[6px]" />
                <div className="px-[12px] py-[6px] text-[10px] font-bold text-[#9a9a9a] uppercase tracking-wider">Фільтр багів</div>
                {FILTERS.map(f => (
                  <button
                    key={f.value}
                    onClick={() => { setFilter(f.value); setShowKebab(false); }}
                    className="w-full px-[12px] h-[32px] text-left flex items-center gap-[8px] text-[13px] font-medium transition-colors hover:bg-[#f4f4f5]"
                    style={{ color: filter === f.value ? '#1f1f1f' : '#5d5d5d' }}
                  >
                    <div className={`w-[6px] h-[6px] rounded-full shrink-0 ${filter === f.value ? 'bg-[#4F46E5]' : 'bg-transparent'}`} />
                    {f.label}
                  </button>
                ))}
                <div className="h-[1px] bg-[#f0f0f0] my-[4px] mx-[6px]" />
                <button onClick={() => { setShowKebab(false); router.push(`/projects/${id}/integration`); }} className="w-full px-[12px] h-[36px] text-left flex items-center gap-[8px] text-[13px] font-medium text-[#1f1f1f] hover:bg-[#f4f4f5] transition-colors">
                  <Settings size={14} className="shrink-0" /> Налаштування
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── New Bugs Header ── */}
      <div className="px-[16px] md:px-[24px] pb-[16px] shrink-0 bg-[#ffffff] relative z-20">
        <div className="bg-[#f4f4f5] flex items-center h-[36px] px-[4px] py-[4px] rounded-full w-full relative transition-all">
          
          <div className="flex items-center flex-1 h-[28px] relative transition-all">
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full outline-none h-full rounded-full text-[12px] pl-[28px] pr-[24px] border-none text-[#1f1f1f] bg-transparent transition-all placeholder:text-[#9a9a9a]"
              placeholder="Пошук..."
            />
            <div className="absolute left-[0px] w-[28px] h-[28px] flex items-center justify-center pointer-events-none text-[#9a9a9a]">
              <Search size={14} />
            </div>
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-[8px] text-[#9a9a9a] hover:text-[#1f1f1f] text-[16px] font-medium w-[16px] h-[16px] flex items-center justify-center"
              >
                ×
              </button>
            )}
          </div>

          {!searchQuery && (
            <button 
              onClick={selectedBugIds.size > 0 ? clearSelectedBugs : () => selectAllBugs(filteredBugs.map(b => b.id))}
              className={`transition-colors flex items-center gap-[10px] h-[28px] px-[8px] py-[4px] rounded-full shrink-0 z-10 border-none ml-[4px] ${
                selectedBugIds.size > 0 ? 'bg-[#4F46E5] hover:bg-[#4338ca] text-white' : 'bg-transparent hover:bg-[#e9e9e9] text-[#9a9a9a]'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {selectedBugIds.size > 0 ? 'Зняти всі' : 'Обрати всі'}
              </span>
              <div className={`flex items-center justify-center rounded-[6px] min-w-[16px] h-[16px] px-[2px] ${selectedBugIds.size > 0 ? 'bg-white/20' : 'bg-[#e9e9e9]'}`}>
                <span className={`text-[11px] font-medium leading-none ${selectedBugIds.size > 0 ? 'text-white' : 'text-[#9a9a9a]'}`}>
                  {selectedBugIds.size > 0 ? selectedBugIds.size : filteredBugs.length}
                </span>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* ── Bug list ── */}
      <div className="flex-1 overflow-y-auto flex flex-col custom-scrollbar pb-[20px] bg-[#ffffff]">
        {bugs.length === 0 && loading ? (
          <div className="text-[13px] text-center text-[#9a9a9a] py-[24px]">Завантаження...</div>
        ) : filteredBugs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-[24px] text-center">
            <span className="text-[13px] font-medium text-[#1f1f1f]">
              {debouncedSearch ? 'Нічого не знайдено' : 'Багів не знайдено'}
            </span>
            {debouncedSearch && (
              <span className="text-[12px] text-[#9a9a9a] mt-[4px]">
                Спробуйте змінити критерії пошуку
              </span>
            )}
          </div>
        ) : (
          filteredBugs.map(bug => {
            const isChecked = selectedBugIds.has(bug.id);
            
            const statusCfg = STATUS_CFG.find(s => s.value === bug.status) || STATUS_CFG[0];
            const sevCfg = SEVERITY_CFG.find(s => s.value === (bug.severity ?? '1')) || SEVERITY_CFG[0];

            let hasPin = false;
            let pinX = 50;
            let pinY = 50;
            if (bug.json_annotations && bug.json_annotations.length > 0) {
              const ann = bug.json_annotations[0];
              if (typeof ann.x === 'number' && typeof ann.y === 'number') {
                pinX = Math.max(0, Math.min(100, ann.x));
                pinY = Math.max(0, Math.min(100, ann.y));
                hasPin = true;
              }
            }

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
                  <div className="w-[8px] h-[8px] rounded-full shrink-0" style={{ backgroundColor: sevCfg.color }} title={`Severity: ${sevCfg.label}`} />

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
              <BugCard
                key={bug.id}
                bug={bug}
                isChecked={isChecked}
                toggleSelectBug={toggleSelectBug}
                handleInlineUpdate={handleInlineUpdate}
                projectId={id}
                className="mx-[8px] md:mx-[24px] mb-[12px]"
              />
            );
          })
        )}
      </div>

      {/* ── Mobile Floating Prompt Button ── */}
      {selectedBugIds.size > 0 && (
        <div className="md:hidden absolute bottom-[20px] left-[16px] right-[16px] z-30">
          <button 
            onClick={() => router.push(`${pathname}?prompt=1`)}
            className="w-full h-[52px] bg-[#1f1f1f] text-white rounded-[16px] shadow-[0_8px_32px_rgba(0,0,0,0.25)] flex items-center justify-center gap-[10px] active:scale-[0.98] transition-transform cursor-pointer"
          >
            <span className="text-[14px] font-bold">Генерувати промпт</span>
            <span className="bg-white/20 text-white text-[12px] font-bold px-[8px] py-[2px] rounded-[6px]">
              {selectedBugIds.size}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}



