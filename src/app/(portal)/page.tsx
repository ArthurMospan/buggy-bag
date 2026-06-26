'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Project, Bug } from '@/lib/types';
import LoadingSpinner from '@/components/ui/Feedback/LoadingSpinner';
import { ArrowRight, LayoutDashboard, MonitorPlay, Activity, ChevronDown, Filter, Plus, Sparkles, FolderPlus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { uk } from 'date-fns/locale';
import BugCard from '@/components/bugs/BugCard';
import { useToast } from '@/components/ui/ToastContext';
import AnimatedLogo from '@/components/ui/AnimatedLogo';

const STATUS_COLOR: Record<string, string> = { open: '#71717a', in_progress: '#fb923c', resolved: '#34d399' };
const STATUS_BG: Record<string, string>    = { open: 'rgba(113,113,122,0.12)', in_progress: 'rgba(234,88,12,0.12)', resolved: 'rgba(16,185,129,0.12)' };
const STATUS_LABEL: Record<string, string> = { open: 'Новий', in_progress: 'В роботі', resolved: 'Виправлено' };


export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [recentBugs, setRecentBugs] = useState<Bug[]>([]);
  const [loading, setLoading] = useState(true);
  const { success, error } = useToast();

  // Onboarding creation state
  const [newProjectName, setNewProjectName] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);

  // Filter States
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Dropdown UI States
  const [openDropdown, setOpenDropdown] = useState<'project' | 'status' | 'severity' | null>(null);

  const load = async () => {
    try {
      const [pr, br] = await Promise.all([fetch('/api/projects'), fetch('/api/bugs')]);
      const pd = await pr.json();
      const bd = await br.json();
      setProjects(pd.projects ?? []);
      setRecentBugs(bd.bugs ?? []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = () => setOpenDropdown(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleInlineUpdate = async (bugId: string, field: 'status' | 'severity', value: string) => {
    setRecentBugs(prev => prev.map(b => b.id === bugId ? { ...b, [field]: value } : b));
    try {
      await fetch('/api/bugs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [bugId], [field]: value })
      });
      success(field === 'status' ? 'Статус оновлено' : 'Критичність оновлено');
    } catch (e) {
      error('Помилка оновлення');
      load();
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || creatingProject) return;
    setCreatingProject(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName.trim() }),
      });
      const data = await res.json();
      if (data.project) {
        success('Проєкт успішно створено');
        // Trigger sidebar update event
        window.dispatchEvent(new CustomEvent('projects-updated'));
        // Redirect to new project setup
        router.push(`/projects/${data.project.id}`);
      } else {
        error(data.error || 'Помилка створення проєкту');
      }
    } catch (err) {
      error('Помилка створення проєкту');
    } finally {
      setCreatingProject(false);
    }
  };

  // Filter recent bugs based on selected filters
  const filteredBugs = recentBugs.filter(bug => {
    if (selectedProjectId !== 'all' && bug.project_id !== selectedProjectId) return false;
    if (selectedStatus !== 'all' && bug.status !== selectedStatus) return false;
    if (selectedSeverity !== 'all' && String(bug.severity) !== selectedSeverity) return false;
    return true;
  }).slice(0, 20);

  const STATUS_LABEL_FILTER: Record<string, string> = { open: 'Новий', in_progress: 'В роботі', resolved: 'Виправлено' };

  if (!loading && projects.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[#fdfdfd] px-[24px]">
        {/* Glow Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
          <div className="absolute top-[20%] left-[30%] w-[350px] h-[350px] rounded-full bg-gradient-to-tr from-[#6366f1] to-[#a855f7] blur-[100px] animate-pulse duration-[8000ms]" />
          <div className="absolute bottom-[20%] right-[30%] w-[300px] h-[300px] rounded-full bg-gradient-to-br from-[#06b6d4] to-[#3b82f6] blur-[90px] animate-pulse duration-[6000ms]" />
        </div>

        <div className="relative max-w-[520px] w-full p-[36px] md:p-[48px] text-center flex flex-col items-center gap-[24px] z-10 transition-all">
          {/* Animated Logo (eyes follow mouse) */}
          <div className="mb-[8px] text-[#1a1a1a]">
            <AnimatedLogo size={84} />
          </div>

          <div className="flex flex-col gap-[8px]">
            <h2 className="text-[24px] font-bold text-[#1a1a1a] tracking-tight">Ласкаво просимо до BuggyBag!</h2>
            <p className="text-[14px] leading-relaxed text-[#71717a] font-medium max-w-[400px] mx-auto">
              Почнімо роботу. Створіть свій перший проєкт, щоб згенерувати унікальний API-ключ та підключити віджет збору багів.
            </p>
          </div>

          <form onSubmit={handleCreateProject} className="w-full flex flex-col gap-[12px] pt-[8px]">
            <div className="relative w-full">
              <input
                autoFocus
                type="text"
                placeholder="Введіть назву проєкту (напр. Мій Сайт)"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="w-full h-[46px] px-[16px] text-[14px] font-medium text-[#1a1a1a] bg-[#f9f9f9] border border-[#e2e2e2] rounded-[12px] placeholder:text-[#a1a1aa] focus:bg-white focus:border-[#6366f1] focus:ring-[3px] focus:ring-[#6366f1]/15 transition-all outline-none"
                disabled={creatingProject}
                required
              />
            </div>
            <button
              type="submit"
              disabled={!newProjectName.trim() || creatingProject}
              className="h-[46px] w-full bg-[#1a1a1a] hover:bg-[#333333] active:scale-[0.99] text-white text-[14px] font-semibold rounded-[12px] flex items-center justify-center gap-[8px] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
            >
              {creatingProject ? (
                <>
                  <LoadingSpinner size={16} />
                  <span>Створюємо...</span>
                </>
              ) : (
                <>
                  <span>Створити перший проєкт</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-[#ffffff]">
      
      {/* ── Header ── */}
      <div className="pt-[16px] md:pt-[24px] pb-[16px] w-full shrink-0 flex flex-col md:flex-row md:items-center justify-between px-[16px] md:px-[40px] sticky top-0 z-50 bg-[#ffffff] gap-4">
        <div className="flex items-center justify-between w-full md:w-auto">
          <h1 className="text-[24px] font-bold text-[#1f1f1f] tracking-tight">Останні баги</h1>
          <button 
            className="md:hidden w-[32px] h-[32px] flex items-center justify-center bg-[#f4f4f5] hover:bg-[#e9e9e9] rounded-[8px] text-[#1f1f1f] transition-colors"
            onClick={() => setShowFilters(!showFilters)}
            title="Фільтри"
          >
            <Filter size={16} />
          </button>
        </div>

        {/* ── Filters Group (standard styled dropdown selectors) ── */}
        <div className={`${showFilters ? 'flex' : 'hidden'} md:flex flex-wrap items-center gap-[8px]`} onClick={e => e.stopPropagation()}>
          {/* Project Selector */}
          <div className="relative">
            <button
              onClick={() => setOpenDropdown(prev => prev === 'project' ? null : 'project')}
              className="h-[32px] px-[12px] bg-[#f4f4f5] hover:bg-[#e9e9e9] transition-colors rounded-[8px] text-[12px] font-semibold text-[#1f1f1f] flex items-center gap-[6px] whitespace-nowrap shrink-0"
            >
              <span>Проєкт: {selectedProjectId === 'all' ? 'Всі' : projects.find(p => p.id === selectedProjectId)?.name || 'Всі'}</span>
              <ChevronDown size={12} className={`transition-transform duration-200 ${openDropdown === 'project' ? 'rotate-180' : ''}`} />
            </button>
            {openDropdown === 'project' && (
              <div className="absolute right-0 top-[38px] min-w-[180px] bg-[#1f1f1f] border border-[#3f3f46] rounded-[10px] shadow-xl z-50 p-[4px] flex flex-col gap-[2px]">
                <button
                  onClick={() => { setSelectedProjectId('all'); setOpenDropdown(null); }}
                  className={`w-full px-[10px] py-[6px] text-left text-[12px] font-medium rounded-[6px] transition-colors ${selectedProjectId === 'all' ? 'bg-[#333] text-white' : 'text-[#a1a1aa] hover:bg-[#27272a] hover:text-white'}`}
                >
                  Всі проєкти
                </button>
                {projects.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedProjectId(p.id); setOpenDropdown(null); }}
                    className={`w-full px-[10px] py-[6px] text-left text-[12px] font-medium rounded-[6px] transition-colors ${selectedProjectId === p.id ? 'bg-[#333] text-white' : 'text-[#a1a1aa] hover:bg-[#27272a] hover:text-white'}`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Status Selector */}
          <div className="relative">
            <button
              onClick={() => setOpenDropdown(prev => prev === 'status' ? null : 'status')}
              className="h-[32px] px-[12px] bg-[#f4f4f5] hover:bg-[#e9e9e9] transition-colors rounded-[8px] text-[12px] font-semibold text-[#1f1f1f] flex items-center gap-[6px] whitespace-nowrap shrink-0"
            >
              <span>Статус: {selectedStatus === 'all' ? 'Всі' : STATUS_LABEL_FILTER[selectedStatus] || 'Всі'}</span>
              <ChevronDown size={12} className={`transition-transform duration-200 ${openDropdown === 'status' ? 'rotate-180' : ''}`} />
            </button>
            {openDropdown === 'status' && (
              <div className="absolute right-0 top-[38px] min-w-[150px] bg-[#1f1f1f] border border-[#3f3f46] rounded-[10px] shadow-xl z-50 p-[4px] flex flex-col gap-[2px]">
                <button
                  onClick={() => { setSelectedStatus('all'); setOpenDropdown(null); }}
                  className={`w-full px-[10px] py-[6px] text-left text-[12px] font-medium rounded-[6px] transition-colors ${selectedStatus === 'all' ? 'bg-[#333] text-white' : 'text-[#a1a1aa] hover:bg-[#27272a] hover:text-white'}`}
                >
                  Всі статуси
                </button>
                {Object.entries(STATUS_LABEL_FILTER).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => { setSelectedStatus(val); setOpenDropdown(null); }}
                    className={`w-full px-[10px] py-[6px] text-left text-[12px] font-medium rounded-[6px] transition-colors ${selectedStatus === val ? 'bg-[#333] text-white' : 'text-[#a1a1aa] hover:bg-[#27272a] hover:text-white'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Severity Selector */}
          <div className="relative">
            <button
              onClick={() => setOpenDropdown(prev => prev === 'severity' ? null : 'severity')}
              className="h-[32px] px-[12px] bg-[#f4f4f5] hover:bg-[#e9e9e9] transition-colors rounded-[8px] text-[12px] font-semibold text-[#1f1f1f] flex items-center gap-[6px] whitespace-nowrap shrink-0"
            >
              <span>Критичність: {selectedSeverity === 'all' ? 'Всі' : selectedSeverity}</span>
              <ChevronDown size={12} className={`transition-transform duration-200 ${openDropdown === 'severity' ? 'rotate-180' : ''}`} />
            </button>
            {openDropdown === 'severity' && (
              <div className="absolute right-0 top-[38px] min-w-[130px] bg-[#1f1f1f] border border-[#3f3f46] rounded-[10px] shadow-xl z-50 p-[4px] flex flex-col gap-[2px]">
                <button
                  onClick={() => { setSelectedSeverity('all'); setOpenDropdown(null); }}
                  className={`w-full px-[10px] py-[6px] text-left text-[12px] font-medium rounded-[6px] transition-colors ${selectedSeverity === 'all' ? 'bg-[#333] text-white' : 'text-[#a1a1aa] hover:bg-[#27272a] hover:text-white'}`}
                >
                  Всі рівні
                </button>
                {Array.from({ length: 10 }, (_, i) => String(i + 1)).map(val => (
                  <button
                    key={val}
                    onClick={() => { setSelectedSeverity(val); setOpenDropdown(null); }}
                    className={`w-full px-[10px] py-[6px] text-left text-[12px] font-medium rounded-[6px] transition-colors ${selectedSeverity === val ? 'bg-[#333] text-white' : 'text-[#a1a1aa] hover:bg-[#27272a] hover:text-white'}`}
                  >
                    Критичність {val}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 w-full overflow-y-auto custom-scrollbar flex flex-col gap-[24px] pb-[24px]">
        
        {/* Recent bugs section */}
        <div className="flex flex-col w-full bg-transparent">

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[16px] px-[16px] md:px-[40px] pb-[40px] w-full animate-pulse">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex flex-col bg-[#ffffff] border border-[#e9e9e9] rounded-[16px] p-[16px] h-[190px] shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                  <div className="flex items-center justify-between mb-[16px]">
                    <div className="h-[12px] w-[90px] bg-zinc-200 rounded" />
                    <div className="h-[18px] w-[50px] bg-zinc-200 rounded-full" />
                  </div>
                  <div className="h-[16px] w-[80%] bg-zinc-200 rounded mb-[8px]" />
                  <div className="h-[16px] w-[50%] bg-zinc-200 rounded mb-[16px]" />
                  <div className="mt-auto flex items-center justify-between">
                    <div className="h-[12px] w-[70px] bg-zinc-100 rounded" />
                    <div className="h-[12px] w-[100px] bg-zinc-100 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredBugs.length === 0 ? (
            <div className="text-[13px] text-center text-[#9a9a9a] py-[60px] font-medium">
              Жодного бага за обраними фільтрами не знайдено.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[16px] px-[16px] md:px-[40px] pb-[40px] w-full">
              {filteredBugs.map(bug => {
                const proj = projects.find(p => p.id === bug.project_id);
                return (
                  <BugCard
                    key={bug.id}
                    bug={bug}
                    projectName={proj?.name}
                    className="w-full"
                    handleInlineUpdate={handleInlineUpdate}
                    onClick={() => router.push(`/projects/${bug.project_id}/bugs/${bug.id}`)}
                  />
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

