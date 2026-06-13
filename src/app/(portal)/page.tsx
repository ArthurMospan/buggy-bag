'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Project, Bug } from '@/lib/types';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import Dialog from '@/components/ui/Dialog';
import LoadingSpinner from '@/components/ui/Feedback/LoadingSpinner';
import { Plus, Trash2, ArrowRight, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { uk } from 'date-fns/locale';

const STATUS_COLOR: Record<string, string> = { open: '#6366f1', in_progress: '#f97316', resolved: '#10b981', closed: '#9a9a9a' };
const STATUS_BG: Record<string, string>    = { open: '#eef2ff', in_progress: '#fff7ed', resolved: '#f0fdf4', closed: '#f4f4f5' };
const STATUS_LABEL: Record<string, string> = { open: 'Новий', in_progress: 'В роботі', resolved: 'Виправлено', closed: 'Закрито' };
const SEVERITY_COLOR: Record<string, string> = { low: '#9a9a9a', medium: '#f59e0b', high: '#f97316', critical: '#dc2626' };

function ProjectCard({ project, onDelete }: { project: Project; onDelete: (id: string) => void }) {
  const router = useRouter();
  return (
    <div className="bg-[#f9f9f9] border border-[#e9e9e9] rounded-[14px] p-[14px] flex items-center gap-[12px] group hover:border-[#cfcfcf] transition-colors">
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-bold text-[#1f1f1f] truncate">{project.name}</div>
        <div className="text-[11px] text-[#9a9a9a] mt-[2px] font-mono truncate">{project.api_key.slice(0, 20)}…</div>
      </div>
      <button
        onClick={e => { e.stopPropagation(); onDelete(project.id); }}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-[6px] rounded-[8px] hover:bg-[#fee2e2] text-[#9a9a9a] hover:text-[#dc2626]"
      >
        <Trash2 size={13} />
      </button>
      <button
        onClick={() => router.push(`/projects/${project.id}`)}
        className="flex items-center gap-[6px] px-[12px] py-[6px] bg-[#1f1f1f] text-white text-[12px] font-bold rounded-[8px] hover:bg-[#303030] transition-colors shrink-0"
      >
        Баги <ArrowRight size={12} />
      </button>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [recentBugs, setRecentBugs] = useState<Bug[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [pr, br] = await Promise.all([fetch('/api/projects'), fetch('/api/bugs')]);
      const pd = await pr.json();
      const bd = await br.json();
      setProjects(pd.projects ?? []);
      setRecentBugs((bd.bugs ?? []).slice(0, 10));
      setLoading(false);
    };
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    const res = await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName.trim() }) });
    const data = await res.json();
    if (data.project) { setProjects(prev => [data.project, ...prev]); setNewName(''); setShowDialog(false); }
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    await fetch('/api/projects', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full py-[80px]">
      <LoadingSpinner size="lg" />
    </div>
  );

  const totalOpen = recentBugs.filter(b => b.status === 'open').length;
  const totalResolved = recentBugs.filter(b => b.status === 'resolved').length;

  return (
    <div className="p-[24px] flex flex-col gap-[28px] max-w-[860px]">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-[20px] font-bold text-[#1f1f1f]">Дашборд</h1>
        <Button style="primary" size="md" icon={Plus} onClick={() => setShowDialog(true)}>
          Новий проєкт
        </Button>
      </div>

      {/* Quick stats — compact */}
      <div className="flex gap-[20px]">
        {[
          { label: 'Проєктів', value: projects.length },
          { label: 'Відкритих', value: totalOpen },
          { label: 'Виправлено', value: totalResolved },
        ].map(s => (
          <div key={s.label} className="flex items-baseline gap-[8px]">
            <span className="text-[28px] font-bold text-[#1f1f1f] leading-none">{s.value}</span>
            <span className="text-[12px] text-[#9a9a9a] font-medium">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Recent bugs — clickable */}
      {recentBugs.length > 0 && (
        <div>
          <div className="flex items-center gap-[10px] mb-[10px]">
            <TrendingUp size={13} className="text-[#9a9a9a]" />
            <span className="text-[11px] font-bold text-[#9a9a9a] uppercase tracking-wider">Останні баги</span>
            <div className="flex-1 h-[1px] bg-[#e9e9e9]" />
          </div>
          <div className="flex flex-col border border-[#e9e9e9] rounded-[14px] overflow-hidden">
            {recentBugs.map((bug, i) => {
              const proj = projects.find(p => p.id === bug.project_id);
              return (
                <button
                  key={bug.id}
                  onClick={() => router.push(`/projects/${bug.project_id}?bug=${bug.id}`)}
                  className={`flex items-center gap-[12px] px-[14px] py-[11px] text-left hover:bg-[#f9f9f9] transition-colors ${i < recentBugs.length - 1 ? 'border-b border-[#f0f0f0]' : ''}`}
                >
                  <div
                    className="w-[6px] h-[6px] rounded-full shrink-0"
                    style={{ background: STATUS_COLOR[bug.status] ?? '#cfcfcf' }}
                  />
                  <span className="flex-1 text-[13px] font-semibold text-[#1f1f1f] truncate">
                    {bug.description || 'Без опису'}
                  </span>
                  {proj && (
                    <span className="text-[11px] text-[#9a9a9a] shrink-0 hidden sm:block">{proj.name}</span>
                  )}
                  <span
                    className="text-[10px] font-bold px-[6px] py-[2px] rounded-[5px] shrink-0 capitalize"
                    style={{ color: SEVERITY_COLOR[bug.severity ?? 'low'], background: '#f4f4f5' }}
                  >
                    {bug.severity ?? 'low'}
                  </span>
                  <span
                    className="text-[10px] font-bold px-[6px] py-[2px] rounded-[5px] shrink-0"
                    style={{ color: STATUS_COLOR[bug.status], background: STATUS_BG[bug.status] }}
                  >
                    {STATUS_LABEL[bug.status] ?? bug.status}
                  </span>
                  <span className="text-[11px] text-[#cfcfcf] shrink-0">
                    {formatDistanceToNow(new Date(bug.created_at), { addSuffix: true, locale: uk })}
                  </span>
                  <ArrowRight size={12} className="text-[#cfcfcf] shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Projects */}
      <div>
        <div className="flex items-center gap-[10px] mb-[10px]">
          <span className="text-[11px] font-bold text-[#9a9a9a] uppercase tracking-wider">Проєкти</span>
          <div className="flex-1 h-[1px] bg-[#e9e9e9]" />
        </div>
        {projects.length === 0 ? (
          <div className="text-[13px] text-[#9a9a9a] py-[24px] text-center">Немає проєктів. Створіть перший!</div>
        ) : (
          <div className="flex flex-col gap-[8px]">
            {projects.map(p => <ProjectCard key={p.id} project={p} onDelete={handleDelete} />)}
          </div>
        )}
      </div>

      <Dialog isOpen={showDialog} onClose={() => { setShowDialog(false); setNewName(''); }} title="Новий проєкт" size="sm">
        <form onSubmit={handleCreate} className="flex flex-col gap-[16px]">
          <Input placeholder="Назва проєкту" value={newName} onChange={e => setNewName(e.target.value)} autoFocus required />
          <div className="flex gap-[8px]">
            <Button style="secondary" size="lg" className="flex-1" type="button" onClick={() => setShowDialog(false)}>Скасувати</Button>
            <Button style="primary" size="lg" className="flex-1" type="submit" loading={creating}>Створити</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
