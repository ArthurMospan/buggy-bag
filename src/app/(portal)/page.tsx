'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Project, Bug } from '@/lib/types';
import LoadingSpinner from '@/components/ui/Feedback/LoadingSpinner';
import { ArrowRight, LayoutDashboard, MonitorPlay, Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { uk } from 'date-fns/locale';
import Link from 'next/link';

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

  if (loading) return (
    <div className="flex items-center justify-center h-full w-full bg-[#f4f4f5]">
      <LoadingSpinner size="lg" />
    </div>
  );

  const totalOpen = recentBugs.filter(b => b.status === 'open').length;
  const totalResolved = recentBugs.filter(b => b.status === 'resolved').length;

  return (
    <div className="h-full flex flex-col bg-[#f4f4f5]">
      
      {/* ── Header — 52px ── */}
      <div className="h-[56px] flex items-center px-[40px] shrink-0 bg-[#ffffff]">
        <div className="flex items-center gap-[12px]">
          <LayoutDashboard size={16} className="text-[#9a9a9a]" />
          <h1 className="text-[14px] font-bold text-[#1f1f1f] tracking-wide">Дашборд</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-[24px] py-[24px]">
        
        {/* Quick stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-[16px] px-[40px]">
          {[
            { label: 'Всього проєктів', value: projects.length, color: '#9a9a9a', icon: MonitorPlay },
            { label: 'Нових багів',     value: totalOpen,       color: '#fb923c', icon: Activity },
            { label: 'Виправлено',      value: totalResolved,   color: '#34d399', icon: Activity },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-[16px] bg-[#ffffff] rounded-[16px] px-[32px] py-[28px] relative overflow-hidden group shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <div className="absolute right-[-20px] top-[-20px] w-[80px] h-[80px] rounded-full opacity-[0.03] group-hover:opacity-[0.06] transition-opacity blur-xl" style={{ background: s.color }} />
              <div className="w-[42px] h-[42px] rounded-full flex items-center justify-center shrink-0 border" style={{ background: `${s.color}15`, borderColor: `${s.color}30` }}>
                <s.icon size={18} style={{ color: s.color }} />
              </div>
              <div className="flex flex-col">
                <span className="text-[28px] font-bold leading-none tracking-tight text-[#1f1f1f] mb-[4px]">{s.value}</span>
                <span className="text-[11px] font-bold text-[#9a9a9a] tracking-wide uppercase">{s.label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Recent bugs section */}
        <div className="flex flex-col bg-transparent">
          <div className="h-[40px] flex items-center px-[40px] shrink-0 bg-transparent mb-[12px]">
            <h2 className="text-[11px] font-bold text-[#9a9a9a] uppercase tracking-widest">Останні баги</h2>
          </div>

          {recentBugs.length === 0 ? (
            <div className="text-[13px] text-center text-[#9a9a9a] py-[60px] font-medium bg-[#ffffff] mx-[40px] rounded-[16px] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              Поки що немає жодного бага. Підключіть віджет до вашого проєкту!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[16px] px-[40px] pb-[40px]">
              {recentBugs.map(bug => {
                const proj = projects.find(p => p.id === bug.project_id);
                return (
                  <Link
                    key={bug.id}
                    href={`/projects/${bug.project_id}/bugs/${bug.id}`}
                  className="group/card flex flex-col shrink-0 cursor-pointer overflow-hidden border border-[#e9e9e9] hover:border-[#cfcfcf] rounded-[16px] transition-all bg-[#ffffff] shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                  >
                    {/* Screenshot */}
                    {bug.image_url && (
                      <div className="w-full aspect-video bg-[#f4f4f5] relative overflow-hidden">
                        <img
                          src={bug.image_url}
                          alt="Screenshot"
                          crossOrigin="anonymous"
                          className="w-full h-full object-cover transition-transform duration-300 group-hover/card:scale-[1.03]"
                        />
                        <div className="absolute inset-0 pointer-events-none transition-all duration-200 bg-black/0 group-hover/card:bg-black/5" />
                        {proj && (
                          <div className="absolute top-[8px] left-[8px] bg-[#1f1f1f] px-[8px] py-[3px] rounded-[4px] flex items-center gap-[4px]">
                            <span className="w-[5px] h-[5px] rounded-full bg-white/40" />
                            <span className="text-[9.5px] font-bold text-white shadow-sm truncate max-w-[100px]">{proj.name}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Content */}
                    <div className="px-[20px] py-[16px] flex flex-col flex-1">
                      <div className="flex items-center justify-between gap-[8px] mb-[8px]">
                        <div className="flex items-center gap-[6px]">
                          {(() => {
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
                            
                            return (
                              <div
                                className="w-[16px] h-[16px] rounded-[4px] flex items-center justify-center text-[9px] font-bold border shrink-0"
                                style={{ color, backgroundColor: bg, borderColor: color + '40' }}
                                title={`Критичність: ${num}/10`}
                              >
                                {num}
                              </div>
                            );
                          })()}
                          <span
                            className="text-[9px] font-bold uppercase tracking-wider px-[5px] py-[1px] rounded-[4px] shrink-0"
                            style={{ color: STATUS_COLOR[bug.status], background: STATUS_BG[bug.status] }}
                          >
                            {STATUS_LABEL[bug.status] ?? bug.status}
                          </span>
                        </div>
                        <span className="text-[10px] font-medium text-[#9a9a9a] truncate">
                          {formatDistanceToNow(new Date(bug.created_at), { addSuffix: true, locale: uk })}
                        </span>
                      </div>
                      
                      <p className="text-[13px] text-[#1f1f1f] font-medium line-clamp-3 leading-relaxed flex-1 mb-[12px]">
                        {bug.description || <em className="text-[#9a9a9a] not-italic">Без опису</em>}
                      </p>

                      <div className="flex items-center justify-between mt-auto pt-[12px] gap-[8px]">
                        <div className="min-w-0 flex-1 flex items-center h-[24px]">
                          {bug.tech_context?.route && (
                            <div className="inline-flex items-center text-[10px] font-mono text-[#1f1f1f] bg-[#f4f4f5] px-[6px] h-full rounded-[5px] truncate max-w-full">
                              {bug.tech_context.route}
                            </div>
                          )}
                        </div>
                        <div className="group/btn shrink-0 flex items-center justify-center gap-[4px] text-[11px] font-semibold text-[#1f1f1f] hover:text-white bg-[#f4f4f5] hover:bg-[#1f1f1f] transition-all px-[9px] h-[24px] rounded-[5px]">
                          Деталі
                          <ArrowRight size={11} className="transition-transform group-hover/btn:translate-x-[2px]" />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
