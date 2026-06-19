'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Project, Bug } from '@/lib/types';
import LoadingSpinner from '@/components/ui/Feedback/LoadingSpinner';
import { ArrowRight, LayoutDashboard, MonitorPlay, Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { uk } from 'date-fns/locale';
import BugCard from '@/components/bugs/BugCard';

const STATUS_COLOR: Record<string, string> = { open: '#71717a', in_progress: '#fb923c', resolved: '#34d399', closed: '#71717a' };
const STATUS_BG: Record<string, string>    = { open: 'rgba(113,113,122,0.12)', in_progress: 'rgba(234,88,12,0.12)', resolved: 'rgba(16,185,129,0.12)', closed: 'rgba(113,113,122,0.1)' };
const STATUS_LABEL: Record<string, string> = { open: 'Новий', in_progress: 'В роботі', resolved: 'Виправлено', closed: 'Закрито' };


export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [recentBugs, setRecentBugs] = useState<Bug[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [pr, br] = await Promise.all([fetch('/api/projects'), fetch('/api/bugs')]);
        const pd = await pr.json();
        const bd = await br.json();
        setProjects(pd.projects ?? []);
        setRecentBugs((bd.bugs ?? []).slice(0, 20));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="h-full w-full flex flex-col bg-[#ffffff]">
      
      {/* ── Header ── */}
      <div className="pt-[24px] pb-[16px] w-full shrink-0 flex items-center justify-between px-[40px] sticky top-0 z-50 bg-[#ffffff]">
        <div className="flex items-center gap-[16px]">
          <h1 className="text-[24px] font-bold text-[#1f1f1f] tracking-tight">Останні баги</h1>
        </div>
      </div>

      <div className="flex-1 w-full overflow-y-auto custom-scrollbar flex flex-col gap-[24px] pb-[24px]">
        
        {/* Recent bugs section */}
        <div className="flex flex-col w-full bg-transparent">

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[16px] px-[40px] pb-[40px] w-full animate-pulse">
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
          ) : recentBugs.length === 0 ? (
            <div className="text-[13px] text-center text-[#9a9a9a] py-[60px] font-medium bg-[#ffffff] mx-[40px] rounded-[16px] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              Поки що немає жодного бага. Підключіть віджет до вашого проєкту!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[16px] px-[40px] pb-[40px] w-full">
              {recentBugs.map(bug => {
                const proj = projects.find(p => p.id === bug.project_id);
                return (
                  <BugCard
                    key={bug.id}
                    bug={bug}
                    projectName={proj?.name}
                    className="w-full"
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
