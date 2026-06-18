'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { Settings, Check, ArrowRight, ExternalLink, Search, MoreHorizontal, LayoutGrid, List as ListIcon, Download, HardDrive, Trash, ChevronDown } from 'lucide-react';
import Tabs from '@/components/ui/Tabs';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Bug as BugType, Project } from '@/lib/types';
import { useProjectContext } from '@/components/layout/ProjectContext';
import { formatDistanceToNow } from 'date-fns';
import { uk } from 'date-fns/locale';
import AnimatedLogo from '@/components/ui/AnimatedLogo';
import { generateProjectZip } from '@/lib/export';

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
      const res  = await fetch(`/api/bugs?project_id=${id}${filter && filter !== 'active' ? `&status=${filter}` : ''}&_t=${refreshTrigger}`);
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
    if (filter === 'active' && b.status !== 'open' && b.status !== 'in_progress') return false;

    if (!debouncedSearch) return true;
    const q = debouncedSearch.toLowerCase();
    const desc = b.description?.toLowerCase() || '';
    const route = b.tech_context?.route?.toLowerCase() || '';
    const comp = b.tech_context?.component?.name?.toLowerCase() || '';
    const sev = (b.severity as string)?.toLowerCase() || '';
    const idStr = b.id.toLowerCase();
    const statusStr = b.status?.toLowerCase() || '';
    const file = b.tech_context?.file_path?.toLowerCase() || '';
    return desc.includes(q) || route.includes(q) || comp.includes(q) || sev.includes(q) || idStr.includes(q) || statusStr.includes(q) || file.includes(q);
  }).sort((a, b) => {
    if (a.status === 'open' && b.status !== 'open') return -1;
    if (b.status === 'open' && a.status !== 'open') return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  if (pathname.includes('/bugs/') || pathname.includes('/integration')) return null;

  return (
    <div className="w-[360px] bg-[#ffffff] flex flex-col shrink-0 relative z-20 border-r border-[#e9e9e9]">

      {/* ── Header ── */}
      <div className="pt-[24px] pb-[16px] flex items-center justify-between px-[24px] shrink-0 bg-[#ffffff]">
        <div className="flex items-center gap-[10px] min-w-0 flex-1">
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
                <button onClick={handleDeleteProject} className="w-full px-[12px] h-[36px] text-left flex items-center gap-[8px] text-[13px] font-medium text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors">
                  <Trash size={14} className="shrink-0" /> Видалити проєкт
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── New Bugs Header ── */}
      <div className="px-[24px] pb-[16px] shrink-0 bg-[#ffffff] relative z-20">
        <div className="bg-[#f4f4f5] flex items-center justify-between h-[36px] px-[4px] py-[4px] rounded-[10px] w-full relative">
          
          {/* Absolute Search Toggle (expands full width from left) */}
          <div className={`absolute left-[4px] flex items-center group/search justify-start h-[28px] transition-all duration-300 pointer-events-auto ${searchQuery ? 'w-[calc(100%-8px)] z-20' : 'w-[28px] z-10 focus-within:w-[calc(100%-8px)] focus-within:z-20'}`}>
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={`w-full outline-none h-[28px] rounded-[8px] text-[12px] pl-[28px] transition-all border border-transparent focus:border-[#e9e9e9] text-[#1f1f1f] bg-white placeholder:text-transparent focus:placeholder:text-[#9ca3af] ${
                searchQuery ? 'pr-[24px] placeholder:text-[#9ca3af] border-[#e9e9e9]' : 'pr-0 focus:pr-[24px]'
              }`}
              placeholder="Детальний пошук багів..."
            />
            <div className="absolute left-[0px] w-[28px] h-[28px] flex items-center justify-center pointer-events-none text-[#1f1f1f]">
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

          <div className="flex items-center gap-[8px] flex-1">
            {/* Spacer for Search */}
            <div className="w-[28px] h-[28px] shrink-0" />
            <div className="flex-1" />
          </div>

          {/* Select all button */}
          <button 
            onClick={selectedBugIds.size > 0 ? clearSelectedBugs : () => selectAllBugs(filteredBugs.map(b => b.id))}
            className={`transition-colors flex items-center gap-[10px] h-[28px] px-[8px] py-[4px] rounded-[8px] shrink-0 z-10 border ${
              selectedBugIds.size > 0 ? 'bg-[#4F46E5] border-[#4F46E5] hover:bg-[#4338ca] text-white' : 'bg-white border-[#e9e9e9] hover:bg-[#f4f4f5] text-[#1f1f1f]'
            }`}
          >
            <span className="text-[13px] font-normal">
              {selectedBugIds.size > 0 ? 'Зняти всі' : 'Обрати всі'}
            </span>
            <div className={`flex items-center justify-center rounded-[50px] min-w-[16px] h-[16px] px-[4px] ${selectedBugIds.size > 0 ? 'bg-white/20' : 'bg-[#f4f4f5]'}`}>
              <span className={`text-[11px] font-medium leading-none ${selectedBugIds.size > 0 ? 'text-white' : 'text-[#9a9a9a]'}`}>
                {selectedBugIds.size > 0 ? selectedBugIds.size : filteredBugs.length}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* ── Bug list ── */}
      <div className="flex-1 overflow-y-auto flex flex-col custom-scrollbar pb-[20px] bg-[#ffffff]">
        {loading ? (
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
              <div
                key={bug.id}
                onClick={() => toggleSelectBug(bug.id)}
                className={`group/card shrink-0 cursor-pointer transition-colors duration-300 ease-out ml-[24px] mr-[22px] mb-[12px] rounded-[14px] h-[193px] p-[2px] ${
                  isChecked ? 'bg-[#4F46E5]' : 'bg-transparent hover:bg-[#e9e9e9]'
                }`}
              >
                {/* Content Container (clips everything else) */}
                <div className="relative w-full h-full rounded-[12px] overflow-hidden isolate bg-[#2a2a2a] shadow-sm">
                  {/* Background Image */}
                  <div className="absolute inset-0 overflow-hidden">
                    {bug.image_url ? (
                      <img
                        src={bug.image_url}
                        alt="Screenshot"
                        crossOrigin="anonymous"
                        className="w-full h-full object-cover object-left-top"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#9a9a9a] text-[12px]">Без скріншоту</div>
                    )}
                  </div>

                  {/* Dark Hover-Reveal Overlay */}
                  <div className="absolute inset-0 bg-black/30 transition-opacity duration-300 group-hover/card:opacity-0 pointer-events-none" />

                  {/* Smooth Gradient Background */}
                  <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-black/70 transition-all duration-300 group-hover/card:opacity-0" />

                  {/* High-Quality Bottom Blur */}
                  <div 
                    className="absolute bottom-0 left-0 right-0 h-[75%] pointer-events-none transition-all duration-300 backdrop-blur-[8px] group-hover/card:backdrop-blur-none rounded-b-[9px]" 
                    style={{
                      WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.013) 8.1%, rgba(0,0,0,0.049) 15.5%, rgba(0,0,0,0.104) 22.5%, rgba(0,0,0,0.175) 29%, rgba(0,0,0,0.259) 35.3%, rgba(0,0,0,0.352) 41.2%, rgba(0,0,0,0.45) 47.1%, rgba(0,0,0,0.55) 52.9%, rgba(0,0,0,0.648) 58.8%, rgba(0,0,0,0.741) 64.7%, rgba(0,0,0,0.825) 71%, rgba(0,0,0,0.896) 77.5%, rgba(0,0,0,0.951) 84.5%, rgba(0,0,0,0.987) 91.9%, black 100%)',
                      maskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.013) 8.1%, rgba(0,0,0,0.049) 15.5%, rgba(0,0,0,0.104) 22.5%, rgba(0,0,0,0.175) 29%, rgba(0,0,0,0.259) 35.3%, rgba(0,0,0,0.352) 41.2%, rgba(0,0,0,0.45) 47.1%, rgba(0,0,0,0.55) 52.9%, rgba(0,0,0,0.648) 58.8%, rgba(0,0,0,0.741) 64.7%, rgba(0,0,0,0.825) 71%, rgba(0,0,0,0.896) 77.5%, rgba(0,0,0,0.951) 84.5%, rgba(0,0,0,0.987) 91.9%, black 100%)'
                    }} 
                  />

                  {/* Selection Overlay Tint */}
                  <div className={`absolute inset-0 transition-all duration-200 pointer-events-none ${
                    isChecked ? 'bg-[#4F46E5]/5' : 'bg-transparent'
                  }`} />

                  <div className="absolute top-[16px] right-[16px] flex items-center gap-[4px] z-10">
                    <div className="bg-[#1f1f1f]/90 backdrop-blur-sm border border-white/10 h-[22px] px-[8px] rounded-[6px] flex items-center justify-center shadow-sm">
                      <span className="text-white text-[10px] font-bold">{statusCfg.label}</span>
                    </div>
                    <div className="bg-[#1f1f1f]/90 backdrop-blur-sm border border-white/10 h-[22px] px-[8px] rounded-[6px] flex items-center justify-center gap-[4px] shadow-sm">
                      <div className="w-[6px] h-[6px] rounded-full" style={{ backgroundColor: sevCfg.color }} />
                      <span className="text-white text-[10px] font-bold">{sevCfg.label}</span>
                    </div>
                  </div>

                  {/* Checkbox Overlay (Top-Left) */}
                  <div className={`absolute top-[16px] left-[16px] w-[20px] h-[20px] rounded-[6px] flex items-center justify-center transition-all duration-300 z-10 ${
                    isChecked ? 'bg-[#4F46E5] border-none' : 'bg-white/30 border border-white/50 backdrop-blur-md group-hover/card:bg-white group-hover/card:border-white group-hover/card:scale-110'
                  }`}>
                    {isChecked ? (
                      <Check size={12} strokeWidth={3} className="text-white" />
                    ) : (
                      <Check size={12} strokeWidth={3} className="text-black/0 group-hover/card:text-black/30 transition-colors duration-300" />
                    )}
                  </div>

                  {/* Route Pill (Middle-Left) */}
                  {bug.tech_context?.route && (
                    <div className="absolute bottom-[52px] left-[16px] bg-black/20 backdrop-blur-md rounded-[4px] px-[6px] py-[2px] z-10 max-w-[80%] flex overflow-hidden border border-white/10">
                      <span 
                        className="text-white/80 text-[10px] font-medium leading-[16px] truncate" 
                        style={{ direction: 'rtl', textAlign: 'left' }}
                      >
                        <bdi dir="ltr">
                          {bug.tech_context.route.length > 15 
                            ? '...' + bug.tech_context.route.slice(-15) 
                            : bug.tech_context.route}
                        </bdi>
                      </span>
                    </div>
                  )}

                  {/* Bottom Details Section */}
                  <div className="absolute bottom-[16px] left-[16px] right-[16px] flex items-end justify-between z-10">
                    <div className="flex flex-col min-w-0 pr-[8px]">
                      <p className="text-white text-[13px] font-medium leading-[20px] truncate drop-shadow-md" title={bug.description || 'Без опису'}>
                        {bug.description || 'Без опису'}
                      </p>
                      <p className="text-white/60 text-[10px] leading-[14px] truncate drop-shadow-sm mt-[2px]">
                        {formatDistanceToNow(new Date(bug.created_at), { addSuffix: true, locale: uk })}
                      </p>
                    </div>

                    <Link
                      href={`/projects/${id}/bugs/${bug.id}`}
                      onClick={e => e.stopPropagation()}
                      className="shrink-0 bg-black/30 hover:bg-black/50 backdrop-blur-md transition-colors h-[22px] px-[6px] rounded-[4px] flex items-center gap-[4px]"
                    >
                      <span className="text-white text-[11px] font-semibold">Деталі</span>
                      <ArrowRight size={12} className="text-white" />
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
