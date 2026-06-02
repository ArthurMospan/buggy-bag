'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Bug, BugStatus, Project } from '@/lib/types';
import BugCard from '@/components/bugs/BugCard';
import BugDetailModal from '@/components/bugs/BugDetailModal';
import PromptGenerator from '@/components/bugs/PromptGenerator';
import EmptyState from '@/components/ui/Feedback/EmptyState';
import LoadingSpinner from '@/components/ui/Feedback/LoadingSpinner';
import { Select } from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import IntegrationPanel from '@/components/bugs/IntegrationPanel';
import Dialog from '@/components/ui/Dialog';
import { Bug as BugIcon, RefreshCw, Settings } from 'lucide-react';

function formatDay(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (isSameDay(d, today)) return 'Сьогодні';
  if (isSameDay(d, yesterday)) return 'Вчора';
  return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
}

function BugList({ bugs, selectedIds, onSelect, onOpen }: {
  bugs: Bug[];
  selectedIds: Set<string>;
  onSelect: (id: string, e: React.MouseEvent) => void;
  onOpen: (bug: Bug) => void;
}) {
  // Group by day
  const groups: { label: string; bugs: Bug[] }[] = [];
  bugs.forEach(bug => {
    const label = formatDay(bug.created_at ?? new Date().toISOString());
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.bugs.push(bug);
    else groups.push({ label, bugs: [bug] });
  });

  return (
    <div className="flex flex-col gap-[24px]">
      {groups.map(group => (
        <div key={group.label}>
          <div className="flex items-center gap-[10px] mb-[12px]">
            <span className="text-[11px] font-bold text-[#9a9a9a] uppercase tracking-wider">{group.label}</span>
            <div className="flex-1 h-[1px] bg-[#e9e9e9]" />
            <span className="text-[11px] text-[#c0c0c0]">{group.bugs.length}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[16px]">
            {group.bugs.map(bug => (
              <BugCard
                key={bug.id}
                bug={bug}
                selected={selectedIds.has(bug.id)}
                onClick={() => onOpen(bug)}
                onSelect={e => onSelect(bug.id, e)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const STATUS_OPTIONS = [
  { value: '',            label: 'Всі статуси' },
  { value: 'open',        label: 'Нові',        dotColor: '#6366f1' },
  { value: 'in_progress', label: 'В роботі',    dotColor: '#f97316' },
  { value: 'resolved',    label: 'Виправлені',  dotColor: '#10b981' },
  { value: 'closed',      label: 'Закриті',     dotColor: '#9a9a9a' },
];

function StatCard({ label, value }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-[#f9f9f9] border border-[#e9e9e9] rounded-[14px] p-[16px]">
      <div className="text-[11px] font-bold text-[#9a9a9a] uppercase tracking-wider">{label}</div>
      <div className="text-[28px] font-bold mt-[4px] text-[#1f1f1f]">{value}</div>
    </div>
  );
}

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [project, setProject]     = useState<Project | null>(null);
  const [bugs, setBugs]           = useState<Bug[]>([]);
  const [loading, setLoading]     = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedBug, setSelectedBug]   = useState<Bug | null>(null);
  const [selectedIds, setSelectedIds]   = useState<Set<string>>(new Set());
  const [showIntegration, setShowIntegration] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [projRes, bugsRes] = await Promise.all([
        fetch('/api/projects'),
        fetch(`/api/bugs?project_id=${id}${statusFilter ? `&status=${statusFilter}` : ''}`),
      ]);
      const projData = await projRes.json();
      const bugsData = await bugsRes.json();
      const found = (projData.projects ?? []).find((p: Project) => p.id === id);
      if (found) setProject(found);
      setBugs(bugsData.bugs ?? []);
    } finally {
      setLoading(false);
    }
  }, [id, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleStatusChange = async (bugId: string, status: BugStatus) => {
    const res = await fetch('/api/bugs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: bugId, status }),
    });
    if (res.ok) {
      setBugs(prev => prev.map(b => b.id === bugId ? { ...b, status } : b));
      setSelectedBug(prev => prev?.id === bugId ? { ...prev, status } : prev);
    }
  };

  const handleSeverityChange = async (bugId: string, severity: import('@/lib/types').BugSeverity) => {
    const res = await fetch('/api/bugs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: bugId, severity }),
    });
    if (res.ok) {
      setBugs(prev => prev.map(b => b.id === bugId ? { ...b, severity } : b));
      setSelectedBug(prev => prev?.id === bugId ? { ...prev, severity } : prev);
    }
  };

  const toggleSelect = (bugId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(bugId) ? next.delete(bugId) : next.add(bugId);
      return next;
    });
  };

  const openCount  = bugs.filter(b => b.status === 'open').length;
  const inProgress = bugs.filter(b => b.status === 'in_progress').length;
  const resolved   = bugs.filter(b => b.status === 'resolved').length;

  return (
    <div className="p-[24px] flex flex-col gap-[24px]">

      {/* Header */}
      <div className="flex items-center justify-between gap-[16px]">
        <div>
          <h1 className="text-[22px] font-bold text-[#1f1f1f]">{project?.name ?? '...'}</h1>
          <p className="text-[13px] text-[#9a9a9a] mt-[2px]">
            {openCount} нових · {inProgress} в роботі
          </p>
        </div>
        <div className="flex items-center gap-[8px] shrink-0">
          <Button style="ghost" size="md" icon={Settings} onClick={() => setShowIntegration(true)}>
            Інтеграція
          </Button>
          <PromptGenerator
            bugs={bugs}
            selectedIds={selectedIds}
            onSelectedIdsChange={setSelectedIds}
            onStatusChange={handleStatusChange}
          />
          <Button style="ghost" size="icon-lg" icon={RefreshCw} onClick={fetchData} title="Оновити">
            Оновити
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-[12px]">
        <StatCard label="Всього"     value={bugs.length} />
        <StatCard label="Нові"       value={openCount} />
        <StatCard label="В роботі"   value={inProgress} />
        <StatCard label="Виправлені" value={resolved} />
      </div>

      {/* Selection hint */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-[10px] bg-[#eef2ff] border border-[#c7d2fe] rounded-[12px] px-[16px] py-[10px]">
          <span className="text-[13px] font-bold text-[#4338ca]">
            Вибрано {selectedIds.size} {selectedIds.size === 1 ? 'баг' : 'баги'} для промпту
          </span>
          <button onClick={() => setSelectedIds(new Set())} className="text-[12px] text-[#6366f1] hover:underline ml-auto">
            Зняти вибір
          </button>
        </div>
      )}

      {/* Filter */}
      <div className="w-[200px]">
        <Select value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
      </div>

      {/* Bugs grid */}
      {loading ? (
        <div className="flex items-center justify-center py-[60px]">
          <LoadingSpinner size="lg" />
        </div>
      ) : bugs.length === 0 ? (
        <EmptyState
          icon={BugIcon}
          title="Багів поки немає"
          description={statusFilter ? 'Немає багів з таким статусом.' : "Баги з'являться тут після першої помилки від вашого віджета."}
        />
      ) : (
        <BugList
          bugs={bugs}
          selectedIds={selectedIds}
          onSelect={(id, e) => toggleSelect(id, e)}
          onOpen={setSelectedBug}
        />
      )}

      {/* Bug detail */}
      <BugDetailModal
        bug={selectedBug}
        onClose={() => setSelectedBug(null)}
        onStatusChange={handleStatusChange}
        onSeverityChange={handleSeverityChange}
      />

      {/* Integration dialog */}
      <Dialog isOpen={showIntegration} onClose={() => setShowIntegration(false)} title="Інтеграція" size="md">
        {project && <IntegrationPanel project={project} />}
      </Dialog>
    </div>
  );
}
