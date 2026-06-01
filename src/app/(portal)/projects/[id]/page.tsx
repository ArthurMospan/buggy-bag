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
import { Bug as BugIcon, RefreshCw, ArrowLeft, Settings } from 'lucide-react';

const STATUS_FILTER_OPTIONS = [
  { value: '',            label: 'Всі статуси' },
  { value: 'open',        label: 'Open',        dotColor: '#6366f1' },
  { value: 'in_progress', label: 'In Progress', dotColor: '#f97316' },
  { value: 'resolved',    label: 'Resolved',    dotColor: '#10b981' },
  { value: 'closed',      label: 'Closed',      dotColor: '#9a9a9a' },
];

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white border border-[#e9e9e9] rounded-[16px] p-[16px]">
      <div className="text-[11px] font-bold text-[#9a9a9a] uppercase tracking-wider">{label}</div>
      <div className="text-[28px] font-bold mt-[4px]" style={{ color }}>{value}</div>
    </div>
  );
}

export default function ProjectBugsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [project, setProject]       = useState<Project | null>(null);
  const [bugs, setBugs]             = useState<Bug[]>([]);
  const [loading, setLoading]       = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedBug, setSelectedBug]   = useState<Bug | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch project info
      const projRes = await fetch('/api/projects');
      const projData = await projRes.json();
      const found = (projData.projects ?? []).find((p: Project) => p.id === id);
      if (found) setProject(found);

      // Fetch bugs for this project
      const qs = new URLSearchParams({ project_id: id });
      if (statusFilter) qs.set('status', statusFilter);
      const bugsRes = await fetch(`/api/bugs?${qs}`);
      const bugsData = await bugsRes.json();
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

  const openCount  = bugs.filter(b => b.status === 'open').length;
  const inProgress = bugs.filter(b => b.status === 'in_progress').length;
  const resolved   = bugs.filter(b => b.status === 'resolved').length;

  return (
    <div className="p-[24px] flex flex-col gap-[24px]">

      {/* Header */}
      <div className="flex items-center justify-between gap-[16px]">
        <div className="flex items-center gap-[12px] min-w-0">
          <Button style="ghost" size="icon" icon={ArrowLeft} onClick={() => router.push('/')}>
            Назад
          </Button>
          <div className="min-w-0">
            <h1 className="text-[22px] font-bold text-[#1f1f1f] truncate">
              {project?.name ?? 'Проєкт'}
            </h1>
            <p className="text-[13px] text-[#9a9a9a] mt-[2px]">
              {openCount} відкритих · {inProgress} в роботі
            </p>
          </div>
        </div>
        <div className="flex items-center gap-[8px] shrink-0">
          <Button
            style="ghost"
            size="md"
            icon={Settings}
            onClick={() => router.push(`/projects/${id}/setup`)}
          >
            Інтеграція
          </Button>
          <PromptGenerator bugs={bugs} onStatusChange={handleStatusChange} />
          <Button style="ghost" size="icon-lg" icon={RefreshCw} onClick={fetchData} title="Оновити">
            Оновити
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-[12px]">
        <StatCard label="Всього"      value={bugs.length} color="#1f1f1f" />
        <StatCard label="Open"        value={openCount}   color="#6366f1" />
        <StatCard label="In Progress" value={inProgress}  color="#f97316" />
        <StatCard label="Resolved"    value={resolved}    color="#10b981" />
      </div>

      {/* Filter */}
      <div className="flex items-center gap-[10px]">
        <div className="w-[200px]">
          <Select value={statusFilter} onChange={setStatusFilter} options={STATUS_FILTER_OPTIONS} />
        </div>
      </div>

      {/* Bugs */}
      {loading ? (
        <div className="flex items-center justify-center py-[60px]">
          <LoadingSpinner size="lg" />
        </div>
      ) : bugs.length === 0 ? (
        <EmptyState
          icon={BugIcon}
          title="Багів поки немає"
          description={statusFilter ? 'Немає багів з таким статусом.' : 'Баги з’являться тут після першої помилки від вашого віджета.'}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[16px]">
          {bugs.map(bug => (
            <BugCard key={bug.id} bug={bug} onClick={() => setSelectedBug(bug)} />
          ))}
        </div>
      )}

      <BugDetailModal
        bug={selectedBug}
        onClose={() => setSelectedBug(null)}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
