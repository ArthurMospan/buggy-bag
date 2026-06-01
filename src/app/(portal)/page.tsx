'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Project } from '@/lib/types';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import Dialog from '@/components/ui/Dialog';
import EmptyState from '@/components/ui/Feedback/EmptyState';
import LoadingSpinner from '@/components/ui/Feedback/LoadingSpinner';
import { Plus, FolderOpen, ArrowRight, Trash2, Key } from 'lucide-react';

// ── Project card ─────────────────────────────────────────────────
function ProjectCard({ project, onDelete }: { project: Project; onDelete: (id: string) => void }) {
  const router = useRouter();

  return (
    <div className="bg-white border border-[#e9e9e9] rounded-[16px] p-[20px] flex flex-col gap-[16px] hover:border-[#cfcfcf] hover:ring-4 hover:ring-[#1f1f1f]/5 transition-all duration-200">
      {/* Header */}
      <div className="flex items-start justify-between gap-[8px]">
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-bold text-[#1f1f1f] truncate">{project.name}</h3>
          <p className="text-[11px] text-[#9a9a9a] mt-[2px]">
            {new Date(project.created_at).toLocaleDateString('uk-UA')}
          </p>
        </div>
        <Button
          style="ghost"
          color="red"
          size="icon-sm"
          icon={Trash2}
          onClick={(e) => { e.stopPropagation(); onDelete(project.id); }}
          title="Видалити проєкт"
        >
          Видалити
        </Button>
      </div>

      {/* API key snippet */}
      <div className="bg-[#f4f4f5] rounded-[10px] px-[12px] py-[8px] flex items-center gap-[8px]">
        <Key size={12} className="text-[#9a9a9a] shrink-0" />
        <code className="text-[11px] font-mono text-[#9a9a9a] truncate flex-1">{project.api_key}</code>
      </div>

      {/* Actions */}
      <div className="flex gap-[8px]">
        <Button
          style="secondary"
          size="md"
          className="flex-1"
          onClick={() => router.push(`/projects/${project.id}/setup`)}
        >
          Інтеграція
        </Button>
        <Button
          style="primary"
          size="md"
          icon={ArrowRight}
          className="flex-1"
          onClick={() => router.push(`/projects/${project.id}`)}
        >
          Баги
        </Button>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────
export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading]   = useState(true);
  const [creating, setCreating] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [newName, setNewName]   = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      setProjects(data.projects ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
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
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteId(id);
    await fetch('/api/projects', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setProjects(prev => prev.filter(p => p.id !== id));
    setDeleteId(null);
  };

  return (
    <div className="p-[24px] flex flex-col gap-[24px]">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-[#1f1f1f]">Мої проєкти</h1>
          <p className="text-[13px] text-[#9a9a9a] mt-[2px]">
            {projects.length} {projects.length === 1 ? 'проєкт' : 'проєктів'}
          </p>
        </div>
        <Button style="primary" size="lg" icon={Plus} onClick={() => setShowDialog(true)}>
          Новий проєкт
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-[60px]">
          <LoadingSpinner size="lg" />
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="Проєктів поки немає"
          description="Створіть перший проєкт, щоб отримати API-ключ для вашого віджета."
          action="Створити проєкт"
          onAction={() => setShowDialog(true)}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[16px]">
          {projects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Create project dialog */}
      <Dialog
        isOpen={showDialog}
        onClose={() => { setShowDialog(false); setNewName(''); }}
        title="Новий проєкт"
        size="sm"
      >
        <form onSubmit={handleCreate} className="flex flex-col gap-[16px]">
          <div>
            <label className="text-[11px] font-bold text-[#9a9a9a] uppercase tracking-wider block mb-[6px]">
              Назва проєкту *
            </label>
            <Input
              placeholder="Наприклад: My Website"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
              required
            />
          </div>
          <p className="text-[12px] text-[#9a9a9a]">
            Після створення ви отримаєте унікальний API-ключ для цього проєкту.
          </p>
          <div className="flex gap-[8px]">
            <Button
              style="secondary"
              size="lg"
              className="flex-1"
              type="button"
              onClick={() => { setShowDialog(false); setNewName(''); }}
            >
              Скасувати
            </Button>
            <Button
              style="primary"
              size="lg"
              className="flex-1"
              type="submit"
              loading={creating}
            >
              Створити
            </Button>
          </div>
        </form>
      </Dialog>

    </div>
  );
}
