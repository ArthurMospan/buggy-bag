'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Project, Bug } from '@/lib/types';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import Dialog from '@/components/ui/Dialog';
import LoadingSpinner from '@/components/ui/Feedback/LoadingSpinner';
import { Plus, FolderOpen, ArrowRight, Trash2, Key } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { uk } from 'date-fns/locale';

const STATUS_LABEL: Record<string, string> = {
  open: 'Новий', in_progress: 'В роботі', resolved: 'Виправлено', closed: 'Закрито',
};

function StatTile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-[#f9f9f9] border border-[#e9e9e9] rounded-[14px] px-[20px] py-[16px]">
      <div className="text-[11px] font-bold text-[#9a9a9a] uppercase tracking-wider mb-[4px]">{label}</div>
      <div className="text-[30px] font-bold text-[#1f1f1f] leading-none">{value}</div>
    </div>
  );
}

function ProjectCard({ project, onDelete }: { project: Project; onDelete: (id: string) => void }) {
  const router = useRouter();
  return (
    <div className="bg-[#f9f9f9] border border-[#e9e9e9] rounded-[14px] p-[16px] flex items-center gap-[12px] group hover:border-[#cfcfcf] transition-colors">
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-bold text-[#1f1f1f] truncate">{project.name}</div>
        <div className="text-[11px] text-[#9a9a9a] mt-[2px] font-mono truncate">{project.api_key.slice(0, 18)}…</div>
      </div>
      <button onClick={() => onDelete(project.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-[6px] rounded-[8px] hover:bg-[#e9e9e9] text-[#9a9a9a] hover:text-[#1f1f1f]">
        <Trash2 size={13} />
      </button>
      <button onClick={() => router.push(`/projects/${project.id}`)}
        className="flex items-center gap-[6px] px-[12px] py-[6px] bg-[#1f1f1f] text-white text-[12px] font-bold rounded-[8px] hover:bg-[#303030] transition-colors shrink-0">
        Баги <ArrowRight size={12} />
      </button>
    </div>
  );
}

export default function DashboardPage() {
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
      setRecentBugs((bd.bugs ?? []).slice(0, 8));
      setLoading(false);
    };
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    });
    const data = await res.json();
    if (data.project) {
      setProjects(prev => [data.project, ...prev]);
      setNewName('');
      setShowDialog(false);
    }
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    await fetch('/api/projects', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  const totalOpen     = recentBugs.filter(b => b.status === 'open').length;
  const totalResolved = recentBugs.filter(b => b.status === 'resolved').length;

  if (loading) return (
    <div className="flex items-center justify-center h-full py-[80px]">
      <LoadingSpinner size="lg" />
    </div>
  );

  return (
    <div className="p-[24px] flex flex-col gap-[32px] max-w-[900px]">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-[#1f1f1f]">Дашборд</h1>
          <p className="text-[13px] text-[#9a9a9a] mt-[2px]">{projects.length} проєктів</p>
        </div>
        <Button style="primary" size="lg" icon={Plus} onClick={() => setShowDialog(true)}>
          Новий проєкт
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-[12px]">
        <StatTile label="Проєктів"   value={projects.length} />
        <StatTile label="Відкритих"  value={totalOpen} />
        <StatTile label="Виправлено" value={totalResolved} />
      </div>

      {/* Recent bugs */}
      {recentBugs.length > 0 && (
        <div>
          <div className="flex items-center gap-[10px] mb-[12px]">
            <span className="text-[11px] font-bold text-[#9a9a9a] uppercase tracking-wider">Останні баги</span>
            <div className="flex-1 h-[1px] bg-[#e9e9e9]" />
          </div>
          <div className="flex flex-col gap-[2px]">
            {recentBugs.map(bug => {
              const proj = projects.find(p => p.id === bug.project_id);
              return (
                <div key={bug.id} className="flex items-center gap-[12px] px-[14px] py-[10px] rounded-[10px] hover:bg-[#f9f9f9] transition-colors group">
                  <div className="w-[6px] h-[6px] rounded-full shrink-0" style={{
                    background: bug.status === 'open' ? '#1f1f1f' : bug.status === 'resolved' ? '#9a9a9a' : '#cfcfcf'
                  }} />
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] font-semibold text-[#1f1f1f] truncate block">
                      {bug.description || 'Без опису'}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#9a9a9a] shrink-0">{proj?.name ?? '—'}</span>
                  <span className="text-[11px] font-bold text-[#9a9a9a] shrink-0 capitalize">{bug.severity ?? 'low'}</span>
                  <span className="text-[11px] text-[#cfcfcf] shrink-0">
                    {formatDistanceToNow(new Date(bug.created_at), { addSuffix: true, locale: uk })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Projects */}
      <div>
        <div className="flex items-center gap-[10px] mb-[12px]">
          <span className="text-[11px] font-bold text-[#9a9a9a] uppercase tracking-wider">Проєкти</span>
          <div className="flex-1 h-[1px] bg-[#e9e9e9]" />
        </div>
        {projects.length === 0 ? (
          <div className="text-[13px] text-[#9a9a9a] py-[24px] text-center">
            Немає проєктів. Створіть перший!
          </div>
        ) : (
          <div className="flex flex-col gap-[8px]">
            {projects.map(p => <ProjectCard key={p.id} project={p} onDelete={handleDelete} />)}
          </div>
        )}
      </div>

      {/* Create dialog */}
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
